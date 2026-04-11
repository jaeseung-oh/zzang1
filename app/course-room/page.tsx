"use client";

import { doc, getDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { defaultCourse } from "@/lib/course/catalog";
import { getFirebaseServices } from "@/lib/firebase/client";
import { requireAuthenticatedUser } from "@/lib/firebase/session";
import { getUserProfile } from "@/lib/firebase/user-profile";

type SaveCourseProgressResponse = {
  progressId: string;
  completionRate: number;
  isCompleted: boolean;
  paymentVerified: boolean;
  certificateEligible: boolean;
  issuedCertificates: Array<{
    certificateId: string;
    documentType: string;
    downloadUrl: string;
    issueNumber: string;
  }>;
};

type GetCourseVideoAccessResponse = {
  videoUrl: string;
  expiresAt: number;
  durationHintSeconds: number;
};

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
  reviewAccepted: boolean;
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

const localStorageKey = `course-room-progress:${defaultCourse.id}`;

const lectureActivityEvent = "resetedu:lecture-activity";

function dispatchLectureActivity(active: boolean) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent(lectureActivityEvent, { detail: { active } }));
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

function buildEmptyModuleProgress() {
  return Object.fromEntries(
    defaultCourse.modules.map((module) => [
      module.id,
      {
        watchedSeconds: 0,
        durationSeconds: module.minutes * 60,
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
      isCompleted: completionRate >= 100,
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
  const [reviewAccepted, setReviewAccepted] = useState(false);
  const [statusMessage, setStatusMessage] = useState("6강 수강 세션과 저장 상태를 준비하는 중입니다.");
  const [error, setError] = useState("");
  const [result, setResult] = useState<SaveCourseProgressResponse | null>(null);
  const [lastSavedLabel, setLastSavedLabel] = useState("저장 대기 중");
  const [playerReady, setPlayerReady] = useState(false);
  const [playerError, setPlayerError] = useState("");
  const [isManualSaving, setIsManualSaving] = useState(false);
  const [isBackgroundSaving, setIsBackgroundSaving] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [videoExpiresAt, setVideoExpiresAt] = useState<number | null>(null);
  const [isVideoLoading, setIsVideoLoading] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const saveInFlightRef = useRef(false);
  const restoreAppliedRef = useRef(false);
  const refreshTimeoutRef = useRef<number | null>(null);
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
    selectedModuleIdRef.current = selectedModuleId;
  }, [selectedModuleId]);

  useEffect(() => {
    moduleProgressRef.current = moduleProgress;
  }, [moduleProgress]);

  const aggregate = useMemo(() => {
    const totalDurationSeconds = defaultCourse.modules.reduce(
      (sum, module) => sum + (moduleProgress[module.id]?.durationSeconds ?? module.minutes * 60),
      0
    );
    const watchedSeconds = defaultCourse.modules.reduce(
      (sum, module) => sum + (moduleProgress[module.id]?.watchedSeconds ?? 0),
      0
    );
    const completedModuleCount = defaultCourse.modules.filter((module) => moduleProgress[module.id]?.isCompleted).length;
    const completionRate = Math.floor((watchedSeconds / Math.max(totalDurationSeconds, 1)) * 100);
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

  const selectedProgress = moduleProgress[selectedModuleId] ?? buildEmptyModuleProgress()[selectedModuleId];

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
        const progressSnapshot = await getDoc(doc(db, "courseProgress", `${user.uid}_${defaultCourse.id}`));
        const remote = progressSnapshot.exists() ? (progressSnapshot.data() as ProgressRecord) : null;
        const local = readLocalSnapshot();
        const mergedProgress = mergeModuleProgress(buildEmptyModuleProgress(), remote?.moduleProgress, local?.moduleProgress);
        const initialModuleId = remote?.moduleProgress?.[selectedModuleId]?.lastPlaybackPositionSeconds
          ? selectedModuleId
          : local?.selectedModuleId ?? defaultCourse.modules[0]?.id ?? "";

        setModuleProgress(mergedProgress);
        setSelectedModuleId(initialModuleId);
        setCaseType(remote?.caseType ?? local?.caseType ?? "dui");
        setLegalAccepted(Boolean(remote?.legalDisclaimerAccepted ?? local?.legalAccepted ?? false));
        setReviewAccepted(Boolean(remote?.userReviewAccepted ?? local?.reviewAccepted ?? false));
        setLastSavedLabel(remote?.updatedAt ? formatTimestamp(remote.updatedAt) : local?.savedAt ?? "저장 대기 중");
        setStatusMessage(
          remote?.moduleProgress || local?.moduleProgress
            ? "이전 학습 기록을 불러왔습니다. 원하는 강의를 선택해 이어서 수강할 수 있습니다."
            : "실명이 확인되었습니다. 6강 강의실에서 강의별 진도와 전체 누적 수강률을 저장할 수 있습니다."
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
        reviewAccepted,
        moduleProgress,
        savedAt: new Date().toLocaleString("ko-KR"),
      } satisfies StoredPlaybackSnapshot)
    );
  }, [caseType, selectedModuleId, legalAccepted, reviewAccepted, moduleProgress]);

  useEffect(() => {
    return () => {
      dispatchLectureActivity(false);
    };
  }, []);

  useEffect(() => {
    if (!uid || !selectedModule) {
      return;
    }

    let cancelled = false;

    const loadVideo = async () => {
      try {
        setIsVideoLoading(true);
        setPlayerError("");
        setPlayerReady(false);
        restoreAppliedRef.current = false;

        const { functions } = getFirebaseServices();
        const callable = httpsCallable<{ courseId: string; moduleId: string }, GetCourseVideoAccessResponse>(functions, "getCourseVideoAccess");
        const response = await callable({ courseId: defaultCourse.id, moduleId: selectedModule.id });

        if (cancelled) {
          return;
        }

        setVideoUrl(response.data.videoUrl);
        setVideoExpiresAt(response.data.expiresAt);
        setModuleProgress((prev) => ({
          ...prev,
          [selectedModule.id]: {
            ...prev[selectedModule.id],
            durationSeconds: Math.max(prev[selectedModule.id]?.durationSeconds ?? 0, response.data.durationHintSeconds || 0),
          },
        }));
        setStatusMessage(`${selectedModule.title} 재생 준비가 완료되었습니다. 강의별 진도와 전체 누적 수강률이 함께 저장됩니다.`);
      } catch (videoLoadError) {
        console.error(videoLoadError);
        if (!cancelled) {
          const message = videoLoadError instanceof Error ? videoLoadError.message : "강의 영상을 불러오지 못했습니다.";
          setPlayerError(message);
          setStatusMessage(message);
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
  }, [uid, selectedModule]);

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
          const { functions } = getFirebaseServices();
          const callable = httpsCallable<{ courseId: string; moduleId: string }, GetCourseVideoAccessResponse>(functions, "getCourseVideoAccess");
          const response = await callable({ courseId: defaultCourse.id, moduleId: selectedModule.id });
          setVideoUrl(response.data.videoUrl);
          setVideoExpiresAt(response.data.expiresAt);
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
      (sum, module) => sum + (moduleProgressRef.current[module.id]?.durationSeconds ?? module.minutes * 60),
      0
    );
    const totalWatchedSeconds = defaultCourse.modules.reduce(
      (sum, module) => sum + (moduleProgressRef.current[module.id]?.watchedSeconds ?? 0),
      0
    );
    const completionRate = Math.floor((totalWatchedSeconds / Math.max(totalDurationSeconds, 1)) * 100);
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

      if (response.data.issuedCertificates.length) {
        setStatusMessage("수강 정보가 저장되었고 결제 및 필수 동의가 확인되어 수료 문서가 준비되었습니다.");
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
      if (mode === "manual") {
        setError(message);
      } else {
        setStatusMessage(`자동 저장 대기 중: ${message}`);
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
          isCompleted: completionRate >= 100,
        },
      };
    });
  }

  const handleLoadedMetadata = () => {
    const player = videoRef.current;
    if (!player || !selectedModule) {
      return;
    }

    const actualDuration = Math.max(Math.round(player.duration || 0), selectedProgress.durationSeconds, selectedModule.minutes * 60, 1);
    updateSelectedModuleProgress({ durationSeconds: actualDuration });
    setPlayerReady(true);

    if (!restoreAppliedRef.current) {
      restoreAppliedRef.current = true;
      player.currentTime = Math.min(selectedProgress.lastPlaybackPositionSeconds, actualDuration);
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

    const player = videoRef.current;
    if (player && !player.paused) {
      player.pause();
    }
    dispatchLectureActivity(false);
    setSelectedModuleId(moduleId);
    setVideoUrl("");
    setPlayerReady(false);
  };

  const handleDownloadHandout = () => {
    setStatusMessage(`${selectedModule?.title ?? "선택 강의"} 교안은 관리자 업로드 후 다운로드할 수 있도록 연결됩니다.`);
  };

  const selectedRemainingSeconds = Math.max(selectedProgress.durationSeconds - selectedProgress.watchedSeconds, 0);
  const saveStateLabel = isManualSaving ? "수동 저장 중" : isBackgroundSaving ? "자동 저장 중" : "자동 저장 대기";
  const ringCircumference = 2 * Math.PI * 54;
  const ringOffset = ringCircumference * (1 - aggregate.completionRate / 100);
  const certificateStatus = result?.issuedCertificates.length
    ? "수료 문서 안내 확인"
    : aggregate.isCompleted
      ? "결제 및 필수 동의 확인 후 발급"
      : "강의 수강 시 발급 안내";

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(198,168,106,0.14),transparent_20%),linear-gradient(180deg,#08101c_0%,#0c1524_16%,#e8edf4_16%,#edf2f7_100%)] px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-[1520px]">
        <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,#0a1424_0%,#0f1c33_45%,#162847_100%)] shadow-[0_30px_90px_rgba(2,6,23,0.34)]">
          <div className="grid gap-8 px-6 py-7 sm:px-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:px-10 lg:py-9">
            <div>
              <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.28em] text-[#c8d7f6]">
                <span>Reset Edu Center</span>
                <span className="rounded-full border border-white/12 bg-white/6 px-3 py-1 text-[11px] text-[#f0d59c]">Premium LMS</span>
              </div>
              <h1 className="mt-4 max-w-4xl text-3xl font-semibold tracking-[-0.05em] text-white sm:text-4xl lg:text-[2.9rem]">
                {defaultCourse.title}
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300 sm:text-[15px]">
                {defaultCourse.subtitle}. 결제 확인, 강의별 재생 이력, 전체 진도율, 발급 안내를 하나의 학습 화면에서 관리합니다.
              </p>
            </div>

            <div className="flex flex-col items-stretch gap-3 sm:flex-row lg:flex-col lg:items-end">
              <Link
                href="/"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#d7e2ef] bg-[rgba(248,251,255,0.96)] px-6 py-3 text-sm font-bold text-[#10213f] shadow-[0_14px_28px_rgba(2,6,23,0.16)] backdrop-blur transition hover:-translate-y-0.5 hover:border-[#c4d3e6] hover:bg-white"
              >
                홈으로 이동
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#d7e2ef] bg-[rgba(248,251,255,0.96)] px-6 py-3 text-sm font-bold text-[#10213f] shadow-[0_14px_28px_rgba(2,6,23,0.16)] backdrop-blur transition hover:-translate-y-0.5 hover:border-[#c4d3e6] hover:bg-white"
              >
                내 수강현황
              </Link>
              <Link
                href="/certificate"
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-[linear-gradient(135deg,#c6a86a_0%,#ecd7ac_100%)] px-6 py-3 text-sm font-bold text-[#17120b] shadow-[0_16px_30px_rgba(198,168,106,0.28)] transition hover:-translate-y-0.5"
              >
                수료 문서 확인
              </Link>
            </div>
          </div>

          <div className="grid gap-4 border-t border-white/10 px-6 py-5 sm:grid-cols-2 lg:grid-cols-4 lg:px-10">
            <div className="rounded-[1.4rem] border border-white/10 bg-white/6 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">수강생</p>
              <p className="mt-2 text-lg font-semibold text-white">{fullName || "실명 확인 대기"}</p>
            </div>
            <div className="rounded-[1.4rem] border border-white/10 bg-white/6 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">총 요구 시간</p>
              <p className="mt-2 text-lg font-semibold text-white">{formatDuration(aggregate.totalDurationSeconds)}</p>
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

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.9fr)_380px]">
          <section className="space-y-6">
            <section className="rounded-[2rem] border border-[#d7deea] bg-white p-5 shadow-[0_24px_60px_rgba(15,23,42,0.08)] sm:p-6 lg:p-7">
              <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_340px]">
                <div className="rounded-[1.8rem] border border-[#d9e2ee] bg-[linear-gradient(180deg,#091221_0%,#0d1730_100%)] shadow-[0_24px_60px_rgba(15,23,42,0.18)]">
                  <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 px-5 py-4 sm:px-6">
                    <div className="max-w-3xl">
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#9fbef9]">현재 재생 중인 강의</p>
                      <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-white sm:text-[2rem]">{selectedModule?.title}</h2>
                      <p className="mt-3 text-sm leading-7 text-slate-300">{selectedModule?.summary}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
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
                      {videoUrl ? (
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
                      ) : (
                        <div className="flex h-full items-center justify-center px-8 text-center text-sm leading-7 text-slate-300">
                          {isVideoLoading ? "선택한 강의 영상을 불러오는 중입니다..." : "선택한 강의 영상이 아직 준비되지 않았습니다."}
                        </div>
                      )}
                    </div>

                    <div className="pointer-events-none absolute bottom-4 left-4">
                      <div className="rounded-full border border-white/10 bg-[#09182c]/90 px-4 py-2 text-xs font-medium text-slate-200 shadow-[0_10px_24px_rgba(2,6,23,0.28)] backdrop-blur">
                        마지막 위치 {formatDuration(selectedProgress.lastPlaybackPositionSeconds)}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 border-t border-white/10 bg-[linear-gradient(180deg,rgba(10,19,36,0.94),rgba(13,25,47,0.98))] px-5 py-5 sm:grid-cols-2 xl:grid-cols-4 sm:px-6">
                    <div className="rounded-[1.25rem] border border-white/10 bg-white/6 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">현재 위치</p>
                      <p className="mt-2 text-lg font-semibold text-white">{formatDuration(selectedProgress.lastPlaybackPositionSeconds)}</p>
                    </div>
                    <div className="rounded-[1.25rem] border border-white/10 bg-white/6 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">누적 시청</p>
                      <p className="mt-2 text-lg font-semibold text-white">{formatDuration(selectedProgress.watchedSeconds)}</p>
                    </div>
                    <div className="rounded-[1.25rem] border border-white/10 bg-white/6 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">강의 진도</p>
                      <p className="mt-2 text-lg font-semibold text-white">{selectedProgress.completionRate}%</p>
                    </div>
                    <div className="rounded-[1.25rem] border border-white/10 bg-white/6 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">남은 시간</p>
                      <p className="mt-2 text-lg font-semibold text-white">{formatDuration(selectedRemainingSeconds)}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-5">
                  <div className="rounded-[1.6rem] border border-[#dae2ef] bg-[linear-gradient(180deg,#f9fbfe_0%,#f2f6fb_100%)] p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#274690]">Lecture Summary</p>
                    <h3 className="mt-3 text-xl font-semibold text-[#0f172a]">강의 개요와 학습 정보</h3>
                    <div className="mt-5 space-y-4 text-sm leading-7 text-slate-600">
                      <div className="rounded-[1.2rem] border border-[#e2e8f0] bg-white px-4 py-4">
                        <p className="text-xs uppercase tracking-[0.16em] text-slate-500">교육 카테고리</p>
                        <p className="mt-2 font-semibold text-slate-900">{caseTypeOptions.find((option) => option.value === caseType)?.label ?? "음주운전"} 재발 방지 전문 과정</p>
                      </div>
                      <div className="rounded-[1.2rem] border border-[#e2e8f0] bg-white px-4 py-4">
                        <p className="text-xs uppercase tracking-[0.16em] text-slate-500">강사 및 운영</p>
                        <p className="mt-2 font-semibold text-slate-900">리셋 에듀센터 전문교육팀</p>
                        <p className="mt-1 text-slate-600">실무형 예방교육 커리큘럼과 수료 연동형 LMS 운영 기준을 따릅니다.</p>
                      </div>
                      <div className="rounded-[1.2rem] border border-[#e2e8f0] bg-white px-4 py-4">
                        <p className="text-xs uppercase tracking-[0.16em] text-slate-500">학습 메모</p>
                        <p className="mt-2 text-slate-700">재생 일시정지, 강의 종료, 10초 간격 자동 저장으로 이어보기와 수료 판정이 함께 관리됩니다.</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[1.6rem] border border-[#dae2ef] bg-white p-5 shadow-[0_14px_28px_rgba(15,23,42,0.05)]">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => void persistProgress("manual")}
                        disabled={isManualSaving || !playerReady}
                        className="inline-flex min-h-12 items-center justify-center rounded-full bg-[linear-gradient(135deg,#0d1b2f_0%,#1f3556_100%)] px-5 py-3 text-sm font-bold text-white shadow-[0_14px_28px_rgba(15,23,42,0.18)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-55"
                      >
                        {isManualSaving ? "저장 중..." : "현재 학습 저장"}
                      </button>
                      <button
                        type="button"
                        onClick={handleDownloadHandout}
                        className="inline-flex min-h-12 items-center justify-center rounded-full bg-[linear-gradient(135deg,#c6a86a_0%,#edd8ab_100%)] px-5 py-3 text-sm font-bold text-[#1a140b] shadow-[0_14px_28px_rgba(198,168,106,0.22)] transition hover:-translate-y-0.5"
                      >
                        교안 다운로드
                      </button>
                    </div>
                    <div className="mt-4 rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-600">
                      <p className="font-semibold text-slate-900">운영 상태</p>
                      <p className="mt-2">{statusMessage}</p>
                      <p className="mt-3 text-xs text-slate-500">마지막 저장 시각 {lastSavedLabel}</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-[2rem] border border-[#d7deea] bg-white p-5 shadow-[0_20px_55px_rgba(15,23,42,0.07)] sm:p-6 lg:p-7">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#274690]">Compliance & Enrollment</p>
                  <h3 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[#0f172a]">수료 연동 필수 설정</h3>
                  <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
                    필수 동의와 사건 유형 설정은 수료 문서 발급, 진행 저장, 추후 문서 연동 상태에 직접 반영됩니다.
                  </p>
                </div>
                <div className="rounded-full border border-[#d8dfeb] bg-[#f6f8fb] px-4 py-2 text-sm font-semibold text-slate-700">
                  UID {uid ? `${uid.slice(0, 10)}...` : "세션 준비 중"}
                </div>
              </div>

              <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_340px]">
                <div className="space-y-4">
                  <label className="flex items-start gap-3 rounded-[1.35rem] border border-[#dce4ef] bg-[#f9fbfd] px-4 py-4 text-sm leading-7 text-slate-700">
                    <input
                      type="checkbox"
                      checked={legalAccepted}
                      onChange={(event) => setLegalAccepted(event.target.checked)}
                      className="mt-1 h-4 w-4 accent-[#1f4db8]"
                    />
                    <span>{disclaimer}</span>
                  </label>
                  <label className="flex items-start gap-3 rounded-[1.35rem] border border-[#dce4ef] bg-[#f9fbfd] px-4 py-4 text-sm leading-7 text-slate-700">
                    <input
                      type="checkbox"
                      checked={reviewAccepted}
                      onChange={(event) => setReviewAccepted(event.target.checked)}
                      className="mt-1 h-4 w-4 accent-[#1f4db8]"
                    />
                    <span>발급 문서와 AI 초안은 사용자가 직접 사실관계를 확인하고 최종 수정한 뒤 사용해야 함을 이해했습니다.</span>
                  </label>
                </div>

                <div className="rounded-[1.6rem] border border-[#dce4ef] bg-[linear-gradient(180deg,#0f1c33_0%,#132544_100%)] p-5 text-white shadow-[0_20px_40px_rgba(15,23,42,0.16)]">
                  <label className="block text-sm">
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9cbef6]">사건 유형</span>
                    <select
                      value={caseType}
                      onChange={(event) => setCaseType(event.target.value as CaseType)}
                      className="mt-3 w-full rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-white outline-none transition focus:border-[#d3b271]"
                    >
                      {caseTypeOptions.map((option) => (
                        <option key={option.value} value={option.value} className="text-slate-900">
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="mt-5 rounded-[1.25rem] border border-white/10 bg-white/7 px-4 py-4 text-sm leading-7 text-slate-200">
                    <p className="font-semibold text-white">수료 문서 안내</p>
                    <p className="mt-2">{certificateStatus}</p>
                  </div>
                </div>
              </div>

              {playerError ? <p className="mt-4 text-sm font-medium text-rose-600">{playerError}</p> : null}
              {error ? <p className="mt-3 text-sm font-medium text-rose-600">{error}</p> : null}
            </section>
          </section>

          <aside className="space-y-6 xl:sticky xl:top-6 xl:self-start">
            <section className="overflow-hidden rounded-[2rem] border border-[#d7deea] bg-white shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
              <div className="bg-[linear-gradient(135deg,#0d172a_0%,#132341_100%)] px-5 py-5 text-white sm:px-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#98b8f7]">Course Progress</p>
                    <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em]">전체 수강률</h2>
                    <p className="mt-2 text-sm leading-7 text-slate-300">총 요구 시간, 누적 시청 시간, 남은 시간, 발급 안내를 한눈에 확인합니다.</p>
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-xs font-semibold text-[#f0d59c]">
                    {aggregate.completedModuleCount}/{aggregate.totalModuleCount} 완료
                  </span>
                </div>
              </div>

              <div className="p-5 sm:p-6">
                <div className="grid gap-5">
                  <div className="grid gap-4 rounded-[1.6rem] border border-[#dce3ef] bg-[linear-gradient(180deg,#f8fafc_0%,#f3f6fa_100%)] p-5">
                    <div className="mx-auto relative flex h-44 w-44 items-center justify-center">
                      <svg viewBox="0 0 140 140" className="h-44 w-44 -rotate-90">
                        <circle cx="70" cy="70" r="54" fill="none" stroke="#d8e2ef" strokeWidth="12" />
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
                        <p className="text-4xl font-semibold tracking-[-0.04em] text-slate-950">{aggregate.completionRate}%</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">completion</p>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-sm text-slate-600">
                        <span>과정 진행률</span>
                        <span className="font-semibold text-slate-900">{aggregate.completionRate}%</span>
                      </div>
                      <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-200">
                        <div
                          className="h-full rounded-full bg-[linear-gradient(90deg,#0f2a57_0%,#1d4ed8_58%,#d3b271_100%)]"
                          style={{ width: `${aggregate.completionRate}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                    <div className="rounded-[1.35rem] border border-[#dce3ef] bg-[#f8fafc] px-4 py-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">총 요구 교육 시간</p>
                      <p className="mt-2 text-lg font-semibold text-slate-950">{formatDuration(aggregate.totalDurationSeconds)}</p>
                    </div>
                    <div className="rounded-[1.35rem] border border-[#dce3ef] bg-[#f8fafc] px-4 py-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">현재 누적 수강 시간</p>
                      <p className="mt-2 text-lg font-semibold text-slate-950">{formatDuration(aggregate.watchedSeconds)}</p>
                    </div>
                    <div className="rounded-[1.35rem] border border-[#dce3ef] bg-[#f8fafc] px-4 py-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">남은 시간</p>
                      <p className="mt-2 text-lg font-semibold text-slate-950">{formatDuration(aggregate.remainingSeconds)}</p>
                    </div>
                    <div className="rounded-[1.35rem] border border-[#dce3ef] bg-[#f8fafc] px-4 py-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">수료증 발급 상태</p>
                      <p className="mt-2 text-lg font-semibold text-slate-950">{certificateStatus}</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-[2rem] border border-[#d7deea] bg-[linear-gradient(180deg,#0c1526_0%,#0f1b31_100%)] p-5 text-white shadow-[0_24px_60px_rgba(15,23,42,0.14)] sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#9dbef8]">Curriculum</p>
                  <h3 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">강의 목차</h3>
                </div>
                <span className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-xs font-medium text-slate-200">
                  {defaultCourse.modules.length} Modules
                </span>
              </div>

              <div className="mt-5 space-y-3">
                {defaultCourse.modules.map((module, index) => {
                  const item = moduleProgress[module.id];
                  const active = selectedModuleId === module.id;
                  const state = getModuleState(item, active);

                  return (
                    <button
                      key={module.id}
                      type="button"
                      onClick={() => handleSelectModule(module.id)}
                      className={`group w-full rounded-[1.45rem] border p-4 text-left transition hover:-translate-y-0.5 hover:border-[#5f8fff]/45 ${state.toneClassName}`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-base font-semibold ${state.iconClassName}`}>
                          {state.icon}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Lesson {index + 1}</p>
                              <h4 className="mt-1 text-base font-semibold text-white">{module.title}</h4>
                            </div>
                            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${active ? "bg-[#1e3a6b] text-[#c8dcff]" : "bg-white/8 text-slate-300"}`}>
                              {state.label}
                            </span>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-slate-300">{module.summary}</p>
                          <div className="mt-4 flex items-center justify-between gap-3 text-sm text-slate-400">
                            <span>{formatDuration(item?.watchedSeconds ?? 0)} / {formatDuration(item?.durationSeconds ?? module.minutes * 60)}</span>
                            <span className="font-semibold text-slate-200">{item?.completionRate ?? 0}%</span>
                          </div>
                          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                            <div className={`h-full rounded-full ${state.progressClassName}`} style={{ width: `${item?.completionRate ?? 0}%` }} />
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="rounded-[2rem] border border-[#d7deea] bg-white p-5 shadow-[0_20px_55px_rgba(15,23,42,0.07)] sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#274690]">Completion Assets</p>
              <h3 className="mt-2 text-xl font-semibold text-[#0f172a]">과정 완료 후 제공 문서</h3>
              <div className="mt-5 space-y-3">
                {defaultCourse.outputs.map((item) => (
                  <div key={item} className="rounded-[1.25rem] border border-[#dce3ef] bg-[#f8fafc] px-4 py-4 text-sm font-medium text-slate-700">
                    {item}
                  </div>
                ))}
              </div>

              {result?.issuedCertificates.length ? (
                <div className="mt-5 rounded-[1.35rem] border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-sm font-semibold text-emerald-800">방금 준비된 문서</p>
                  <div className="mt-3 space-y-3 text-sm text-emerald-900">
                    {result.issuedCertificates.map((certificate) => (
                      <a
                        key={certificate.certificateId}
                        href={certificate.downloadUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-white px-4 py-3 transition hover:bg-emerald-50"
                      >
                        <span>{certificate.documentType} / {certificate.issueNumber}</span>
                        <span className="font-semibold">열기</span>
                      </a>
                    ))}
                  </div>
                </div>
              ) : null}
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
