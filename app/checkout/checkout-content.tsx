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
const coursePrice = Number(process.env.NEXT_PUBLIC_DEFAULT_COURSE_PRICE || "0");

function formatWon(value: number) {
  return `${value.toLocaleString("ko-KR")}원`;
}

function createOrderId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `order_${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`;
  }

  return `order_${Date.now()}`;
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
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [isInitializing, setIsInitializing] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [serviceChecked, setServiceChecked] = useState(false);
  const [issueChecked, setIssueChecked] = useState(false);
  const [refundChecked, setRefundChecked] = useState(false);

  const canSubmit = isReady && !isSubmitting && serviceChecked && issueChecked && refundChecked && coursePrice > 0;

  const paymentSummary = useMemo(
    () => [
      { label: "주문 과정", value: defaultCourse.title },
      { label: "총 교육 시간", value: `${defaultCourse.durationMinutes}분` },
      { label: "결제 금액", value: coursePrice > 0 ? formatWon(coursePrice) : "가격 설정 필요" },
    ],
    []
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
        const nextOrderId = createOrderId();

        setCustomerName(resolvedName);
        setCustomerEmail(resolvedEmail);
        setOrderId(nextOrderId);

        if (!clientKey) {
          throw new Error("NEXT_PUBLIC_TOSS_WIDGET_CLIENT_KEY가 설정되지 않았습니다.");
        }

        if (!Number.isFinite(coursePrice) || coursePrice <= 0) {
          throw new Error("NEXT_PUBLIC_DEFAULT_COURSE_PRICE가 설정되지 않았습니다.");
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
          value: coursePrice,
        });
        await widgets.renderPaymentMethods({
          selector: "#payment-method",
          variantKey: "DEFAULT",
        });
        await widgets.renderAgreement({
          selector: "#agreement",
          variantKey: "DEFAULT",
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
            토스 결제위젯으로 카드, 계좌이체, 가상계좌(무통장입금) 등 계약 및 어드민 설정에 따라 제공되는 결제수단을 한 주문서에서 처리합니다.
          </p>
          <div className="mt-6 flex flex-wrap gap-3 text-sm text-slate-200">
            <span className="rounded-full border border-white/12 bg-white/8 px-4 py-2">민간 교육 서비스</span>
            <span className="rounded-full border border-white/12 bg-white/8 px-4 py-2">결제 후 수강 완료 시 이수 확인 자료 안내</span>
            <span className="rounded-full border border-white/12 bg-white/8 px-4 py-2">환불 기준 별도 확인</span>
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
                <div className="rounded-[1.5rem] border border-[#dce4ef] bg-[#f9fbfd] p-4">
                  <p className="text-sm font-semibold text-slate-900">결제수단 선택</p>
                  <div id="payment-method" className="mt-4 min-h-[220px]" />
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
                  <p className="font-semibold text-white">결제 전 안내</p>
                  <p className="mt-2">결제 승인 후 구매 이력이 저장됩니다. 결제만으로 문서가 자동 발급되지 않으며, 수강 완료와 필수 동의 확인이 모두 충족되어야 이수 확인 자료 안내가 이어집니다.</p>
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

              <div className="space-y-3 p-4 sm:p-5">
                <label className="flex items-start gap-3 rounded-[1.2rem] border border-[#dce4ef] bg-[#f8fafd] px-4 py-4 text-sm leading-7 text-slate-700">
                  <input
                    type="checkbox"
                    checked={serviceChecked}
                    onChange={(event) => setServiceChecked(event.target.checked)}
                    className="mt-1 h-4 w-4 accent-[#173968]"
                  />
                  <span>본 서비스가 민간 교육 서비스이며 법률 자문이나 결과 보장을 제공하지 않는다는 점을 확인했습니다.</span>
                </label>
                <label className="flex items-start gap-3 rounded-[1.2rem] border border-[#dce4ef] bg-[#f8fafd] px-4 py-4 text-sm leading-7 text-slate-700">
                  <input
                    type="checkbox"
                    checked={issueChecked}
                    onChange={(event) => setIssueChecked(event.target.checked)}
                    className="mt-1 h-4 w-4 accent-[#173968]"
                  />
                  <span>결제만으로 수료 문서가 자동 발급되지 않으며, 수강 완료와 필수 동의 확인이 함께 필요하다는 점을 확인했습니다.</span>
                </label>
                <label className="flex items-start gap-3 rounded-[1.2rem] border border-[#dce4ef] bg-[#f8fafd] px-4 py-4 text-sm leading-7 text-slate-700">
                  <input
                    type="checkbox"
                    checked={refundChecked}
                    onChange={(event) => setRefundChecked(event.target.checked)}
                    className="mt-1 h-4 w-4 accent-[#173968]"
                  />
                  <span>환불 기준과 이용 조건은 결제 전 안내, 이용약관, 환불규정을 직접 확인해야 한다는 점을 이해했습니다.</span>
                </label>

                <div className="flex flex-wrap gap-3 text-sm">
                  <Link href="/terms" className="underline underline-offset-4 text-[#173968] hover:text-[#0b1220]">
                    이용약관
                  </Link>
                  <Link href="/privacy-policy" className="underline underline-offset-4 text-[#173968] hover:text-[#0b1220]">
                    개인정보처리방침
                  </Link>
                  <Link href="/refund-policy" className="underline underline-offset-4 text-[#173968] hover:text-[#0b1220]">
                    환불규정
                  </Link>
                </div>

                <button
                  type="button"
                  onClick={() => void handleRequestPayment()}
                  disabled={!canSubmit}
                  className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[linear-gradient(135deg,#d3ad62_0%,#f0cb85_100%)] px-5 py-3 text-sm font-bold text-[#1a140b] shadow-[0_14px_28px_rgba(198,168,106,0.22)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? "결제창 여는 중..." : "토스로 결제하기"}
                </button>

                <p className="text-xs leading-6 text-slate-500">
                  카드, 계좌이체, 가상계좌(무통장입금) 노출 여부는 토스 결제위젯 어드민 설정과 계약 상태에 따라 달라집니다.
                </p>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
