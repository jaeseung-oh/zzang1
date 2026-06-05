"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { defaultCourse } from "@/lib/course/catalog";
import { duiPreventionCourseProduct, formatKrw } from "@/lib/course/product";
import { paymentConfig } from "@/lib/payment/config";
import { requireAuthenticatedUser } from "@/lib/firebase/session";
import { getUserProfile } from "@/lib/firebase/user-profile";

declare global {
  interface Window {
    TossPayments?: (clientKey: string) => {
      widgets(params: { customerKey: string }): Promise<TossWidgets> | TossWidgets;
    };
  }
}

type TossWidgets = {
  setAmount(amount: { currency: "KRW"; value: number }): Promise<void> | void;
  renderPaymentMethods(params: { selector: string; variantKey?: string }): Promise<unknown> | unknown;
  renderAgreement(params: { selector: string; variantKey?: string }): Promise<unknown> | unknown;
  requestPayment(paymentRequest: {
    orderId: string;
    orderName: string;
    successUrl: string;
    failUrl: string;
    customerEmail?: string;
    customerName?: string;
  }): Promise<void> | void;
};

const tossScriptUrl = "https://js.tosspayments.com/v2/standard";
const clientKey = paymentConfig.clientKey;
const appOrigin = paymentConfig.siteUrl;
const fallbackCoursePrice = duiPreventionCourseProduct.price;
const paymentMethodVariantKey = paymentConfig.paymentMethodVariantKey;
const agreementVariantKey = paymentConfig.agreementVariantKey;
const paymentMethods = [
  {
    id: "card",
    title: "신용카드",
    label: "CARD",
    description: "국내 주요 카드사 일시불/할부 결제",
    badgeClass: "bg-[#173968] text-white",
  },
  {
    id: "mobile",
    title: "휴대폰결제",
    label: "DANAL",
    description: "다날 휴대폰 본인인증 기반 소액결제",
    badgeClass: "bg-[#0f766e] text-white",
  },
  {
    id: "kakaopay",
    title: "카카오페이",
    label: "KAKAO",
    description: "카카오페이 지갑/카드 간편결제",
    badgeClass: "bg-[#fee500] text-[#191600]",
  },
] as const;

type PaymentMethodId = (typeof paymentMethods)[number]["id"];

function createLocalOrderId(uid: string) {
  const randomValue = crypto.getRandomValues(new Uint32Array(2));
  const randomSuffix = Array.from(randomValue)
    .map((value) => value.toString(36))
    .join("")
    .slice(0, 12);

  return `order_${Date.now()}_${uid.slice(0, 8)}_${randomSuffix}`;
}

async function buildCustomerKey(uid: string) {
  const encoder = new TextEncoder();
  const buffer = await crypto.subtle.digest("SHA-256", encoder.encode(uid));
  const hash = Array.from(new Uint8Array(buffer))
    .map((item) => item.toString(16).padStart(2, "0"))
    .join("");

  return `user_${hash.slice(0, 24)}`;
}

function loadTossScript() {
  return new Promise<void>((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("브라우저 환경에서만 결제 SDK를 불러올 수 있습니다."));
      return;
    }

    if (window.TossPayments) {
      resolve();
      return;
    }

    const existingScript = document.querySelector<HTMLScriptElement>(`script[src="${tossScriptUrl}"]`);
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener("error", () => reject(new Error("결제 모듈을 불러오지 못했습니다.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = tossScriptUrl;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("결제 모듈을 불러오지 못했습니다."));
    document.head.appendChild(script);
  });
}

export default function CheckoutContent() {
  const router = useRouter();
  const widgetsRef = useRef<TossWidgets | null>(null);
  const renderStartedRef = useRef(false);
  const [orderId, setOrderId] = useState("");
  const [courseAmount, setCourseAmount] = useState(fallbackCoursePrice);
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [isInitializing, setIsInitializing] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [checkoutNoticeChecked, setCheckoutNoticeChecked] = useState(false);
  const [refundPolicyChecked, setRefundPolicyChecked] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethodId>("card");

  const selectedPaymentMethodInfo = useMemo(
    () => paymentMethods.find((method) => method.id === selectedPaymentMethod) || paymentMethods[0],
    [selectedPaymentMethod]
  );

  const canSubmit = isReady && !isSubmitting && checkoutNoticeChecked && refundPolicyChecked && courseAmount > 0;

  const paymentSummary = useMemo(
    () => [
      { label: "주문 과정", value: defaultCourse.title },
      { label: "강의 수", value: `총 ${duiPreventionCourseProduct.totalLessons}강` },
      { label: "수강기간", value: defaultCourse.accessValidLabel },
      { label: "결제 금액", value: courseAmount > 0 ? formatKrw(courseAmount) : "가격 설정 필요" },
    ],
    [courseAmount]
  );

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const user = await requireAuthenticatedUser();
        const profile = await getUserProfile(user.uid);
        if (cancelled) {
          return;
        }

        const resolvedName = profile?.realName?.trim() || profile?.fullName?.trim() || "회원";
        const resolvedEmail = user.email || profile?.email || "";
        const resolvedOrderId = createLocalOrderId(user.uid);
        const resolvedAmount = fallbackCoursePrice;

        setCustomerName(resolvedName);
        setCustomerEmail(resolvedEmail);
        setOrderId(resolvedOrderId);
        setCourseAmount(resolvedAmount);

        if (!clientKey) {
          throw new Error("NEXT_PUBLIC_PAYMENT_CLIENT_KEY 또는 NEXT_PUBLIC_TOSS_WIDGET_CLIENT_KEY가 설정되지 않았습니다.");
        }

        if (!Number.isFinite(resolvedAmount) || resolvedAmount <= 0) {
          throw new Error("결제 금액 설정이 올바르지 않습니다.");
        }

        await loadTossScript();

        if (cancelled || renderStartedRef.current) {
          return;
        }

        renderStartedRef.current = true;
        const customerKey = await buildCustomerKey(user.uid);
        const tossPayments = window.TossPayments?.(clientKey);

        if (!tossPayments) {
          throw new Error("결제 모듈 초기화에 실패했습니다.");
        }

        const widgets = await tossPayments.widgets({ customerKey });
        await widgets.setAmount({
          currency: "KRW",
          value: resolvedAmount,
        });
        await widgets.renderPaymentMethods({
          selector: "#payment-method",
          variantKey: paymentMethodVariantKey,
        });
        await widgets.renderAgreement({
          selector: "#agreement",
          variantKey: agreementVariantKey,
        });

        widgetsRef.current = widgets;
        if (!cancelled) {
          setIsReady(true);
        }
      } catch (initError) {
        console.error(initError);
        const message = initError instanceof Error ? initError.message : "주문서를 준비하지 못했습니다.";

        if (message === "AUTH_LOGIN_REQUIRED") {
          router.replace("/login?next=/checkout");
          return;
        }

        if (!cancelled) {
          setError(message);
        }
      } finally {
        if (!cancelled) {
          setIsInitializing(false);
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const handleRequestPayment = async () => {
    if (!widgetsRef.current) {
      setError("결제 UI가 아직 준비되지 않았습니다.");
      return;
    }

    if (!canSubmit) {
      setError("필수 확인 항목을 모두 체크한 뒤 결제를 진행해 주세요.");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      await widgetsRef.current.requestPayment({
        orderId,
        orderName: duiPreventionCourseProduct.courseTitle,
        successUrl: `${appOrigin}/payment/success?courseId=${duiPreventionCourseProduct.courseId}`,
        failUrl: `${appOrigin}/payment/fail?courseId=${duiPreventionCourseProduct.courseId}`,
        customerEmail: customerEmail || undefined,
        customerName: customerName || undefined,
      });
    } catch (requestError) {
      console.error(requestError);
      setError(requestError instanceof Error ? requestError.message : "결제 요청 중 오류가 발생했습니다.");
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#edf3f9_48%,#f8fafc_100%)] px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="rounded-[1.75rem] border border-[#d7e1ef] bg-[linear-gradient(135deg,#0b1d36_0%,#173968_58%,#21568f_100%)] px-6 py-8 text-white shadow-[0_26px_70px_rgba(15,23,42,0.22)] sm:px-8 lg:px-10">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#a7c7ff]">Secure Checkout</p>
          <h1 className="mt-4 text-3xl font-semibold sm:text-4xl">결제하기</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-200 sm:text-[15px]">
            신청한 교육과 결제금액을 확인한 뒤 결제수단을 선택하세요.
          </p>
        </section>

        <div className="mt-7 grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
          <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
            <section className="rounded-[1.5rem] border border-[#cfdceb] bg-white p-5 shadow-[0_22px_55px_rgba(15,23,42,0.10)] sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#274690]">Order</p>
              <h2 className="mt-2 text-2xl font-semibold">신청내역</h2>
              <dl className="mt-5 space-y-4">
                <div><dt className="text-xs font-semibold text-slate-500">교육명</dt><dd className="mt-1 text-base font-semibold text-slate-950">{defaultCourse.title}</dd></div>
                <div><dt className="text-xs font-semibold text-slate-500">상품명</dt><dd className="mt-1 text-base font-semibold text-slate-950">{duiPreventionCourseProduct.courseTitle}</dd></div>
                <div><dt className="text-xs font-semibold text-slate-500">수강기간</dt><dd className="mt-1 text-base font-semibold text-slate-950">{defaultCourse.accessValidLabel}</dd></div>
              </dl>
              <div className="mt-5 rounded-[1rem] bg-[#f8fafc] p-4">
                <p className="text-sm font-semibold text-slate-950">제공 항목</p>
                <ul className="mt-3 space-y-2">
                  {["온라인 강의 수강", "진도율 확인", "수료증 발급", "교육 이수 기록 정리"].map((item) => (
                    <li key={item} className="flex gap-2 text-sm leading-6 text-slate-700">
                      <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-[#173968]">✓</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-5 border-t border-[#e2e8f0] pt-5">
                <p className="text-sm font-semibold text-slate-600">결제금액</p>
                <p className="mt-2 text-4xl font-bold text-[#0f2f5f]">{formatKrw(courseAmount)}</p>
              </div>
            </section>

            <section className="rounded-[1.5rem] border border-[#cfdceb] bg-white p-5 shadow-[0_22px_55px_rgba(15,23,42,0.10)] sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#274690]">Buyer</p>
              <h2 className="mt-2 text-2xl font-semibold">구매자 정보</h2>
              <div className="mt-5 space-y-3 rounded-[1rem] bg-[#f8fafc] p-4 text-sm leading-7 text-slate-700">
                <p><span className="font-semibold text-slate-950">이름:</span> {customerName || "불러오는 중"}</p>
                <p><span className="font-semibold text-slate-950">이메일:</span> {customerEmail || "등록 필요"}</p>
                <p><span className="font-semibold text-slate-950">주문번호:</span> {orderId || "생성 중"}</p>
              </div>
            </section>
          </aside>

          <section className="rounded-[1.5rem] border border-[#dbe4ef] bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.07)] sm:p-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#274690]">Method</p>
              <h2 className="mt-2 text-2xl font-semibold">결제수단 선택</h2>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-3">
              {paymentMethods.map((method) => {
                const isSelected = method.id === selectedPaymentMethod;
                return (
                  <button
                    key={method.id}
                    type="button"
                    aria-selected={isSelected}
                    onClick={() => setSelectedPaymentMethod(method.id)}
                    className={isSelected ? "min-h-[158px] cursor-pointer rounded-[1.25rem] border-2 border-[#173968] bg-[#f5f8ff] p-5 text-left shadow-[0_16px_34px_rgba(23,57,104,0.15)] transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(23,57,104,0.17)] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2" : "min-h-[158px] cursor-pointer rounded-[1.25rem] border border-[#d8e2ee] bg-white p-5 text-left transition-all hover:-translate-y-0.5 hover:border-[#9fb5d1] hover:bg-indigo-50 hover:shadow-[0_14px_28px_rgba(15,23,42,0.08)] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className={["rounded-full px-3 py-1 text-xs font-black", method.badgeClass].join(" ")}>{method.label}</span>
                      <span className={isSelected ? "flex h-7 w-7 items-center justify-center rounded-full bg-[#173968] text-white" : "h-7 w-7 rounded-full border border-[#cbd5e1] bg-white"}>{isSelected ? "✓" : null}</span>
                    </div>
                    <h3 className="mt-4 text-lg font-semibold text-slate-950">{method.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{method.description}</p>
                  </button>
                );
              })}
            </div>

            <div className="mt-6 rounded-[1rem] border border-[#dbe4ef] bg-[#f8fafc] p-4 text-sm leading-7 text-slate-600">
              <p>선택한 결제수단으로 결제창을 열어 안전하게 결제를 진행합니다.</p>
              <p className="mt-2">선택 결제수단: <strong className="text-slate-950">{selectedPaymentMethodInfo.title}</strong></p>
            </div>

            <div id="payment-method" className="mt-5 min-h-[220px] rounded-[1rem] border border-[#dbe4ef] bg-white p-4" />

            <div className="mt-5 rounded-[1rem] border border-[#dbe4ef] bg-[#f8fafc] p-4">
              <p className="text-sm font-semibold text-slate-950">결제 약관</p>
              <div id="agreement" className="mt-4 min-h-[160px]" />
            </div>

            <div className="mt-6 space-y-4">
              <label className="flex items-start gap-3 rounded-[1rem] border border-[#dce4ef] bg-[#f8fafd] px-4 py-4 text-sm leading-7 text-slate-700">
                <input type="checkbox" checked={checkoutNoticeChecked} onChange={(event) => setCheckoutNoticeChecked(event.target.checked)} className="mt-1 h-4 w-4 accent-[#173968]" />
                <span className="font-semibold text-slate-900">결제 전 안내, 이용약관 및 수료 문서 발급 조건을 확인했습니다.</span>
              </label>

              <label className="flex items-start gap-3 rounded-[1rem] border border-[#dce4ef] bg-[#fff7e5] px-4 py-4 text-sm leading-7 text-[#3d2b08]">
                <input type="checkbox" checked={refundPolicyChecked} onChange={(event) => setRefundPolicyChecked(event.target.checked)} className="mt-1 h-4 w-4 accent-[#8a6a2d]" />
                <span className="font-semibold">수강기간 90일 및 교육 이수 관련 서류 발급 조건을 확인했습니다.</span>
              </label>
            </div>

            <div className="mt-6 rounded-[1rem] border border-[#dbe4ef] bg-[#f8fafc] p-4 text-sm leading-7 text-slate-600">
              <div className="flex flex-wrap gap-3 text-sm font-semibold">
                <Link href="/terms" className="underline underline-offset-4 text-[#173968] hover:text-[#0b1220]">이용약관</Link>
                <Link href="/privacy-policy" className="underline underline-offset-4 text-[#173968] hover:text-[#0b1220]">개인정보처리방침</Link>
                <Link href="/refund-policy" className="underline underline-offset-4 text-[#173968] hover:text-[#0b1220]">환불규정</Link>
              </div>
            </div>

            {error ? <p className="mt-4 rounded-[1rem] border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p> : null}
            {isInitializing ? <p className="mt-4 rounded-[1rem] border border-[#dbe4ef] bg-[#f8fafc] p-4 text-sm text-slate-500">주문서와 결제창을 준비하는 중입니다...</p> : null}

            <button
              type="button"
              onClick={() => void handleRequestPayment()}
              disabled={!canSubmit}
              className="mt-5 inline-flex min-h-14 w-full cursor-pointer items-center justify-center rounded-[1rem] bg-[#06101b] px-5 py-4 text-base font-bold text-[#e9c98d] shadow-[0_16px_30px_rgba(6,16,27,0.28)] transition-all hover:bg-indigo-700 hover:shadow-lg active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 disabled:opacity-70 disabled:shadow-none disabled:hover:bg-slate-300 disabled:hover:shadow-none disabled:active:scale-100"
            >
              {isSubmitting ? "결제창 여는 중..." : selectedPaymentMethodInfo.title + "로 결제하기"}
            </button>
          </section>
        </div>
      </div>
    </main>
  );
}
