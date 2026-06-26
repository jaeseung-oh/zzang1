"use client";

import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import Link from "next/link";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { defaultCourse } from "@/lib/course/catalog";
import { moduleProgressToLessonProgress, saveLessonProgress, updateCourseProgress } from "@/lib/course/progress-service";
import { getFirebaseServices } from "@/lib/firebase/client";
import { requireAuthenticatedUser } from "@/lib/firebase/session";
import { getUserProfile } from "@/lib/firebase/user-profile";
import { buttonClass } from "@/app/components/ui/button-styles";
import { getVerifiedUserEnrollments, isEnrollmentActive } from "@/lib/course/enrollment-service";
import { isSuperAdmin } from "@/lib/auth/auth-role-service";
import { hasPreventionDocumentsAccess, preventionDocuments } from "@/lib/course/prevention-documents";
import { trackCourseComplete, trackCourseStart } from "@/lib/analytics/ga";

type SaveCourseProgressResponse = {
  progressId: string;
  completionRate: number;
  isCompleted: boolean;
  paymentVerified: boolean;
  certificateEligible: boolean;
  issuedCertificates: Array<{
    certificateId: string;
    documentType: string;
    issueNumber: string;
  }>;
};

type GetCourseVideoAccessResponse = {
  provider?: "storage" | "cloudflare-stream";
  videoUrl: string;
  streamUid?: string;
  expiresAt: number;
  durationHintSeconds: number;
};

type CloudflareStreamPlayer = {
  currentTime: number;
  duration: number;
  paused: boolean;
  ended: boolean;
  addEventListener: (eventName: string, listener: () => void) => void;
  removeEventListener: (eventName: string, listener: () => void) => void;
};

declare global {
  interface Window {
    Stream?: (element: HTMLIFrameElement) => CloudflareStreamPlayer;
  }
}

type CaseType = "dui" | "sexual" | "drug" | "violence" | "other";

type ModuleProgressState = {
  watchedSeconds: number;
  durationSeconds: number;
  completionRate: number;
  lastPlaybackPositionSeconds: number;
  isCompleted: boolean;
};

type StoredPlaybackSnapshot = {
  caseType: CaseType;
  selectedModuleId: string;
  legalAccepted: boolean;
  legalAcceptedDate?: string;
  reviewAccepted: boolean;
  purchaseNoticeAccepted: boolean;
  moduleProgress: Record<string, ModuleProgressState>;
  savedAt: string;
};

type ProgressRecord = {
  caseType?: CaseType;
  watchedSeconds?: number;
  durationSeconds?: number;
  completionRate?: number;
  remainingSeconds?: number;
  lastPlaybackPositionSeconds?: number;
  completedModuleCount?: number;
  totalModuleCount?: number;
  moduleProgress?: Record<string, ModuleProgressState>;
  isCompleted?: boolean;
  legalDisclaimerAccepted?: boolean;
  legalNoticeAcceptedAt?: { seconds: number } | string | Date | null;
  legalNoticeAcceptedDate?: string;
  userReviewAccepted?: boolean;
  updatedAt?: { seconds: number };
};

const caseTypeOptions: Array<{ value: CaseType; label: string }> = [
  { value: "dui", label: "음주운전" },
  { value: "sexual", label: "성범죄" },
  { value: "drug", label: "마약" },
  { value: "violence", label: "폭행" },
  { value: "other", label: "기타" },
];

const disclaimer =
  "본 과정은 법률 검토나 상담을 제공하지 않으며, 사용자가 자신의 생활 변화와 재발 방지 계획을 스스로 정리할 수 있도록 돕는 민간 교육 서비스입니다.";

// TODO: 실제 운영에서는 Cloudflare Stream signed URL 또는 서버 발급 토큰을 사용해 결제자와 관리자만 영상 재생 URL을 받을 수 있도록 구현해야 함.

const localStorageKey = `course-room-progress:${defaultCourse.id}`;

const lectureActivityEvent = "resetedu:lecture-activity";
const completionThreshold = 95;

function dispatchLectureActivity(active: boolean) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent(lectureActivityEvent, { detail: { active } }));
}

function getTodayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function toDateFromUnknown(value: unknown) {
  if (!value) return null;
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value : null;
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isFinite(parsed.getTime()) ? parsed : null;
  }
  if (typeof value === "object" && value !== null && "seconds" in value && typeof (value as { seconds?: unknown }).seconds === "number") {
    return new Date((value as { seconds: number }).seconds * 1000);
  }
  return null;
}

function formatDateKey(value: unknown) {
  const date = toDateFromUnknown(value);
  if (!date) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function isLegalAcceptedToday(remote: ProgressRecord | null, local: StoredPlaybackSnapshot | null) {
  const today = getTodayKey();
  return remote?.legalNoticeAcceptedDate === today || formatDateKey(remote?.legalNoticeAcceptedAt) === today || local?.legalAcceptedDate === today;
}

function formatDuration(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainingSeconds = safeSeconds % 60;

  if (hours > 0) {
    return `${hours}시간 ${minutes}분 ${remainingSeconds}초`;
  }

  if (minutes > 0) {
    return `${minutes}분 ${remainingSeconds}초`;
  }

  return `${remainingSeconds}초`;
}

function formatTimestamp(timestamp?: { seconds: number }) {
  if (!timestamp?.seconds) {
    return "저장 대기 중";
  }

  return new Date(timestamp.seconds * 1000).toLocaleString("ko-KR");
}

function formatDurationOrPending(seconds?: number | null) {
  if (!seconds || seconds <= 0) {
    return "영상 로딩 후 표시";
  }

  return formatDuration(seconds);
}

function formatProgressTime(currentSeconds: number, durationSeconds: number) {
  return formatDuration(currentSeconds) + " / " + formatDurationOrPending(durationSeconds);
}

function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return value.slice(0, maxLength).trimEnd() + "...";
}


async function resolveCloudflareStreamUrl(uid: string) {
  const apiBaseUrl = process.env.NEXT_PUBLIC_AUTH_API_BASE_URL?.replace(/\/$/, "");
  if (!apiBaseUrl) {
    throw new Error("영상 토큰 발급 서버 URL이 설정되지 않았습니다.");
  }

  const user = await requireAuthenticatedUser();
  const idToken = await user.getIdToken();
  const response = await fetch(`${apiBaseUrl}/api/stream/token?uid=${encodeURIComponent(uid)}&courseId=${encodeURIComponent(defaultCourse.id)}`, {
    method: "GET",
    headers: { Authorization: "Bearer " + idToken },
  });

  const data = (await response.json().catch(() => ({}))) as { videoUrl?: string; message?: string; error?: string };
  if (!response.ok || !data.videoUrl) {
    throw new Error(data.message || data.error || `Stream token request failed: ${response.status}`);
  }

  return data.videoUrl;
}
function buildEmptyModuleProgress() {
  return Object.fromEntries(
    defaultCourse.modules.map((module) => [
      module.id,
      {
        watchedSeconds: 0,
        durationSeconds: 0,
        completionRate: 0,
        lastPlaybackPositionSeconds: 0,
        isCompleted: false,
      },
    ])
  ) as Record<string, ModuleProgressState>;
}

function readLocalSnapshot(): StoredPlaybackSnapshot | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(localStorageKey);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as StoredPlaybackSnapshot;
  } catch {
    return null;
  }
}

function mergeModuleProgress(
  base: Record<string, ModuleProgressState>,
  remote?: Record<string, ModuleProgressState>,
  local?: Record<string, ModuleProgressState>
) {
  const merged = { ...base };

  for (const module of defaultCourse.modules) {
    const fallback = base[module.id];
    const remoteItem = remote?.[module.id];
    const localItem = local?.[module.id];
    const durationSeconds = Math.max(
      fallback.durationSeconds,
      remoteItem?.durationSeconds ?? 0,
      localItem?.durationSeconds ?? 0
    );
    const watchedSeconds = Math.min(
      durationSeconds,
      Math.max(remoteItem?.watchedSeconds ?? 0, localItem?.watchedSeconds ?? 0, fallback.watchedSeconds)
    );
    const lastPlaybackPositionSeconds = Math.min(
      durationSeconds,
      Math.max(
        remoteItem?.lastPlaybackPositionSeconds ?? 0,
        localItem?.lastPlaybackPositionSeconds ?? 0,
        fallback.lastPlaybackPositionSeconds
      )
    );
    const completionRate = Math.floor((watchedSeconds / Math.max(durationSeconds, 1)) * 100);

    merged[module.id] = {
      watchedSeconds,
      durationSeconds,
      completionRate,
      lastPlaybackPositionSeconds,
      isCompleted: completionRate >= completionThreshold,
    };
  }

  return merged;
}

function getModuleState(item: ModuleProgressState | undefined, active: boolean) {
  if (item?.isCompleted) {
    return {
      label: "수강 완료",
      icon: "✓",
      iconClassName: "bg-emerald-500/16 text-emerald-300 ring-1 ring-emerald-400/30",
      toneClassName: "border-emerald-400/30 bg-emerald-400/8",
      progressClassName: "bg-emerald-400",
    };
  }

  if ((item?.watchedSeconds ?? 0) > 0 || active) {
    return {
      label: active ? "현재 수강 중" : "이어보기 가능",
      icon: "▶",
      iconClassName: "bg-[#1c4ed8]/20 text-[#9cc0ff] ring-1 ring-[#5f8fff]/30",
      toneClassName: active ? "border-[#5f8fff]/45 bg-[#0c1c37]" : "border-[#243752] bg-[#0f1b2e]",
      progressClassName: "bg-[linear-gradient(90deg,#c6a86a_0%,#e9d3a0_100%)]",
    };
  }

  return {
    label: "미수강",
    icon: "•",
    iconClassName: "bg-white/8 text-slate-400 ring-1 ring-white/10",
    toneClassName: active ? "border-[#5f8fff]/45 bg-[#0c1c37]" : "border-[#243752] bg-[#0f1729]",
    progressClassName: "bg-white/25",
  };
}

export default function CourseRoomPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [uid, setUid] = useState("");
  const [caseType, setCaseType] = useState<CaseType>("dui");
  const [selectedModuleId, setSelectedModuleId] = useState(defaultCourse.modules[0]?.id ?? "");
  const [moduleProgress, setModuleProgress] = useState<Record<string, ModuleProgressState>>(buildEmptyModuleProgress);
  const [legalAccepted, setLegalAccepted] = useState(false);
  const [legalGateChecked, setLegalGateChecked] = useState(false);
  const [reviewAccepted, setReviewAccepted] = useState(false);
  const [purchaseNoticeAccepted, setPurchaseNoticeAccepted] = useState(false);
  const [statusMessage, setStatusMessage] = useState("5강 수강 세션과 저장 상태를 준비하는 중입니다.");
  const [error, setError] = useState("");
  const [result, setResult] = useState<SaveCourseProgressResponse | null>(null);
  const [lastSavedLabel, setLastSavedLabel] = useState("저장 대기 중");
  const [playerReady, setPlayerReady] = useState(false);
  const [playerError, setPlayerError] = useState("");
  const [isManualSaving, setIsManualSaving] = useState(false);
  const [isBackgroundSaving, setIsBackgroundSaving] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [videoProvider, setVideoProvider] = useState<"storage" | "cloudflare-stream">("storage");
  const [videoExpiresAt, setVideoExpiresAt] = useState<number | null>(null);
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const [streamSdkReady, setStreamSdkReady] = useState(false);
  const [accessBlockedMessage, setAccessBlockedMessage] = useState("");
  const [accessChecking, setAccessChecking] = useState(true);
  const [adminPreview, setAdminPreview] = useState(false);
  const [resumePromptVisible, setResumePromptVisible] = useState(false);
  const [resumeToast, setResumeToast] = useState("");
  const [progressSyncNotice, setProgressSyncNotice] = useState("");
  const [hasDocumentFormsAccess, setHasDocumentFormsAccess] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamIframeRef = useRef<HTMLIFrameElement | null>(null);
  const streamPlayerRef = useRef<CloudflareStreamPlayer | null>(null);
  const saveInFlightRef = useRef(false);
  const restoreAppliedRef = useRef(false);
  const refreshTimeoutRef = useRef<number | null>(null);
  const resumeToastTimeoutRef = useRef<number | null>(null);
  const lastSavedSnapshotRef = useRef<{ watchedSeconds: number; currentSeconds: number }>({
    watchedSeconds: -1,
    currentSeconds: -1,
  });

  const selectedModule = useMemo(
    () => defaultCourse.modules.find((module) => module.id === selectedModuleId) ?? defaultCourse.modules[0],
    [selectedModuleId]
  );

  const fullNameRef = useRef(fullName);
  const uidRef = useRef(uid);
  const caseTypeRef = useRef(caseType);
  const legalAcceptedRef = useRef(legalAccepted);
  const reviewAcceptedRef = useRef(reviewAccepted);
  const purchaseNoticeAcceptedRef = useRef(purchaseNoticeAccepted);
  const selectedModuleIdRef = useRef(selectedModuleId);
  const moduleProgressRef = useRef(moduleProgress);

  useEffect(() => {
    fullNameRef.current = fullName;
  }, [fullName]);

  useEffect(() => {
    uidRef.current = uid;
  }, [uid]);

  useEffect(() => {
    caseTypeRef.current = caseType;
  }, [caseType]);

  useEffect(() => {
    legalAcceptedRef.current = legalAccepted;
  }, [legalAccepted]);

  useEffect(() => {
    reviewAcceptedRef.current = reviewAccepted;
  }, [reviewAccepted]);

  useEffect(() => {
    purchaseNoticeAcceptedRef.current = purchaseNoticeAccepted;
  }, [purchaseNoticeAccepted]);

  useEffect(() => {
    selectedModuleIdRef.current = selectedModuleId;
  }, [selectedModuleId]);

  useEffect(() => {
    moduleProgressRef.current = moduleProgress;
  }, [moduleProgress]);

  const aggregate = useMemo(() => {
    const totalDurationSeconds = defaultCourse.modules.reduce(
      (sum, module) => sum + (moduleProgress[module.id]?.durationSeconds ?? 0),
      0
    );
    const watchedSeconds = defaultCourse.modules.reduce(
      (sum, module) => sum + (moduleProgress[module.id]?.watchedSeconds ?? 0),
      0
    );
    const completedModuleCount = defaultCourse.modules.filter((module) => moduleProgress[module.id]?.isCompleted).length;
    const completionRate = totalDurationSeconds > 0 ? Math.floor((watchedSeconds / totalDurationSeconds) * 100) : 0;
    const remainingSeconds = Math.max(totalDurationSeconds - watchedSeconds, 0);

    return {
      totalDurationSeconds,
      watchedSeconds,
      completedModuleCount,
      totalModuleCount: defaultCourse.modules.length,
      completionRate,
      remainingSeconds,
      isCompleted: completedModuleCount === defaultCourse.modules.length,
    };
  }, [moduleProgress]);

  const selectedModuleIndex = useMemo(() => defaultCourse.modules.findIndex((module) => module.id === selectedModuleId), [selectedModuleId]);
  const previousModule = selectedModuleIndex > 0 ? defaultCourse.modules[selectedModuleIndex - 1] : null;
  const nextModule = selectedModuleIndex >= 0 && selectedModuleIndex < defaultCourse.modules.length - 1 ? defaultCourse.modules[selectedModuleIndex + 1] : null;
  const selectedProgress = moduleProgress[selectedModuleId] ?? buildEmptyModuleProgress()[selectedModuleId];
  const selectedProgressRef = useRef(selectedProgress);

  useEffect(() => {
    selectedProgressRef.current = selectedProgress;
  }, [selectedProgress]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const user = await requireAuthenticatedUser();
        const profile = await getUserProfile(user.uid);

        if (cancelled) {
          return;
        }

        setUid(user.uid);

        const resolvedName = profile?.realName?.trim() || profile?.fullName?.trim();

        if (!resolvedName) {
          setError("수강을 저장하기 전에 회원가입 화면에서 실명을 먼저 저장해 주세요.");
          setStatusMessage("실명 정보가 없어 학습 저장과 수료 처리 연결을 진행할 수 없습니다.");
          return;
        }

        setFullName(resolvedName);

        const { db } = getFirebaseServices();
        const adminBypass = isSuperAdmin(user);
        setAdminPreview(adminBypass);
        const enrollments = adminBypass ? [] : await getVerifiedUserEnrollments(user, null);
        const enrollment = enrollments.find((item) => item.courseId === defaultCourse.id && isEnrollmentActive(item)) ?? enrollments.find((item) => item.courseId === defaultCourse.id);
        const allowed = adminBypass || isEnrollmentActive(enrollment);
        const documentFormsAllowed = enrollments.some((item) => item.courseId === defaultCourse.id && isEnrollmentActive(item) && hasPreventionDocumentsAccess(item.productId, item.amount, item.productTitle));
        setHasDocumentFormsAccess(adminBypass || documentFormsAllowed);

        if (!allowed) {
          const expired = enrollment?.paymentStatus === "paid" && !isEnrollmentActive(enrollment);
          const message = expired
            ? "해당 강의의 수강기간은 결제일로부터 90일이며, 현재 수강기간이 만료되어 수강할 수 없습니다."
            : "수강권 결제 후 이용할 수 있습니다.";
          setAccessBlockedMessage(message);
          setPlayerError(message);
          setAccessChecking(false);
          router.replace("/courses/apply/?category=dui&notice=" + encodeURIComponent(message));
          return;
        } else {
          setAccessBlockedMessage("");
        }
        setAccessChecking(false);
        const progressSnapshot = await getDoc(doc(db, "courseProgress", user.uid + "_" + defaultCourse.id));
        const remote = progressSnapshot.exists() ? (progressSnapshot.data() as ProgressRecord) : null;
        const local = readLocalSnapshot();
        const mergedProgress = mergeModuleProgress(buildEmptyModuleProgress(), remote?.moduleProgress, local?.moduleProgress);
        const initialModuleId = remote?.moduleProgress?.[selectedModuleId]?.lastPlaybackPositionSeconds
          ? selectedModuleId
          : local?.selectedModuleId ?? defaultCourse.modules[0]?.id ?? "";

        setModuleProgress(mergedProgress);
        setSelectedModuleId(initialModuleId);
        setCaseType(remote?.caseType ?? local?.caseType ?? "dui");
        setLegalAccepted(isLegalAcceptedToday(remote, local));
        setReviewAccepted(Boolean(remote?.userReviewAccepted ?? local?.reviewAccepted ?? false));
        setPurchaseNoticeAccepted(Boolean(local?.purchaseNoticeAccepted ?? false));
        setLastSavedLabel(remote?.updatedAt ? formatTimestamp(remote.updatedAt) : local?.savedAt ?? "저장 대기 중");
        setStatusMessage(
          remote?.moduleProgress || local?.moduleProgress
            ? "이전 학습 기록을 불러왔습니다. 원하는 강의를 선택해 이어서 수강할 수 있습니다."
            : "실명이 확인되었습니다. 5강 강의실에서 강의별 진도와 전체 누적 수강률을 저장할 수 있습니다."
        );
      } catch (sessionError) {
        console.error(sessionError);
        if (!cancelled) {
          const message = sessionError instanceof Error ? sessionError.message : "";
          if (message === "AUTH_LOGIN_REQUIRED") {
            router.replace("/login?next=/course-room");
            setError("로그인한 회원만 강의실에 접근할 수 있습니다.");
            setStatusMessage("로그인이 필요합니다.");
            return;
          }

          setError("Firebase 세션 준비에 실패했습니다. Authentication과 Firestore 연결 상태를 확인해 주세요.");
          setStatusMessage("세션 준비에 실패했습니다.");
          setAccessChecking(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      localStorageKey,
      JSON.stringify({
        caseType,
        selectedModuleId,
        legalAccepted,
        legalAcceptedDate: legalAccepted ? getTodayKey() : "",
        reviewAccepted,
        purchaseNoticeAccepted,
        moduleProgress,
        savedAt: new Date().toLocaleString("ko-KR"),
      } satisfies StoredPlaybackSnapshot)
    );
  }, [caseType, selectedModuleId, legalAccepted, reviewAccepted, purchaseNoticeAccepted, moduleProgress]);

  useEffect(() => {
    return () => {
      if (resumeToastTimeoutRef.current) {
        window.clearTimeout(resumeToastTimeoutRef.current);
      }
      dispatchLectureActivity(false);
    };
  }, []);

  function getActivePlaybackSeconds() {
    if (videoProvider === "cloudflare-stream") {
      const player = streamPlayerRef.current;
      return Math.max(0, Math.round(player?.currentTime || selectedProgressRef.current.lastPlaybackPositionSeconds || 0));
    }

    const player = videoRef.current;
    return Math.max(0, Math.round(player?.currentTime || selectedProgressRef.current.lastPlaybackPositionSeconds || 0));
  }

  function buildCurrentLessonProgress() {
    const userId = uidRef.current;
    const lessonId = selectedModuleIdRef.current;
    const item = moduleProgressRef.current[lessonId];

    if (!userId || !lessonId || !item) {
      return null;
    }

    const currentTime = getActivePlaybackSeconds();
    const duration = Math.max(item.durationSeconds, selectedProgressRef.current.durationSeconds, 1);
    return moduleProgressToLessonProgress(userId, defaultCourse.id, lessonId, {
      ...item,
      durationSeconds: duration,
      lastPlaybackPositionSeconds: Math.min(duration, currentTime),
      watchedSeconds: Math.max(item.watchedSeconds, Math.min(duration, currentTime)),
    });
  }

  function saveCurrentLessonLocally() {
    const progress = buildCurrentLessonProgress();
    if (!progress) return null;
    try {
      window.localStorage.setItem("lesson-progress-" + progress.userId + "-" + progress.courseId + "-" + progress.lessonId, JSON.stringify(progress));
    } catch {
      // localStorage 저장 실패는 수강을 막지 않습니다.
    }
    return progress;
  }

  async function syncCurrentLessonBackup() {
    const progress = buildCurrentLessonProgress();
    if (!progress) return;

    const lessonResult = await saveLessonProgress(progress);
    await updateCourseProgress(progress.userId, progress.courseId, {
      lastLessonId: progress.lessonId,
      lastLessonTime: progress.currentTime,
    });

    if (!lessonResult.ok) {
      setProgressSyncNotice("진도 저장이 일시적으로 지연되었습니다. 네트워크 연결 후 자동으로 다시 저장됩니다.");
    } else {
      setProgressSyncNotice("");
    }
  }

  function showResumeNotice(resumeTime: number, durationSeconds: number) {
    if (resumeTime <= 5) return;
    setResumePromptVisible(true);
    setResumeToast("이전 시청 위치부터 이어집니다.");
    if (resumeToastTimeoutRef.current) {
      window.clearTimeout(resumeToastTimeoutRef.current);
    }
    resumeToastTimeoutRef.current = window.setTimeout(() => setResumeToast(""), 3000);

    if (durationSeconds > 0 && resumeTime >= durationSeconds - 10) {
      setStatusMessage("이전에 거의 끝까지 시청했습니다. 이어보기 또는 처음부터 보기를 선택할 수 있습니다.");
    } else {
      setStatusMessage("이전에 보던 위치부터 이어서 수강할 수 있습니다.");
    }
  }

  function seekSelectedPlayback(seconds: number, options?: { play?: boolean; hidePrompt?: boolean }) {
    const safeSeconds = Math.max(0, Math.round(seconds));

    if (videoProvider === "cloudflare-stream") {
      const player = streamPlayerRef.current;
      if (player) {
        player.currentTime = safeSeconds;
      }
    } else if (videoRef.current) {
      videoRef.current.currentTime = safeSeconds;
      if (options?.play) {
        void videoRef.current.play().catch(() => undefined);
      }
    }

    updateSelectedModuleProgress({ lastPlaybackPositionSeconds: safeSeconds });
    if (options?.hidePrompt) {
      setResumePromptVisible(false);
    }
  }

  function handleResumeFromSavedPosition() {
    seekSelectedPlayback(selectedProgressRef.current.lastPlaybackPositionSeconds, { play: true, hidePrompt: true });
    setStatusMessage("이전에 보던 위치부터 이어서 수강합니다. 진도는 자동으로 저장됩니다.");
  }

  function handleRestartCurrentLesson() {
    seekSelectedPlayback(0, { play: true, hidePrompt: true });
    setStatusMessage("처음부터 다시 재생합니다. 기존 진도율은 유지되며 다시 시청하면서 업데이트됩니다.");
  }

  function handleMoveAdjacentLesson(moduleId: string | null | undefined) {
    if (!moduleId) return;
    handleSelectModule(moduleId);
  }

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleBeforeUnload = () => {
      saveCurrentLessonLocally();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        saveCurrentLessonLocally();
        void persistProgress("auto");
        void syncCurrentLessonBackup();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (!uid || !selectedModule || accessChecking) {
      return;
    }

    let cancelled = false;

    const loadVideo = async () => {
      try {
        setIsVideoLoading(true);
        setPlayerError("");
        setPlayerReady(false);
        restoreAppliedRef.current = false;
        setResumePromptVisible(false);
        setResumeToast("");

        if (accessBlockedMessage) {
          setVideoProvider("storage");
          setVideoUrl("");
          setPlayerError(accessBlockedMessage);
          setStatusMessage(accessBlockedMessage);
          return;
        }

        if (selectedModule.cloudflareStreamUid) {
          if (cancelled) {
            return;
          }

          const streamUrl = await resolveCloudflareStreamUrl(selectedModule.cloudflareStreamUid);

          if (cancelled) {
            return;
          }

          setVideoProvider("cloudflare-stream");
          setVideoUrl(streamUrl);
          setVideoExpiresAt(Date.now() + 1000 * 60 * 55);
          setModuleProgress((prev) => ({
            ...prev,
            [selectedModule.id]: {
              ...prev[selectedModule.id],
              durationSeconds: prev[selectedModule.id]?.durationSeconds ?? 0,
            },
          }));
        } else {
          const { functions } = getFirebaseServices();
          const callable = httpsCallable<{ courseId: string; moduleId: string }, GetCourseVideoAccessResponse>(functions, "getCourseVideoAccess");
          const response = await callable({ courseId: defaultCourse.id, moduleId: selectedModule.id });

          if (cancelled) {
            return;
          }

          setVideoProvider(response.data.provider ?? "storage");
          setVideoUrl(response.data.videoUrl);
          setVideoExpiresAt(response.data.expiresAt);
          setModuleProgress((prev) => ({
            ...prev,
            [selectedModule.id]: {
              ...prev[selectedModule.id],
              durationSeconds: Math.max(prev[selectedModule.id]?.durationSeconds ?? 0, response.data.durationHintSeconds || 0),
            },
          }));
        }
        setStatusMessage(`${selectedModule.title} 재생 준비가 완료되었습니다. 강의별 진도와 전체 누적 수강률이 함께 저장됩니다.`);
      } catch (videoLoadError) {
        console.error(videoLoadError);
        if (!cancelled) {
          const message = videoLoadError instanceof Error ? videoLoadError.message : "강의 영상을 불러오지 못했습니다.";
          setPlayerError(message);
          setStatusMessage(message);
          setVideoProvider("storage");
          setVideoUrl("");
        }
      } finally {
        if (!cancelled) {
          setIsVideoLoading(false);
        }
      }
    };

    void loadVideo();

    return () => {
      cancelled = true;
    };
  }, [uid, selectedModule, accessBlockedMessage, accessChecking]);

  useEffect(() => {
    if (typeof window !== "undefined" && window.Stream) {
      setStreamSdkReady(true);
    }
  }, []);

  useEffect(() => {
    if (videoProvider !== "cloudflare-stream" || !videoUrl || !streamSdkReady || !selectedModule) {
      return;
    }

    const iframe = streamIframeRef.current;
    const createPlayer = typeof window !== "undefined" ? window.Stream : undefined;

    if (!iframe || !createPlayer) {
      return;
    }

    const player = createPlayer(iframe);
    streamPlayerRef.current = player;

    const handleStreamLoadedMetadata = () => {
      const progress = selectedProgressRef.current;
      const actualDuration = Math.max(Math.round(player.duration || 0), progress.durationSeconds, 1);
      updateSelectedModuleProgress({ durationSeconds: actualDuration });
      setPlayerReady(true);

      if (!restoreAppliedRef.current) {
        restoreAppliedRef.current = true;
        const resumeTime = Math.min(progress.lastPlaybackPositionSeconds, Math.max(actualDuration - 1, 0));
        player.currentTime = resumeTime;
        showResumeNotice(resumeTime, actualDuration);
      }
    };

    const handleStreamTimeUpdate = () => {
      const progress = selectedProgressRef.current;
      const durationSeconds = Math.max(Math.round(player.duration || 0), progress.durationSeconds, 1);
      const currentSeconds = Math.min(Math.max(player.currentTime || 0, 0), durationSeconds);
      updateSelectedModuleProgress({
        durationSeconds,
        watchedSeconds: Math.max(progress.watchedSeconds, currentSeconds),
        lastPlaybackPositionSeconds: currentSeconds,
      });
    };

    const handleStreamPlay = () => {
      trackCourseStart(defaultCourse.id, selectedModule?.id);
      dispatchLectureActivity(true);
    };

    const handleStreamPause = () => {
      dispatchLectureActivity(false);
      void persistProgress("pause");
    };

    const handleStreamEnded = () => {
      dispatchLectureActivity(false);
      const progress = selectedProgressRef.current;
      const durationSeconds = Math.max(Math.round(player.duration || 0), progress.durationSeconds, 1);
      updateSelectedModuleProgress({
        durationSeconds,
        watchedSeconds: durationSeconds,
        lastPlaybackPositionSeconds: durationSeconds,
        isCompleted: true,
      });
      setTimeout(() => {
        void persistProgress("ended");
      }, 0);
    };

    player.addEventListener("loadedmetadata", handleStreamLoadedMetadata);
    player.addEventListener("timeupdate", handleStreamTimeUpdate);
    player.addEventListener("play", handleStreamPlay);
    player.addEventListener("pause", handleStreamPause);
    player.addEventListener("ended", handleStreamEnded);

    return () => {
      player.removeEventListener("loadedmetadata", handleStreamLoadedMetadata);
      player.removeEventListener("timeupdate", handleStreamTimeUpdate);
      player.removeEventListener("play", handleStreamPlay);
      player.removeEventListener("pause", handleStreamPause);
      player.removeEventListener("ended", handleStreamEnded);
      streamPlayerRef.current = null;
      dispatchLectureActivity(false);
    };
  }, [videoProvider, videoUrl, streamSdkReady, selectedModule]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void persistProgress("auto");
    }, 10000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!videoExpiresAt || !selectedModule) {
      return;
    }

    if (refreshTimeoutRef.current) {
      window.clearTimeout(refreshTimeoutRef.current);
    }

    const delay = Math.max(videoExpiresAt - Date.now() - 60_000, 5_000);
    refreshTimeoutRef.current = window.setTimeout(() => {
      const player = videoRef.current;
      const preservedTime = player?.currentTime ?? selectedProgress.lastPlaybackPositionSeconds;
      const wasPlaying = Boolean(player && !player.paused && !player.ended);

      const refresh = async () => {
        try {
          if (selectedModule.cloudflareStreamUid) {
            const streamUrl = await resolveCloudflareStreamUrl(selectedModule.cloudflareStreamUid);
            setVideoProvider("cloudflare-stream");
            setVideoUrl(streamUrl);
            setVideoExpiresAt(Date.now() + 1000 * 60 * 55);
          } else {
            const { functions } = getFirebaseServices();
            const callable = httpsCallable<{ courseId: string; moduleId: string }, GetCourseVideoAccessResponse>(functions, "getCourseVideoAccess");
            const response = await callable({ courseId: defaultCourse.id, moduleId: selectedModule.id });
            setVideoProvider(response.data.provider ?? "storage");
            setVideoUrl(response.data.videoUrl);
            setVideoExpiresAt(response.data.expiresAt);
          }
          window.setTimeout(() => {
            const nextPlayer = videoRef.current;
            if (!nextPlayer) {
              return;
            }
            nextPlayer.currentTime = preservedTime;
            if (wasPlaying) {
              void nextPlayer.play().catch(() => undefined);
            }
          }, 150);
        } catch (refreshError) {
          console.error(refreshError);
        }
      };

      void refresh();
    }, delay);

    return () => {
      if (refreshTimeoutRef.current) {
        window.clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [videoExpiresAt, selectedModule, selectedProgress.lastPlaybackPositionSeconds]);

  async function persistProgress(mode: "auto" | "pause" | "ended" | "manual") {
    if (!uidRef.current || !fullNameRef.current.trim()) {
      return;
    }

    const activeModuleId = selectedModuleIdRef.current;
    const activeProgress = moduleProgressRef.current[activeModuleId];
    const totalDurationSeconds = defaultCourse.modules.reduce(
      (sum, module) => sum + (moduleProgressRef.current[module.id]?.durationSeconds ?? 0),
      0
    );
    const totalWatchedSeconds = defaultCourse.modules.reduce(
      (sum, module) => sum + (moduleProgressRef.current[module.id]?.watchedSeconds ?? 0),
      0
    );
    const completionRate = totalDurationSeconds > 0 ? Math.floor((totalWatchedSeconds / totalDurationSeconds) * 100) : 0;
    const isCompleted = defaultCourse.modules.every((module) => moduleProgressRef.current[module.id]?.isCompleted);

    if (
      mode === "auto" &&
      totalWatchedSeconds === lastSavedSnapshotRef.current.watchedSeconds &&
      activeProgress?.lastPlaybackPositionSeconds === lastSavedSnapshotRef.current.currentSeconds
    ) {
      return;
    }

    if (saveInFlightRef.current) {
      return;
    }

    saveInFlightRef.current = true;
    if (mode === "manual") {
      setIsManualSaving(true);
      setError("");
    } else {
      setIsBackgroundSaving(true);
    }

    try {
      const { functions } = getFirebaseServices();
      const callable = httpsCallable<
        {
          courseId: string;
          courseTitle: string;
          caseType: CaseType;
          watchedSeconds: number;
          durationSeconds: number;
          lastPlaybackPositionSeconds: number;
          completionRate: number;
          isCompleted: boolean;
          legalAccepted: boolean;
          userReviewAccepted: boolean;
          moduleProgress: Record<string, ModuleProgressState>;
        },
        SaveCourseProgressResponse
      >(functions, "saveCourseProgress");

      const response = await callable({
        courseId: defaultCourse.id,
        courseTitle: defaultCourse.title,
        caseType: caseTypeRef.current,
        watchedSeconds: totalWatchedSeconds,
        durationSeconds: totalDurationSeconds,
        lastPlaybackPositionSeconds: activeProgress?.lastPlaybackPositionSeconds ?? 0,
        completionRate,
        isCompleted,
        legalAccepted: legalAcceptedRef.current,
        userReviewAccepted: reviewAcceptedRef.current,
        moduleProgress: moduleProgressRef.current,
      });

      lastSavedSnapshotRef.current = {
        watchedSeconds: totalWatchedSeconds,
        currentSeconds: activeProgress?.lastPlaybackPositionSeconds ?? 0,
      };
      setLastSavedLabel(new Date().toLocaleString("ko-KR"));
      setResult(response.data);
      void syncCurrentLessonBackup();

      if (response.data.isCompleted) {
        trackCourseComplete(defaultCourse.id);
      }

      if (response.data.issuedCertificates.length) {
        setStatusMessage("음주운전 예방교육 수강을 완료했습니다. 수료증 등 교육 이수 자료를 즉시 출력할 수 있습니다.");
      } else if (response.data.isCompleted && !response.data.paymentVerified) {
        setStatusMessage("수강 정보가 확인되면 수료 문서 발급이 자동으로 이어집니다.");
      } else if (response.data.isCompleted && !response.data.certificateEligible) {
        setStatusMessage("수료 문서 발급을 위해 필수 동의 항목을 확인해 주세요.");
      } else if (mode === "manual") {
        setStatusMessage("현재 강의별 진도와 전체 누적 수강률이 저장되었습니다.");
      }
    } catch (saveError) {
      console.error(saveError);
      const message = saveError instanceof Error ? saveError.message : "학습 진행 저장 중 문제가 발생했습니다.";
      saveCurrentLessonLocally();
      void syncCurrentLessonBackup();
      if (mode === "manual") {
        setError(message);
      } else {
        setStatusMessage("진도 저장이 일시적으로 지연되었습니다. 네트워크 연결 후 자동으로 다시 저장됩니다.");
      }
    } finally {
      saveInFlightRef.current = false;
      setIsManualSaving(false);
      setIsBackgroundSaving(false);
    }
  }

  function updateSelectedModuleProgress(update: Partial<ModuleProgressState>) {
    if (!selectedModule) {
      return;
    }

    setModuleProgress((prev) => {
      const current = prev[selectedModule.id];
      const durationSeconds = Math.max(1, Math.round(update.durationSeconds ?? current.durationSeconds));
      const watchedSeconds = Math.min(
        durationSeconds,
        Math.max(0, Math.round(update.watchedSeconds ?? current.watchedSeconds))
      );
      const lastPlaybackPositionSeconds = Math.min(
        durationSeconds,
        Math.max(0, Math.round(update.lastPlaybackPositionSeconds ?? current.lastPlaybackPositionSeconds))
      );
      const completionRate = Math.floor((watchedSeconds / durationSeconds) * 100);

      return {
        ...prev,
        [selectedModule.id]: {
          watchedSeconds,
          durationSeconds,
          completionRate,
          lastPlaybackPositionSeconds,
          isCompleted: completionRate >= completionThreshold,
        },
      };
    });
  }

  const handleLoadedMetadata = () => {
    const player = videoRef.current;
    if (!player || !selectedModule) {
      return;
    }

    const actualDuration = Math.max(Math.round(player.duration || 0), selectedProgress.durationSeconds, 1);
    updateSelectedModuleProgress({ durationSeconds: actualDuration });
    setPlayerReady(true);

    if (!restoreAppliedRef.current) {
      restoreAppliedRef.current = true;
      const resumeTime = Math.min(selectedProgress.lastPlaybackPositionSeconds, Math.max(actualDuration - 1, 0));
      player.currentTime = resumeTime;
      showResumeNotice(resumeTime, actualDuration);
    }
  };

  const handleTimeUpdate = () => {
    const player = videoRef.current;
    if (!player) {
      return;
    }

    const durationSeconds = Math.max(Math.round(player.duration || 0), selectedProgress.durationSeconds, 1);
    const currentSeconds = Math.min(Math.max(player.currentTime, 0), durationSeconds);
    updateSelectedModuleProgress({
      durationSeconds,
      watchedSeconds: Math.max(selectedProgress.watchedSeconds, currentSeconds),
      lastPlaybackPositionSeconds: currentSeconds,
    });
  };

  const handlePlay = () => {
    trackCourseStart(defaultCourse.id, selectedModule?.id);
    dispatchLectureActivity(true);
  };

  const handlePause = () => {
    dispatchLectureActivity(false);
    void persistProgress("pause");
  };

  const handleEnded = () => {
    dispatchLectureActivity(false);
    const player = videoRef.current;
    const durationSeconds = Math.max(Math.round(player?.duration || 0), selectedProgress.durationSeconds, 1);
    updateSelectedModuleProgress({
      durationSeconds,
      watchedSeconds: durationSeconds,
      lastPlaybackPositionSeconds: durationSeconds,
      isCompleted: true,
    });
    setTimeout(() => {
      void persistProgress("ended");
    }, 0);
  };

  const handleSelectModule = (moduleId: string) => {
    if (moduleId === selectedModuleId) {
      return;
    }

    if (!legalAccepted) {
      setStatusMessage("수강 전 법적 고지와 민간 교육 서비스 동의를 먼저 확인해 주세요.");
      return;
    }

    const moduleIndex = defaultCourse.modules.findIndex((module) => module.id === moduleId);
    const previousModule = moduleIndex > 0 ? defaultCourse.modules[moduleIndex - 1] : null;
    if (previousModule && !moduleProgress[previousModule.id]?.isCompleted) {
      setStatusMessage("잠금 강의입니다. 바로 이전 강의를 완료하면 순차적으로 열립니다.");
      return;
    }

    const player = videoRef.current;
    if (player && !player.paused) {
      player.pause();
    }
    dispatchLectureActivity(false);
    setSelectedModuleId(moduleId);
    setVideoProvider("storage");
    setVideoUrl("");
    setPlayerReady(false);
  };

  const selectedRemainingSeconds = selectedProgress.durationSeconds > 0 ? Math.max(selectedProgress.durationSeconds - selectedProgress.watchedSeconds, 0) : 0;
  const saveStateLabel = isManualSaving ? "수동 저장 중" : isBackgroundSaving ? "자동 저장 중" : "자동 저장 대기";
  const ringCircumference = 2 * Math.PI * 54;
  const ringOffset = ringCircumference * (1 - aggregate.completionRate / 100);
  const purchaseChecklistReady = purchaseNoticeAccepted;
  const legalGateOpen = !legalAccepted;
  const certificateStatus = result?.issuedCertificates.length
    ? "수료증 발급 완료"
    : "수강권 확인 후 즉시 발급 가능";

  const handleLegalGateAccept = async () => {
    setLegalAccepted(true);
    setLegalGateChecked(false);
    setStatusMessage("법적 고지 동의가 확인되었습니다. 강의실 이용을 시작할 수 있습니다.");

    if (!uidRef.current) {
      return;
    }

    try {
      const { db } = getFirebaseServices();
      await setDoc(
        doc(db, "courseProgress", `${uidRef.current}_${defaultCourse.id}`),
        {
          uid: uidRef.current,
          courseId: defaultCourse.id,
          courseTitle: defaultCourse.title,
          caseType: caseTypeRef.current,
          legalDisclaimerAccepted: true,
          legalNoticeAcceptedAt: serverTimestamp(),
          legalNoticeAcceptedDate: getTodayKey(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      setLastSavedLabel(new Date().toLocaleString("ko-KR"));
    } catch (acceptError) {
      console.error(acceptError);
      setStatusMessage("고지 동의는 현재 화면에 저장되었습니다. 서버 저장은 다음 진도 저장 때 다시 시도됩니다.");
    }
  };

  if (accessChecking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#07111f] px-4 text-white">
        <p className="rounded-xl border border-white/15 bg-white/10 px-5 py-4 text-sm font-semibold shadow-[0_18px_48px_rgba(0,0,0,0.24)]">수강권 정보를 먼저 확인하고 있습니다.</p>
      </main>
    );
  }

  if (accessBlockedMessage) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#07111f] px-4 text-white">
        <section className="max-w-md rounded-xl border border-white/15 bg-white/10 p-6 text-center shadow-[0_18px_48px_rgba(0,0,0,0.24)]">
          <h1 className="text-2xl font-black">수강권 확인이 필요합니다.</h1>
          <p className="mt-3 text-sm leading-7 text-slate-200">{accessBlockedMessage}</p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Link href="/courses/apply/?category=dui" className={buttonClass("warning", "sm", "rounded-full font-black")}>과정 선택하기</Link>
            <Link href="/courses" className={buttonClass("darkSecondary", "sm", "rounded-full focus:ring-offset-[#07111f]")}>교육과정 보기</Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[linear-gradient(145deg,#07111f_0%,#0b1930_45%,#10213f_100%)] px-3 py-4 text-white sm:px-6 lg:px-8 lg:py-8">
      <Script
        src="https://embed.cloudflarestream.com/embed/sdk.latest.js"
        strategy="afterInteractive"
        onLoad={() => setStreamSdkReady(true)}
        onError={() => setStatusMessage("강의 플레이어 스크립트를 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요.")}
      />
      <div className="pointer-events-none absolute inset-0 opacity-80">
        <div className="absolute left-[-12rem] top-[-10rem] h-[32rem] w-[32rem] rounded-full bg-indigo-600/22 blur-[110px]" />
        <div className="absolute right-[-10rem] top-[18rem] h-[30rem] w-[30rem] rounded-full bg-purple-600/20 blur-[120px]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-300/50 to-transparent" />
      </div>

      {legalGateOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#06080c]/86 px-4 backdrop-blur-xl">
          <div className="w-full max-w-2xl overflow-hidden rounded-[1.75rem] border border-white/14 bg-white/[0.08] shadow-[0_30px_120px_rgba(0,0,0,0.55)] ring-1 ring-indigo-300/12">
            <div className="border-b border-white/10 bg-[linear-gradient(135deg,rgba(79,70,229,0.28),rgba(147,51,234,0.22))] px-6 py-5 sm:px-8">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-indigo-100/80">Legal Consent Required</p>
              <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-white sm:text-3xl">수강 전 법적 고지 확인</h2>
              <p className="mt-3 text-sm leading-7 text-slate-200">이 과정은 민간 교육 서비스이며 법률 자문, 사건 결과 또는 특정 법적 효과를 보장하지 않습니다. 동의 후 강의실과 영상 재생 기능이 열립니다.</p>
            </div>
            <div className="space-y-4 px-6 py-6 sm:px-8">
              <div className="rounded-2xl border border-white/12 bg-[#06080c]/55 p-5 text-sm leading-7 text-slate-200">
                <p>{disclaimer}</p>
                <p className="mt-3">이수 확인 자료는 수강 사실을 정리하는 참고 자료이며, 제출 여부와 사용 방식은 수강자가 직접 판단해야 합니다.</p>
              </div>
              <label className="flex items-start gap-3 rounded-2xl border border-indigo-300/18 bg-indigo-300/[0.07] px-4 py-4 text-sm leading-7 text-slate-100">
                <input
                  type="checkbox"
                  checked={legalGateChecked}
                  onChange={(event) => setLegalGateChecked(event.target.checked)}
                  className="mt-1 h-4 w-4 accent-indigo-400"
                />
                <span>위 법적 고지와 민간 교육 서비스의 한계를 확인했고, 동의 후 수강을 시작합니다.</span>
              </label>
              <button
                type="button"
                disabled={!legalGateChecked}
                onClick={() => void handleLegalGateAccept()}
                className="inline-flex min-h-12 w-full cursor-pointer items-center justify-center rounded-full bg-[linear-gradient(135deg,#6366f1_0%,#a855f7_100%)] px-6 py-3 text-sm font-bold text-white shadow-[0_18px_40px_rgba(99,102,241,0.34)] transition-all hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-[#0b1220] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-[0_18px_40px_rgba(99,102,241,0.34)] disabled:active:scale-100"
              >
                동의하고 강의실 입장
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="relative mx-auto max-w-[1520px]">
        <section className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-[linear-gradient(135deg,#0a1424_0%,#0f1c33_45%,#162847_100%)] shadow-[0_30px_90px_rgba(2,6,23,0.34)] sm:rounded-[2rem]">
          <div className="grid gap-6 px-4 py-6 sm:px-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:px-10 lg:py-9">
            <div>
              <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.28em] text-[#c8d7f6]">
                <span>Reset Edu Center</span>
                <span className="rounded-full border border-white/12 bg-white/6 px-3 py-1 text-[11px] text-[#f0d59c]">온라인 학습실</span>
                {adminPreview ? <span className="rounded-full border border-slate-300/30 bg-slate-950 px-3 py-1 text-[11px] text-white">관리자 접근</span> : null}
              </div>
              <h1 className="mt-4 max-w-4xl break-keep text-2xl font-black tracking-[-0.03em] text-white sm:text-4xl sm:tracking-[-0.05em] lg:text-[2.9rem]">
                {defaultCourse.title}
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300 sm:text-[15px]">
                {defaultCourse.subtitle}. 결제 확인, 강의별 재생 이력, 전체 진도율, 발급 안내를 하나의 학습 화면에서 관리합니다.
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 lg:min-w-[360px]">
              <a
                href="/resources/reflection-guide"
                target="_blank"
                rel="noopener noreferrer"
                style={{ backgroundColor: "#facc15", color: "#111827", borderColor: "#fde047" }}
                className="inline-flex min-h-12 cursor-pointer items-center justify-center rounded-full border-2 px-6 py-3 text-center text-sm font-black shadow-[0_18px_36px_rgba(250,204,21,0.34)] ring-2 ring-amber-100/70 transition-all hover:-translate-y-0.5 hover:bg-amber-300 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-200"
              >
                반성문 가이드
              </a>
              <a
                href="/resources/dui-reflection-example"
                target="_blank"
                rel="noopener noreferrer"
                style={{ backgroundColor: "#ffffff", color: "#10213f", borderColor: "#cbd5e1" }}
                className="inline-flex min-h-12 cursor-pointer items-center justify-center rounded-full border-2 px-6 py-3 text-center text-sm font-black shadow-[0_14px_30px_rgba(15,23,42,0.22)] transition-all hover:-translate-y-0.5 hover:bg-slate-100 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/60"
              >
                반성문 예시
              </a>
              <Link
                href="/"
                className="inline-flex min-h-12 cursor-pointer items-center justify-center rounded-full border-2 border-white/60 bg-transparent px-6 py-3 text-sm font-black text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-white hover:text-slate-950 hover:shadow-lg active:scale-[0.98] focus:outline-none focus:ring-4 focus:ring-white/50"
              >
                홈으로 이동
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex min-h-12 cursor-pointer items-center justify-center rounded-full border-2 border-white/60 bg-transparent px-6 py-3 text-sm font-black text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-white hover:text-slate-950 hover:shadow-lg active:scale-[0.98] focus:outline-none focus:ring-4 focus:ring-white/50"
              >
                내 수강현황
              </Link>
            </div>
          </div>

          <div className="grid gap-3 border-t border-white/10 px-4 py-4 sm:grid-cols-2 lg:grid-cols-4 lg:px-10">
            <div className="rounded-[1.4rem] border border-white/10 bg-white/6 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">수강생</p>
              <p className="mt-2 text-lg font-semibold text-white">{fullName || "실명 확인 대기"}</p>
            </div>
            <div className="rounded-[1.4rem] border border-white/10 bg-white/6 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">총 요구 시간</p>
              <p className="mt-2 text-lg font-semibold text-white">{formatDurationOrPending(aggregate.totalDurationSeconds)}</p>
            </div>
            <div className="rounded-[1.4rem] border border-white/10 bg-white/6 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">누적 수강</p>
              <p className="mt-2 text-lg font-semibold text-white">{formatDuration(aggregate.watchedSeconds)}</p>
            </div>
            <div className="rounded-[1.4rem] border border-white/10 bg-white/6 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">발급 안내</p>
              <p className="mt-2 text-lg font-semibold text-[#f0d59c]">{certificateStatus}</p>
            </div>
          </div>
        </section>

        <section id="reflection-resources" className="mt-5 rounded-[1.5rem] border-2 border-amber-300 bg-[#fff8e6] p-5 text-slate-950 shadow-[0_20px_50px_rgba(250,204,21,0.20)] ring-2 ring-amber-100 sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-800">결제 회원 전용 자료</p>
              <h2 className="mt-2 text-xl font-black text-slate-950 sm:text-2xl">반성문 작성에 도움이 필요하신가요?</h2>
              <p className="mt-2 max-w-3xl text-sm font-semibold leading-7 text-slate-700 sm:text-base">
                결제 회원은 반성문 작성 가이드와 예시를 확인하고 인쇄하거나 PDF로 저장할 수 있습니다.
              </p>
            </div>
            <div className="grid shrink-0 gap-3 sm:grid-cols-2">
              <a
                href="/resources/reflection-guide"
                target="_blank"
                rel="noopener noreferrer"
                style={{ backgroundColor: "#173968", color: "#ffffff", borderColor: "#173968" }}
                className="inline-flex min-h-14 items-center justify-center rounded-xl border-2 px-6 py-3 text-center text-base font-black shadow-[0_14px_28px_rgba(23,57,104,0.28)] transition hover:bg-[#10213f] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-300"
              >
                반성문 작성 가이드 보기
              </a>
              <a
                href="/resources/dui-reflection-example"
                target="_blank"
                rel="noopener noreferrer"
                style={{ backgroundColor: "#facc15", color: "#111827", borderColor: "#eab308" }}
                className="inline-flex min-h-14 items-center justify-center rounded-xl border-2 px-6 py-3 text-center text-base font-black shadow-[0_14px_28px_rgba(250,204,21,0.28)] transition hover:bg-amber-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-300"
              >
                음주운전 반성문 예시 보기
              </a>
            </div>
          </div>
        </section>


        <section className="mt-5 grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
          <div className="rounded-[1.5rem] border border-white/12 bg-white/[0.08] backdrop-blur-2xl p-4 shadow-[0_18px_48px_rgba(15,23,42,0.08)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-200">전체 수강률</p>
                <p className="mt-1 text-4xl font-semibold tracking-[-0.05em] text-white">{aggregate.completionRate}%</p>
              </div>
              <div className="text-right text-sm text-slate-300">
                <p className="font-semibold text-white">{aggregate.completedModuleCount}/{aggregate.totalModuleCount}강 완료</p>
                <p className="mt-1">남은 시간 {formatDuration(aggregate.remainingSeconds)}</p>
              </div>
            </div>
            <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-[linear-gradient(90deg,#0f2a57_0%,#1d4ed8_58%,#d3b271_100%)]"
                style={{ width: `${aggregate.completionRate}%` }}
              />
            </div>
            <div className="mt-4 grid gap-2 text-center text-xs text-slate-300 sm:grid-cols-3">
              <div className="rounded-xl border border-white/12 bg-white/[0.06] px-2 py-3">
                <p className="font-semibold text-white">{formatDuration(aggregate.watchedSeconds)}</p>
                <p className="mt-1">누적 수강</p>
              </div>
              <div className="rounded-xl border border-white/12 bg-white/[0.06] px-2 py-3">
                <p className="font-semibold text-white">{formatDurationOrPending(aggregate.totalDurationSeconds)}</p>
                <p className="mt-1">총 분량</p>
              </div>
              <div className="rounded-xl border border-white/12 bg-white/[0.06] px-2 py-3">
                <p className="font-semibold text-white">{saveStateLabel}</p>
                <p className="mt-1">저장 상태</p>
              </div>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-white/12 bg-white/[0.08] backdrop-blur-2xl p-4 shadow-[0_18px_48px_rgba(15,23,42,0.08)]">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-200">강의 바로가기</p>
                <h2 className="mt-1 text-xl font-semibold tracking-[-0.03em] text-white">1강부터 5강까지 한눈에 보기</h2>
              </div>
              <span className="rounded-full border border-[#d7deea] bg-white/[0.06] px-3 py-1 text-xs font-semibold text-slate-200">현재 {selectedModule?.title.split(".")[0] ?? "선택 대기"}</span>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {defaultCourse.modules.map((module, index) => {
                const progress = moduleProgress[module.id];
                const active = module.id === selectedModuleId;
                const rate = progress?.completionRate ?? 0;
                const completed = Boolean(progress?.isCompleted);
                const locked = index > 0 && !moduleProgress[defaultCourse.modules[index - 1].id]?.isCompleted;

                return (
                  <button
                    key={module.id}
                    type="button"
                    onClick={() => handleSelectModule(module.id)}
                    disabled={locked}
                    className={`min-h-[128px] rounded-[1.15rem] border p-4 text-left transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-[#111827] ${
                      active
                        ? "cursor-pointer border-indigo-300/60 bg-indigo-500/18 shadow-[0_12px_34px_rgba(79,70,229,0.22)] hover:-translate-y-0.5 hover:shadow-[0_16px_38px_rgba(79,70,229,0.24)] active:scale-[0.98]"
                        : locked
                          ? "cursor-not-allowed border-white/8 bg-white/[0.035] opacity-55"
                          : completed
                            ? "cursor-pointer border-emerald-300/40 bg-emerald-400/10 hover:-translate-y-0.5 hover:border-emerald-300/55 hover:shadow-[0_14px_30px_rgba(16,185,129,0.16)] active:scale-[0.98]"
                            : "cursor-pointer border-white/10 bg-white/[0.06] hover:-translate-y-0.5 hover:border-indigo-300/45 hover:shadow-[0_14px_30px_rgba(79,70,229,0.14)] active:scale-[0.98]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${active ? "bg-indigo-500 text-white" : "bg-white/10 text-slate-200"}`}>
                        {locked ? "잠금" : `${index + 1}강`}
                      </span>
                      <span className={`text-xs font-semibold ${completed ? "text-emerald-300" : active ? "text-indigo-200" : "text-slate-400"}`}>
                        {locked ? "Locked" : completed ? "완료" : active ? "재생 중" : `${rate}%`}
                      </span>
                    </div>
                    <h3 className="mt-3 line-clamp-2 text-sm font-semibold leading-5 text-white">{module.title.replace(/^\d+강\.\s*/, "")}</h3>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/80 ring-1 ring-slate-200">
                      <div className="h-full rounded-full bg-[linear-gradient(90deg,#1d4ed8_0%,#d3b271_100%)]" style={{ width: `${rate}%` }} />
                    </div>
                    <p className="mt-2 text-xs text-slate-400">{formatProgressTime(progress?.watchedSeconds ?? 0, progress?.durationSeconds ?? 0)}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <div className="mt-5 grid gap-5 xl:grid-cols-[380px_minmax(0,1.9fr)]">
          <section className="space-y-6 xl:order-2">
            <section className="rounded-[1.5rem] border border-white/12 bg-white/[0.08] p-4 shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur-2xl sm:rounded-[2rem] sm:p-6 lg:p-7">
              <div className="space-y-5">
                <div className="rounded-[1.25rem] border border-white/12 bg-[linear-gradient(180deg,#091221_0%,#0d1730_100%)] shadow-[0_24px_60px_rgba(15,23,42,0.18)] sm:rounded-[1.8rem]">
                  <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 px-4 py-4 sm:px-6">
                    <div className="max-w-3xl">
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#9fbef9]">현재 재생 중인 강의</p>
                      <h2 className="mt-2 break-keep text-xl font-semibold tracking-[-0.03em] text-white sm:text-[2rem]">{selectedModule?.title}</h2>
                      <p className="mt-3 text-sm leading-7 text-slate-300">{selectedModule?.summary}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full border border-white/10 bg-white/8 px-4 py-2 text-xs font-medium text-slate-200">
                        영상 시간 {formatDurationOrPending(selectedProgress.durationSeconds)}
                      </span>
                      <span className="rounded-full border border-[#d3b271]/35 bg-[#d3b271]/12 px-4 py-2 text-xs font-semibold text-[#f3ddb2]">
                        {selectedProgress.completionRate}% 진행
                      </span>
                      <span className="rounded-full border border-white/10 bg-white/8 px-4 py-2 text-xs font-medium text-slate-200">
                        {saveStateLabel}
                      </span>
                    </div>
                  </div>

                  <div className="relative bg-black">
                    <div className="aspect-video w-full">
                      {accessChecking ? (
                        <div className="flex h-full items-center justify-center px-4 text-center text-sm leading-7 text-slate-300">수강권 정보를 확인하고 있습니다.</div>
                      ) : accessBlockedMessage ? (
                        <div className="flex h-full items-center justify-center px-8 text-center text-sm leading-7 text-slate-300">
                          <div>
                            <p className="font-semibold text-white">{accessBlockedMessage}</p>
                            <div className="mt-4 flex flex-wrap justify-center gap-2">
                              <Link href="/courses/apply/?category=dui" className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700">수강 신청하기</Link>
                              <Link href="/courses/dui-prevention" className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50">강의 구성 보기</Link>
                            </div>
                          </div>
                        </div>
                      ) : videoUrl ? (
                        videoProvider === "cloudflare-stream" ? (
                          <iframe
                            ref={streamIframeRef}
                            key={`${selectedModuleId}:${videoUrl}`}
                            src={videoUrl}
                            title={selectedModule?.title ?? "강의 영상"}
                            className="h-full w-full border-0"
                            allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
                            allowFullScreen
                            onLoad={() => {
                              setPlayerReady(true);
                              setStatusMessage(`${selectedModule?.title ?? "선택한 강의"} Cloudflare Stream 재생 준비가 완료되었습니다.`);
                            }}
                          />
                        ) : (
                          <video
                            ref={videoRef}
                            key={`${selectedModuleId}:${videoUrl}`}
                            src={videoUrl}
                            className="h-full w-full"
                            controls
                            controlsList="nodownload noplaybackrate"
                            disablePictureInPicture
                            playsInline
                            preload="metadata"
                            onLoadedMetadata={handleLoadedMetadata}
                            onPlay={handlePlay}
                            onTimeUpdate={handleTimeUpdate}
                            onPause={handlePause}
                            onEnded={handleEnded}
                            onContextMenu={(event) => event.preventDefault()}
                          />
                        )
                      ) : (
                        <div className="flex h-full items-center justify-center px-8 text-center text-sm leading-7 text-slate-300">
                          {isVideoLoading ? "선택한 강의 영상을 불러오는 중입니다..." : "강의 영상은 수강권을 구매 후 이용하실 수 있습니다. 결제 후에도 이 문구가 보이면 고객센터로 문의해 주세요."}
                        </div>
                      )}
                    </div>

                    <div className="pointer-events-none absolute bottom-4 left-4">
                      <div className="rounded-full border border-white/10 bg-[#09182c]/90 px-4 py-2 text-xs font-medium text-slate-200 shadow-[0_10px_24px_rgba(2,6,23,0.28)] backdrop-blur">
                        현재 {formatProgressTime(selectedProgress.lastPlaybackPositionSeconds, selectedProgress.durationSeconds)}
                      </div>
                    </div>
                  </div>

                  {resumeToast ? (
                    <div className="border-t border-white/10 bg-emerald-400/10 px-5 py-3 text-sm font-semibold text-emerald-100 sm:px-6">
                      {resumeToast}
                    </div>
                  ) : null}

                  {resumePromptVisible ? (
                    <div className="border-t border-white/10 bg-[#0b1528] px-5 py-4 sm:px-6">
                      <div className="flex flex-col gap-4 rounded-[1.25rem] border border-indigo-300/25 bg-indigo-400/10 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="keep-korean text-sm leading-7 text-indigo-50">
                          <p className="font-bold text-white">이전에 보던 위치부터 이어서 수강할 수 있습니다.</p>
                          <p className="mt-1 text-indigo-100">이전에 {formatDuration(selectedProgress.lastPlaybackPositionSeconds)}까지 시청했습니다. 진도는 자동으로 저장됩니다.</p>
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <button
                            type="button"
                            onClick={handleResumeFromSavedPosition}
                            className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full bg-indigo-500 px-5 py-2 text-sm font-bold text-white transition hover:bg-indigo-400 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:ring-offset-2 focus:ring-offset-[#0b1528]"
                          >
                            이어보기
                          </button>
                          <button
                            type="button"
                            onClick={handleRestartCurrentLesson}
                            className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full border-2 border-slate-200 bg-white px-5 py-2 text-sm font-bold text-slate-950 shadow-sm transition hover:bg-slate-100 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:ring-offset-2 focus:ring-offset-[#0b1528]"
                          >
                            처음부터 보기
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  <div className="grid gap-3 border-t border-white/10 bg-[linear-gradient(180deg,rgba(10,19,36,0.94),rgba(13,25,47,0.98))] px-5 py-5 sm:grid-cols-2 xl:grid-cols-4 sm:px-6">
                    <div className="rounded-[1.25rem] border border-white/10 bg-white/6 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">현재 / 전체</p>
                      <p className="mt-2 text-lg font-semibold text-white">{formatProgressTime(selectedProgress.lastPlaybackPositionSeconds, selectedProgress.durationSeconds)}</p>
                    </div>
                    <div className="rounded-[1.25rem] border border-white/10 bg-white/6 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">들은 시간</p>
                      <p className="mt-2 text-lg font-semibold text-white">{formatDuration(selectedProgress.watchedSeconds)}</p>
                    </div>
                    <div className="rounded-[1.25rem] border border-white/10 bg-white/6 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">강의 진도</p>
                      <p className="mt-2 text-lg font-semibold text-white">{selectedProgress.completionRate}%</p>
                    </div>
                    <div className="rounded-[1.25rem] border border-white/10 bg-white/6 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">남은 시간</p>
                      <p className="mt-2 text-lg font-semibold text-white">{selectedProgress.durationSeconds > 0 ? formatDuration(selectedRemainingSeconds) : "영상 로딩 후 표시"}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-[1.6rem] border border-white/12 bg-white/[0.08] p-5 shadow-[0_14px_28px_rgba(15,23,42,0.05)]">
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <button
                        type="button"
                        onClick={() => handleMoveAdjacentLesson(previousModule?.id)}
                        disabled={!previousModule}
                        className="inline-flex min-h-12 cursor-pointer items-center justify-center rounded-full border-2 border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-950 shadow-sm transition hover:bg-slate-100 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-[#111827] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
                      >
                        이전 강의
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveAdjacentLesson(nextModule?.id)}
                        disabled={!nextModule || !selectedProgress.isCompleted}
                        className="inline-flex min-h-12 cursor-pointer items-center justify-center rounded-full border-2 border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-950 shadow-sm transition hover:bg-slate-100 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-[#111827] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
                      >
                        다음 강의
                      </button>
                      <button
                        type="button"
                        onClick={() => void persistProgress("manual")}
                        disabled={isManualSaving || !playerReady}
                        className={buttonClass("primary", "md", "rounded-full px-5 font-bold focus:ring-offset-[#111827] disabled:opacity-100")}
                      >
                        {isManualSaving ? "저장 중..." : "현재 학습 저장"}
                      </button>
                        <Link
                          href="/certificate"
                          className={buttonClass("darkSecondary", "md", "rounded-full px-5 font-bold !text-black hover:!text-black focus:ring-offset-[#111827]")}
                        >
                          수료증 발급
                        </Link>
                        <Link
                          href="/certificate?print=1"
                          className={buttonClass("warning", "md", "rounded-full px-5 font-black !text-black hover:!text-black shadow-[0_18px_36px_rgba(250,204,21,0.30)] ring-2 ring-amber-100/70 focus:ring-offset-[#111827]")}
                        >
                          바로 인쇄
                        </Link>
                    </div>
                    <div className="mt-4 rounded-[1.25rem] border border-white/12 bg-[#06080c]/45 px-4 py-4 text-sm leading-7 text-slate-300">
                      <p className="font-semibold text-slate-100">운영 상태</p>
                      <p className="mt-2">{statusMessage}</p>
                      {progressSyncNotice ? <p className="mt-2 text-xs font-semibold text-amber-200">{progressSyncNotice}</p> : null}
                      <p className="mt-3 text-xs text-slate-400">마지막 저장 시각 {lastSavedLabel}</p>
                    </div>
                  </div>
              </div>
            </section>

          </section>

          <aside className="flex flex-col gap-6 xl:order-1 xl:sticky xl:top-6 xl:self-start">
            <section className="overflow-hidden rounded-[2rem] border border-white/12 bg-white/[0.08] backdrop-blur-2xl shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
              <div className="bg-[linear-gradient(135deg,#6b4f1d_0%,#8a6a2d_100%)] px-4 py-4 text-white sm:px-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#f6e1b1]">Order Summary</p>
                    <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em]">결제 전 주문 확인</h2>
                    <p className="mt-1.5 text-xs leading-5 text-white/75">결제 전 필요한 확인 사항을 먼저 검토할 수 있습니다.</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${purchaseChecklistReady ? "bg-[#f3ddb2] text-[#3d2b08]" : "bg-white/12 text-white"}`}>
                    {purchaseChecklistReady ? "확인 완료" : "확인 필요"}
                  </span>
                </div>
              </div>

              <div className="space-y-4 p-4 sm:p-5">
                <div className="rounded-[1.3rem] border border-white/12 bg-white/[0.06] p-4 text-sm leading-7 text-slate-200">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-amber-200">주문 과정</p>
                      <p className="mt-2 font-semibold text-slate-100">{defaultCourse.title}</p>
                    </div>
                    <span className="rounded-full border border-amber-300 bg-amber-300 px-3 py-1 text-xs font-black text-slate-950">
                      {defaultCourse.priceLabel}
                    </span>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-[#eadfcb] bg-white/[0.06] px-3.5 py-3">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-400">제공 내용</p>
                      <p className="mt-1.5 text-slate-100">온라인 강의 {defaultCourse.modules.length}강, 학습확인 자료 안내</p>
                    </div>
                    <div className="rounded-xl border border-[#eadfcb] bg-white/[0.06] px-3.5 py-3">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-400">수강 유효기간</p>
                      <p className="mt-1.5 text-slate-100">{defaultCourse.accessValidLabel}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="flex items-start gap-3 rounded-[1.2rem] border border-white/12 bg-white/[0.06] px-4 py-4 text-sm leading-7 text-slate-200">
                    <input
                      type="checkbox"
                      checked={purchaseNoticeAccepted}
                      onChange={(event) => setPurchaseNoticeAccepted(event.target.checked)}
                      className="mt-1 h-4 w-4 accent-[#8a6a2d]"
                    />
                    <span className="font-semibold text-slate-100">결제 전 안내와 수료 문서 즉시 발급 내용을 확인했습니다.</span>
                  </label>
                </div>

                {purchaseChecklistReady ? (
                  <Link
                    href="/courses/apply/?category=dui"
                    className="inline-flex min-h-12 w-full cursor-pointer items-center justify-center rounded-full bg-[linear-gradient(135deg,#8a6a2d_0%,#d3ad62_100%)] px-5 py-3 text-sm font-bold text-[#1a140b] shadow-[0_14px_28px_rgba(138,106,45,0.18)] transition-all hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-[#111827]"
                  >
                    주문서로 이동
                  </Link>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[linear-gradient(135deg,#8a6a2d_0%,#d3ad62_100%)] px-5 py-3 text-sm font-bold text-[#1a140b] shadow-[0_14px_28px_rgba(138,106,45,0.18)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    필수 확인 후 주문서 이동
                  </button>
                )}
              </div>
            </section>

            <section className="overflow-hidden rounded-[2rem] border border-white/12 bg-white/[0.08] backdrop-blur-2xl shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
              <div className="bg-[linear-gradient(135deg,#0d172a_0%,#132341_100%)] px-4 py-4 text-white sm:px-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#98b8f7]">Course Progress</p>
                    <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em]">전체 수강률</h2>
                    <p className="mt-1.5 text-xs leading-5 text-slate-300">핵심 진행 지표만 간결하게 확인합니다.</p>
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-xs font-semibold text-[#f0d59c]">
                    {aggregate.completedModuleCount}/{aggregate.totalModuleCount} 완료
                  </span>
                </div>
              </div>

              <div className="p-3.5 sm:p-4">
                <div className="grid gap-3">
                  <div className="grid gap-2.5 rounded-[1.2rem] border border-white/12 bg-[linear-gradient(180deg,#f8fafc_0%,#f3f6fa_100%)] p-3">
                    <div className="mx-auto relative flex h-24 w-24 items-center justify-center">
                      <svg viewBox="0 0 140 140" className="h-24 w-24 -rotate-90">
                        <circle cx="70" cy="70" r="54" fill="none" stroke="#d8e2ef" strokeWidth="10" />
                        <circle
                          cx="70"
                          cy="70"
                          r="54"
                          fill="none"
                          stroke="url(#course-progress-ring)"
                          strokeWidth="12"
                          strokeLinecap="round"
                          strokeDasharray={ringCircumference}
                          strokeDashoffset={ringOffset}
                        />
                        <defs>
                          <linearGradient id="course-progress-ring" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#0f2a57" />
                            <stop offset="55%" stopColor="#1d4ed8" />
                            <stop offset="100%" stopColor="#d3b271" />
                          </linearGradient>
                        </defs>
                      </svg>
                      <div className="pointer-events-none absolute text-center">
                        <p className="text-xl font-black tracking-[-0.04em] text-slate-950">{aggregate.completionRate}%</p>
                        <p className="mt-0.5 text-[10px] font-bold text-slate-500">전체 진도율</p>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-xs text-slate-600">
                        <span>과정 진행률</span>
                        <span className="font-black text-slate-950">{aggregate.completionRate}%</span>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-300">
                        <div
                          className="h-full rounded-full bg-[linear-gradient(90deg,#0f2a57_0%,#1d4ed8_58%,#d3b271_100%)]"
                          style={{ width: `${aggregate.completionRate}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-[1.15rem] border border-white/12 bg-white/[0.06] px-3.5 py-3.5">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">총 요구 교육 시간</p>
                      <p className="mt-1.5 text-base font-semibold text-white">{formatDurationOrPending(aggregate.totalDurationSeconds)}</p>
                    </div>
                    <div className="rounded-[1.15rem] border border-white/12 bg-white/[0.06] px-3.5 py-3.5">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">현재 누적 수강 시간</p>
                      <p className="mt-1.5 text-base font-semibold text-white">{formatDuration(aggregate.watchedSeconds)}</p>
                    </div>
                    <div className="rounded-[1.15rem] border border-white/12 bg-white/[0.06] px-3.5 py-3.5">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">남은 시간</p>
                      <p className="mt-1.5 text-base font-semibold text-white">{formatDuration(aggregate.remainingSeconds)}</p>
                    </div>
                    <div className="rounded-[1.15rem] border border-white/12 bg-white/[0.06] px-3.5 py-3.5">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">서류 발급 상태</p>
                      <p className="mt-1.5 text-base font-semibold text-white">{certificateStatus}</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-[2rem] border border-white/12 bg-white/[0.08] backdrop-blur-2xl p-5 shadow-[0_20px_55px_rgba(15,23,42,0.07)] sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#274690]">Completion Assets</p>
              <h3 className="mt-2 text-xl font-semibold text-white">수강 즉시 출력 자료</h3>
              <div className="mt-4 space-y-3 rounded-[1.5rem] border-2 border-sky-300 bg-sky-50 p-4 shadow-[0_18px_44px_rgba(14,165,233,0.20)]">
                <p className="text-sm font-black text-sky-950">재발방지 관련 3종 서식</p>
                <p className="text-sm leading-6 text-sky-900">{hasDocumentFormsAccess ? "서식을 열어 인쇄하거나 PDF로 저장할 수 있습니다." : "서식 포함 수강권을 선택하면 이용할 수 있습니다."}</p>
                {preventionDocuments.map((document) => (
                  <Link
                    key={document.id}
                    href={hasDocumentFormsAccess ? `/prevention-documents?type=${document.id}` : "/courses/apply/?category=dui&productId=dui-documents"}
                    className="flex min-h-16 items-center justify-between gap-4 rounded-[1.15rem] border-2 border-[#10213f] bg-[#10213f] px-4 py-4 text-sm font-black !text-white shadow-[0_12px_28px_rgba(16,33,63,0.24)] transition hover:-translate-y-0.5 hover:bg-[#1d3d6f] hover:!text-white hover:shadow-lg"
                  >
                    <span>{document.title}</span>
                    <span className="shrink-0 rounded-full border border-white/30 bg-white/10 px-3 py-1.5 text-xs font-black !text-white">{hasDocumentFormsAccess ? "인쇄 · PDF 저장" : "서식 포함 수강권"}</span>
                  </Link>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
