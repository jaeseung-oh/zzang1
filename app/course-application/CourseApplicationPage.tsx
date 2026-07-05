"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { applicationCourseCategories, applicationNoticeText, formatApplicationKrw, type ApplicationCourseCategory, type ApplicationIconName } from "@/lib/course/application-products";
import { buttonClass, selectableCardClass } from "@/app/components/ui/button-styles";

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

function StatusBadge({ available }: { available: boolean }) {
  return <span className={available ? "rounded-full bg-indigo-600 px-3 py-1 text-xs font-black text-white" : "rounded-full bg-gray-300 px-3 py-1 text-xs font-black text-gray-700"}>{available ? "수강 가능" : "준비중"}</span>;
}

const selectedChoiceClass = "cursor-pointer rounded-[1.25rem] border-2 border-[#173968] bg-[#173968] text-left text-white shadow-[0_18px_42px_rgba(23,57,104,0.26)] transition-all hover:-translate-y-0.5 hover:bg-[#10213f] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[#173968] focus:ring-offset-2";

export default function CourseApplicationPage() {
  const router = useRouter();
  const [selectedCategoryId, setSelectedCategoryId] = useState("dui");
  const [selectedProductId, setSelectedProductId] = useState("basic");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const categoryId = params.get("category") || params.get("categoryId");
    const productId = params.get("productId");
    const nextCategory = applicationCourseCategories.find((category) => category.id === categoryId);
    if (!nextCategory) return;
    setSelectedCategoryId(nextCategory.id);
    const nextProduct = nextCategory.products.find((product) => product.id === productId);
    setSelectedProductId(nextProduct?.id || nextCategory.defaultProductId || "");
  }, []);

  const selectedCategory = useMemo(() => applicationCourseCategories.find((category) => category.id === selectedCategoryId) || applicationCourseCategories[0], [selectedCategoryId]);
  const selectedProduct = useMemo(() => selectedCategory.products.find((product) => product.id === selectedProductId) || selectedCategory.products[0] || null, [selectedCategory, selectedProductId]);
  const isAvailable = selectedCategory.status === "available";

  const handleCategorySelect = (category: ApplicationCourseCategory) => {
    setSelectedCategoryId(category.id);
    setSelectedProductId(category.defaultProductId || "");
  };

  const handleSubmit = () => {
    if (!isAvailable || !selectedProduct) return;
    router.push(`/checkout?categoryId=${selectedCategory.id}&productId=${selectedProduct.id}`);
  };

  return (
    <main className="keep-korean min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#edf3f9_48%,#f8fafc_100%)] px-4 py-6 text-slate-950 sm:px-6 sm:py-8 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="overflow-hidden rounded-[1.25rem] border border-[#d7e1ef] bg-[linear-gradient(135deg,#0b1d36_0%,#173968_58%,#21568f_100%)] px-4 py-6 text-white shadow-[0_26px_70px_rgba(15,23,42,0.22)] sm:rounded-[1.75rem] sm:px-8 sm:py-8 lg:px-10">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-300">Course Application</p>
          <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div className="min-w-0"><h1 className="text-[1.9rem] font-black leading-tight text-white sm:text-4xl">수강신청</h1><p className="mt-4 max-w-3xl text-sm leading-relaxed text-slate-100 sm:text-base">교육 카테고리별 상품 구성을 확인할 수 있습니다. 신규 재범·재발 방지교육은 59,000원 기본과정과 129,000원 심화과정으로 신청할 수 있습니다.</p></div><div className="grid grid-cols-2 gap-2 text-xs font-bold text-slate-100 sm:flex sm:flex-wrap sm:text-sm">{["온라인 수강", "수강 즉시 수료증 출력", "참고서식 선택"].map((badge) => <span key={badge} className="rounded-full border border-white/20 bg-white/10 px-4 py-2">{badge}</span>)}</div></div>
        </section>

        <div className="mt-5 grid gap-5 sm:mt-7 sm:gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6">
            <section className="rounded-[1.5rem] border border-[#dbe4ef] bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.07)] sm:p-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-700">Step 1</p><h2 className="mt-1 text-2xl font-black text-slate-950">교육 선택</h2></div><p className="text-sm font-semibold text-slate-700">현재 선택: {selectedCategory.title}</p></div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {applicationCourseCategories.map((category) => {
                  const isSelected = selectedCategory.id === category.id;
                  const available = category.status === "available";
                  return <button key={category.id} type="button" aria-selected={isSelected} onClick={() => handleCategorySelect(category)} className={(isSelected ? selectedChoiceClass : selectableCardClass) + " group min-h-[180px] p-4 sm:min-h-[210px] " + (!available && !isSelected ? "bg-slate-100 text-slate-700" : "") }><div className="flex items-start justify-between gap-3"><span className={isSelected ? "flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[#173968]" : "flex h-11 w-11 items-center justify-center rounded-2xl bg-[#eef4fb] text-[#173968] transition group-hover:bg-[#dbeafe]"}><CourseIcon name={category.icon} /></span><StatusBadge available={available} /></div><h3 className={isSelected ? "mt-4 text-lg font-black leading-snug text-white" : "mt-4 text-lg font-black leading-snug text-slate-950"}>{category.title}</h3><p className={isSelected ? "mt-2 min-h-[54px] text-sm leading-relaxed text-slate-100" : "mt-2 min-h-[54px] text-sm leading-relaxed text-slate-700"}>{category.description}</p><p className={isSelected ? "mt-3 text-xs font-bold text-[#f7d9a0]" : "mt-3 text-xs font-bold text-slate-700"}>{category.summary}</p><div className="mt-4 flex items-end justify-between gap-3">{available ? <p className={isSelected ? "text-sm font-black text-[#f7d9a0]" : "text-sm font-black text-indigo-800"}>신청 가능</p> : <p className={isSelected ? "text-sm font-black text-slate-200" : "text-sm font-black text-gray-700"}>결제 불가</p>}<span className={isSelected ? "rounded-full bg-white px-3 py-1 text-xs font-bold text-[#173968]" : "rounded-full bg-slate-200 px-3 py-1 text-xs font-bold text-slate-700"}>{isSelected ? "선택됨" : "확인"}</span></div></button>;
                })}
              </div>
            </section>

            <section className="rounded-[1.5rem] border border-[#dbe4ef] bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.07)] sm:p-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-700">Step 2</p><h2 className="mt-1 text-2xl font-black text-slate-950">상품 선택</h2></div><p className="text-sm font-semibold text-slate-700">{selectedCategory.title}</p></div>
              <div className="mt-5 grid gap-3 sm:gap-4 xl:grid-cols-3">{selectedCategory.products.map((product) => { const isSelected = selectedProduct?.id === product.id; return <button key={product.id} type="button" aria-selected={isSelected} onClick={() => setSelectedProductId(product.id)} className={(isSelected ? selectedChoiceClass : selectableCardClass) + " p-4 sm:p-5"}><div className="flex items-start justify-between gap-4"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className={isSelected ? "text-lg font-black leading-snug text-white" : "text-lg font-black leading-snug text-slate-950"}>{product.title}</h3>{product.badge ? <span className={isSelected ? "rounded-full border border-white/25 bg-white/12 px-2.5 py-1 text-xs font-black text-white" : "rounded-full bg-[#eef4fb] px-2.5 py-1 text-xs font-black text-[#173968]"}>{product.badge}</span> : null}</div><p className={isSelected ? "mt-2 text-sm leading-relaxed text-slate-100" : "mt-2 text-sm leading-relaxed text-slate-700"}>{product.description}</p></div><span className={isSelected ? "flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-[#173968]" : "h-7 w-7 shrink-0 rounded-full border border-[#cbd5e1] bg-white"}>{isSelected ? <CheckIcon /> : null}</span></div><p className={isSelected ? "mt-4 text-2xl font-black text-white sm:mt-5 sm:text-3xl" : "mt-4 text-2xl font-black text-slate-950 sm:mt-5 sm:text-3xl"}>{formatApplicationKrw(product.price)}</p><p className={isSelected ? "mt-1 text-xs font-bold text-[#f7d9a0]" : "mt-1 text-xs font-bold text-slate-500"}>{product.id === "dui-documents" ? "3종 참고서식 출력/PDF 포함" : product.id === "dui-cbt-advanced" ? "인지행동기반 교육 및 이수 서류 출력" : "교육 수강 및 수강 즉시 수료증 출력"}</p><ul className="mt-5 space-y-2.5">{product.includes.map((item) => <li key={item} className={isSelected ? "flex min-w-0 gap-2 text-sm leading-relaxed text-slate-100" : "flex min-w-0 gap-2 text-sm leading-relaxed text-slate-800"}><span className={isSelected ? "mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-[#173968]" : "mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#e7f0ff] text-[#173968]"}><CheckIcon className="h-3.5 w-3.5" /></span><span className="min-w-0">{item}</span></li>)}</ul></button>; })}</div>{!isAvailable ? <div className="mt-5 rounded-[1.25rem] border border-slate-200 bg-slate-100 p-5"><h3 className="text-lg font-black text-slate-950">준비중인 과정입니다.</h3><p className="mt-3 text-sm leading-relaxed text-slate-700">{selectedCategory.comingSoonText || "해당 교육 과정은 현재 콘텐츠를 준비하고 있습니다."}</p><p className="mt-2 text-sm leading-relaxed text-slate-700">상품 구성은 표시되지만 결제는 콘텐츠 준비 후 가능합니다.</p></div> : null}
            </section>
          </div>

          <aside className="lg:sticky lg:top-6 lg:self-start"><div className="rounded-[1.5rem] border border-[#cfdceb] bg-white p-5 shadow-[0_22px_55px_rgba(15,23,42,0.11)] sm:p-6"><p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-700">Summary</p><h2 className="mt-2 text-2xl font-black text-slate-950">신청 요약</h2><dl className="mt-5 space-y-4"><div><dt className="text-xs font-bold text-slate-600">선택한 교육명</dt><dd className="mt-1 text-base font-black text-slate-950">{selectedCategory.title}</dd></div><div><dt className="text-xs font-bold text-slate-600">선택한 상품명</dt><dd className="mt-1 text-base font-black text-slate-950">{selectedProduct?.title || "준비중"}</dd></div><div><dt className="text-xs font-bold text-slate-600">상품제공기간</dt><dd className="mt-1 text-base font-black text-slate-950">결제 완료 즉시 제공</dd></div></dl>{selectedProduct ? <div className="mt-5 rounded-[1rem] bg-[#f8fafc] p-4"><p className="text-sm font-black text-slate-950">제공 항목</p><ul className="mt-3 space-y-2">{selectedProduct.includes.map((item) => <li key={item} className="flex min-w-0 gap-2 text-sm leading-relaxed text-slate-800"><span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-[#173968]"><CheckIcon className="h-3.5 w-3.5" /></span><span>{item}</span></li>)}</ul></div> : <div className="mt-5 rounded-[1rem] bg-slate-100 p-4 text-sm leading-relaxed text-slate-700">준비중 과정은 상품과 가격을 표시하지 않습니다.</div>}<div className="mt-5 border-t border-[#e2e8f0] pt-5"><div className="flex items-end justify-between gap-4"><span className="text-sm font-bold text-slate-700">결제 예정 금액</span><strong className="text-3xl font-black text-slate-950">{selectedProduct ? formatApplicationKrw(selectedProduct.price) : "-"}</strong></div></div><p className="mt-5 rounded-[1rem] border border-[#dbe4ef] bg-[#f8fafc] p-4 text-xs leading-relaxed text-slate-700">{applicationNoticeText}</p><button type="button" disabled={!isAvailable || !selectedProduct} onClick={handleSubmit} className={buttonClass("warning", "lg", "mt-5 w-full gap-2 rounded-[1rem] font-extrabold disabled:opacity-100")}>{isAvailable ? "수강신청하기" : "준비중"}</button></div></aside>
        </div>
      </div>
    </main>
  );
}
