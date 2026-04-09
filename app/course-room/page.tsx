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

type CaseType = "dui" | "sexual" | "drug" | "violence" | "other";

type StoredPlaybackSnapshot = {
  caseType: CaseType;
  watchedSeconds: number;
  durationSeconds: number;
  lastPlaybackPositionSeconds: number;
  legalAccepted: boolean;
  reviewAccepted: boolean;
  savedAt: string;
};

type ProgressRecord = {
  caseType?: CaseType;
  watchedSeconds?: number;
  durationSeconds?: number;
  completionRate?: number;
  remainingSeconds?: number;
  lastPlaybackPositionSeconds?: number;
  isCompleted?: boolean;
  legalDisclaimerAccepted?: boolean;
  userReviewAccepted?: boolean;
  updatedAt?: { seconds: number };
};

type YouTubePlayer = {
  destroy: () => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlayerState: () => number;
  seekTo: (seconds: number, allowSeekAhead?: boolean) => void;
};

type YouTubeNamespace = {
  Player: new (element: HTMLElement, options: {
    videoId: string;
    playerVars?: Record<string, number | string>;
    events?: {
      onReady?: (event: { target: YouTubePlayer }) => void;
      onStateChange?: (event: { data: number; target: YouTubePlayer }) => void;
      onError?: () => void;
    };
  }) => YouTubePlayer;
  PlayerState: {
    ENDED: number;
    PLAYING: number;
    PAUSED: number;
  };
};

declare global {
  interface Window {
    YT?: YouTubeNamespace;
    onYouTubeIframeAPIReady?: () => void;
    __youtubeIframeApiPromise?: Promise<YouTubeNamespace>;
  }
}

const caseTypeOptions: Array<{ value: CaseType; label: string }> = [
  { value: "dui", label: "음주운전" },
  { value: "sexual", label: "성범죄" },
  { value: "drug", label: "마약" },
  { value: "violence", label: "폭행" },
  { value: "other", label: "기타" },
];

const disclaimer =
  "본 과정은 법률 검토나 상담을 제공하지 않으며, 사용자가 자신의 생활 변화와 재발 방지 계획을 스스로 정리할 수 있도록 돕는 민간 교육 서비스입니다.";

const fallbackDurationSeconds = Math.max(defaultCourse.durationMinutes, defaultCourse.modules[0]?.minutes ?? 0) * 60;
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

function loadYouTubeIframeApi() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("브라우저 환경에서만 교육 플레이어를 불러올 수 있습니다."));
  }

  if (window.YT?.Player) {
    return Promise.resolve(window.YT);
  }

  if (window.__youtubeIframeApiPromise) {
    return window.__youtubeIframeApiPromise;
  }

  window.__youtubeIframeApiPromise = new Promise<YouTubeNamespace>((resolve, reject) => {
    const existingScript = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');

    window.onYouTubeIframeAPIReady = () => {
      if (window.YT?.Player) {
        resolve(window.YT);
      } else {
        reject(new Error("교육 플레이어 초기화에 실패했습니다."));
      }
    };

    if (!existingScript) {
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      script.onerror = () => reject(new Error("교육 플레이어 스크립트를 불러오지 못했습니다."));
      document.head.appendChild(script);
    }
  });

  return window.__youtubeIframeApiPromise;
}

export default function CourseRoomPage() {
  const [fullName, setFullName] = useState("");
  const [uid, setUid] = useState("");
  const [caseType, setCaseType] = useState<CaseType>("dui");
  const [legalAccepted, setLegalAccepted] = useState(false);
  const [reviewAccepted, setReviewAccepted] = useState(false);
  const [statusMessage, setStatusMessage] = useState("학습 세션과 저장 상태를 준비하는 중입니다.");
  const [error, setError] = useState("");
  const [result, setResult] = useState<SaveCourseProgressResponse | null>(null);
  const [durationSeconds, setDurationSeconds] = useState(fallbackDurationSeconds);
  const [watchedSeconds, setWatchedSeconds] = useState(0);
  const [currentSeconds, setCurrentSeconds] = useState(0);
  const [lastSavedLabel, setLastSavedLabel] = useState("저장 대기 중");
  const [playerReady, setPlayerReady] = useState(false);
  const [playerError, setPlayerError] = useState("");
  const [isManualSaving, setIsManualSaving] = useState(false);
  const [isBackgroundSaving, setIsBackgroundSaving] = useState(false);

  const playerHostRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YouTubePlayer | null>(null);
  const playbackTimerRef = useRef<number | null>(null);
  const lastPlaybackSampleRef = useRef<number | null>(null);
  const resumePositionRef = useRef(0);
  const restoringPlaybackRef = useRef(false);
  const saveInFlightRef = useRef(false);
  const lastSavedSnapshotRef = useRef<{ watchedSeconds: number; currentSeconds: number }>({
    watchedSeconds: -1,
    currentSeconds: -1,
  });

  const fullNameRef = useRef(fullName);
  const uidRef = useRef(uid);
  const caseTypeRef = useRef(caseType);
  const legalAcceptedRef = useRef(legalAccepted);
  const reviewAcceptedRef = useRef(reviewAccepted);
  const watchedSecondsRef = useRef(watchedSeconds);
  const currentSecondsRef = useRef(currentSeconds);
  const durationSecondsRef = useRef(durationSeconds);

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
    watchedSecondsRef.current = watchedSeconds;
  }, [watchedSeconds]);

  useEffect(() => {
    currentSecondsRef.current = currentSeconds;
  }, [currentSeconds]);

  useEffect(() => {
    durationSecondsRef.current = durationSeconds;
  }, [durationSeconds]);

  const completion = useMemo(() => {
    const safeDuration = Math.max(durationSeconds, 1);
    const safeWatched = Math.min(watchedSeconds, safeDuration);
    const completionRate = Math.floor((safeWatched / safeDuration) * 100);
    const remainingSeconds = Math.max(safeDuration - safeWatched, 0);

    return {
      completionRate,
      remainingSeconds,
      watchedSeconds: safeWatched,
      isCompleted: completionRate >= 100,
    };
  }, [durationSeconds, watchedSeconds]);

  const progressTone = useMemo(() => {
    if (completion.isCompleted) {
      return { label: "수료 완료", className: "border-[#d3ad62]/40 bg-[#d3ad62]/12 text-[#f7dfab]" };
    }

    if (completion.completionRate >= 80) {
      return { label: "곧 수료", className: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200" };
    }

    return { label: "진행 중", className: "border-white/15 bg-white/5 text-white/80" };
  }, [completion.completionRate, completion.isCompleted]);

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

        const mergedDuration = Math.max(
          fallbackDurationSeconds,
          remote?.durationSeconds ?? 0,
          local?.durationSeconds ?? 0
        );
        const mergedWatched = Math.min(
          mergedDuration,
          Math.max(remote?.watchedSeconds ?? 0, local?.watchedSeconds ?? 0)
        );
        const mergedPlaybackPosition = Math.min(
          mergedDuration,
          Math.max(remote?.lastPlaybackPositionSeconds ?? 0, local?.lastPlaybackPositionSeconds ?? 0)
        );

        setDurationSeconds(mergedDuration);
        setWatchedSeconds(mergedWatched);
        setCurrentSeconds(mergedPlaybackPosition);
        setCaseType(remote?.caseType ?? local?.caseType ?? "dui");
        setLegalAccepted(Boolean(remote?.legalDisclaimerAccepted ?? local?.legalAccepted ?? false));
        setReviewAccepted(Boolean(remote?.userReviewAccepted ?? local?.reviewAccepted ?? false));
        setLastSavedLabel(remote?.updatedAt ? formatTimestamp(remote.updatedAt) : local?.savedAt ?? "저장 대기 중");
        resumePositionRef.current = mergedPlaybackPosition;

        setStatusMessage(
          mergedWatched > 0
            ? "이전 학습 기록을 불러왔습니다. 재생하면 이어보기 위치부터 계속 진행됩니다."
            : "실명이 확인되었습니다. 강의 재생과 학습 진행 저장을 시작할 수 있습니다."
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

    const payload: StoredPlaybackSnapshot = {
      caseType,
      watchedSeconds: completion.watchedSeconds,
      durationSeconds,
      lastPlaybackPositionSeconds: currentSeconds,
      legalAccepted,
      reviewAccepted,
      savedAt: new Date().toLocaleString("ko-KR"),
    };

    window.localStorage.setItem(localStorageKey, JSON.stringify(payload));
  }, [caseType, completion.watchedSeconds, currentSeconds, durationSeconds, legalAccepted, reviewAccepted]);

  useEffect(() => {
    const videoId = defaultCourse.youtubeVideoId;

    if (!videoId || !playerHostRef.current) {
      return;
    }

    let cancelled = false;

    const setupPlayer = async () => {
      try {
        const YT = await loadYouTubeIframeApi();

        if (cancelled || !playerHostRef.current) {
          return;
        }

        playerRef.current = new YT.Player(playerHostRef.current, {
          videoId,
          playerVars: {
            rel: 0,
            modestbranding: 1,
            playsinline: 1,
            controls: 1,
            fs: 0,
            disablekb: 1,
            iv_load_policy: 3,
          },
          events: {
            onReady: (event) => {
              const playerDuration = Math.max(Math.round(event.target.getDuration() || 0), durationSecondsRef.current, 1);
              setDurationSeconds(playerDuration);
              setPlayerReady(true);
              setStatusMessage((message) =>
                message.includes("이전 학습 기록") ? message : "플레이어가 준비되었습니다. 강의를 재생하면 진도율이 자동 계산됩니다."
              );

              if (resumePositionRef.current > 0 && !restoringPlaybackRef.current) {
                restoringPlaybackRef.current = true;
                event.target.seekTo(resumePositionRef.current, true);
                setCurrentSeconds(resumePositionRef.current);
                lastPlaybackSampleRef.current = resumePositionRef.current;
              }
            },
            onStateChange: (event) => {
              if (!window.YT) {
                return;
              }

              const playerDuration = Math.max(Math.round(event.target.getDuration() || 0), durationSecondsRef.current, 1);
              setDurationSeconds(playerDuration);

              if (event.data === window.YT.PlayerState.PLAYING) {
                setPlayerReady(true);
                if (playbackTimerRef.current) {
                  window.clearInterval(playbackTimerRef.current);
                }
                lastPlaybackSampleRef.current = event.target.getCurrentTime();
                playbackTimerRef.current = window.setInterval(() => {
                  const player = playerRef.current;
                  if (!player) {
                    return;
                  }

                  const liveDuration = Math.max(Math.round(player.getDuration() || 0), durationSecondsRef.current, 1);
                  const liveCurrentTime = Math.min(Math.max(player.getCurrentTime(), 0), liveDuration);
                  const previousSample = lastPlaybackSampleRef.current ?? liveCurrentTime;
                  const delta = liveCurrentTime - previousSample;
                  lastPlaybackSampleRef.current = liveCurrentTime;

                  setDurationSeconds(liveDuration);
                  setCurrentSeconds(liveCurrentTime);

                  if (delta > 0 && delta <= 2.5) {
                    setWatchedSeconds((previous) => Math.min(liveDuration, previous + delta));
                  }
                }, 1000);
                return;
              }

              if (playbackTimerRef.current) {
                window.clearInterval(playbackTimerRef.current);
                playbackTimerRef.current = null;
              }

              const liveCurrentTime = Math.min(Math.max(event.target.getCurrentTime(), 0), playerDuration);
              setCurrentSeconds(liveCurrentTime);
              lastPlaybackSampleRef.current = liveCurrentTime;

              if (event.data === window.YT.PlayerState.PAUSED) {
                void persistProgress("pause");
              }

              if (event.data === window.YT.PlayerState.ENDED) {
                setCurrentSeconds(playerDuration);
                setWatchedSeconds(playerDuration);
                lastPlaybackSampleRef.current = playerDuration;
                void persistProgress("ended", playerDuration, playerDuration);
              }
            },
            onError: () => {
              setPlayerError("강의 플레이어 로딩 중 문제가 발생했습니다. 등록된 영상 상태를 확인해 주세요.");
            },
          },
        });
      } catch (loadError) {
        console.error(loadError);
        if (!cancelled) {
          setPlayerError(loadError instanceof Error ? loadError.message : "강의 플레이어를 불러오지 못했습니다.");
        }
      }
    };

    void setupPlayer();

    return () => {
      cancelled = true;
      if (playbackTimerRef.current) {
        window.clearInterval(playbackTimerRef.current);
      }
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void persistProgress("auto");
    }, 10000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  async function persistProgress(mode: "auto" | "pause" | "ended" | "manual", nextWatchedSeconds?: number, nextCurrentSeconds?: number) {
    if (!uidRef.current || !fullNameRef.current.trim()) {
      return;
    }

    const watchedValue = Math.min(
      Math.max(Math.round(nextWatchedSeconds ?? watchedSecondsRef.current), 0),
      Math.max(Math.round(durationSecondsRef.current), 1)
    );
    const currentValue = Math.min(
      Math.max(Math.round(nextCurrentSeconds ?? currentSecondsRef.current), 0),
      Math.max(Math.round(durationSecondsRef.current), 1)
    );
    const durationValue = Math.max(Math.round(durationSecondsRef.current), 1);
    const completionRate = Math.floor((watchedValue / durationValue) * 100);
    const isCompleted = completionRate >= 100;

    if (
      mode === "auto" &&
      watchedValue === lastSavedSnapshotRef.current.watchedSeconds &&
      currentValue === lastSavedSnapshotRef.current.currentSeconds
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
        },
        SaveCourseProgressResponse
      >(functions, "saveCourseProgress");

      const response = await callable({
        courseId: defaultCourse.id,
        courseTitle: defaultCourse.title,
        caseType: caseTypeRef.current,
        watchedSeconds: watchedValue,
        durationSeconds: durationValue,
        lastPlaybackPositionSeconds: currentValue,
        completionRate,
        isCompleted,
        legalAccepted: legalAcceptedRef.current,
        userReviewAccepted: reviewAcceptedRef.current,
      });

      lastSavedSnapshotRef.current = { watchedSeconds: watchedValue, currentSeconds: currentValue };
      setLastSavedLabel(new Date().toLocaleString("ko-KR"));
      setResult(response.data);

      if (response.data.issuedCertificates.length) {
        setStatusMessage("수강 완료가 저장되었고 결제 및 필수 동의가 확인되어 수료 문서가 준비되었습니다.");
      } else if (response.data.isCompleted && !response.data.paymentVerified) {
        setStatusMessage("학습은 100% 완료되었습니다. 수료 문서 발급은 결제 확인 이후 자동으로 이어집니다.");
      } else if (response.data.isCompleted && !response.data.certificateEligible) {
        setStatusMessage("학습은 100% 완료되었습니다. 수료 문서 발급을 위해 필수 동의 항목을 확인해 주세요.");
      } else if (mode === "manual") {
        setStatusMessage("현재 학습 진행률이 저장되었습니다. 대시보드에서도 같은 수치로 확인할 수 있습니다.");
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

  const handleManualSave = () => {
    void persistProgress("manual");
  };

  return (
    <main className="min-h-screen px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-6 shadow-[0_30px_80px_rgba(0,0,0,0.3)] lg:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#f0cb85]">Phase 3. Course Room</p>
              <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">실시간 진도 연동 교육 수강실</h1>
              <p className="mt-5 max-w-2xl text-sm leading-8 text-white/70 sm:text-base">
                실제 재생 시간 기준으로 수강률, 남은 시간, 수료 상태를 계산하고 Firebase에 같은 UID 기준으로 저장합니다.
              </p>
            </div>
            <div className="w-full max-w-md rounded-[1.5rem] border border-[#d3ad62]/20 bg-[#0b1523] p-5">
              <p className="text-sm font-semibold text-[#f0cb85]">회원 실명</p>
              <h2 className="mt-3 text-2xl font-semibold text-white">{fullName || "저장된 실명 없음"}</h2>
              <p className="mt-3 text-sm leading-7 text-white/75">
                수료증에는 이 이름이 그대로 출력됩니다. 재생 중에는 10초 간격, 일시정지, 종료 시점마다 진도가 저장됩니다.
              </p>
              <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-white/60">총 길이</p>
                  <p className="mt-2 text-white">{formatDuration(durationSeconds)}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-white/60">마지막 저장</p>
                  <p className="mt-2 text-white">{lastSavedLabel}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <section className="rounded-[2rem] border border-white/10 bg-[#0d1828] p-6 lg:p-8">
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#f0cb85]">Connected Lecture</p>
                  <h2 className="mt-3 text-2xl font-semibold text-white">{defaultCourse.modules[0]?.title ?? defaultCourse.title}</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-7 text-white/70">
                    {defaultCourse.modules[0]?.summary ?? defaultCourse.subtitle}
                  </p>
                </div>
                <div className={`inline-flex items-center rounded-full border px-4 py-2 text-sm font-semibold ${progressTone.className}`}>
                  {progressTone.label}
                </div>
              </div>

              <div className="mt-6 overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#08111d] shadow-[0_20px_50px_rgba(0,0,0,0.35)]">
                <div className="aspect-video w-full bg-black">
                  <div ref={playerHostRef} className="h-full w-full" />
                </div>
              </div>

              <div className="mt-6 grid gap-3 md:grid-cols-4">
                <div className="rounded-[1.25rem] border border-white/10 bg-[#08111d] p-4">
                  <p className="text-sm text-white/60">현재 시청 시간</p>
                  <p className="mt-2 text-lg font-semibold text-white">{formatDuration(currentSeconds)}</p>
                </div>
                <div className="rounded-[1.25rem] border border-white/10 bg-[#08111d] p-4">
                  <p className="text-sm text-white/60">누적 수강 시간</p>
                  <p className="mt-2 text-lg font-semibold text-white">{formatDuration(completion.watchedSeconds)}</p>
                </div>
                <div className="rounded-[1.25rem] border border-white/10 bg-[#08111d] p-4">
                  <p className="text-sm text-white/60">남은 시간</p>
                  <p className="mt-2 text-lg font-semibold text-white">{formatDuration(completion.remainingSeconds)}</p>
                </div>
                <div className="rounded-[1.25rem] border border-white/10 bg-[#08111d] p-4">
                  <p className="text-sm text-white/60">현재 수강률</p>
                  <p className="mt-2 text-lg font-semibold text-white">{completion.completionRate}%</p>
                </div>
              </div>

              <div className="mt-6">
                <div className="flex items-center justify-between text-sm text-white/65">
                  <span>학습 진행률</span>
                  <span>{completion.completionRate}%</span>
                </div>
                <div className="mt-3 overflow-hidden rounded-full bg-white/10">
                  <div className="h-3 rounded-full bg-gradient-to-r from-[#d3ad62] via-[#f0cb85] to-[#fff1ca]" style={{ width: `${completion.completionRate}%` }} />
                </div>
              </div>

              <div className="mt-6 grid gap-3 md:grid-cols-2">
                {defaultCourse.modules.map((module, index) => (
                  <article key={module.id} className="rounded-[1.5rem] border border-white/10 bg-[#08111d] p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#f0cb85]">Module {index + 1}</p>
                    <h3 className="mt-3 text-lg font-semibold text-white">{module.title}</h3>
                    <p className="mt-2 text-sm leading-7 text-white/70">{module.summary}</p>
                    <div className="mt-4 inline-flex rounded-full border border-white/10 px-3 py-2 text-sm text-white/75">
                      {module.minutes}분
                    </div>
                  </article>
                ))}
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
                    onClick={handleManualSave}
                    disabled={isManualSaving || !playerReady}
                    className="inline-flex items-center justify-center rounded-full bg-[#d3ad62] px-6 py-3 text-sm font-semibold text-[#06101b] transition hover:bg-[#f0cb85] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isManualSaving ? "저장 중..." : "현재 학습 상태 저장"}
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
              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-white">현재 수강 현황</h2>

              <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-[#08111d] p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-white">학습 요약</p>
                  <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${progressTone.className}`}>{progressTone.label}</span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-white/60">총 길이</p>
                    <p className="mt-2 text-white">{formatDuration(durationSeconds)}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-white/60">현재 위치</p>
                    <p className="mt-2 text-white">{formatDuration(currentSeconds)}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-white/60">누적 수강</p>
                    <p className="mt-2 text-white">{formatDuration(completion.watchedSeconds)}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-white/60">남은 시간</p>
                    <p className="mt-2 text-white">{formatDuration(completion.remainingSeconds)}</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 overflow-hidden rounded-full bg-white/10">
                <div className="h-3 rounded-full bg-[#d3ad62]" style={{ width: `${completion.completionRate}%` }} />
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-white/60">수강률</p>
                  <p className="mt-2 text-white">{completion.completionRate}%</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-white/60">자동 저장</p>
                  <p className="mt-2 text-white">{isBackgroundSaving ? "진행 중" : "대기"}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-white/60">수료 여부</p>
                  <p className="mt-2 text-white">{completion.isCompleted ? "완료" : "진행 중"}</p>
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
