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

        if (!profile?.fullName?.trim()) {
          setError("수강을 저장하기 전에 회원가입 화면에서 실명을 먼저 저장해 주세요.");
          setStatusMessage("실명 정보가 없어 학습 저장과 수료 처리 연결을 진행할 수 없습니다.");
          return;
        }

        setFullName(profile.fullName.trim());

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

  return (
    <main className="min-h-screen px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-6 shadow-[0_30px_80px_rgba(0,0,0,0.3)] lg:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#f0cb85]">Phase 3. Course Room</p>
              <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">6강 누적 수강 교육실</h1>
              <p className="mt-5 max-w-2xl text-sm leading-8 text-white/70 sm:text-base">
                각 강의를 따로 선택해 수강하고, 강의별 진도와 6강 누적 수강률을 함께 저장합니다. 전체 6강을 모두 완료해야 수료 상태로 전환됩니다.
              </p>
            </div>
            <div className="w-full max-w-md rounded-[1.5rem] border border-[#d3ad62]/20 bg-[#0b1523] p-5">
              <p className="text-sm font-semibold text-[#f0cb85]">회원 실명</p>
              <h2 className="mt-3 text-2xl font-semibold text-white">{fullName || "저장된 실명 없음"}</h2>
              <p className="mt-3 text-sm leading-7 text-white/75">
                수료증에는 이 이름이 그대로 출력됩니다. 강의별로 이어보기가 가능하며, 전체 6강 누적 수강률이 자동 계산됩니다.
              </p>
              <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-white/60">총 길이</p>
                  <p className="mt-2 text-white">{formatDuration(aggregate.totalDurationSeconds)}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-white/60">완료 강의</p>
                  <p className="mt-2 text-white">{aggregate.completedModuleCount}/{aggregate.totalModuleCount}강</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <section className="rounded-[2rem] border border-white/10 bg-[#0d1828] p-6 lg:p-8">
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#f0cb85]">Selected Lesson</p>
                  <h2 className="mt-3 text-2xl font-semibold text-white">{selectedModule?.title}</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-7 text-white/70">{selectedModule?.summary}</p>
                </div>
                <div className={`inline-flex items-center rounded-full border px-4 py-2 text-sm font-semibold ${progressTone.className}`}>
                  {progressTone.label}
                </div>
              </div>

              <div className="mt-6 overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#08111d] shadow-[0_20px_50px_rgba(0,0,0,0.35)]">
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
                    <div className="flex h-full items-center justify-center px-8 text-center text-sm leading-7 text-white/65">
                      {isVideoLoading ? "선택한 강의 영상을 불러오는 중입니다..." : "선택한 강의 영상이 아직 준비되지 않았습니다."}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 grid gap-3 md:grid-cols-4">
                <div className="rounded-[1.25rem] border border-white/10 bg-[#08111d] p-4">
                  <p className="text-sm text-white/60">선택 강의 위치</p>
                  <p className="mt-2 text-lg font-semibold text-white">{formatDuration(selectedProgress.lastPlaybackPositionSeconds)}</p>
                </div>
                <div className="rounded-[1.25rem] border border-white/10 bg-[#08111d] p-4">
                  <p className="text-sm text-white/60">선택 강의 수강</p>
                  <p className="mt-2 text-lg font-semibold text-white">{formatDuration(selectedProgress.watchedSeconds)}</p>
                </div>
                <div className="rounded-[1.25rem] border border-white/10 bg-[#08111d] p-4">
                  <p className="text-sm text-white/60">선택 강의 진도</p>
                  <p className="mt-2 text-lg font-semibold text-white">{selectedProgress.completionRate}%</p>
                </div>
                <div className="rounded-[1.25rem] border border-white/10 bg-[#08111d] p-4">
                  <p className="text-sm text-white/60">남은 시간</p>
                  <p className="mt-2 text-lg font-semibold text-white">{formatDuration(Math.max(selectedProgress.durationSeconds - selectedProgress.watchedSeconds, 0))}</p>
                </div>
              </div>

              <div className="mt-6">
                <div className="flex items-center justify-between text-sm text-white/65">
                  <span>전체 6강 누적 수강률</span>
                  <span>{aggregate.completionRate}%</span>
                </div>
                <div className="mt-3 overflow-hidden rounded-full bg-white/10">
                  <div className="h-3 rounded-full bg-gradient-to-r from-[#d3ad62] via-[#f0cb85] to-[#fff1ca]" style={{ width: `${aggregate.completionRate}%` }} />
                </div>
              </div>

              <div className="mt-6 grid gap-3 md:grid-cols-2">
                {defaultCourse.modules.map((module, index) => {
                  const item = moduleProgress[module.id];
                  const active = selectedModuleId === module.id;
                  return (
                    <button
                      key={module.id}
                      type="button"
                      onClick={() => handleSelectModule(module.id)}
                      className={
                        active
                          ? "rounded-[1.5rem] border border-[#d3ad62] bg-[#d3ad62]/10 p-5 text-left"
                          : "rounded-[1.5rem] border border-white/10 bg-[#08111d] p-5 text-left transition hover:bg-[#0f1b2b]"
                      }
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#f0cb85]">Module {index + 1}</p>
                          <h3 className="mt-3 text-lg font-semibold text-white">{module.title}</h3>
                          <p className="mt-2 text-sm leading-7 text-white/70">{module.summary}</p>
                        </div>
                        <span className="rounded-full border border-white/10 px-3 py-2 text-xs text-white/70">{item?.completionRate ?? 0}%</span>
                      </div>
                      <div className="mt-4 flex items-center justify-between text-sm text-white/65">
                        <span>{formatDuration(item?.watchedSeconds ?? 0)} / {formatDuration(item?.durationSeconds ?? module.minutes * 60)}</span>
                        <span>{item?.isCompleted ? "완료" : "진행 중"}</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-6 space-y-3 rounded-[1.5rem] border border-white/10 bg-black/20 p-5">
                <label className="flex items-start gap-3 text-sm leading-7 text-white/85">
                  <input
                    type="checkbox"
                    checked={legalAccepted}
                    onChange={(event) => setLegalAccepted(event.target.checked)}
                    className="mt-1 h-4 w-4 accent-[#d3ad62]"
                  />
                  <span>{disclaimer}</span>
                </label>
                <label className="flex items-start gap-3 text-sm leading-7 text-white/85">
                  <input
                    type="checkbox"
                    checked={reviewAccepted}
                    onChange={(event) => setReviewAccepted(event.target.checked)}
                    className="mt-1 h-4 w-4 accent-[#d3ad62]"
                  />
                  <span>발급 문서와 AI 초안은 사용자가 직접 사실관계를 확인하고 최종 수정한 뒤 사용해야 함을 이해했습니다.</span>
                </label>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
                <label className="space-y-2 text-sm text-white/80">
                  <span>사건 유형</span>
                  <select
                    value={caseType}
                    onChange={(event) => setCaseType(event.target.value as CaseType)}
                    className="w-full rounded-2xl border border-white/10 bg-[#08111d] px-4 py-3 text-white outline-none"
                  >
                    {caseTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => void persistProgress("manual")}
                    disabled={isManualSaving || !playerReady}
                    className="inline-flex items-center justify-center rounded-full bg-[#d3ad62] px-6 py-3 text-sm font-semibold text-[#06101b] transition hover:bg-[#f0cb85] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isManualSaving ? "저장 중..." : "강의별 진도 저장"}
                  </button>
                  <Link href="/dashboard" className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
                    대시보드 보기
                  </Link>
                </div>
              </div>

              {playerError ? <p className="mt-4 text-sm text-[#f2a39b]">{playerError}</p> : null}
              {error ? <p className="mt-4 text-sm text-[#f2a39b]">{error}</p> : null}
            </section>

            <aside className="rounded-[2rem] border border-white/10 bg-[#111f33] p-6 lg:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#f0cb85]">Progress</p>
              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-white">현재 누적 수강 현황</h2>

              <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-[#08111d] p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-white">전체 수강 요약</p>
                  <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${progressTone.className}`}>{progressTone.label}</span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-white/60">전체 길이</p>
                    <p className="mt-2 text-white">{formatDuration(aggregate.totalDurationSeconds)}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-white/60">누적 수강</p>
                    <p className="mt-2 text-white">{formatDuration(aggregate.watchedSeconds)}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-white/60">완료 강의</p>
                    <p className="mt-2 text-white">{aggregate.completedModuleCount}/{aggregate.totalModuleCount}강</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-white/60">남은 시간</p>
                    <p className="mt-2 text-white">{formatDuration(aggregate.remainingSeconds)}</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 overflow-hidden rounded-full bg-white/10">
                <div className="h-3 rounded-full bg-[#d3ad62]" style={{ width: `${aggregate.completionRate}%` }} />
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-white/60">누적 수강률</p>
                  <p className="mt-2 text-white">{aggregate.completionRate}%</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-white/60">자동 저장</p>
                  <p className="mt-2 text-white">{isBackgroundSaving ? "진행 중" : "대기"}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-white/60">수료 여부</p>
                  <p className="mt-2 text-white">{aggregate.isCompleted ? "완료" : "진행 중"}</p>
                </div>
              </div>

              <div className="mt-6 rounded-[1.5rem] border border-[#d3ad62]/20 bg-[#d3ad62]/10 p-4 text-sm leading-7 text-[#f7dfab]">
                {statusMessage}
              </div>

              <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-[#08111d] p-5">
                <p className="text-sm font-semibold text-white">완료 시 자동 준비 문서</p>
                <div className="mt-4 space-y-3 text-sm text-white/75">
                  {defaultCourse.outputs.map((item) => (
                    <div key={item} className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              {result?.issuedCertificates.length ? (
                <div className="mt-6 rounded-[1.5rem] border border-[#d3ad62]/20 bg-black/20 p-5">
                  <p className="text-sm font-semibold text-[#f0cb85]">방금 준비된 문서</p>
                  <div className="mt-4 space-y-3 text-sm text-white/80">
                    {result.issuedCertificates.map((certificate) => (
                      <a
                        key={certificate.certificateId}
                        href={certificate.downloadUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="block rounded-2xl border border-white/10 bg-[#0d1828] px-4 py-3 transition hover:bg-[#13233a]"
                      >
                        <div className="font-semibold text-white">{certificate.documentType}</div>
                        <div className="mt-1 text-white/60">문서번호 {certificate.issueNumber}</div>
                      </a>
                    ))}
                  </div>
                </div>
              ) : null}
            </aside>
          </div>
        </div>
      </div>
    </main>
  );
}
