"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { applicationCourseCategories, formatApplicationKrw, isCounselingProductId, type ApplicationCourseCategory, type ApplicationIconName, type ApplicationProduct } from "@/lib/course/application-products";
import { attributionParamKeys, attributionStorageKey, type AttributionParams } from "@/lib/marketing/attribution";
import { trackEvent } from "@/lib/analytics/ga";
import { buttonClass } from "@/app/components/ui/button-styles";

function getStoredAttribution() {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(window.sessionStorage.getItem(attributionStorageKey) || "{}") as AttributionParams; } catch { return {}; }
}

function appendAttributionParams(href: string) {
  if (typeof window === "undefined") return href;
  const url = new URL(href, window.location.origin);
  const stored = getStoredAttribution();
  attributionParamKeys.forEach((key) => {
    const liveValue = new URLSearchParams(window.location.search).get(key);
    const value = liveValue || stored[key];
    if (value && !url.searchParams.has(key)) url.searchParams.set(key, value);
  });
  return url.pathname + url.search;
}

function CourseIcon({ name, className = "h-6 w-6" }: { name: ApplicationIconName; className?: string }) {
  const commonProps = { className: className + " fill-none stroke-current", strokeWidth: 1.9, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, viewBox: "0 0 24 24", "aria-hidden": true };
  if (name === "car") return <svg {...commonProps}><path d="M5 16l1.6-5.2A3 3 0 0 1 9.5 8.7h5a3 3 0 0 1 2.9 2.1L19 16" /><path d="M6.5 16h11" /><path d="M8 12h8" /><circle cx="7.5" cy="17.5" r="1.5" /><circle cx="16.5" cy="17.5" r="1.5" /></svg>;
  if (name === "fileSearch") return <svg {...commonProps}><path d="M7 3h7l5 5v13H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" /><path d="M14 3v5h5" /><circle cx="11" cy="14" r="2.4" /><path d="m12.8 15.8 2.2 2.2" /></svg>;
  if (name === "dice") return <svg {...commonProps}><rect x="5" y="5" width="14" height="14" rx="3" /><circle cx="9" cy="9" r=".8" /><circle cx="15" cy="9" r=".8" /><circle cx="12" cy="12" r=".8" /><circle cx="9" cy="15" r=".8" /><circle cx="15" cy="15" r=".8" /></svg>;
  if (name === "alert") return <svg {...commonProps}><path d="M12 4 21 20H3L12 4Z" /><path d="M12 9v5" /><path d="M12 17h.01" /></svg>;
  return <svg {...commonProps}><path d="M12 3 19 6.7v5.4c0 4.3-2.9 7.4-7 8.9-4.1-1.5-7-4.6-7-8.9V6.7L12 3Z" /><path d="m8.8 12.3 2 2 4.4-4.6" /></svg>;
}

function CheckIcon({ className = "h-4 w-4" }: { className?: string }) {
  return <svg viewBox="0 0 24 24" className={className + " fill-none stroke-current"} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg>;
}

function getIncludeItemClass(item: string, isAdvancedProduct: boolean, isCounselingProduct: boolean, isSelected = false) {
  const isCounselingOnly = isCounselingProduct && (item.includes("심리상담") || item.includes("상담기관") || item.includes("종합 평가") || item.includes("유선 상담"));
  const isAdvancedOnly = isAdvancedProduct && !isCounselingOnly && (item.includes("심화이수과정 전체 포함") || item.includes("충실 준비과정 전체 포함") || item.includes("충실준비과정 전체 포함") || item.includes("인지행동") || item.includes("CBT") || item.includes("상세 내역서") || item.includes("상세내역서") || item.includes("이수증") || item.includes("소감문"));
  if (isCounselingOnly) return isSelected ? "min-w-0 font-black text-[#fecaca]" : "min-w-0 font-black text-[#b91c1c]";
  if (isAdvancedOnly) return isSelected ? "min-w-0 font-black text-[#bfdbfe]" : "min-w-0 font-black text-[#173968]";
  return "min-w-0";
}

function isCounseling(product: ApplicationProduct | null | undefined) {
  return Boolean(product && (isCounselingProductId(product.id) || product.planId === "counseling"));
}

function isAdvanced(product: ApplicationProduct | null | undefined) {
  return Boolean(product && (isCounseling(product) || product.id === "dui-cbt-advanced" || product.id.endsWith("advanced") || product.id.endsWith("premium") || product.planId === "advanced" || product.planId === "premium"));
}

function getSummaryText(product: ApplicationProduct | null) {
  if (!product) return "선택한 상품의 제공 항목을 확인할 수 있습니다.";
  if (isCounseling(product)) return "심화이수과정 전체 + 유선 상담 가능 + 심리상담 의견서 + 상담기관 탄원서";
  if (isAdvanced(product)) return "기본 수료과정 전체 + 인지행동기반 재범방지교육 + 교육이수 상세자료";
  return "온라인 재범방지교육 + 수료증 + 기본 실천자료";
}

function getSubmitLabel(product: ApplicationProduct | null) {
  if (!product) return "준비중";
  return "결제하기";
}

function getCompactIncludes(product: ApplicationProduct | null) {
  if (!product) return [];
  if (isCounseling(product)) {
    return ["심화이수과정 전체 포함", "유선 상담 가능(방문 없이 진행)", "심리상담 의견서", "상담기관 탄원서"];
  }
  if (isAdvanced(product)) {
    return ["기본 수료과정 전체 포함", "인지행동기반 재발방지교육 이수증", "재범방지 교육 이수 상세 내역서", "교육 소감문 작성자료"];
  }
  return product.includes.slice(0, 4);
}

function getStandardProductPresentation(product: ApplicationProduct) {
  const advancedProduct = isAdvanced(product);
  if (advancedProduct) {
    return {
      badge: "심화이수과정 추가 제공",
      description: "기본 수료과정 전체에 인지행동기반 재범방지교육과 교육이수 확인자료를 더해 재범방지 노력을 더 구체적으로 정리하는 과정입니다.",
      previewItems: [
        { title: "기본 수료과정 전체", body: "온라인 교육, 수료증, 재발방지 3종 자료 포함" },
        { title: "인지행동기반 재발방지 교육 및 이수증", body: "인지행동기반 교육 이수 내용을 별도로 확인할 수 있는 자료" },
        { title: "교육이수 상세내역서", body: "교육과정과 주요 학습내용을 구체적으로 정리" },
        { title: "교육 소감문", body: "교육 후 느낀 점과 실천계획을 직접 정리" },
      ],
      footer: "기본 수료과정 전체 + 인지행동기반 교육 이수증 + 교육이수 상세내역서 + 교육 소감문",
    };
  }

  return {
    badge: "기본 수료자료 제공",
    description: "교육 이수와 기본적인 수료자료가 필요한 경우 선택하는 과정입니다. 수료증과 재범방지 실천자료를 함께 확인할 수 있습니다.",
    previewItems: [
      { title: "온라인 재범방지교육", body: "사건 유형별 교육을 PC와 모바일로 수강" },
      { title: "교육 수료증", body: "교육과정을 정상적으로 이수한 사실을 확인" },
      { title: "재발방지 3종 자료", body: "재범방지계획서, 실천계획서, 재범방지 서약서" },
    ],
    footer: "수료증 · 재범방지계획서 · 실천계획서 · 서약서",
  };
}

function StandardProductCard({ product, selected, onSelect }: { product: ApplicationProduct; selected: boolean; onSelect: () => void }) {
  const advancedProduct = isAdvanced(product);
  const presentation = getStandardProductPresentation(product);
  return (
    <div
      role="button"
      tabIndex={0}
      aria-selected={selected}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
      className={(selected ? "border-[#173968] bg-[#f3f7fb] shadow-[0_18px_42px_rgba(23,57,104,0.16)]" : "border-slate-200 bg-white hover:border-[#173968] hover:bg-slate-50") + " group relative flex min-h-[320px] cursor-pointer flex-col rounded-[1.25rem] border-2 p-5 text-left transition-all active:scale-[0.99] focus:outline-none focus:ring-4 focus:ring-[#173968]/20"}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <span className={advancedProduct ? "inline-flex rounded-full bg-[#eef4fb] px-3 py-1 text-xs font-black text-[#173968]" : "inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700"}>{presentation.badge}</span>
          <h3 className="mt-3 text-2xl font-black leading-tight text-slate-950">{product.title}</h3>
          <p className={advancedProduct ? "mt-2 text-[34px] font-black leading-none tracking-tight text-[#173968]" : "mt-2 text-[34px] font-black leading-none tracking-tight text-slate-950"}>{formatApplicationKrw(product.price)}</p>
        </div>
        <span className={selected ? "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#173968] text-white" : "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white text-transparent"}><CheckIcon /></span>
      </div>
      <p className="mt-4 break-keep text-sm font-semibold leading-7 text-slate-700">{presentation.description}</p>
      <div className="mt-4 rounded-xl border border-slate-200 bg-white/80 p-3.5">
        <p className="text-xs font-black text-slate-500">주요 제공내용</p>
        <div className="mt-3 grid gap-2">
          {presentation.previewItems.map((item) => (
            <div key={item.title} className={advancedProduct ? "rounded-lg border border-[#dbe7f4] bg-[#f6f9fd] px-3 py-2.5" : "rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5"}>
              <p className={advancedProduct ? "break-keep text-sm font-black leading-5 text-[#173968]" : "break-keep text-sm font-black leading-5 text-slate-950"}>{item.title}</p>
              <p className="mt-1 break-keep text-xs font-semibold leading-5 text-slate-600">{item.body}</p>
            </div>
          ))}
        </div>
      </div>
      <details className="mt-3 rounded-xl border border-slate-200 bg-white p-3" onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
        <summary className="cursor-pointer text-sm font-black text-slate-950">전체 제공내용 보기</summary>
        <ul className="mt-3 grid gap-2">
          {product.includes.map((item) => (
            <li key={item} className="flex min-w-0 gap-2 text-sm font-semibold leading-6 text-slate-800">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#eef4fb] text-[#173968]"><CheckIcon className="h-3.5 w-3.5" /></span>
              <span className={getIncludeItemClass(item, advancedProduct, false)}>{item}</span>
            </li>
          ))}
        </ul>
      </details>
      <div className="mt-auto pt-4">
        <p className={advancedProduct ? "break-keep text-sm font-black leading-6 text-[#173968]" : "break-keep text-sm font-black leading-6 text-slate-800"}>{presentation.footer}</p>
      </div>
      <span className={selected ? "mt-4 inline-flex min-h-10 items-center justify-center rounded-lg bg-[#173968] px-4 text-sm font-black text-white" : "mt-4 inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-black text-slate-950 transition group-hover:border-[#173968] group-hover:text-[#173968]"}>{selected ? "선택됨" : product.title + " 선택"}</span>
    </div>
  );
}

function CounselingProductCard({ product, selected, onSelect, cardRef }: { product: ApplicationProduct; selected: boolean; onSelect: () => void; cardRef: React.RefObject<HTMLDivElement | null> }) {
  const mainItems = [
    "1:1 유선 심리상담 가능",
    "실제 상담내용을 반영한 심리상담 의견서",
    "상담기관 탄원서",
    "심화이수과정의 모든 교육 및 이수자료 포함",
  ];

  return (
    <div
      ref={cardRef}
      role="button"
      tabIndex={0}
      aria-selected={selected}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
      className={(selected ? "border-[#5f4514] bg-[#fffdf7] shadow-[0_24px_60px_rgba(95,69,20,0.18)]" : "border-[#d3b271] bg-white shadow-[0_18px_45px_rgba(211,178,113,0.14)]") + " cursor-pointer rounded-[1.35rem] border-2 p-5 transition-all focus:outline-none focus:ring-4 focus:ring-[#d3b271]/30 sm:p-6"}
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex rounded-full bg-[#d3b271] px-3 py-1.5 text-xs font-black text-slate-950">유선 상담 가능</span>
            <span className="inline-flex rounded-full bg-[#fffaf0] px-3 py-1.5 text-xs font-black text-[#5f4514]">심화이수과정 전체 포함</span>
            {selected ? <span className="inline-flex items-center gap-1 rounded-full bg-[#173968] px-3 py-1.5 text-xs font-black text-white"><CheckIcon className="h-3.5 w-3.5" />선택됨</span> : null}
          </div>
          <h3 className="mt-4 break-keep text-[30px] font-black leading-tight text-slate-950 sm:text-[38px]">심리상담 종합과정</h3>
          <p className="mt-2 break-keep text-lg font-black leading-7 text-[#5f4514] sm:text-xl">교육 + 유선 심리상담 + 상담의견서까지 한 번에</p>
          <p className="mt-4 text-[42px] font-black leading-none tracking-tight text-[#5f4514] sm:text-5xl">{formatApplicationKrw(product.price)}</p>

          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            {mainItems.map((item) => (
              <div key={item} className="flex min-h-12 items-center gap-2 rounded-xl border border-[#d3b271]/70 bg-[#fffaf0] px-3 py-2 text-sm font-black leading-6 text-[#5f4514]">
                <CheckIcon className="h-4 w-4 shrink-0" />
                {item}
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
            <p className="break-keep text-base font-black leading-7 text-slate-950">방문 없이 유선 상담으로도 진행할 수 있습니다</p>
            <p className="mt-2 break-keep text-sm font-semibold leading-7 text-slate-700">사건 이후의 심리상태, 생활환경, 재발 위험요인 및 향후 실천계획 등을 상담을 통해 확인하고, 실제 상담내용을 바탕으로 상담의견서를 작성합니다.</p>
          </div>
        </div>

        <div className="rounded-[1rem] border border-[#d3b271] bg-[#fffaf0] p-4">
          <p className="text-sm font-black text-slate-950">상담 진행 안내</p>
          <p className="mt-3 break-keep text-sm font-black leading-6 text-[#5f4514]">결제 완료 후 1영업일 이내 담당 심리상담사가 개별 연락드립니다.</p>
          <p className="mt-2 break-keep text-sm font-black leading-6 text-[#b91c1c]">상담은 유선으로도 진행 가능합니다.</p>
          <p className="mt-3 break-keep text-sm font-semibold leading-6 text-slate-700">상담기관 탄원서는 실제 상담내용, 대상자의 현재 상태 및 상담 과정 전반을 종합적으로 검토하여 발급됩니다.</p>
          <button type="button" onClick={(event) => { event.stopPropagation(); onSelect(); }} className={(selected ? "bg-[#173968] text-white" : "bg-[#5f4514] text-white hover:bg-[#173968]") + " mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-xl px-4 text-base font-black transition"}>{selected ? "심리상담 종합과정 선택 완료" : "심리상담 종합과정 선택"}</button>
        </div>
      </div>

      <details className="mt-5 rounded-xl border border-slate-200 bg-white p-4" onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
        <summary className="cursor-pointer text-sm font-black text-slate-950">전체 제공내용 보기</summary>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {product.includes.map((item) => (
            <li key={item} className="flex min-w-0 gap-2 text-sm font-semibold leading-6 text-slate-800">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#eef4fb] text-[#173968]"><CheckIcon className="h-3.5 w-3.5" /></span>
              <span className={getIncludeItemClass(item, true, true)}>{item}</span>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}

export default function CourseApplicationPage() {
  const router = useRouter();
  const [selectedCategoryId, setSelectedCategoryId] = useState("dui");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [shouldScrollToCounseling, setShouldScrollToCounseling] = useState(false);
  const [coursePickerOpen, setCoursePickerOpen] = useState(false);
  const counselingCardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const defaultCategory = applicationCourseCategories.find((category) => category.id === "dui") || applicationCourseCategories[0];
    setSelectedProductId(defaultCategory.defaultProductId || defaultCategory.products[0]?.id || "");
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const categoryId = params.get("category") || params.get("categoryId");
    const productId = params.get("productId");
    const categoryFromUrl = applicationCourseCategories.find((category) => category.id === categoryId);
    const categoryFromProduct = productId ? applicationCourseCategories.find((category) => category.products.some((product) => product.id === productId)) : undefined;
    const nextCategory = categoryFromProduct || categoryFromUrl;
    if (!nextCategory) return;

    const nextProduct = productId ? nextCategory.products.find((product) => product.id === productId) : undefined;
    const resolvedProductId = nextProduct?.id || nextCategory.defaultProductId || nextCategory.products[0]?.id || "";
    setSelectedCategoryId(nextCategory.id);
    setSelectedProductId(resolvedProductId);
    if (nextProduct && isCounseling(nextProduct)) setShouldScrollToCounseling(true);
  }, []);

  useEffect(() => {
    if (!shouldScrollToCounseling) return;
    const timer = window.setTimeout(() => {
      counselingCardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      setShouldScrollToCounseling(false);
    }, 180);
    return () => window.clearTimeout(timer);
  }, [shouldScrollToCounseling, selectedCategoryId, selectedProductId]);

  const selectedCategory = useMemo(() => applicationCourseCategories.find((category) => category.id === selectedCategoryId) || applicationCourseCategories[0], [selectedCategoryId]);
  const selectedProduct = useMemo(() => selectedCategory.products.find((product) => product.id === selectedProductId) || selectedCategory.products.find((product) => product.id === selectedCategory.defaultProductId) || selectedCategory.products[0] || null, [selectedCategory, selectedProductId]);
  const isAvailable = selectedCategory.status === "available";
  const standardProducts = selectedCategory.products.filter((product) => !isCounseling(product));
  const counselingProduct = selectedCategory.products.find((product) => isCounseling(product));
  const selectedIsCounseling = isCounseling(selectedProduct);

  const handleCategorySelect = (category: ApplicationCourseCategory) => {
    const nextProductId = category.defaultProductId || category.products[0]?.id || "";
    setSelectedCategoryId(category.id);
    setSelectedProductId(nextProductId);
    setCoursePickerOpen(false);
    const nextProduct = category.products.find((product) => product.id === nextProductId);
    if (nextProduct) trackEvent("product_select", { category: category.id, productId: nextProduct.id, productName: nextProduct.title, price: nextProduct.price });
  };

  const handleProductSelect = (product: ApplicationProduct) => {
    setSelectedProductId(product.id);
    trackEvent("product_select", { category: selectedCategory.id, productId: product.id, productName: product.title, price: product.price });
  };

  const handleSubmit = () => {
    if (!isAvailable || !selectedProduct) return;
    trackEvent("checkout_start", { category: selectedCategory.id, productId: selectedProduct.id, price: selectedProduct.price });
    router.push(appendAttributionParams(`/checkout?categoryId=${selectedCategory.id}&productId=${selectedProduct.id}`));
  };

  return (
    <main className="keep-korean min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#edf3f9_48%,#f8fafc_100%)] px-4 pb-28 pt-6 text-slate-950 sm:px-6 sm:py-8 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="overflow-hidden rounded-[1.25rem] border border-[#d7e1ef] bg-[linear-gradient(135deg,#0b1d36_0%,#173968_58%,#21568f_100%)] px-4 py-6 text-white shadow-[0_26px_70px_rgba(15,23,42,0.22)] sm:rounded-[1.75rem] sm:px-8 sm:py-8 lg:px-10">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-300">Course Application</p>
          <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div className="min-w-0"><h1 className="text-[1.9rem] font-black leading-tight text-white sm:text-4xl">수강신청</h1><p className="mt-4 max-w-3xl text-sm leading-relaxed text-slate-100 sm:text-base">교육 중심 과정과 개별 상담이 포함된 종합과정을 구분해 확인할 수 있습니다. 필요한 자료 범위에 맞춰 신청해 주세요.</p></div><div className="grid grid-cols-2 gap-2 text-xs font-bold text-slate-100 sm:flex sm:flex-wrap sm:text-sm">{["온라인 수강", "수료증 PDF", "실천자료 관리", "개별 상담 선택"].map((badge) => <span key={badge} className="rounded-full border border-white/20 bg-white/10 px-4 py-2">{badge}</span>)}</div></div>
        </section>

        <div className="mt-5 grid gap-5 sm:mt-7 sm:gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6">
            <section className="rounded-[1.5rem] border border-[#dbe4ef] bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.07)] sm:p-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-700">Step 1</p><h2 className="mt-1 text-2xl font-black text-slate-950">교육 선택</h2></div><p className="text-sm font-semibold text-slate-700">현재 선택: {selectedCategory.title}</p></div>
              <div className="mt-4">
                <button type="button" aria-selected="true" onClick={() => setCoursePickerOpen((open) => !open)} className="group relative flex min-h-[74px] w-full cursor-pointer items-center gap-3 rounded-[1rem] border-2 border-[#173968] bg-[#173968] p-3 pr-12 text-left text-white shadow-[0_14px_30px_rgba(23,57,104,0.22)] transition active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:min-h-[82px] sm:rounded-[1.25rem] sm:p-4 sm:pr-14">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#173968]"><CourseIcon name={selectedCategory.icon} className="h-5 w-5" /></span>
                  <span className="min-w-0 flex-1"><span className="block break-keep text-base font-black leading-6 text-white sm:text-lg">{selectedCategory.title}</span><span className="mt-1 block break-keep text-xs font-bold leading-5 text-slate-100 sm:text-sm">{coursePickerOpen ? "다른 교육을 선택할 수 있습니다." : "다른 교육을 보려면 눌러주세요."}</span></span>
                  <span className={(coursePickerOpen ? "rotate-180 " : "") + "absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white text-[#173968] transition-transform sm:right-4"} aria-hidden="true">⌄</span>
                </button>
                {coursePickerOpen ? (
                  <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                    {applicationCourseCategories.filter((category) => category.id !== selectedCategory.id).map((category) => {
                      const available = category.status === "available";
                      return <button key={category.id} type="button" aria-selected="false" onClick={() => handleCategorySelect(category)} className={("cursor-pointer rounded-[1rem] border-2 border-slate-200 bg-white text-left text-slate-900 hover:border-indigo-300 hover:bg-slate-50 hover:shadow-[0_14px_28px_rgba(15,23,42,0.08)] sm:rounded-[1.25rem]") + " group relative min-h-[60px] p-2.5 pr-10 transition-all active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:min-h-[72px] sm:p-3 sm:pr-10 sm:hover:-translate-y-0.5 " + (!available ? "bg-slate-100 text-slate-700" : "") }><div className="flex min-w-0 items-center gap-2.5 sm:gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#eef4fb] text-[#173968] transition group-hover:bg-[#dbeafe] sm:h-9 sm:w-9 sm:rounded-xl"><CourseIcon name={category.icon} className="h-[18px] w-[18px] sm:h-5 sm:w-5" /></span><h3 className="min-w-0 flex-1 break-keep text-[14px] font-black leading-5 text-slate-950 sm:text-[15px]">{category.title}</h3></div></button>;
                    })}
                  </div>
                ) : null}
              </div>
            </section>

            <section className="rounded-[1.5rem] border border-[#dbe4ef] bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.07)] sm:p-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-700">Step 2</p><h2 className="mt-1 text-2xl font-black text-slate-950">선택 과정 확인</h2></div><p className="text-sm font-semibold text-slate-700">{selectedCategory.title}</p></div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {selectedCategory.products.map((product) => {
                  const selected = selectedProduct?.id === product.id;
                  const counselingProduct = isCounseling(product);
                  const advancedProduct = isAdvanced(product);
                  return (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => handleProductSelect(product)}
                      aria-selected={selected}
                      className={(selected ? "border-[#173968] bg-[#f3f7fb] shadow-[0_14px_34px_rgba(23,57,104,0.14)]" : counselingProduct ? "border-[#d3b271] bg-white hover:border-[#173968]" : "border-slate-200 bg-white hover:border-[#173968]") + " flex min-h-[92px] items-center gap-3 rounded-[1rem] border-2 p-4 text-left transition focus:outline-none focus:ring-4 focus:ring-[#173968]/20"}
                    >
                      <span className={selected ? "flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#173968] text-white" : "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white text-transparent"}><CheckIcon className="h-4 w-4" /></span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className={selected ? "break-keep text-base font-black text-[#173968]" : "break-keep text-base font-black text-slate-950"}>{product.title}</span>
                          <span className={counselingProduct ? "rounded-full bg-[#fffaf0] px-2 py-0.5 text-[11px] font-black text-[#5f4514]" : advancedProduct ? "rounded-full bg-[#eef4fb] px-2 py-0.5 text-[11px] font-black text-[#173968]" : "rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-black text-slate-600"}>{counselingProduct ? "상담 추가" : advancedProduct ? "심화이수" : "기본 수료"}</span>
                        </span>
                        <span className="mt-1 block text-xl font-black text-slate-950">{formatApplicationKrw(product.price)}</span>
                        <span className="mt-1 block break-keep text-sm font-semibold leading-6 text-slate-600">{getSummaryText(product)}</span>
                      </span>
                    </button>
                  );
                })}
              </div>

              {!isAvailable ? <div className="mt-5 rounded-[1.25rem] border border-slate-200 bg-slate-100 p-5"><h3 className="text-lg font-black text-slate-950">준비중인 과정입니다.</h3><p className="mt-3 text-sm leading-relaxed text-slate-700">{selectedCategory.comingSoonText || "해당 교육 과정은 현재 콘텐츠를 준비하고 있습니다."}</p><p className="mt-2 text-sm leading-relaxed text-slate-700">상품 구성은 표시되지만 결제는 콘텐츠 준비 후 가능합니다.</p></div> : null}
            </section>
          </div>

          <aside className="lg:sticky lg:top-6 lg:self-start">
            <div className={(selectedIsCounseling ? "border-[#d3b271] shadow-[0_22px_55px_rgba(211,178,113,0.18)]" : "border-[#cfdceb] shadow-[0_22px_55px_rgba(15,23,42,0.11)]") + " rounded-[1.5rem] border bg-white p-5 sm:p-6"}>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-700">Summary</p>
              <h2 className="mt-2 text-2xl font-black text-slate-950">신청 요약</h2>
              <dl className="mt-5 space-y-4">
                <div><dt className="text-xs font-bold text-slate-600">선택한 교육명</dt><dd className="mt-1 text-base font-black text-slate-950">{selectedCategory.title}</dd></div>
                <div><dt className="text-xs font-bold text-slate-600">선택한 상품명</dt><dd className={selectedIsCounseling ? "mt-1 text-lg font-black text-[#5f4514]" : "mt-1 text-base font-black text-slate-950"}>{selectedProduct?.title || "준비중"}</dd></div>
                <div><dt className="text-xs font-bold text-slate-600">포함내용 요약</dt><dd className="mt-1 break-keep text-sm font-bold leading-6 text-slate-800">{getSummaryText(selectedProduct)}</dd></div>
                <div><dt className="text-xs font-bold text-slate-600">상품제공기간</dt><dd className="mt-1 text-base font-black text-slate-950">결제 완료 즉시 제공</dd></div>
              </dl>
              {selectedProduct ? <div className="mt-5 rounded-[1rem] bg-[#f8fafc] p-4"><p className="text-sm font-black text-slate-950">핵심 포함사항</p><ul className="mt-3 space-y-2">{getCompactIncludes(selectedProduct).map((item) => <li key={item} className="flex min-w-0 gap-2 text-sm leading-relaxed text-slate-800"><span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-[#173968]"><CheckIcon className="h-3.5 w-3.5" /></span><span className={getIncludeItemClass(item, isAdvanced(selectedProduct), selectedIsCounseling)}>{item}</span></li>)}</ul></div> : <div className="mt-5 rounded-[1rem] bg-slate-100 p-4 text-sm leading-relaxed text-slate-700">준비중 과정은 상품과 가격을 표시하지 않습니다.</div>}
              <div className="mt-5 border-t border-[#e2e8f0] pt-5"><div className="flex items-end justify-between gap-4"><span className="text-sm font-bold text-slate-700">결제 예정 금액</span><strong className={selectedIsCounseling ? "text-3xl font-black text-[#5f4514]" : "text-3xl font-black text-slate-950"}>{selectedProduct ? formatApplicationKrw(selectedProduct.price) : "-"}</strong></div></div>
              <button type="button" disabled={!isAvailable || !selectedProduct} onClick={handleSubmit} className={buttonClass(selectedIsCounseling ? "primary" : "warning", "lg", selectedIsCounseling ? "mt-5 w-full rounded-[1rem] bg-[#5f4514] font-extrabold hover:bg-[#173968] disabled:opacity-100" : "mt-5 w-full gap-2 rounded-[1rem] font-extrabold disabled:opacity-100")}>{isAvailable ? getSubmitLabel(selectedProduct) : "준비중"}</button>
            </div>
          </aside>
        </div>
      </div>
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-[0_-14px_36px_rgba(15,23,42,0.18)] backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-7xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-slate-600">{selectedProduct?.title || selectedCategory.title}</p>
            <p className={selectedIsCounseling ? "mt-0.5 text-lg font-black text-[#5f4514]" : "mt-0.5 text-lg font-black text-slate-950"}>{selectedProduct ? formatApplicationKrw(selectedProduct.price) : "준비중"}</p>
          </div>
          <button type="button" disabled={!isAvailable || !selectedProduct} onClick={handleSubmit} className={buttonClass(selectedIsCounseling ? "primary" : "warning", "md", selectedIsCounseling ? "min-w-[170px] rounded-full bg-[#5f4514] px-5 font-black hover:bg-[#173968] disabled:opacity-100" : "min-w-[142px] rounded-full px-5 font-black disabled:opacity-100")}>{isAvailable ? (selectedIsCounseling ? "상담과정 결제" : "바로 결제") : "준비중"}</button>
        </div>
      </div>
    </main>
  );
}
