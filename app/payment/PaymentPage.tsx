"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import {
  applicationNoticeText,
  formatApplicationKrw,
  getApplicationCategory,
  getApplicationProduct,
} from "@/lib/course/application-products";
import { requestPayment, type PaymentMethod } from "@/lib/payment/payment-service";
import { buttonClass, selectableCardClass, selectedCardClass } from "@/app/components/ui/button-styles";

const paymentMethods: Array<{
  id: PaymentMethod;
  title: string;
  description: string;
  badge: string;
  badgeClassName: string;
}> = [
  { id: "kakaopay", title: "카카오페이", description: "카카오페이로 간편하게 결제합니다.", badge: "KakaoPay", badgeClassName: "bg-[#fee500] text-[#191600]" },
  { id: "danal-mobile", title: "핸드폰결제", description: "다날 휴대폰 결제로 결제합니다.", badge: "Danal", badgeClassName: "bg-[#0f766e] text-white" },
  { id: "card", title: "신용카드결제", description: "국내 신용카드 또는 체크카드로 결제합니다.", badge: "Card", badgeClassName: "bg-[#173968] text-white" },
];

function CheckIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className + " fill-none stroke-current"} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}

export default function PaymentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const categoryId = searchParams.get("categoryId");
  const productId = searchParams.get("productId");
  const selectedCategory = useMemo(() => getApplicationCategory(categoryId), [categoryId]);
  const selectedProduct = useMemo(() => getApplicationProduct(categoryId, productId), [categoryId, productId]);
  const hasDocumentItems = Boolean(selectedProduct?.includes.some((item) => item.includes("참고서식")));
  const canPay = Boolean(selectedCategory && selectedProduct && selectedPaymentMethod && !isSubmitting);

  const handlePayment = async () => {
    if (isSubmitting) {
      return;
    }

    if (!selectedCategory || !selectedProduct || !selectedPaymentMethod) {
      setError("신청 정보와 결제수단을 모두 확인해 주세요.");
      return;
    }

    setError("");
    setIsSubmitting(true);

    // TODO: 추후 백엔드에서 주문번호를 발급받는 방식으로 교체합니다.
    // 실제 결제 금액과 상품 정보는 프론트엔드 값만 신뢰하면 안 되며 백엔드에서 반드시 검증해야 합니다.
    const orderId = "ORDER-" + Date.now();

    try {
      const result = await requestPayment({
        orderId,
        categoryId: selectedCategory.id,
        categoryTitle: selectedCategory.title,
        productId: selectedProduct.id,
        productTitle: selectedProduct.title,
        price: selectedProduct.price,
        paymentMethod: selectedPaymentMethod,
      });

      if (!result.success) {
        throw new Error(result.message || "결제 요청에 실패했습니다.");
      }

      const params = new URLSearchParams({
        mock: "1",
        orderId: result.orderId,
        categoryId: selectedCategory.id,
        productId: selectedProduct.id,
        paymentMethod: selectedPaymentMethod,
      });

      router.push("/payment/success?" + params.toString());
    } catch (paymentError) {
      console.error(paymentError);
      setError(paymentError instanceof Error ? paymentError.message : "결제 요청 중 오류가 발생했습니다.");
      setIsSubmitting(false);
    }
  };

  if (!selectedCategory || !selectedProduct) {
    return (
      <main className="min-h-screen bg-[#eef3f8] px-4 py-10 text-slate-950 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-[1.5rem] border border-[#dbe4ef] bg-white p-6 text-center shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#274690]">Payment</p>
          <h1 className="mt-3 text-3xl font-semibold">신청 정보가 없습니다</h1>
          <p className="mt-3 text-sm leading-7 text-slate-600">수강신청 화면에서 교육과 상품을 선택한 뒤 결제를 진행해 주세요.</p>
          <Link href="/courses/apply" className={buttonClass("primary", "md", "mt-6 rounded-full px-6 font-bold")}>
            수강신청으로 이동
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#edf3f9_48%,#f8fafc_100%)] px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="rounded-[1.75rem] border border-[#d7e1ef] bg-[linear-gradient(135deg,#0b1d36_0%,#173968_58%,#21568f_100%)] px-6 py-8 text-white shadow-[0_26px_70px_rgba(15,23,42,0.22)] sm:px-8 lg:px-10">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#a7c7ff]">Payment</p>
          <h1 className="mt-4 text-3xl font-semibold sm:text-4xl">결제하기</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-200 sm:text-[15px]">신청한 교육과 결제금액을 확인한 뒤 결제수단을 선택하세요.</p>
        </section>

        <div className="mt-7 grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
          <aside className="rounded-[1.5rem] border border-[#cfdceb] bg-white p-5 shadow-[0_22px_55px_rgba(15,23,42,0.10)] sm:p-6 lg:self-start">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#274690]">Order</p>
            <h2 className="mt-2 text-2xl font-semibold">신청내역</h2>
            <dl className="mt-5 space-y-4">
              <div><dt className="text-xs font-semibold text-slate-500">교육명</dt><dd className="mt-1 text-base font-semibold text-slate-950">{selectedCategory.title}</dd></div>
              <div><dt className="text-xs font-semibold text-slate-500">상품명</dt><dd className="mt-1 text-base font-semibold text-slate-950">{selectedProduct.title}</dd></div>
            </dl>
            <div className="mt-5 rounded-[1rem] bg-[#f8fafc] p-4">
              <p className="text-sm font-semibold text-slate-950">제공 항목</p>
              <ul className="mt-3 space-y-2">
                {selectedProduct.includes.map((item) => (
                  <li key={item} className="flex gap-2 text-sm leading-6 text-slate-700"><span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-[#173968]"><CheckIcon className="h-3.5 w-3.5" /></span><span>{item}</span></li>
                ))}
              </ul>
            </div>
            <div className="mt-5 border-t border-[#e2e8f0] pt-5"><p className="text-sm font-semibold text-slate-600">결제금액</p><p className="mt-2 text-4xl font-bold text-[#0f2f5f]">{formatApplicationKrw(selectedProduct.price)}</p></div>
          </aside>

          <section className="rounded-[1.5rem] border border-[#dbe4ef] bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.07)] sm:p-6">
            <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#274690]">Method</p><h2 className="mt-2 text-2xl font-semibold">결제수단 선택</h2></div>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              {paymentMethods.map((method) => {
                const isSelected = selectedPaymentMethod === method.id;
                return (
                  <button key={method.id} type="button" aria-selected={isSelected} onClick={() => setSelectedPaymentMethod(method.id)} className={(isSelected ? selectedCardClass : selectableCardClass) + " min-h-[158px] p-5"}>
                    <div className="flex items-start justify-between gap-3"><span className={"rounded-full px-3 py-1 text-xs font-black " + method.badgeClassName}>{method.badge}</span><span className={isSelected ? "flex h-7 w-7 items-center justify-center rounded-full bg-[#173968] text-white" : "h-7 w-7 rounded-full border border-[#cbd5e1] bg-white"}>{isSelected ? <CheckIcon /> : null}</span></div>
                    <h3 className="mt-4 text-lg font-semibold text-slate-950">{method.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{method.description}</p>
                  </button>
                );
              })}
            </div>
            <div className="mt-6 space-y-3 rounded-[1rem] border border-[#dbe4ef] bg-[#f8fafc] p-4 text-sm leading-7 text-slate-600"><p>결제 완료 후 선택한 교육을 수강할 수 있으며, 수강 즉시 수료증을 출력할 수 있습니다.</p>{hasDocumentItems ? <p>{applicationNoticeText}</p> : null}</div>
            {error ? <p className="mt-4 rounded-[1rem] border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p> : null}
            <button type="button" disabled={!canPay} onClick={handlePayment} className={buttonClass("primary", "lg", "mt-5 w-full rounded-[1rem] font-bold disabled:opacity-100")}>
              {isSubmitting ? "결제 요청 중..." : formatApplicationKrw(selectedProduct.price) + " 결제하기"}
            </button>
          </section>
        </div>
      </div>
    </main>
  );
}
