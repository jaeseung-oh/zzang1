"use client";

import { httpsCallable } from "firebase/functions";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { getFirebaseServices } from "@/lib/firebase/client";
import { requireAuthenticatedUser } from "@/lib/firebase/session";

type DraftResponse = {
  documentId: string;
  draft: string;
  warnings: string[];
};

type FormState = {
  documentType: "reflection-letter-guide" | "petition-letter-guide";
  caseType: "dui" | "sexual" | "drug" | "violence" | "other";
  caseStage: "police" | "prosecution" | "trial";
  remorseReason: string;
  familyContext: string;
  preventionPlan: string;
  specialNotes: string;
  legalAccepted: boolean;
  userReviewAccepted: boolean;
};

const initialState: FormState = {
  documentType: "reflection-letter-guide",
  caseType: "dui",
  caseStage: "police",
  remorseReason: "",
  familyContext: "",
  preventionPlan: "",
  specialNotes: "",
  legalAccepted: false,
  userReviewAccepted: false,
};

const caseTypeLabels: Record<FormState["caseType"], string> = {
  dui: "음주운전",
  sexual: "성범죄",
  drug: "마약",
  violence: "폭행",
  other: "기타",
};

const disclaimer =
  "본 도구는 법률 검토나 상담을 제공하지 않으며, 사용자가 자신의 경험과 생각을 바탕으로 성찰문을 스스로 정리할 수 있도록 돕는 참고용 글쓰기 가이드입니다.";

export default function AiDraftPage() {
  const router = useRouter();
  const [form, setForm] = useState(initialState);
  const [result, setResult] = useState<DraftResponse | null>(null);
  const [error, setError] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setResult(null);

    if (!form.legalAccepted || !form.userReviewAccepted) {
      setError("면책 고지와 직접 검토 책임 확인에 모두 동의해야 초안 작성을 진행할 수 있습니다.");
      return;
    }

    if (!form.remorseReason.trim() || !form.preventionPlan.trim()) {
      setError("반성 사유와 재범 방지 계획은 반드시 입력해야 합니다.");
      return;
    }

    startTransition(async () => {
      try {
        await requireAuthenticatedUser();
        const { functions } = getFirebaseServices();
        const callable = httpsCallable<FormState, DraftResponse>(functions, "generateSentencingDraft");
        const response = await callable(form);
        setResult(response.data);
      } catch (submitError) {
        console.error(submitError);
        const message = submitError instanceof Error ? submitError.message : "";
        if (message === "AUTH_LOGIN_REQUIRED") {
          router.replace("/login?next=/ai-draft");
          setError("로그인한 회원만 AI 글쓰기 가이드를 사용할 수 있습니다.");
          return;
        }

        setError("초안 작성 중 문제가 발생했습니다. Firebase Functions 설정과 OpenAI API 키를 확인해 주세요.");
      }
    });
  };

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#07111f_0%,#09111d_45%,#050a12_100%)] px-4 py-10 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-6 rounded-[2rem] border border-white/10 bg-white/[0.03] p-6 shadow-[0_30px_80px_rgba(0,0,0,0.3)] lg:flex-row lg:items-start lg:justify-between lg:p-8">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#f0cb85]">Phase 3. Reflection Writing Guide</p>
            <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
              성찰문 글쓰기 가이드
            </h1>
            <p className="mt-5 max-w-2xl text-sm leading-8 text-white/70 sm:text-base">
              사건 이후의 성찰, 생활 변화, 재발 방지 계획을 바탕으로 스스로 글의 구조를 정리할 수 있게 돕습니다.
              생성된 문구는 참고용 예시이며, 사용자가 직접 사실관계를 확인하고 자신의 표현으로 수정한 뒤 사용해야 합니다.
            </p>
          </div>
          <div className="w-full max-w-md rounded-[1.5rem] border border-[#d3ad62]/20 bg-[#0b1523] p-5">
            <p className="text-sm font-semibold text-[#f0cb85]">중요 고지</p>
            <p className="mt-3 text-sm leading-7 text-white/75">{disclaimer}</p>
            <div className="mt-5 space-y-2 text-sm text-white/75">
              <div>• 과장 없이 사실관계와 생활 변화 중심으로 정리</div>
              <div>• 사용자가 직접 검토 및 수정</div>
              <div>• 법률 문서 작성 대행이나 법률대리 기능 아님</div>
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-[1.75rem] border border-[#f3c97a]/30 bg-[linear-gradient(180deg,rgba(255,214,128,0.18),rgba(255,214,128,0.08))] p-5 text-[#fff4d8] shadow-[0_14px_34px_rgba(0,0,0,0.18)]">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#f5d48d]">Warning Alert</p>
          <p className="mt-3 text-sm leading-8 text-[#fff6e5]">⚠️ 주의: 본 가이드와 템플릿은 사용자의 자발적인 성찰을 돕기 위한 예시이며, 개별 사건에 대한 법률적 검토를 거친 서면이 아닙니다. 법원 및 수사기관 제출 시 법적 방어를 위한 대필/첨삭 등 법률 사무 기능을 제공하지 않으니, 오직 개인의 진심을 담는 참고 용도로만 활용하시기 바랍니다.</p>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <form onSubmit={handleSubmit} className="rounded-[2rem] border border-white/10 bg-[#0d1828] p-6 lg:p-8">
            <div className="grid gap-6 md:grid-cols-2">
              <label className="space-y-2 text-sm text-white/80">
                <span>가이드 유형</span>
                <select
                  value={form.documentType}
                  onChange={(e) => updateField("documentType", e.target.value as FormState["documentType"])}
                  className="w-full rounded-2xl border border-white/10 bg-[#08111d] px-4 py-3 text-white outline-none"
                >
                  <option value="reflection-letter-guide">성찰문 글쓰기 가이드</option>
                  <option value="petition-letter-guide">주변인 의견문 정리 가이드</option>
                </select>
              </label>

              <label className="space-y-2 text-sm text-white/80">
                <span>사건 유형</span>
                <select
                  value={form.caseType}
                  onChange={(e) => updateField("caseType", e.target.value as FormState["caseType"])}
                  className="w-full rounded-2xl border border-white/10 bg-[#08111d] px-4 py-3 text-white outline-none"
                >
                  {Object.entries(caseTypeLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2 text-sm text-white/80 md:col-span-2">
                <span>현재 절차 단계</span>
                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    ["police", "경찰 조사 단계"],
                    ["prosecution", "검찰 단계"],
                    ["trial", "재판 단계"],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => updateField("caseStage", value as FormState["caseStage"])}
                      className={
                        form.caseStage === value
                          ? "rounded-2xl border border-[#d3ad62] bg-[#d3ad62]/15 px-4 py-3 text-sm font-semibold text-white"
                          : "rounded-2xl border border-white/10 bg-[#08111d] px-4 py-3 text-sm text-white/70"
                      }
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </label>

              <label className="space-y-2 text-sm text-white/80 md:col-span-2">
                <span>반성 사유</span>
                <textarea
                  value={form.remorseReason}
                  onChange={(e) => updateField("remorseReason", e.target.value)}
                  placeholder="사건 이후 반성하고 있는 이유, 피해 회복 노력, 생활 변화 등을 구체적으로 적어 주세요."
                  className="min-h-32 w-full rounded-2xl border border-white/10 bg-[#08111d] px-4 py-3 text-white outline-none"
                />
              </label>

              <label className="space-y-2 text-sm text-white/80">
                <span>가족 및 생활 배경</span>
                <textarea
                  value={form.familyContext}
                  onChange={(e) => updateField("familyContext", e.target.value)}
                  placeholder="부양 가족, 직장, 치료 상황, 주변의 도움 등을 입력해 주세요."
                  className="min-h-28 w-full rounded-2xl border border-white/10 bg-[#08111d] px-4 py-3 text-white outline-none"
                />
              </label>

              <label className="space-y-2 text-sm text-white/80">
                <span>재범 방지 계획</span>
                <textarea
                  value={form.preventionPlan}
                  onChange={(e) => updateField("preventionPlan", e.target.value)}
                  placeholder="교육 수강, 치료, 상담, 생활 습관 변화 계획 등을 적어 주세요."
                  className="min-h-28 w-full rounded-2xl border border-white/10 bg-[#08111d] px-4 py-3 text-white outline-none"
                />
              </label>

              <label className="space-y-2 text-sm text-white/80 md:col-span-2">
                <span>추가 메모</span>
                <textarea
                  value={form.specialNotes}
                  onChange={(e) => updateField("specialNotes", e.target.value)}
                  placeholder="반드시 포함하고 싶은 사정이나 제출 맥락이 있으면 적어 주세요."
                  className="min-h-24 w-full rounded-2xl border border-white/10 bg-[#08111d] px-4 py-3 text-white outline-none"
                />
              </label>
            </div>

            <div className="mt-6 space-y-3 rounded-[1.5rem] border border-white/10 bg-black/20 p-5">
              <label className="flex items-start gap-3 text-sm leading-7 text-white/85">
                <input
                  type="checkbox"
                  checked={form.legalAccepted}
                  onChange={(e) => updateField("legalAccepted", e.target.checked)}
                  className="mt-1 h-4 w-4 accent-[#d3ad62]"
                />
                <span>{disclaimer}</span>
              </label>
              <label className="flex items-start gap-3 text-sm leading-7 text-white/85">
                <input
                  type="checkbox"
                  checked={form.userReviewAccepted}
                  onChange={(e) => updateField("userReviewAccepted", e.target.checked)}
                  className="mt-1 h-4 w-4 accent-[#d3ad62]"
                />
                <span>생성된 초안은 사용자가 직접 사실관계를 확인하고 최종 수정한 뒤 사용해야 함을 이해했습니다.</span>
              </label>
            </div>

            {error ? <p className="mt-4 text-sm text-[#f2a39b]">{error}</p> : null}

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={isPending}
                className="inline-flex items-center justify-center rounded-full bg-[#d3ad62] px-6 py-3 text-sm font-semibold text-[#06101b] transition hover:bg-[#f0cb85] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending ? "초안 생성 중..." : "AI 초안 생성하기"}
              </button>
              <Link href="/" className="inline-flex items-center justify-center rounded-full border border-[#d5deeb] bg-white px-6 py-3 text-sm font-semibold text-[#10213f] shadow-[0_10px_20px_rgba(15,23,42,0.12)] transition hover:-translate-y-0.5 hover:border-[#c4d2e4] hover:bg-[#f8fbff]">
                메인으로 돌아가기
              </Link>
            </div>
          </form>

          <section className="rounded-[2rem] border border-white/10 bg-[#111f33] p-6 lg:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#f0cb85]">Draft Preview</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-white">초안 미리보기</h2>
            <p className="mt-4 text-sm leading-8 text-white/70">
              Firebase Cloud Functions가 OpenAI API를 호출해 사건 유형과 작성 목적에 맞는 초안 구조를 생성합니다.
            </p>

            <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-[#08111d] p-5">
              {result ? (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
                    <p className="text-sm text-white/70">생성된 문서 ID</p>
                    <span className="rounded-full border border-[#d3ad62]/30 bg-[#d3ad62]/10 px-3 py-1 text-xs text-[#f0cb85]">
                      {result.documentId}
                    </span>
                  </div>
                  {result.warnings.length ? (
                    <div className="mt-4 rounded-2xl border border-[#d3ad62]/20 bg-[#d3ad62]/10 p-4 text-sm leading-7 text-[#f7dfab]">
                      {result.warnings.map((warning) => (
                        <p key={warning}>{warning}</p>
                      ))}
                    </div>
                  ) : null}
                  <div className="mt-5 whitespace-pre-wrap text-sm leading-8 text-white/85">{result.draft}</div>
                </>
              ) : (
                <div className="space-y-4 text-sm leading-8 text-white/65">
                  <p>• 생성 결과에는 사건 개요, 반성 내용, 재범 방지 계획, 제출 전 확인 문구가 포함됩니다.</p>
                  <p>• Functions는 위험 표현을 걸러내고, 법률 자문처럼 보일 수 있는 표현을 피하도록 프롬프트를 제한합니다.</p>
                  <p>• 생성 후 Firestore의 `aiDocuments` 컬렉션에 초안과 사용자 검토 확인 여부를 저장할 수 있습니다.</p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
