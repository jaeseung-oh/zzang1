"use client";

import { useMemo, useState } from "react";

const PRICES = {
  BASIC: 55000,
  DUI_WITH_DOCUMENTS: 89000,
} as const;

type Product = {
  id: string;
  title: string;
  price: number;
  description: string;
  includes: string[];
  badge?: string;
};

type CourseCategory = {
  id: string;
  title: string;
  description: string;
  summary: string;
  icon: IconName;
  products: Product[];
  defaultProductId: string;
};

type IconName = "car" | "fileSearch" | "dice" | "alert" | "shieldCheck";

const basicProduct: Product = {
  id: "basic",
  title: "일반 수료형 교육",
  price: PRICES.BASIC,
  description: "교육 이수 후 수료증 발급이 가능한 기본형 교육",
  includes: ["온라인 강의 수강", "진도율 확인", "수료증 발급"],
};

const duiDocumentsProduct: Product = {
  id: "dui-documents",
  title: "실천자료 포함형",
  price: PRICES.DUI_WITH_DOCUMENTS,
  description: "교육 이수 후 수료증과 함께 실천계획 관련 참고서식 2종을 제공하는 상품",
  includes: [
    "온라인 강의 수강",
    "진도율 확인",
    "수료증 발급",
    "음주예방실천계획서 참고서식",
    "재발방지계획서 참고서식",
  ],
  badge: "자료 포함",
};

const courseCategories: CourseCategory[] = [
  {
    id: "dui",
    title: "음주운전 예방교육",
    description: "음주운전 위험성과 재발 예방을 온라인 강의로 차분히 점검합니다.",
    summary: "온라인 강의, 진도율 확인, 수료증, 참고서식 선택 가능",
    icon: "car",
    products: [basicProduct, duiDocumentsProduct],
    defaultProductId: "dui-documents",
  },
  {
    id: "fraud",
    title: "사기 예방교육",
    description: "거래 윤리와 책임 있는 의사결정을 학습하는 예방교육입니다.",
    summary: "온라인 강의, 진도율 확인, 수료증",
    icon: "fileSearch",
    products: [basicProduct],
    defaultProductId: "basic",
  },
  {
    id: "gambling",
    title: "도박 예방교육",
    description: "도박 위험 신호와 생활관리 원칙을 정리하는 예방교육입니다.",
    summary: "온라인 강의, 진도율 확인, 수료증",
    icon: "dice",
    products: [basicProduct],
    defaultProductId: "basic",
  },
  {
    id: "drug",
    title: "마약 예방교육",
    description: "약물 오남용 위험성과 자기점검 방법을 다루는 예방교육입니다.",
    summary: "온라인 강의, 진도율 확인, 수료증",
    icon: "alert",
    products: [basicProduct],
    defaultProductId: "basic",
  },
  {
    id: "sex-crime",
    title: "성범죄 예방교육",
    description: "관계 윤리와 경계 존중, 책임 있는 행동 기준을 학습합니다.",
    summary: "온라인 강의, 진도율 확인, 수료증",
    icon: "shieldCheck",
    products: [basicProduct],
    defaultProductId: "basic",
  },
];

const noticeText =
  "제공되는 수료증 및 참고서식은 교육 이수 사실과 수강자의 자기점검 및 실천계획 정리를 돕기 위한 자료입니다. 특정 법적 결과를 보장하거나 법률 자문을 제공하는 서비스가 아닙니다.";

function formatKrw(value: number) {
  return `${value.toLocaleString("ko-KR")}원`;
}

function CourseIcon({ name, className = "h-6 w-6" }: { name: IconName; className?: string }) {
  const commonProps = {
    className: `${className} fill-none stroke-current`,
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    viewBox: "0 0 24 24",
    "aria-hidden": true,
  };

  if (name === "car") {
    return (
      <svg {...commonProps}>
        <path d="M5 16l1.6-5.2A3 3 0 0 1 9.5 8.7h5a3 3 0 0 1 2.9 2.1L19 16" />
        <path d="M6.5 16h11" />
        <path d="M8 12h8" />
        <circle cx="7.5" cy="17.5" r="1.5" />
        <circle cx="16.5" cy="17.5" r="1.5" />
      </svg>
    );
  }

  if (name === "fileSearch") {
    return (
      <svg {...commonProps}>
        <path d="M7 3h7l5 5v13H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
        <path d="M14 3v5h5" />
        <circle cx="11" cy="14" r="2.4" />
        <path d="m12.8 15.8 2.2 2.2" />
      </svg>
    );
  }

  if (name === "dice") {
    return (
      <svg {...commonProps}>
        <rect x="5" y="5" width="14" height="14" rx="3" />
        <circle cx="9" cy="9" r=".8" />
        <circle cx="15" cy="9" r=".8" />
        <circle cx="12" cy="12" r=".8" />
        <circle cx="9" cy="15" r=".8" />
        <circle cx="15" cy="15" r=".8" />
      </svg>
    );
  }

  if (name === "alert") {
    return (
      <svg {...commonProps}>
        <path d="M12 4 21 20H3L12 4Z" />
        <path d="M12 9v5" />
        <path d="M12 17h.01" />
      </svg>
    );
  }

  return (
    <svg {...commonProps}>
      <path d="M12 3 19 6.7v5.4c0 4.3-2.9 7.4-7 8.9-4.1-1.5-7-4.6-7-8.9V6.7L12 3Z" />
      <path d="m8.8 12.3 2 2 4.4-4.6" />
    </svg>
  );
}

function CheckIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`${className} fill-none stroke-current`}
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}

export default function CourseApplicationPage() {
  const [selectedCategoryId, setSelectedCategoryId] = useState("dui");
  const [selectedProductId, setSelectedProductId] = useState("dui-documents");

  const selectedCategory = useMemo(
    () => courseCategories.find((category) => category.id === selectedCategoryId) || courseCategories[0],
    [selectedCategoryId]
  );

  const selectedProduct = useMemo(
    () => selectedCategory.products.find((product) => product.id === selectedProductId) || selectedCategory.products[0],
    [selectedCategory, selectedProductId]
  );

  const handleCategorySelect = (category: CourseCategory) => {
    setSelectedCategoryId(category.id);
    setSelectedProductId(category.defaultProductId);
  };

  const handleSubmit = () => {
    const application = {
      categoryId: selectedCategory.id,
      categoryTitle: selectedCategory.title,
      productId: selectedProduct.id,
      productTitle: selectedProduct.title,
      price: selectedProduct.price,
    };

    console.log(application);
    // TODO: 결제 페이지 연동 시 application 정보를 주문 생성 또는 checkout 라우트로 전달합니다.
  };

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#edf3f9_48%,#f8fafc_100%)] px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="overflow-hidden rounded-[1.75rem] border border-[#d7e1ef] bg-[linear-gradient(135deg,#0b1d36_0%,#173968_58%,#21568f_100%)] px-6 py-8 text-white shadow-[0_26px_70px_rgba(15,23,42,0.22)] sm:px-8 lg:px-10">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#a7c7ff]">Course Application</p>
          <div className="mt-4 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-semibold sm:text-4xl">수강신청</h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-200 sm:text-[15px]">
                필요한 교육을 선택하고 제공 항목을 확인한 뒤 신청을 진행하세요.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-sm font-semibold text-slate-100">
              {["온라인 수강", "수료증 발급", "참고서식 제공"].map((badge) => (
                <span key={badge} className="rounded-full border border-white/15 bg-white/10 px-4 py-2">
                  {badge}
                </span>
              ))}
            </div>
          </div>
        </section>

        <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6">
            <section className="rounded-[1.5rem] border border-[#dbe4ef] bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.07)] sm:p-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#274690]">Step 1</p>
                  <h2 className="mt-1 text-2xl font-semibold">교육 카테고리 선택</h2>
                </div>
                <p className="text-sm text-slate-500">현재 선택: {selectedCategory.title}</p>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {courseCategories.map((category) => {
                  const isSelected = selectedCategory.id === category.id;
                  const lowestPrice = Math.min(...category.products.map((product) => product.price));

                  return (
                    <button
                      key={category.id}
                      type="button"
                      aria-selected={isSelected}
                      onClick={() => handleCategorySelect(category)}
                      className={
                        isSelected
                          ? "group min-h-[214px] rounded-[1.15rem] border-2 border-[#173968] bg-[#f3f7ff] p-4 text-left shadow-[0_16px_36px_rgba(23,57,104,0.16)] transition"
                          : "group min-h-[214px] rounded-[1.15rem] border border-[#d8e2ee] bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-[#9fb5d1] hover:shadow-[0_14px_30px_rgba(15,23,42,0.09)]"
                      }
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span
                          className={
                            isSelected
                              ? "flex h-11 w-11 items-center justify-center rounded-2xl bg-[#173968] text-white"
                              : "flex h-11 w-11 items-center justify-center rounded-2xl bg-[#eef4fb] text-[#173968] transition group-hover:bg-[#dbeafe]"
                          }
                        >
                          <CourseIcon name={category.icon} />
                        </span>
                        {isSelected ? (
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#173968] text-white">
                            <CheckIcon />
                          </span>
                        ) : null}
                      </div>
                      <h3 className="mt-4 text-lg font-semibold text-slate-950">{category.title}</h3>
                      <p className="mt-2 min-h-[48px] text-sm leading-6 text-slate-600">{category.description}</p>
                      <p className="mt-3 text-xs font-semibold text-[#274690]">{category.summary}</p>
                      <div className="mt-4 flex items-end justify-between gap-3">
                        <p className="text-xl font-bold text-[#0f2f5f]">{formatKrw(lowestPrice)}</p>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                          선택
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="rounded-[1.5rem] border border-[#dbe4ef] bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.07)] sm:p-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#274690]">Step 2</p>
                  <h2 className="mt-1 text-2xl font-semibold">상품 유형 선택</h2>
                </div>
                <p className="text-sm text-slate-500">{selectedCategory.title} 상품</p>
              </div>

              <div className="mt-5 grid gap-4 xl:grid-cols-2">
                {selectedCategory.products.map((product) => {
                  const isSelected = selectedProduct.id === product.id;

                  return (
                    <button
                      key={product.id}
                      type="button"
                      aria-selected={isSelected}
                      onClick={() => setSelectedProductId(product.id)}
                      className={
                        isSelected
                          ? "rounded-[1.25rem] border-2 border-[#173968] bg-[#f5f8ff] p-5 text-left shadow-[0_16px_34px_rgba(23,57,104,0.15)] transition"
                          : "rounded-[1.25rem] border border-[#d8e2ee] bg-white p-5 text-left transition hover:-translate-y-0.5 hover:border-[#9fb5d1] hover:shadow-[0_14px_28px_rgba(15,23,42,0.08)]"
                      }
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg font-semibold text-slate-950">{product.title}</h3>
                            {product.badge ? (
                              <span className="rounded-full bg-[#dbeafe] px-3 py-1 text-xs font-bold text-[#173968]">
                                {product.badge}
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-2 text-sm leading-6 text-slate-600">{product.description}</p>
                        </div>
                        <span
                          className={
                            isSelected
                              ? "flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#173968] text-white"
                              : "h-7 w-7 shrink-0 rounded-full border border-[#cbd5e1] bg-white"
                          }
                        >
                          {isSelected ? <CheckIcon /> : null}
                        </span>
                      </div>
                      <p className="mt-5 text-3xl font-bold text-[#0f2f5f]">{formatKrw(product.price)}</p>
                      <ul className="mt-5 space-y-2.5">
                        {product.includes.map((item) => (
                          <li key={item} className="flex gap-2 text-sm leading-6 text-slate-700">
                            <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#e7f0ff] text-[#173968]">
                              <CheckIcon className="h-3.5 w-3.5" />
                            </span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </button>
                  );
                })}
              </div>
            </section>
          </div>

          <aside className="lg:sticky lg:top-6 lg:self-start">
            <div className="rounded-[1.5rem] border border-[#cfdceb] bg-white p-5 shadow-[0_22px_55px_rgba(15,23,42,0.11)] sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#274690]">Summary</p>
              <h2 className="mt-2 text-2xl font-semibold">신청 요약</h2>

              <dl className="mt-5 space-y-4">
                <div>
                  <dt className="text-xs font-semibold text-slate-500">선택한 교육명</dt>
                  <dd className="mt-1 text-base font-semibold text-slate-950">{selectedCategory.title}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-slate-500">선택한 상품명</dt>
                  <dd className="mt-1 text-base font-semibold text-slate-950">{selectedProduct.title}</dd>
                </div>
              </dl>

              <div className="mt-5 rounded-[1rem] bg-[#f8fafc] p-4">
                <p className="text-sm font-semibold text-slate-950">제공 항목</p>
                <ul className="mt-3 space-y-2">
                  {selectedProduct.includes.map((item) => (
                    <li key={item} className="flex gap-2 text-sm leading-6 text-slate-700">
                      <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-[#173968]">
                        <CheckIcon className="h-3.5 w-3.5" />
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-5 border-t border-[#e2e8f0] pt-5">
                <div className="flex items-end justify-between gap-4">
                  <span className="text-sm font-semibold text-slate-600">결제 예정 금액</span>
                  <strong className="text-3xl font-bold text-[#0f2f5f]">{formatKrw(selectedProduct.price)}</strong>
                </div>
              </div>

              <p className="mt-5 rounded-[1rem] border border-[#dbe4ef] bg-[#f8fafc] p-4 text-xs leading-6 text-slate-600">
                {noticeText}
              </p>

              <button
                type="button"
                disabled={!selectedCategory || !selectedProduct}
                onClick={handleSubmit}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-[1rem] bg-[#06101b] px-5 py-4 text-base font-bold text-[#e9c98d] shadow-[0_16px_30px_rgba(6,16,27,0.28)] ring-1 ring-[#e9c98d]/25 transition hover:bg-[#10213f] hover:text-[#f6deb0] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 disabled:ring-0 disabled:shadow-none"
              >
                <span>수강신청하기</span>
                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="2" aria-hidden="true">
                  <path d="M5 12h14" />
                  <path d="m13 6 6 6-6 6" />
                </svg>
              </button>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
