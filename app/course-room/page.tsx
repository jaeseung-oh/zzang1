"use client";

import { httpsCallable } from "firebase/functions";
import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { defaultCourse } from "@/lib/course/catalog";
import { getFirebaseServices } from "@/lib/firebase/client";
import { ensureAnonymousSession } from "@/lib/firebase/session";

type SaveCourseProgressResponse = {
  progressId: string;
  completionRate: number;
  isCompleted: boolean;
  issuedCertificates: Array<{
    certificateId: string;
    documentType: string;
    downloadUrl: string;
  }>;
};

type CaseType = "dui" | "sexual" | "drug" | "violence" | "other";

const caseTypeOptions: Array<{ value: CaseType; label: string }> = [
  { value: "dui", label: "음주운전" },
  { value: "sexual", label: "성범죄" },
  { value: "drug", label: "마약" },
  { value: "violence", label: "폭행" },
  { value: "other", label: "기타" },
];

const disclaimer =
  "본 과정은 법률 검토나 상담을 제공하지 않으며, 사용자가 자신의 생활 변화와 재발 방지 계획을 스스로 정리할 수 있도록 돕는 민간 교육 서비스입니다.";

export default function CourseRoomPage() {
  const [learnerName, setLearnerName] = useState("");
  const [caseType, setCaseType] = useState<CaseType>("dui");
  const [moduleState, setModuleState] = useState<Record<string, boolean>>(
    Object.fromEntries(defaultCourse.modules.map((module) => [module.id, false]))
  );
  const [legalAccepted, setLegalAccepted] = useState(false);
  const [reviewAccepted, setReviewAccepted] = useState(false);
  const [statusMessage, setStatusMessage] = useState("익명 세션을 준비하는 중입니다.");
  const [error, setError] = useState("");
  const [result, setResult] = useState<SaveCourseProgressResponse | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;

    ensureAnonymousSession()
      .then(() => {
        if (!cancelled) {
          setStatusMessage("수강 진행과 발급 이력을 저장할 준비가 완료되었습니다.");
        }
      })
      .catch((sessionError) => {
        if (!cancelled) {
          console.error(sessionError);
          setError("Firebase 익명 로그인에 실패했습니다. Authentication에서 Anonymous 제공자를 활성화해 주세요.");
          setStatusMessage("세션 준비에 실패했습니다.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const completion = useMemo(() => {
    const completedCount = Object.values(moduleState).filter(Boolean).length;
    const totalCount = defaultCourse.modules.length;
    const completionRate = Math.round((completedCount / totalCount) * 100);
    const watchedMinutes = defaultCourse.modules
      .filter((module) => moduleState[module.id])
      .reduce((sum, module) => sum + module.minutes, 0);

    return { completedCount, totalCount, completionRate, watchedMinutes };
  }, [moduleState]);

  const handleToggleModule = (moduleId: string) => {
    setModuleState((prev) => ({ ...prev, [moduleId]: !prev[moduleId] }));
  };

  const markReadyForCertificate = () => {
    setModuleState(Object.fromEntries(defaultCourse.modules.map((module) => [module.id, true])));
    setLegalAccepted(true);
    setReviewAccepted(true);
    if (!learnerName.trim()) {
      setLearnerName("테스트 수강생");
    }
    setError("");
    setStatusMessage("테스트 발급용으로 전체 수강 완료와 확인 항목을 미리 채웠습니다.");
  };

  const handleSave = () => {
    setError("");
    setResult(null);

    if (!learnerName.trim()) {
      setError("문서 발급용 이름을 입력해 주세요.");
      return;
    }

    if (!legalAccepted || !reviewAccepted) {
      setError("면책 고지와 직접 검토 책임 확인에 모두 동의해야 진행할 수 있습니다.");
      return;
    }

    startTransition(async () => {
      try {
        await ensureAnonymousSession();
        const { functions } = getFirebaseServices();
        const callable = httpsCallable<
          {
            courseId: string;
            courseTitle: string;
            learnerName: string;
            caseType: CaseType;
            watchedSeconds: number;
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
          learnerName: learnerName.trim(),
          caseType,
          watchedSeconds: completion.watchedMinutes * 60,
          completionRate: completion.completionRate,
          isCompleted: completion.completionRate === 100,
          legalAccepted,
          userReviewAccepted: reviewAccepted,
        });

        setResult(response.data);
        setStatusMessage(
          response.data.isCompleted
            ? "수강 완료가 저장되었고 발급 문서 3종이 준비되었습니다."
            : "현재 수강 진행률이 저장되었습니다."
        );
      } catch (submitError) {
        console.error(submitError);
        setError("수강 진행 저장 중 문제가 발생했습니다. Functions 배포 상태와 Firebase 인증 설정을 확인해 주세요.");
      }
    });
  };

  return (
    <main className="min-h-screen px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-6 shadow-[0_30px_80px_rgba(0,0,0,0.3)] lg:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#f0cb85]">Phase 3. Course Room</p>
              <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
                1시간 수강과 문서 발급 준비를 한 화면에서 진행
              </h1>
              <p className="mt-5 max-w-2xl text-sm leading-8 text-white/70 sm:text-base">
                결제 연동은 마지막 단계로 미뤄 둔 상태입니다. 현재 화면에서는 익명 세션 기준으로 수강 진행률과 발급 문서 흐름을 먼저 검증할 수 있습니다.
              </p>
            </div>
            <div className="w-full max-w-md rounded-[1.5rem] border border-[#d3ad62]/20 bg-[#0b1523] p-5">
              <p className="text-sm font-semibold text-[#f0cb85]">현재 코스</p>
              <h2 className="mt-3 text-2xl font-semibold text-white">{defaultCourse.title}</h2>
              <p className="mt-3 text-sm leading-7 text-white/75">{defaultCourse.subtitle}</p>
              <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-white/60">총 길이</p>
                  <p className="mt-2 text-white">{defaultCourse.durationMinutes}분</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-white/60">결제 상태</p>
                  <p className="mt-2 text-white">{defaultCourse.priceLabel}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <section className="rounded-[2rem] border border-white/10 bg-[#0d1828] p-6 lg:p-8">
              <div className="grid gap-6 md:grid-cols-2">
                <label className="space-y-2 text-sm text-white/80">
                  <span>발급 문서 이름</span>
                  <input
                    value={learnerName}
                    onChange={(event) => setLearnerName(event.target.value)}
                    placeholder="홍길동"
                    className="w-full rounded-2xl border border-white/10 bg-[#08111d] px-4 py-3 text-white outline-none"
                  />
                </label>
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
              </div>

              <div className="mt-6 space-y-3">
                {defaultCourse.modules.map((module, index) => (
                  <button
                    key={module.id}
                    type="button"
                    onClick={() => handleToggleModule(module.id)}
                    className={
                      moduleState[module.id]
                        ? "flex w-full items-start justify-between gap-4 rounded-[1.5rem] border border-[#d3ad62] bg-[#d3ad62]/12 p-5 text-left"
                        : "flex w-full items-start justify-between gap-4 rounded-[1.5rem] border border-white/10 bg-[#08111d] p-5 text-left"
                    }
                  >
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#f0cb85]">Module {index + 1}</p>
                      <h3 className="mt-3 text-xl font-semibold text-white">{module.title}</h3>
                      <p className="mt-2 text-sm leading-7 text-white/70">{module.summary}</p>
                    </div>
                    <div className="min-w-18 rounded-full border border-white/10 px-3 py-2 text-center text-sm text-white/80">
                      {module.minutes}분
                    </div>
                  </button>
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

              {error ? <p className="mt-4 text-sm text-[#f2a39b]">{error}</p> : null}

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isPending}
                  className="inline-flex items-center justify-center rounded-full bg-[#d3ad62] px-6 py-3 text-sm font-semibold text-[#06101b] transition hover:bg-[#f0cb85] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isPending ? "저장 중..." : completion.completionRate === 100 ? "수강 완료 저장 및 문서 발급" : "현재 진행률 저장"}
                </button>
                <button
                  type="button"
                  onClick={markReadyForCertificate}
                  disabled={isPending}
                  className="inline-flex items-center justify-center rounded-full border border-[#d3ad62]/40 bg-[#d3ad62]/10 px-6 py-3 text-sm font-semibold text-[#f0cb85] transition hover:bg-[#d3ad62]/15 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  테스트용 수료증 바로 발급
                </button>
                <Link href="/dashboard" className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
                  대시보드 보기
                </Link>
              </div>
            </section>

            <aside className="rounded-[2rem] border border-white/10 bg-[#111f33] p-6 lg:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#f0cb85]">Progress</p>
              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-white">현재 수강 현황</h2>
              <div className="mt-6 overflow-hidden rounded-full bg-white/10">
                <div className="h-3 rounded-full bg-[#d3ad62]" style={{ width: `${completion.completionRate}%` }} />
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-white/60">진행률</p>
                  <p className="mt-2 text-white">{completion.completionRate}%</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-white/60">완료 모듈</p>
                  <p className="mt-2 text-white">
                    {completion.completedCount}/{completion.totalCount}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-white/60">학습 시간</p>
                  <p className="mt-2 text-white">{completion.watchedMinutes}분</p>
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
                <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-[#08111d] p-5">
                  <p className="text-sm font-semibold text-white">즉시 다운로드</p>
                  <div className="mt-4 space-y-3">
                    {result.issuedCertificates.map((certificate) => (
                      <div
                        key={certificate.certificateId}
                        className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white"
                      >
                        <p>{certificate.documentType}</p>
                        <div className="mt-3 flex flex-wrap gap-3">
                          <a
                            href={certificate.downloadUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-full border border-white/10 px-4 py-2 text-sm transition hover:bg-black/30"
                          >
                            PDF 열기
                          </a>
                          {certificate.documentType === "completion" ? (
                            <Link
                              href="/certificate"
                              className="rounded-full border border-[#d3ad62]/40 bg-[#d3ad62]/10 px-4 py-2 text-sm font-semibold text-[#f0cb85] transition hover:bg-[#d3ad62]/15"
                            >
                              출력 화면 열기
                            </Link>
                          ) : null}
                        </div>
                      </div>
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
