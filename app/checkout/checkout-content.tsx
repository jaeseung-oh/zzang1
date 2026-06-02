"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { defaultCourse } from "@/lib/course/catalog";
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
const clientKey = process.env.NEXT_PUBLIC_TOSS_WIDGET_CLIENT_KEY || "";
const appOrigin = process.env.NEXT_PUBLIC_APP_ORIGIN || "http://localhost:3000";
const fallbackCoursePrice = defaultCourse.priceKrw;
const paymentMethodVariantKey = process.env.NEXT_PUBLIC_TOSS_PAYMENT_METHOD_VARIANT_KEY || "DEFAULT";
const agreementVariantKey = process.env.NEXT_PUBLIC_TOSS_AGREEMENT_VARIANT_KEY || "DEFAULT";

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

function formatWon(value: number) {
  return `${value.toLocaleString("ko-KR")}원`;
}

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
      existingScript.addEventListener("error", () => reject(new Error("토스 결제 SDK를 불러오지 못했습니다.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = tossScriptUrl;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("토스 결제 SDK를 불러오지 못했습니다."));
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
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethodId>("card");

  const selectedPaymentMethodInfo = useMemo(
    () => paymentMethods.find((method) => method.id === selectedPaymentMethod) || paymentMethods[0],
    [selectedPaymentMethod]
  );

  const canSubmit = isReady && !isSubmitting && checkoutNoticeChecked && courseAmount > 0;

  const paymentSummary = useMemo(
    () => [
      { label: "주문 과정", value: defaultCourse.title },
      { label: "총 교육 시간", value: `${defaultCourse.durationMinutes}분` },
      { label: "수강 유효기간", value: defaultCourse.accessValidLabel },
      { label: "결제 금액", value: courseAmount > 0 ? formatWon(courseAmount) : "가격 설정 필요" },
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
          throw new Error("NEXT_PUBLIC_TOSS_WIDGET_CLIENT_KEY가 설정되지 않았습니다.");
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
          throw new Error("토스 결제 SDK 초기화에 실패했습니다.");
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
        orderName: defaultCourse.title,
        successUrl: `${appOrigin}/payment/success?courseId=${defaultCourse.id}`,
        failUrl: `${appOrigin}/payment/fail?courseId=${defaultCourse.id}`,
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
    <main className="min-h-screen bg-[linear-gradient(180deg,#08101c_0%,#0d1728_22%,#eef3f8_22%,#f4f7fb_100%)] px-4 py-8 text-[#0f172a] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,#0a1424_0%,#10213f_45%,#16325e_100%)] px-6 py-7 text-white shadow-[0_30px_90px_rgba(2,6,23,0.34)] sm:px-8 lg:px-10">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#f0d59c]">Toss Checkout</p>
          <h1 className="mt-4 text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">주문서 및 결제</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300 sm:text-[15px]">
            신용카드, 휴대폰결제(다날), 카카오페이를 먼저 열어두는 주문서입니다. 결제사 심사 완료 후 운영 키와 상점 설정만 연결하면 실제 결제창으로 이어지도록 준비합니다.
          </p>
          <div className="mt-6 flex flex-wrap gap-3 text-sm text-slate-200">
            <span className="rounded-full border border-white/12 bg-white/8 px-4 py-2">민간 교육 서비스</span>
            <span className="rounded-full border border-white/12 bg-white/8 px-4 py-2">수강 유효기간 {defaultCourse.accessValidLabel}</span>
            <span className="rounded-full border border-white/12 bg-white/8 px-4 py-2">미수강 강의 환불 기준 확인</span>
            <span className="rounded-full border border-white/12 bg-white/8 px-4 py-2">신용카드</span>
            <span className="rounded-full border border-white/12 bg-white/8 px-4 py-2">휴대폰결제(다날)</span>
            <span className="rounded-full border border-white/12 bg-white/8 px-4 py-2">카카오페이</span>
          </div>
        </section>

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_380px]">
          <section className="rounded-[2rem] border border-[#d7deea] bg-white p-5 shadow-[0_24px_60px_rgba(15,23,42,0.08)] sm:p-6 lg:p-7">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#274690]">Order Form</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[#0f172a]">토스 결제위젯</h2>
              </div>
              <div className="rounded-full border border-[#d8dfeb] bg-[#f6f8fb] px-4 py-2 text-sm font-semibold text-slate-700">
                주문번호 {orderId || "생성 중"}
              </div>
            </div>

            <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
              <div className="space-y-5">
                <div className="overflow-hidden rounded-[1.5rem] border border-[#dce4ef] bg-white">
                  <div className="border-b border-[#e5ebf3] bg-[#f8fafc] px-4 py-4 sm:px-5">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#274690]">Payment Method</p>
                        <h3 className="mt-1 text-lg font-semibold tracking-[-0.02em] text-slate-950">결제수단 선택</h3>
                      </div>
                      <p className="text-sm font-semibold text-slate-600">총 결제금액 {formatWon(courseAmount)}</p>
                    </div>
                  </div>

                  <div className="grid gap-3 p-4 sm:grid-cols-3 sm:p-5">
                    {paymentMethods.map((method) => {
                      const isSelected = method.id === selectedPaymentMethod;

                      return (
                        <button
                          key={method.id}
                          type="button"
                          aria-pressed={isSelected}
                          onClick={() => setSelectedPaymentMethod(method.id)}
                          className={
                            isSelected
                              ? "group min-h-[132px] rounded-[1.2rem] border border-[#173968] bg-[#f3f7ff] px-4 py-4 text-left shadow-[0_14px_30px_rgba(23,57,104,0.14)] transition"
                              : "group min-h-[132px] rounded-[1.2rem] border border-[#dce4ef] bg-white px-4 py-4 text-left transition hover:-translate-y-0.5 hover:border-[#b9c7db] hover:shadow-[0_12px_24px_rgba(15,23,42,0.08)]"
                          }
                        >
                          <span className={["inline-flex rounded-full px-3 py-1 text-[11px] font-bold tracking-[0.14em]", method.badgeClass].join(" ")}>
                            {method.label}
                          </span>
                          <span className="mt-4 block text-base font-bold text-slate-950">{method.title}</span>
                          <span className="mt-2 block text-sm leading-6 text-slate-600">{method.description}</span>
                          <span
                            className={
                              isSelected
                                ? "mt-4 inline-flex h-5 w-5 items-center justify-center rounded-full border border-[#173968] bg-[#173968] text-xs font-bold text-white"
                                : "mt-4 inline-flex h-5 w-5 items-center justify-center rounded-full border border-[#cbd5e1] text-xs font-bold text-transparent"
                            }
                          >
                            ✓
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="border-t border-[#e5ebf3] bg-[#fbfcfe] px-4 py-4 sm:px-5">
                    <div className="flex flex-col gap-2 rounded-[1rem] border border-[#e1e8f2] bg-white px-4 py-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
                      <span>선택한 결제수단</span>
                      <strong className="text-slate-950">{selectedPaymentMethodInfo.title}</strong>
                    </div>
                    <p className="mt-3 text-xs leading-6 text-slate-500">
                      아래 결제사 위젯은 실제 승인 가능한 수단을 최종 표시합니다. 신용카드, 다날 휴대폰결제, 카카오페이는 결제사 계약 및 상점관리자 활성화 후 운영 결제창에 노출됩니다.
                    </p>
                    <div id="payment-method" className="mt-4 min-h-[220px]" />
                  </div>
                </div>

                <div className="rounded-[1.5rem] border border-[#dce4ef] bg-[#f9fbfd] p-4">
                  <p className="text-sm font-semibold text-slate-900">토스 약관</p>
                  <div id="agreement" className="mt-4 min-h-[160px]" />
                </div>
              </div>

              <div className="rounded-[1.6rem] border border-[#dce4ef] bg-[linear-gradient(180deg,#0f1c33_0%,#132544_100%)] p-5 text-white shadow-[0_20px_40px_rgba(15,23,42,0.16)]">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9cbef6]">구매자 정보</p>
                <div className="mt-4 space-y-3 rounded-[1.2rem] border border-white/10 bg-white/7 px-4 py-4 text-sm leading-7 text-slate-200">
                  <p>
                    <span className="font-semibold text-white">이름:</span> {customerName || "불러오는 중"}
                  </p>
                  <p>
                    <span className="font-semibold text-white">이메일:</span> {customerEmail || "등록 필요"}
                  </p>
                </div>

                <div className="mt-5 rounded-[1.2rem] border border-white/10 bg-white/7 px-4 py-4 text-sm leading-7 text-slate-200">
                  <p className="font-semibold text-white">선택 결제수단</p>
                  <div className="mt-3 flex items-center justify-between rounded-[0.9rem] bg-white/10 px-3 py-3">
                    <span>{selectedPaymentMethodInfo.title}</span>
                    <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold tracking-[0.14em] text-[#10213f]">{selectedPaymentMethodInfo.label}</span>
                  </div>
                </div>

                <div className="mt-4 rounded-[1.2rem] border border-white/10 bg-white/7 px-4 py-4 text-sm leading-7 text-slate-200">
                  <p className="font-semibold text-white">결제 전 안내</p>
                  <p className="mt-2">결제 승인 후 구매 이력이 저장됩니다. 수강 유효기간은 {defaultCourse.accessValidLabel}입니다. 총 수강료는 55,000원이며, 수료 확인 자료를 발급받지 못했고 실제로 듣지 못한 강의가 남아 있는 경우 환불규정에 따라 강의 1개당 11,000원을 기준으로 환불 가능 금액을 검토합니다.</p>
                  <p className="mt-3 text-[#f4d79e]">실제 결제창 노출은 결제사 심사, 다날/카카오페이 계약, Toss 상점관리자 설정을 따릅니다.</p>
                </div>
              </div>
            </div>

            {error ? <p className="mt-5 text-sm font-medium text-rose-600">{error}</p> : null}
            {isInitializing ? <p className="mt-5 text-sm text-slate-500">주문서와 결제위젯을 준비하는 중입니다...</p> : null}
          </section>

          <aside className="space-y-6 xl:sticky xl:top-6 xl:self-start">
            <section className="overflow-hidden rounded-[2rem] border border-[#d7deea] bg-white shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
              <div className="bg-[linear-gradient(135deg,#6b4f1d_0%,#8a6a2d_100%)] px-4 py-4 text-white sm:px-5">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#f6e1b1]">Payment Summary</p>
                <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em]">주문 요약</h2>
              </div>

              <div className="space-y-3 p-4 sm:p-5">
                {paymentSummary.map((item) => (
                  <div key={item.label} className="rounded-[1.2rem] border border-[#dce4ef] bg-[#f8fafd] px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{item.label}</p>
                    <p className="mt-1.5 font-semibold text-slate-900">{item.value}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="overflow-hidden rounded-[2rem] border border-[#d7deea] bg-white shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
              <div className="bg-[linear-gradient(135deg,#10213f_0%,#173968_100%)] px-4 py-4 text-white sm:px-5">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#9dbef8]">Required Check</p>
                <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em]">결제 전 필수 확인</h2>
              </div>

              <div className="space-y-4 p-4 sm:p-5">
                <label className="flex items-start gap-3 rounded-[1.2rem] border border-[#dce4ef] bg-[#f8fafd] px-4 py-4 text-sm leading-7 text-slate-700">
                  <input
                    type="checkbox"
                    checked={checkoutNoticeChecked}
                    onChange={(event) => setCheckoutNoticeChecked(event.target.checked)}
                    className="mt-1 h-4 w-4 accent-[#173968]"
                  />
                  <span className="font-semibold text-slate-900">결제 전 안내, 이용약관, 환불규정 및 수료 문서 발급 조건을 확인했습니다.</span>
                </label>

                <div className="rounded-[1.1rem] border border-[#e2e8f0] bg-white px-4 py-4 text-sm leading-7 text-slate-600">
                  <p>수료 문서는 결제 완료, 수강 완료, 필수 동의 확인 후 안내됩니다. 수강 가능 기간은 {defaultCourse.accessValidLabel}이며, 미수강 강의 환불 기준은 55,000원 기준 강의 1개당 11,000원입니다. 본 서비스는 법률 자문이나 결과 보장을 제공하지 않는 민간 교육 서비스입니다.</p>
                  <div className="mt-3 flex flex-wrap gap-3 text-sm font-semibold">
                    <Link href="/terms" className="underline underline-offset-4 text-[#173968] hover:text-[#0b1220]">이용약관</Link>
                    <Link href="/privacy-policy" className="underline underline-offset-4 text-[#173968] hover:text-[#0b1220]">개인정보처리방침</Link>
                    <Link href="/refund-policy" className="underline underline-offset-4 text-[#173968] hover:text-[#0b1220]">환불규정</Link>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => void handleRequestPayment()}
                  disabled={!canSubmit}
                  className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[linear-gradient(135deg,#d3ad62_0%,#f0cb85_100%)] px-5 py-3 text-sm font-bold text-[#1a140b] shadow-[0_14px_28px_rgba(198,168,106,0.22)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? "결제창 여는 중..." : selectedPaymentMethodInfo.title + "로 결제하기"}
                </button>

                <p className="text-xs leading-6 text-slate-500">
                  신용카드, 휴대폰결제(다날), 카카오페이 노출 여부는 결제사 계약 상태와 상점관리자 결제위젯 설정에 따라 달라집니다.
                </p>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
