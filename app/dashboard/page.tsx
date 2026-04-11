"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { collection, getDocs, query, where } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import { defaultCourse } from "@/lib/course/catalog";
import { getFirebaseServices } from "@/lib/firebase/client";
import { requireAuthenticatedUser } from "@/lib/firebase/session";

type ModuleProgressState = {
  watchedSeconds: number;
  durationSeconds: number;
  completionRate: number;
  lastPlaybackPositionSeconds: number;
  isCompleted: boolean;
};

type ProgressRecord = {
  courseId: string;
  completionRate: number;
  watchedSeconds: number;
  durationSeconds?: number;
  remainingSeconds?: number;
  lastPlaybackPositionSeconds?: number;
  completedModuleCount?: number;
  totalModuleCount?: number;
  moduleProgress?: Record<string, ModuleProgressState>;
  isCompleted: boolean;
  updatedAt?: { seconds: number };
};

type CertificateRecord = {
  id: string;
  documentType: string;
  issueNumber: string;
  downloadUrl: string;
  issuedAt?: { seconds: number };
};

type DraftRecord = {
  id: string;
  documentType: string;
  caseType: string;
  generatedDraft: string;
  createdAt?: { seconds: number };
};

const documentLabels: Record<string, string> = {
  completion: "건전음주 교육 이수증",
  "psychology-report": "인지행동 심리검사 결과지",
  "compliance-pledge": "준법 서약서",
};

const draftLabels: Record<string, string> = {
  "reflection-letter-guide": "성찰문 글쓰기 가이드",
  "petition-letter-guide": "주변인 의견문 정리 가이드",
};

function formatTimestamp(timestamp?: { seconds: number }) {
  if (!timestamp?.seconds) {
    return "기록 대기 중";
  }

  return new Date(timestamp.seconds * 1000).toLocaleString("ko-KR");
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

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState<ProgressRecord | null>(null);
  const [certificates, setCertificates] = useState<CertificateRecord[]>([]);
  const [drafts, setDrafts] = useState<DraftRecord[]>([]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const user = await requireAuthenticatedUser();
        const { db } = getFirebaseServices();

        const [progressSnapshot, certificateSnapshot, draftSnapshot] = await Promise.all([
          getDocs(query(collection(db, "courseProgress"), where("uid", "==", user.uid))),
          getDocs(query(collection(db, "certificates"), where("uid", "==", user.uid))),
          getDocs(query(collection(db, "aiDocuments"), where("uid", "==", user.uid))),
        ]);

        if (cancelled) {
          return;
        }

        setProgress(progressSnapshot.docs[0]?.data() ? (progressSnapshot.docs[0].data() as ProgressRecord) : null);
        setCertificates(
          certificateSnapshot.docs
            .map((doc) => ({ id: doc.id, ...(doc.data() as Omit<CertificateRecord, "id">) }))
            .sort((a, b) => (b.issuedAt?.seconds || 0) - (a.issuedAt?.seconds || 0))
        );
        setDrafts(
          draftSnapshot.docs
            .map((doc) => ({ id: doc.id, ...(doc.data() as Omit<DraftRecord, "id">) }))
            .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
        );
      } catch (loadError) {
        console.error(loadError);
        if (!cancelled) {
          const message = loadError instanceof Error ? loadError.message : "";
          if (message === "AUTH_LOGIN_REQUIRED") {
            router.replace("/login?next=/dashboard");
            setError("로그인한 회원만 내 수강현황을 확인할 수 있습니다.");
            return;
          }

          setError("수강현황 데이터를 불러오지 못했습니다. Firebase 인증과 Firestore 인덱스 상태를 확인해 주세요.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const progressSummary = useMemo(() => {
    const durationSeconds = Math.max(progress?.durationSeconds ?? defaultCourse.durationMinutes * 60, 1);
    const watchedSeconds = Math.min(progress?.watchedSeconds ?? 0, durationSeconds);
    const remainingSeconds = Math.max(progress?.remainingSeconds ?? durationSeconds - watchedSeconds, 0);
    const completionRate = progress?.completionRate ?? Math.floor((watchedSeconds / durationSeconds) * 100);
    const completedModuleCount = progress?.completedModuleCount ?? Object.values(progress?.moduleProgress ?? {}).filter((item) => item.isCompleted).length;
    const totalModuleCount = progress?.totalModuleCount ?? defaultCourse.modules.length;
    const statusLabel = progress?.isCompleted ? "전체 수료 완료" : completionRate >= 80 ? "곧 전체 수료" : "수강 진행 중";

    return {
      durationSeconds,
      watchedSeconds,
      remainingSeconds,
      completionRate,
      completedModuleCount,
      totalModuleCount,
      statusLabel,
      isCompleted: Boolean(progress?.isCompleted),
      moduleProgress: progress?.moduleProgress ?? {},
    };
  }, [progress]);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(211,173,98,0.14),transparent_22%),linear-gradient(180deg,#09111d_0%,#0d1728_32%,#eef3f8_32%,#f4f7fb_100%)] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl rounded-[2rem] border border-[#d7deea] bg-white p-6 shadow-[0_30px_80px_rgba(15,23,42,0.14)] lg:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#9b7a38]">My Course</p>
            <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-[#0f172a] sm:text-5xl">내 수강현황과 발급 문서 확인</h1>
            <p className="mt-4 max-w-3xl text-sm leading-8 text-slate-600">
              강의별 진도, 누적 수강 시간, 남은 시간, 발급 문서를 한 곳에서 확인합니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/course-room" className="inline-flex items-center justify-center rounded-full bg-[#d3ad62] px-6 py-3 text-sm font-semibold text-[#06101b] transition hover:bg-[#f0cb85]">
              수강실로 이동
            </Link>
            <Link href="/ai-draft" className="inline-flex items-center justify-center rounded-full border border-[#d6dde8] bg-[#f8fbff] px-6 py-3 text-sm font-semibold text-[#10213f] transition hover:bg-[#eef4fb]">
              성찰문 글쓰기 가이드
            </Link>
          </div>
        </div>

        {loading ? <p className="mt-8 text-sm text-slate-600">수강현황을 불러오는 중입니다...</p> : null}
        {error ? <p className="mt-8 text-sm text-[#f2a39b]">{error}</p> : null}

        {!loading && !error ? (
          <div className="mt-8 grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
            <section className="space-y-6">
              <div className="rounded-[1.75rem] border border-white/10 bg-[#0d1828] p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-[#f0cb85]">현재 코스</p>
                    <h2 className="mt-3 text-2xl font-semibold text-white">{defaultCourse.title}</h2>
                  </div>
                  <span className="rounded-full border border-[#d3ad62]/30 bg-[#d3ad62]/10 px-4 py-2 text-sm font-semibold text-[#f7dfab]">
                    {progressSummary.statusLabel}
                  </span>
                </div>

                <div className="mt-5 overflow-hidden rounded-full bg-white/10">
                  <div className="h-3 rounded-full bg-gradient-to-r from-[#d3ad62] via-[#f0cb85] to-[#fff1ca]" style={{ width: `${progressSummary.completionRate}%` }} />
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3 text-sm xl:grid-cols-4">
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-white/60">누적 수강률</p>
                    <p className="mt-2 text-white">{progressSummary.completionRate}%</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-white/60">누적 시청 시간</p>
                    <p className="mt-2 text-white">{formatDuration(progressSummary.watchedSeconds)}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-white/60">남은 시간</p>
                    <p className="mt-2 text-white">{formatDuration(progressSummary.remainingSeconds)}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-white/60">완료 강의</p>
                    <p className="mt-2 text-white">{progressSummary.completedModuleCount}/{progressSummary.totalModuleCount}강</p>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-white/60">전체 길이</p>
                    <p className="mt-2 text-white">{formatDuration(progressSummary.durationSeconds)}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-white/60">완료 여부</p>
                    <p className="mt-2 text-white">{progressSummary.isCompleted ? "완료" : "진행 중"}</p>
                  </div>
                </div>

                <p className="mt-5 text-sm leading-7 text-white/70">마지막 저장 시각: {formatTimestamp(progress?.updatedAt)}</p>
              </div>

              <div className="rounded-[1.75rem] border border-white/10 bg-[#111f33] p-6">
                <p className="text-sm font-semibold text-[#f0cb85]">강의별 수강 현황</p>
                <div className="mt-4 space-y-3">
                  {defaultCourse.modules.map((module, index) => {
                    const item = progressSummary.moduleProgress[module.id];
                    return (
                      <article key={module.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-semibold text-white">{index + 1}강. {module.title}</p>
                          <span className="text-xs text-white/55">{item?.isCompleted ? "완료" : `${item?.completionRate ?? 0}%`}</span>
                        </div>
                        <p className="mt-2 text-sm text-white/65">{formatDuration(item?.watchedSeconds ?? 0)} / {formatDuration(item?.durationSeconds ?? module.minutes * 60)}</p>
                        <div className="mt-3 overflow-hidden rounded-full bg-white/10">
                          <div className="h-2 rounded-full bg-[#d3ad62]" style={{ width: `${item?.completionRate ?? 0}%` }} />
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-[1.75rem] border border-white/10 bg-[#111f33] p-6">
                <p className="text-sm font-semibold text-[#f0cb85]">글쓰기 가이드 이력</p>
                <div className="mt-4 space-y-3">
                  {drafts.length ? (
                    drafts.slice(0, 3).map((draft) => (
                      <article key={draft.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-semibold text-white">{draftLabels[draft.documentType] ?? draft.documentType}</p>
                          <span className="text-xs text-white/55">{formatTimestamp(draft.createdAt)}</span>
                        </div>
                        <p className="mt-2 text-sm text-white/65">사건 유형: {draft.caseType}</p>
                        <p className="mt-3 line-clamp-4 whitespace-pre-wrap text-sm leading-7 text-white/80">{draft.generatedDraft}</p>
                      </article>
                    ))
                  ) : (
                    <p className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/65">아직 저장된 글쓰기 가이드 이력이 없습니다.</p>
                  )}
                </div>
              </div>
            </section>

            <section className="rounded-[1.75rem] border border-white/10 bg-[#0d1828] p-6">
              <p className="text-sm font-semibold text-[#f0cb85]">발급 문서</p>
              <h2 className="mt-3 text-3xl font-semibold text-white">PDF 3종 다운로드</h2>
              <p className="mt-4 text-sm leading-8 text-white/70">
                수강 정보와 발급 절차가 확인되면 Functions가 생성한 PDF를 여기서 확인할 수 있습니다.
              </p>

              <div className="mt-6 space-y-4">
                {certificates.length ? (
                  certificates.map((certificate) => (
                    <div key={certificate.id} className="rounded-[1.5rem] border border-white/10 bg-black/20 p-5 transition hover:bg-black/30">
                      <div>
                        <p className="text-lg font-semibold text-white">{documentLabels[certificate.documentType] ?? certificate.documentType}</p>
                        <p className="mt-2 text-sm text-white/65">문서번호 {certificate.issueNumber}</p>
                        <p className="mt-1 text-sm text-white/50">발급 시각 {formatTimestamp(certificate.issuedAt)}</p>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-3">
                        <a href={certificate.downloadUrl} target="_blank" rel="noreferrer" className="rounded-full border border-[#d9c18b] bg-[#fff6df] px-4 py-2 text-sm font-semibold text-[#6f531b] transition hover:bg-[#ffefc5]">
                          PDF 열기
                        </a>
                        {certificate.documentType === "completion" ? (
                          <Link href="/certificate" className="rounded-full border border-[#d5deeb] bg-[#f8fbff] px-4 py-2 text-sm font-semibold text-[#10213f] transition hover:border-[#c4d2e4] hover:bg-white">
                            출력 화면 열기
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[1.5rem] border border-dashed border-white/15 bg-black/20 p-6 text-sm leading-7 text-white/65">
                    아직 발급된 문서가 없습니다. 수강 정보와 필수 확인 절차가 반영되면 PDF 3종이 자동 생성됩니다.
                  </div>
                )}
              </div>
            </section>
          </div>
        ) : null}
      </div>
    </main>
  );
}
