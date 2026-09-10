"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { applicationCourseCategories } from "@/lib/course/application-products";
import { attributionParamKeys, attributionStorageKey, type AttributionParams } from "@/lib/marketing/attribution";
import { trackEvent } from "@/lib/analytics/ga";
import { buttonClass } from "@/app/components/ui/button-styles";
import {
  assessmentStepLabels,
  calculateAssessment,
  commonRiskOptions,
  effortOptions,
  getAssessmentCategoryRiskConfig,
  priorHistoryOptions,
  procedureStageOptions,
  toggleExclusiveSelection,
  type AssessmentInput,
  type PriorHistoryId,
  type ProcedureStageId,
} from "@/lib/assessment/course-assessment";

type AssessmentStep = 0 | 1 | 2 | 3 | 4 | 5 | 6;

const defaultAssessment: AssessmentInput = {
  categoryId: "dui",
  procedureStageId: "police_before",
  priorHistoryId: "none",
  commonRiskIds: [],
  categoryRiskIds: [],
  effortIds: [],
};

function appendStoredAttribution(href: string) {
  if (typeof window === "undefined") return href;
  try {
    const stored = JSON.parse(window.sessionStorage.getItem(attributionStorageKey) || "{}") as AttributionParams;
    const url = new URL(href, window.location.origin);
    Object.entries(stored).forEach(([key, value]) => {
      if (value && !url.searchParams.has(key)) url.searchParams.set(key, value);
    });
    return url.pathname + url.search;
  } catch {
    return href;
  }
}

function applyHref(categoryId: string, productId: string) {
  return appendStoredAttribution("/courses/apply/?category=" + encodeURIComponent(categoryId) + "&productId=" + encodeURIComponent(productId));
}

export function AttributionCapture() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const next: AttributionParams = {};
    attributionParamKeys.forEach((key) => {
      const value = params.get(key);
      if (value) next[key] = value.slice(0, 160);
    });
    if (Object.keys(next).length === 0) return;
    try {
      const prev = JSON.parse(window.sessionStorage.getItem(attributionStorageKey) || "{}") as AttributionParams;
      window.sessionStorage.setItem(attributionStorageKey, JSON.stringify({ ...prev, ...next }));
    } catch {
      // Attribution capture must never block the site.
    }
  }, []);
  return null;
}

export function IntentBanner({ defaultCategoryId = "dui" }: { defaultCategoryId?: string }) {
  const [intent, setIntent] = useState("");
  useEffect(() => {
    setIntent(new URLSearchParams(window.location.search).get("intent") || "");
  }, []);

  const category = applicationCourseCategories.find((item) => item.id === defaultCategoryId) || applicationCourseCategories[0];
  const counseling = category.products.find((product) => product.planId === "counseling" || product.id.endsWith("-counseling"));
  if (!intent || !["certificate", "sentencing", "counseling"].includes(intent)) return null;

  const copy = intent === "certificate"
    ? ["수료증이 필요한 교육을 찾고 계신가요?", "온라인으로 교육을 이수하고 과정에 따른 수료자료를 확인할 수 있습니다."]
    : intent === "sentencing"
      ? ["재범방지교육과 관련 자료를 준비하고 계신가요?", "사건 유형에 맞는 교육과정을 이수하고 수료증, 재발방지계획서 등 과정별 자료를 준비할 수 있습니다."]
      : ["개별 심리상담과 상담자료가 필요한 경우", "심리상담 종합과정에서는 온라인 교육과 함께 개별 상담을 진행할 수 있습니다."];

  return (
    <div className="border-b border-[#d7e1ef] bg-white px-4 py-3 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="break-keep text-base font-black text-[#173968]">{copy[0]}</p>
          <p className="mt-1 break-keep text-sm font-semibold leading-6 text-slate-600">{copy[1]}</p>
        </div>
        {intent === "counseling" && counseling ? <Link href={applyHref(category.id, counseling.id)} className={buttonClass("secondary", "sm", "shrink-0 rounded-full px-4 font-black")}>상담과정 바로 보기</Link> : null}
      </div>
    </div>
  );
}

function ProgressIndicator({ step }: { step: AssessmentStep }) {
  const current = Math.max(1, Math.min(6, step || 1));
  return (
    <div className="border-b border-slate-200 bg-slate-50 px-5 py-3">
      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="진단 진행단계">
        {assessmentStepLabels.map((label, index) => {
          const active = index + 1 === current;
          const done = index + 1 < current;
          return <span key={label} className={(active ? "border-[#173968] bg-[#173968] text-white" : done ? "border-[#176b68] bg-[#edf7f4] text-[#176b68]" : "border-slate-200 bg-white text-slate-500") + " shrink-0 rounded-full border px-3 py-1.5 text-xs font-black"}>{label}</span>;
        })}
      </div>
    </div>
  );
}

function ChoiceButton({ selected, title, description, onClick }: { selected: boolean; title: string; description?: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={(selected ? "border-[#173968] bg-[#eef4fb] ring-2 ring-[#173968]/15" : "border-slate-200 bg-white hover:border-[#173968] hover:bg-slate-50") + " flex min-h-14 w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition"}>
      <span className={(selected ? "border-[#173968] bg-[#173968] text-white" : "border-slate-300 bg-white text-transparent") + " mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs font-black"}>✓</span>
      <span className="min-w-0">
        <span className="block break-keep text-sm font-black leading-5 text-slate-950">{title}</span>
        {description ? <span className="mt-1 block break-keep text-xs font-semibold leading-5 text-slate-600">{description}</span> : null}
        {selected ? <span className="mt-1 block text-xs font-black text-[#173968]">선택됨</span> : null}
      </span>
    </button>
  );
}

function MultiChoiceButton({ selected, title, onClick }: { selected: boolean; title: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={(selected ? "border-[#173968] bg-[#eef4fb] ring-2 ring-[#173968]/15" : "border-slate-200 bg-white hover:border-[#173968] hover:bg-slate-50") + " flex min-h-12 w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition"}>
      <span className={(selected ? "border-[#173968] bg-[#173968] text-white" : "border-slate-300 bg-white text-transparent") + " flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs font-black"}>✓</span>
      <span className="break-keep text-sm font-bold leading-5 text-slate-900">{title}</span>
    </button>
  );
}

export function CourseRecommendation({ triggerLabel = "나에게 맞는 강의 찾기", compact = false }: { triggerLabel?: string; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<AssessmentStep>(0);
  const [answers, setAnswers] = useState<AssessmentInput>(defaultAssessment);
  const categoryRiskConfig = useMemo(() => getAssessmentCategoryRiskConfig(answers.categoryId), [answers.categoryId]);
  const result = useMemo(() => calculateAssessment(answers), [answers]);
  const canContinueRisks = answers.commonRiskIds.length > 0 && (categoryRiskConfig.options.length === 0 || answers.categoryRiskIds.length > 0);

  const openModal = () => {
    setAnswers(defaultAssessment);
    setStep(0);
    setOpen(true);
    trackEvent("course_recommend_start");
  };

  const completeAssessment = () => {
    setStep(6);
    const calculated = calculateAssessment(answers);
    trackEvent("course_recommend_complete", { category: calculated.category.id, recommendedProduct: calculated.recommendedProductId, riskLevel: calculated.riskLevel });
  };

  const selectCategory = (categoryId: string) => {
    setAnswers((current) => ({ ...current, categoryId, commonRiskIds: [], categoryRiskIds: [] }));
    setStep(2);
  };

  const updateProcedure = (procedureStageId: ProcedureStageId) => {
    setAnswers((current) => ({ ...current, procedureStageId }));
    setStep(3);
  };

  const updateHistory = (priorHistoryId: PriorHistoryId) => {
    setAnswers((current) => ({ ...current, priorHistoryId }));
    setStep(4);
  };

  const modalTitle = step === 0 ? "나에게 맞는 강의 찾기" : step === 6 ? "나에게 맞는 강의 찾기 결과" : "나에게 맞는 강의 찾기";

  return (
    <>
      <button type="button" onClick={openModal} className={buttonClass("primary", compact ? "md" : "lg", compact ? "w-full rounded-lg px-4 font-black sm:w-auto" : "w-full rounded-lg px-7 font-black sm:w-auto")}>{triggerLabel}</button>
      {open ? (
        <div className="fixed inset-0 z-50 bg-slate-950/55 px-3 py-4 backdrop-blur-sm sm:px-4 sm:py-5" role="dialog" aria-modal="true" aria-label={modalTitle}>
          <div className="mx-auto flex max-h-[calc(100vh-2rem)] max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-[0_26px_70px_rgba(15,23,42,0.28)]">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[#176b68]">Structured Assessment</p>
                <h2 className="mt-1 break-keep text-2xl font-black text-slate-950">{modalTitle}</h2>
                {step > 0 && step < 6 ? <p className="mt-1 text-sm font-bold text-slate-500">교육과정 선택을 위한 참고용 진단입니다.</p> : null}
              </div>
              <button type="button" onClick={() => setOpen(false)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-300 text-xl font-black text-slate-700" aria-label="닫기">×</button>
            </div>
            {step > 0 ? <ProgressIndicator step={step} /> : null}
            <div className="overflow-y-auto p-5 sm:p-6">
              {step === 0 ? <div>
                <h3 className="break-keep text-2xl font-black leading-tight text-slate-950">나에게 맞는 강의 찾기</h3>
                <p className="mt-4 break-keep text-base font-semibold leading-7 text-slate-700">사건 진행단계, 과거 동종·유사 전력, 사건의 위험요인 및 현재까지의 재범방지 노력을 종합하여 적합한 교육과정을 안내합니다.</p>
                <p className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 break-keep text-xs font-semibold leading-5 text-slate-600">본 진단은 교육과정 선택을 위한 참고자료이며, 형사사건의 결과나 형량을 예측하는 법률상담이 아닙니다.</p>
                <button type="button" onClick={() => setStep(1)} className={buttonClass("primary", "lg", "mt-6 w-full rounded-xl font-black sm:w-auto")}>진단 시작하기</button>
              </div> : null}

              {step === 1 ? <div>
                <h3 className="break-keep text-xl font-black text-slate-950">어떤 사건과 관련된 교육을 찾고 계신가요?</h3>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">{applicationCourseCategories.map((item) => <ChoiceButton key={item.id} selected={answers.categoryId === item.id} title={item.title.replace(" 재범방지교육", "").replace(" 재발방지교육", "")} description={item.description} onClick={() => selectCategory(item.id)} />)}</div>
              </div> : null}

              {step === 2 ? <div>
                <h3 className="break-keep text-xl font-black text-slate-950">현재 사건은 어느 단계에 있나요?</h3>
                <div className="mt-4 grid gap-2">{procedureStageOptions.map((item) => <ChoiceButton key={item.id} selected={answers.procedureStageId === item.id} title={item.label} description={item.description} onClick={() => updateProcedure(item.id as ProcedureStageId)} />)}</div>
              </div> : null}

              {step === 3 ? <div>
                <h3 className="break-keep text-xl font-black text-slate-950">과거 동종 또는 유사한 사건으로 처분·처벌받은 경험이 있나요?</h3>
                <div className="mt-4 grid gap-2">{priorHistoryOptions.map((item) => <ChoiceButton key={item.id} selected={answers.priorHistoryId === item.id} title={item.label} description={item.description} onClick={() => updateHistory(item.id as PriorHistoryId)} />)}</div>
              </div> : null}

              {step === 4 ? <div>
                <h3 className="break-keep text-xl font-black text-slate-950">이번 사건에서 다음에 해당하는 사항이 있나요?</h3>
                <p className="mt-2 text-sm font-semibold text-slate-600">복수 선택이 가능합니다.</p>
                <div className="mt-4 grid gap-2">{commonRiskOptions.map((item) => <MultiChoiceButton key={item.id} selected={answers.commonRiskIds.includes(item.id)} title={item.label} onClick={() => setAnswers((current) => ({ ...current, commonRiskIds: toggleExclusiveSelection(current.commonRiskIds, item) }))} />)}</div>
                {categoryRiskConfig.options.length ? <div className="mt-6 border-t border-slate-200 pt-5"><h4 className="break-keep text-lg font-black text-slate-950">{categoryRiskConfig.question}</h4><div className="mt-3 grid gap-2">{categoryRiskConfig.options.map((item) => <MultiChoiceButton key={item.id} selected={answers.categoryRiskIds.includes(item.id)} title={item.label} onClick={() => setAnswers((current) => ({ ...current, categoryRiskIds: toggleExclusiveSelection(current.categoryRiskIds, item) }))} />)}</div></div> : null}
                <button type="button" onClick={() => setStep(5)} disabled={!canContinueRisks} className={buttonClass("primary", "md", "mt-6 w-full rounded-xl font-black disabled:opacity-60")}>다음</button>
              </div> : null}

              {step === 5 ? <div>
                <h3 className="break-keep text-xl font-black text-slate-950">사건 이후 현재까지 어떤 노력을 하고 계신가요?</h3>
                <p className="mt-2 text-sm font-semibold text-slate-600">복수 선택이 가능합니다. 선택한 내용은 결과 안내에만 사용됩니다.</p>
                <div className="mt-4 grid gap-2">{effortOptions.map((item) => <MultiChoiceButton key={item.id} selected={answers.effortIds.includes(item.id)} title={item.label} onClick={() => setAnswers((current) => ({ ...current, effortIds: toggleExclusiveSelection(current.effortIds, item) }))} />)}</div>
                <button type="button" onClick={completeAssessment} disabled={answers.effortIds.length === 0} className={buttonClass("primary", "md", "mt-6 w-full rounded-xl font-black disabled:opacity-60")}>결과 확인하기</button>
              </div> : null}

              {step === 6 ? <div>
                <p className="text-sm font-black text-[#176b68]">권장 교육수준</p>
                <h3 className="mt-2 break-keep text-2xl font-black leading-tight text-slate-950">{result.levelTitle}</h3>
                <div className="mt-5 rounded-2xl border-2 border-[#173968] bg-[#f8fbff] p-5">
                  <p className="text-sm font-black text-slate-500">추천 과정</p>
                  <h4 className="mt-1 break-keep text-2xl font-black text-slate-950">{result.recommendationTitle}</h4>
                  <p className="mt-2 text-3xl font-black text-[#173968]">{result.formattedPrice}</p>
                  <Link href={applyHref(result.category.id, result.product.id)} className={buttonClass("primary", "lg", "mt-5 w-full rounded-xl font-black")}>{result.product.title} 신청하기</Link>
                </div>
                <section className="mt-6">
                  <h4 className="text-lg font-black text-slate-950">진단 요약</h4>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">입력하신 내용을 기준으로 다음 요소가 확인되었습니다.</p>
                  <ul className="mt-3 grid gap-2">{result.factors.map((item) => <li key={item} className="rounded-xl bg-slate-50 px-4 py-2 text-sm font-bold leading-6 text-slate-800">{item}</li>)}</ul>
                </section>
                <section className="mt-6">
                  <h4 className="text-lg font-black text-slate-950">왜 이 과정을 권장하나요?</h4>
                  <div className="mt-3 grid gap-3">{result.reasoning.slice(0, 4).map((item) => <p key={item} className="break-keep text-sm font-semibold leading-7 text-slate-700">{item}</p>)}</div>
                </section>
                <section className="mt-6">
                  <h4 className="text-lg font-black text-slate-950">권장 교육내용</h4>
                  <ul className="mt-3 grid gap-2 sm:grid-cols-2">{result.recommendedContents.map((item) => <li key={item} className="flex gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-800"><span className="text-[#176b68]">✓</span><span>{item}</span></li>)}</ul>
                </section>
                {result.secondaryRecommendations.length ? <section className="mt-6 border-t border-slate-200 pt-5"><h4 className="text-lg font-black text-slate-950">다른 과정도 비교할 수 있습니다</h4><div className="mt-3 grid gap-2 sm:grid-cols-2">{result.secondaryRecommendations.map(({ plan, product }) => <Link key={product.id} href={applyHref(result.category.id, product.id)} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold leading-6 text-slate-800 hover:border-[#173968] hover:bg-slate-50"><span className="block text-xs font-black text-slate-500">{plan === "counseling" ? "보다 집중적인 개별 상담이 필요한 경우" : plan === "basic" ? "기본 교육만 원하는 경우" : "구조화된 심화교육이 필요한 경우"}</span><span className="mt-1 block text-base font-black text-slate-950">{product.title}</span><span className="mt-1 block font-black text-[#173968]">{product.price.toLocaleString("ko-KR")}원</span></Link>)}</div></section> : null}
                <p className="mt-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 break-keep text-xs font-semibold leading-5 text-slate-500">본 진단 결과는 입력하신 내용을 바탕으로 적합한 교육 수준을 안내하기 위한 참고자료입니다. 구체적인 형사처분, 재판 결과 또는 양형을 예측하거나 보장하지 않으며, 사건에 대한 법률적 판단이 필요한 경우 변호사 등 법률전문가의 상담을 이용하시기 바랍니다.</p>
              </div> : null}
            </div>
            {step > 1 && step < 6 ? <div className="flex items-center justify-between border-t border-slate-200 p-4"><button type="button" onClick={() => setStep((step - 1) as AssessmentStep)} className="text-sm font-black text-[#173968]">이전 단계</button><button type="button" onClick={() => setOpen(false)} className="text-sm font-bold text-slate-500">닫기</button></div> : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
