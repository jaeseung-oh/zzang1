"use client";

import { doc, getDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { defaultCourse } from "@/lib/course/catalog";
import { getFirebaseServices } from "@/lib/firebase/client";
import { ensureAnonymousSession } from "@/lib/firebase/session";
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

export default function CourseRoomPage() {
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

  const progressTone = useMemo(() => {
    if (aggregate.isCompleted) {
      return { label: "전체 수료 완료", className: "border-[#d3ad62]/40 bg-[#d3ad62]/12 text-[#f7dfab]" };
    }

    if (aggregate.completionRate >= 80) {
      return { label: "곧 전체 수료", className: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200" };
    }

    return { label: "수강 진행 중", className: "border-white/15 bg-white/5 text-white/80" };
  }, [aggregate.completionRate, aggregate.isCompleted]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const user = await ensureAnonymousSession();
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
            ? "이전 6강 학습 기록을 불러왔습니다. 원하는 강의를 선택해 이어서 수강할 수 있습니다."
            : "실명이 확인되었습니다. 6강 강의실에서 강의별 진도와 전체 누적 수강률을 저장할 수 있습니다."
        );
      } catch (sessionError) {
        console.error(sessionError);
        if (!cancelled) {
          setError("Firebase 세션 준비에 실패했습니다. Authentication과 Firestore 연결 상태를 확인해 주세요.");
          setStatusMessage("세션 준비에 실패했습니다.");
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

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
        setStatusMessage("6강 전체 수강 완료가 저장되었고 결제 및 필수 동의가 확인되어 수료 문서가 준비되었습니다.");
      } else if (response.data.isCompleted && !response.data.paymentVerified) {
        setStatusMessage("6강 전체 수강은 완료되었습니다. 수료 문서 발급은 결제 확인 이후 자동으로 이어집니다.");
      } else if (response.data.isCompleted && !response.data.certificateEligible) {
        setStatusMessage("6강 전체 수강은 완료되었습니다. 수료 문서 발급을 위해 필수 동의 항목을 확인해 주세요.");
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

  const handlePause = () => {
    void persistProgress("pause");
  };

  const handleEnded = () => {
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
    setSelectedModuleId(moduleId);
    setVideoUrl("");
    setPlayerReady(false);
  };

  const selectedRemainingSeconds = Math.max(selectedProgress.durationSeconds - selectedProgress.watchedSeconds, 0);
  const saveStateLabel = isManualSaving ? "수동 저장 중" : isBackgroundSaving ? "자동 저장 중" : "자동 저장 대기";
  const saveStateClassName = isManualSaving || isBackgroundSaving
    ? "border-blue-200 bg-blue-50 text-blue-700"
    : "border-slate-200 bg-white/90 text-slate-600";
  const ringCircumference = 2 * Math.PI * 54;
  const ringOffset = ringCircumference * (1 - aggregate.completionRate / 100);

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#eef4fb_0%,#e6eef8_32%,#dde7f2_100%)] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-7xl">
        <div className="rounded-[2rem] border border-[#d8e2ef] bg-white/90 p-4 shadow-[0_28px_80px_rgba(15,23,42,0.12)] backdrop-blur-xl sm:p-6 lg:p-8">
          <div className="flex flex-col gap-3 border-b border-slate-200/80 pb-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[#2f6fed]">Reset Edu Center LMS</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[#0f172a] sm:text-4xl">
                음주운전 재발 방지 온라인 교육 수강실
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 sm:text-[15px]">
                비디오 기반 진도율, 강의별 이어보기, 전체 6강 누적 수강률이 하나의 학습 대시보드에서 자동으로 관리됩니다.
              </p>
            </div>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50"
            >
              학습 대시보드 열기
            </Link>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.75fr)_minmax(320px,0.95fr)]">
            <section className="space-y-6">
              <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-[linear-gradient(145deg,#0f1b35_0%,#13284d_42%,#17325f_100%)] shadow-[0_24px_60px_rgba(15,23,42,0.18)]">
                <div className="border-b border-white/10 px-5 py-4 sm:px-6">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="max-w-3xl">
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-200">Current Lecture</p>
                      <h2 className="mt-2 text-2xl font-semibold text-white sm:text-[2rem]">{selectedModule?.title}</h2>
                      <p className="mt-3 text-sm leading-7 text-slate-200/85">{selectedModule?.summary}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center rounded-full border px-4 py-2 text-xs font-semibold ${progressTone.className}`}>
                        {progressTone.label}
                      </span>
                      <span className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-medium text-slate-100">
                        {selectedProgress.completionRate}% 진행
                      </span>
                    </div>
                  </div>
                </div>

                <div className="relative bg-[#040b18]">
                  <div className="aspect-video w-full bg-black">
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

                  <div className="pointer-events-none absolute bottom-4 right-4 z-10">
                    <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium shadow-[0_12px_30px_rgba(15,23,42,0.22)] ${saveStateClassName}`}>
                      <span className={`h-2 w-2 rounded-full ${isManualSaving || isBackgroundSaving ? "bg-blue-500" : "bg-emerald-500"}`} />
                      {saveStateLabel}
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 border-t border-white/10 bg-[linear-gradient(180deg,rgba(6,15,30,0.7),rgba(10,20,39,0.92))] px-5 py-5 sm:grid-cols-2 xl:grid-cols-4 sm:px-6">
                  {/* selectedProgress.lastPlaybackPositionSeconds -> 현재 재생 위치 카드 */}
                  <div className="rounded-[1.25rem] border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-300">현재 위치</p>
                    <p className="mt-2 text-lg font-semibold text-white">{formatDuration(selectedProgress.lastPlaybackPositionSeconds)}</p>
                  </div>
                  {/* selectedProgress.watchedSeconds -> 현재 강의 누적 시청 시간 */}
                  <div className="rounded-[1.25rem] border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-300">시청 시간</p>
                    <p className="mt-2 text-lg font-semibold text-white">{formatDuration(selectedProgress.watchedSeconds)}</p>
                  </div>
                  {/* selectedProgress.completionRate -> 현재 강의 진행률 */}
                  <div className="rounded-[1.25rem] border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-300">강의 진도</p>
                    <p className="mt-2 text-lg font-semibold text-white">{selectedProgress.completionRate}%</p>
                  </div>
                  {/* selectedRemainingSeconds -> 현재 강의 남은 시간 */}
                  <div className="rounded-[1.25rem] border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-300">남은 시간</p>
                    <p className="mt-2 text-lg font-semibold text-white">{formatDuration(selectedRemainingSeconds)}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.08)] sm:p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#2f6fed]">Lecture Overview</p>
                    <h3 className="mt-2 text-xl font-semibold text-slate-900">현재 강의 정보 및 저장 설정</h3>
                    <p className="mt-2 text-sm leading-7 text-slate-600">
                      진행률은 실제 재생 시간을 기준으로 계산되며, 강의 일시정지와 종료 시점 및 10초 간격으로 자동 저장됩니다.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => void persistProgress("manual")}
                      disabled={isManualSaving || !playerReady}
                      className="inline-flex items-center justify-center rounded-full bg-[#2f6fed] px-6 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(47,111,237,0.24)] transition hover:-translate-y-0.5 hover:bg-[#1f5bd3] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isManualSaving ? "저장 중..." : "현재 학습 저장"}
                    </button>
                    <Link
                      href="/dashboard"
                      className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-slate-50 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:bg-slate-100"
                    >
                      대시보드 보기
                    </Link>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
                  <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-5">
                    <p className="text-sm font-semibold text-slate-900">수강 규정 및 동의</p>
                    <div className="mt-4 space-y-3">
                      <label className="flex items-start gap-3 rounded-[1.25rem] border border-slate-200 bg-white px-4 py-4 text-sm leading-7 text-slate-700">
                        <input
                          type="checkbox"
                          checked={legalAccepted}
                          onChange={(event) => setLegalAccepted(event.target.checked)}
                          className="mt-1 h-4 w-4 accent-[#2f6fed]"
                        />
                        <span>{disclaimer}</span>
                      </label>
                      <label className="flex items-start gap-3 rounded-[1.25rem] border border-slate-200 bg-white px-4 py-4 text-sm leading-7 text-slate-700">
                        <input
                          type="checkbox"
                          checked={reviewAccepted}
                          onChange={(event) => setReviewAccepted(event.target.checked)}
                          className="mt-1 h-4 w-4 accent-[#2f6fed]"
                        />
                        <span>발급 문서와 AI 초안은 사용자가 직접 사실관계를 확인하고 최종 수정한 뒤 사용해야 함을 이해했습니다.</span>
                      </label>
                    </div>
                  </div>

                  <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-5">
                    <label className="block space-y-2 text-sm text-slate-700">
                      <span className="font-semibold text-slate-900">사건 유형</span>
                      <select
                        value={caseType}
                        onChange={(event) => setCaseType(event.target.value as CaseType)}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-[#2f6fed]"
                      >
                        {caseTypeOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="mt-5 rounded-[1.25rem] border border-slate-200 bg-white p-4 text-sm leading-7 text-slate-600">
                      <p className="font-semibold text-slate-900">학습 상태 안내</p>
                      <p className="mt-2">{statusMessage}</p>
                      <p className="mt-3 text-xs text-slate-500">마지막 저장 시각 {lastSavedLabel}</p>
                    </div>
                  </div>
                </div>

                {playerError ? <p className="mt-4 text-sm text-rose-600">{playerError}</p> : null}
                {error ? <p className="mt-4 text-sm text-rose-600">{error}</p> : null}
              </div>
            </section>

            <aside className="space-y-6">
              <div className="rounded-[1.75rem] border border-slate-200 bg-[linear-gradient(180deg,#f8fbff_0%,#eff5ff_100%)] p-5 shadow-[0_16px_42px_rgba(15,23,42,0.09)] sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#2f6fed]">Learner Profile</p>
                    <h2 className="mt-3 text-2xl font-semibold text-slate-950">{fullName || "저장된 실명 없음"}</h2>
                    <p className="mt-2 text-sm leading-7 text-slate-600">수료증에는 이 실명이 그대로 반영되며, 강의 완료 여부와 함께 발급 상태가 연결됩니다.</p>
                  </div>
                  <div className={`inline-flex rounded-full border px-4 py-2 text-xs font-semibold ${aggregate.isCompleted ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-blue-200 bg-blue-50 text-blue-700"}`}>
                    {aggregate.isCompleted ? "수료 완료" : "진행 중"}
                  </div>
                </div>

                <div className="relative mt-6 rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">내 학습 현황</p>
                      <p className="mt-1 text-sm text-slate-500">6강 전체 누적 기준</p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                      {aggregate.completedModuleCount}/{aggregate.totalModuleCount} 강 완료
                    </span>
                  </div>

                  <div className="mt-5 grid gap-5 sm:grid-cols-[auto_1fr] sm:items-center">
                    <div className="relative mx-auto flex h-40 w-40 items-center justify-center">
                      {/* aggregate.completionRate -> 도넛 차트 원형 스트로크 길이 */}
                      <svg viewBox="0 0 140 140" className="h-40 w-40 -rotate-90">
                        <circle cx="70" cy="70" r="54" fill="none" stroke="#dbe7f5" strokeWidth="12" />
                        <circle
                          cx="70"
                          cy="70"
                          r="54"
                          fill="none"
                          stroke="url(#progress-ring)"
                          strokeWidth="12"
                          strokeLinecap="round"
                          strokeDasharray={ringCircumference}
                          strokeDashoffset={ringOffset}
                        />
                        <defs>
                          <linearGradient id="progress-ring" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#2f6fed" />
                            <stop offset="100%" stopColor="#60a5fa" />
                          </linearGradient>
                        </defs>
                      </svg>
                      <div className="pointer-events-none absolute flex flex-col items-center justify-center text-center">
                        <span className="text-3xl font-semibold text-slate-950">{aggregate.completionRate}%</span>
                        <span className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">completion</span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {/* aggregate.watchedSeconds / aggregate.remainingSeconds / aggregate.totalDurationSeconds -> 우측 요약 카드 */}
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-4">
                          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">누적 시청</p>
                          <p className="mt-2 text-lg font-semibold text-slate-900">{formatDuration(aggregate.watchedSeconds)}</p>
                        </div>
                        <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-4">
                          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">남은 시간</p>
                          <p className="mt-2 text-lg font-semibold text-slate-900">{formatDuration(aggregate.remainingSeconds)}</p>
                        </div>
                        <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-4">
                          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">총 교육 시간</p>
                          <p className="mt-2 text-lg font-semibold text-slate-900">{formatDuration(aggregate.totalDurationSeconds)}</p>
                        </div>
                        <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-4">
                          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">저장 상태</p>
                          <p className="mt-2 text-lg font-semibold text-slate-900">{isBackgroundSaving ? "저장 중" : "대기"}</p>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between text-sm text-slate-600">
                          <span>전체 과정 진행률</span>
                          <span>{aggregate.completionRate}%</span>
                        </div>
                        <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-200">
                          <div className="h-full rounded-full bg-[linear-gradient(90deg,#2f6fed_0%,#60a5fa_100%)]" style={{ width: `${aggregate.completionRate}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_16px_42px_rgba(15,23,42,0.08)] sm:p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#2f6fed]">Curriculum</p>
                    <h3 className="mt-2 text-xl font-semibold text-slate-950">전체 커리큘럼</h3>
                  </div>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                    1강 ~ {defaultCourse.modules.length}강
                  </span>
                </div>

                <div className="mt-5 space-y-3">
                  {defaultCourse.modules.map((module, index) => {
                    const item = moduleProgress[module.id];
                    const active = selectedModuleId === module.id;
                    const state = item?.isCompleted
                      ? {
                          label: "수강 완료",
                          iconClassName: "bg-emerald-100 text-emerald-600",
                          accentClassName: "border-emerald-200 bg-emerald-50/70",
                          icon: "✓",
                        }
                      : (item?.watchedSeconds ?? 0) > 0
                        ? {
                            label: "수강 중",
                            iconClassName: "bg-blue-100 text-blue-600",
                            accentClassName: active ? "border-blue-200 bg-blue-50/70" : "border-slate-200 bg-white",
                            icon: "▶",
                          }
                        : {
                            label: "미수강",
                            iconClassName: "bg-slate-200 text-slate-500",
                            accentClassName: active ? "border-blue-200 bg-blue-50/70" : "border-slate-200 bg-white",
                            icon: "•",
                          };

                    return (
                      <button
                        key={module.id}
                        type="button"
                        onClick={() => handleSelectModule(module.id)}
                        className={`group w-full rounded-[1.5rem] border p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(15,23,42,0.08)] ${active ? "border-blue-200 bg-blue-50/80" : state.accentClassName}`}
                      >
                        <div className="flex items-start gap-4">
                          {/* moduleProgress[module.id] -> 타일 아이콘/배지 상태에 연결 */}
                          <div className={`mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-base font-semibold ${state.iconClassName}`}>
                            {state.icon}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Lesson {index + 1}</p>
                                <h4 className="mt-1 text-base font-semibold text-slate-900">{module.title}</h4>
                              </div>
                              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${item?.isCompleted ? "bg-emerald-100 text-emerald-700" : active ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"}`}>
                                {state.label}
                              </span>
                            </div>
                            <p className="mt-2 text-sm leading-6 text-slate-600">{module.summary}</p>
                            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
                              <span>{formatDuration(item?.watchedSeconds ?? 0)} / {formatDuration(item?.durationSeconds ?? module.minutes * 60)}</span>
                              <span className="font-medium text-slate-700">{item?.completionRate ?? 0}%</span>
                            </div>
                            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                              <div className={`h-full rounded-full ${item?.isCompleted ? "bg-emerald-500" : "bg-[linear-gradient(90deg,#2f6fed_0%,#60a5fa_100%)]"}`} style={{ width: `${item?.completionRate ?? 0}%` }} />
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_16px_42px_rgba(15,23,42,0.08)] sm:p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#2f6fed]">Completion Assets</p>
                <h3 className="mt-2 text-xl font-semibold text-slate-950">완료 시 제공 문서</h3>
                <div className="mt-5 space-y-3 text-sm text-slate-700">
                  {defaultCourse.outputs.map((item) => (
                    <div key={item} className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-4">
                      {item}
                    </div>
                  ))}
                </div>

                {result?.issuedCertificates.length ? (
                  <div className="mt-5 rounded-[1.25rem] border border-emerald-200 bg-emerald-50 p-4">
                    <p className="text-sm font-semibold text-emerald-800">방금 준비된 문서</p>
                    <div className="mt-3 space-y-3 text-sm text-emerald-900">
                      {result.issuedCertificates.map((certificate) => (
                        <a
                          key={certificate.certificateId}
                          href={certificate.downloadUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="block rounded-2xl border border-emerald-200 bg-white px-4 py-3 transition hover:bg-emerald-50"
                        >
                          <div className="font-semibold">{certificate.documentType}</div>
                          <div className="mt-1 text-emerald-700/80">문서번호 {certificate.issueNumber}</div>
                        </a>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </aside>
          </div>
        </div>
      </div>
    </main>
  );
}
