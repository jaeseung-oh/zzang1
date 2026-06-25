"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { duiPreventionCourseProduct } from "@/lib/course/product";
import { getApplicationProduct } from "@/lib/course/application-products";
import { requireAuthenticatedUser } from "@/lib/firebase/session";
import { paymentConfig } from "@/lib/payment/config";
import { ensureCertificateIdentityLock } from "@/lib/firebase/user-profile";
import { buttonClass } from "@/app/components/ui/button-styles";
import { trackPurchaseOnce } from "@/lib/analytics/ga";

type ConfirmResponse = {
  savedPurchaseId?: string;
  orderId?: string;
  method?: string;
  totalAmount?: number;
  approvedAt?: string;
  expiresAt?: string;
  courseTitle?: string;
  accessStatus?: string;
  receipt?: {
    url?: string;
  };
};

const disclaimer =
  "본 서비스는 법률 검토나 상담을 제공하지 않으며, 자발적인 교육 이수와 생활 실천 계획 정리를 돕는 민간 교육 서비스입니다.";

const CARD_APPROVAL_DELAY_MESSAGE =
  "안녕하세요. 리셋에듀센터입니다.\n\n결제 과정에서 카드 승인 후 수강권 반영이 지연된 것으로 확인됩니다.\n중복 결제는 하지 말아주시고, 승인 문자 또는 결제 시각을 보내주시면 확인 후 수강권을 즉시 반영해드리겠습니다.\n\n이용에 불편을 드려 죄송합니다.";

async function waitForRetry(attempt: number) {
  await new Promise((resolve) => window.setTimeout(resolve, 900 * attempt));
}

async function fetchJsonWithRetry(url: string, init: RequestInit, attempts = 3) {
  let lastError: unknown;
  const method = init.method || "GET";
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, init);
      const responseText = await response.text();
      const payload = responseText ? (() => { try { return JSON.parse(responseText); } catch { return { raw: responseText }; } })() : {};
      if (!response.ok) {
        const error = new Error(payload?.message || "결제 검증 처리에 실패했습니다.") as Error & { status?: number; payload?: unknown; url?: string; method?: string; responseText?: string; attempt?: number };
        error.status = response.status;
        error.payload = payload;
        error.url = url;
        error.method = method;
        error.responseText = responseText;
        error.attempt = attempt;
        console.error("Payment confirm API failed", { url, method, status: response.status, responseText, payload, attempt });
        throw error;
      }
      return payload;
    } catch (error) {
      if (error instanceof TypeError) console.error("Payment confirm fetch failed before HTTP response", { url, method, attempt, message: error.message });
      lastError = error;
      if (attempt === attempts) break;
      await waitForRetry(attempt);
    }
  }
  throw lastError instanceof Error ? lastError : new Error("결제 검증 처리에 실패했습니다.");
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}

function LegacyPaymentSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ConfirmResponse | null>(null);

  useEffect(() => {
    const paymentKey = searchParams.get("paymentKey");
    const orderId = searchParams.get("orderId");
    const amountValue = searchParams.get("amount");
    const courseId = searchParams.get("courseId");

    if (!paymentKey || !orderId || !amountValue || !courseId) {
      setError("결제 승인에 필요한 정보가 누락되었습니다. courseId까지 함께 전달되어야 합니다.");
      setLoading(false);
      return;
    }

    const confirmUrl = paymentConfig.confirmUrl;
    if (!confirmUrl) {
      setError("결제 승인 Worker URL이 설정되지 않았습니다.");
      setLoading(false);
      return;
    }

    const amount = Number(amountValue);
    if (Number.isNaN(amount)) {
      setError("결제 금액 형식이 올바르지 않습니다.");
      setLoading(false);
      return;
    }

    const run = async () => {
      try {
        const sessionUser = await requireAuthenticatedUser();
        const idToken = await sessionUser.getIdToken();
        const payload = await fetchJsonWithRetry(confirmUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + idToken,
          },
          body: JSON.stringify({
            paymentKey,
            orderId,
            amount,
            uid: sessionUser.uid,
            courseId,
            legalDisclaimerAccepted: true,
            finalReviewResponsibilityAccepted: true,
          }),
        });

        setResult(payload);
        trackPurchaseOnce({
          transaction_id: payload.savedPurchaseId || payload.orderId || orderId,
          value: typeof payload.totalAmount === "number" ? payload.totalAmount : amount,
          currency: "KRW",
          items: [{ item_id: courseId, item_name: payload.courseTitle || duiPreventionCourseProduct.courseTitle, price: typeof payload.totalAmount === "number" ? payload.totalAmount : amount, quantity: 1 }],
        });

        try {
          await ensureCertificateIdentityLock({
            uid: sessionUser.uid,
            purchaseId: payload.savedPurchaseId || payload.orderId || orderId,
            lockSource: "payment",
          });
        } catch (lockError) {
          console.error(lockError);
          setError(lockError instanceof Error ? lockError.message : "수료증 발급 기준 정보 잠금에 실패했습니다.");
        }
      } catch (requestError) {
        console.error(requestError);
        const message = requestError instanceof Error ? requestError.message : "";
        if (message === "AUTH_LOGIN_REQUIRED") {
          router.replace("/login?next=" + encodeURIComponent("/payment/success?" + searchParams.toString()));
          setError("로그인한 회원만 결제 완료를 계정에 연결할 수 있습니다.");
          return;
        }

        setError(CARD_APPROVAL_DELAY_MESSAGE);
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [router, searchParams]);

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#07111f_0%,#09111d_45%,#050a12_100%)] px-4 py-10 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl rounded-[2rem] border border-white/10 bg-white/[0.03] p-6 shadow-[0_30px_80px_rgba(0,0,0,0.3)] lg:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#f0cb85]">Payment</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-white">결제 완료 확인</h1>
        <p className="mt-4 text-sm leading-8 text-white/70">
          서버에서 결제금액과 주문 정보를 검증한 뒤 결제내역과 수강권을 저장합니다. 결제 완료 즉시 음주운전 예방교육 수강권이 부여됩니다. 수강 즉시 수료증을 출력할 수 있습니다.
        </p>

        <div className="mt-6 rounded-[1.5rem] border border-[#d3ad62]/20 bg-[#d3ad62]/10 p-4 text-sm leading-7 text-[#f7dfab]">
          {disclaimer}
        </div>

        <div className="mt-4 flex flex-wrap gap-3 text-sm text-white/75">
          <Link href="/terms" className="underline underline-offset-4 hover:text-white">
            이용약관 확인
          </Link>
          <Link href="/privacy-policy" className="underline underline-offset-4 hover:text-white">
            개인정보처리방침 확인
          </Link>
          <Link href="/refund-policy" className="underline underline-offset-4 hover:text-white">
            환불규정 확인
          </Link>
        </div>

        <div className="mt-8 rounded-[1.5rem] border border-white/10 bg-[#0d1828] p-5">
          {loading ? <p className="text-sm text-white/75">결제 승인 정보를 확인하는 중입니다...</p> : null}
          {error ? <p className="text-sm text-[#f2a39b]">{error}</p> : null}

          {!loading && result ? (
            <div className="space-y-4 text-sm text-white/80">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-white">결제가 완료되었습니다. 지금 바로 강의를 수강할 수 있습니다.</p>
                <p className="mt-2 text-white/70">저장된 구매 ID: {result.savedPurchaseId || result.orderId}</p>
                <p className="mt-2 text-white/70">수강기간은 결제일로부터 {duiPreventionCourseProduct.durationDays}일이며, 수강 즉시 수료증 출력이 가능합니다.</p>
                {result.expiresAt ? <p className="mt-2 text-white/70">수강권 만료일: {new Date(result.expiresAt).toLocaleString("ko-KR")}</p> : null}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-white/60">결제 수단</p>
                  <p className="mt-2 text-white">{result.method || "확인 중"}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-white/60">결제 금액</p>
                  <p className="mt-2 text-white">
                    {typeof result.totalAmount === "number" ? result.totalAmount.toLocaleString("ko-KR") + "원" : "확인 중"}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link href="/course-room" className={buttonClass("darkPrimary", "md", "rounded-full px-6 focus:ring-offset-[#0d1828]")}>
                  수강실로 이동
                </Link>
                {result.receipt?.url ? (
                  <a href={result.receipt.url} target="_blank" rel="noreferrer" className={buttonClass("darkSecondary", "md", "rounded-full px-6 focus:ring-offset-[#0d1828]")}>
                    영수증 보기
                  </a>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}

function PortOnePaymentSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get("code") || "";
  const message = searchParams.get("message") || "";
  const paymentId = searchParams.get("paymentId") || "";
  const [loading, setLoading] = useState(!code && !message);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ConfirmResponse | null>(null);

  useEffect(() => {
    if ((code || message) && !paymentId) return;
    if (!paymentId) {
      setError("결제번호가 전달되지 않았습니다. 결제내역 확인 후 수강권을 반영할 수 있습니다.");
      setLoading(false);
      return;
    }

    const confirmUrl = paymentConfig.confirmUrl;
    if (!confirmUrl) {
      setError("결제 검증 Worker URL이 설정되지 않았습니다.");
      setLoading(false);
      return;
    }

    let cancelled = false;
    const syncPayment = async () => {
      try {
        const user = await requireAuthenticatedUser();
        const idToken = await user.getIdToken();
        const raw = window.localStorage.getItem("resetedu:pending-portone-order");
        const pending = raw ? JSON.parse(raw) as { paymentId?: string; categoryId?: string; productId?: string; courseId?: string; amount?: number } : null;
        const productId = pending?.productId || searchParams.get("productId") || "basic";
        const product = getApplicationProduct("dui", productId);
        const amount = typeof pending?.amount === "number" ? pending.amount : product?.price;

        const payload = await fetchJsonWithRetry(confirmUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + idToken,
          },
          body: JSON.stringify({
            paymentId,
            uid: user.uid,
            courseId: pending?.courseId || searchParams.get("courseId") || duiPreventionCourseProduct.courseId,
            categoryId: pending?.categoryId || "dui",
            productId,
            amount,
            legalDisclaimerAccepted: true,
            finalReviewResponsibilityAccepted: true,
          }),
        });

        if (!cancelled) {
          setResult(payload);
          trackPurchaseOnce({
            transaction_id: payload.savedPurchaseId || payload.orderId || paymentId,
            value: typeof payload.totalAmount === "number" ? payload.totalAmount : amount,
            currency: "KRW",
            items: [{ item_id: productId, item_name: payload.courseTitle || duiPreventionCourseProduct.courseTitle, price: typeof payload.totalAmount === "number" ? payload.totalAmount : amount, quantity: 1 }],
          });
          window.localStorage.removeItem("resetedu:pending-portone-order");
        }

        try {
          await ensureCertificateIdentityLock({
            uid: user.uid,
            purchaseId: payload.savedPurchaseId || payload.orderId || paymentId,
            lockSource: "payment",
          });
        } catch (lockError) {
          console.error(lockError);
        }
      } catch (syncError) {
        console.error(syncError);
        const errorMessage = syncError instanceof Error ? syncError.message : "";
        if (errorMessage === "AUTH_LOGIN_REQUIRED") {
          router.replace("/login?next=" + encodeURIComponent("/payment/success?" + searchParams.toString()));
          if (!cancelled) setError("로그인한 회원만 결제 완료를 계정에 연결할 수 있습니다.");
          return;
        }
        if (!cancelled) {
          const detail = syncError instanceof Error && "status" in syncError
            ? `결제 검증 API 실패: ${(syncError as any).method || "POST"} ${(syncError as any).url || confirmUrl} / status ${(syncError as any).status || "network"} / response ${(syncError as any).responseText || syncError.message}`
            : CARD_APPROVAL_DELAY_MESSAGE;
          setError(detail);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void syncPayment();
    return () => { cancelled = true; };
  }, [code, message, paymentId, router, searchParams]);

  if ((code || message) && !paymentId) {
    return (
      <main className="min-h-screen bg-[#f3f6f9] px-4 py-10 text-slate-950 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm lg:p-8">
          <h1 className="text-3xl font-bold text-slate-950">결제가 완료되지 않았습니다</h1>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            결제가 취소되었거나 처리 중 문제가 발생했습니다. 내용을 확인한 뒤 다시 시도해 주세요.
          </p>
          <div className="mt-6 rounded-xl border border-red-100 bg-red-50 p-4 text-sm leading-7 text-red-700">
            {message || "결제 실패 사유를 확인하지 못했습니다."}
          </div>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link href="/courses/apply/?category=dui" className={buttonClass("primary", "md", "rounded-full px-6 font-bold")}>결제 페이지로 돌아가기</Link>
            <Link href="/refund-policy" className={buttonClass("secondary", "md", "rounded-full px-6 font-bold")}>환불규정 보기</Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f3f6f9] px-4 py-10 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-8">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#10213f] text-white">
          <CheckIcon />
        </div>
        <h1 className="mt-5 text-3xl font-bold text-slate-950 sm:text-4xl">결제 완료 확인</h1>
        <p className="mt-4 text-sm leading-7 text-slate-600">
          {loading ? "서버에서 결제 상태와 금액을 검증하는 중입니다." : error ? "결제 검증을 완료하지 못했습니다." : "결제 검증이 완료되어 수강권이 반영되었습니다."}
        </p>
        <div className="mt-7 rounded-xl border border-slate-200 bg-slate-50 p-5 text-left">
          {loading ? <p className="text-sm text-slate-600">결제 정보를 확인하는 중입니다...</p> : null}
          {error ? <p className="whitespace-pre-line text-sm leading-7 text-red-700">{error}</p> : null}
          {!loading && result ? (
            <dl className="grid gap-4 sm:grid-cols-2">
              <div><dt className="text-xs font-semibold text-slate-500">상품명</dt><dd className="mt-1 text-base font-bold text-slate-950">{result.courseTitle || duiPreventionCourseProduct.courseTitle} 수강권</dd></div>
              <div><dt className="text-xs font-semibold text-slate-500">결제금액</dt><dd className="mt-1 text-2xl font-bold text-[#10213f]">{typeof result.totalAmount === "number" ? result.totalAmount.toLocaleString("ko-KR") + "원" : "확인 완료"}</dd></div>
              <div><dt className="text-xs font-semibold text-slate-500">수강기간</dt><dd className="mt-1 text-base font-bold text-slate-950">결제일로부터 {duiPreventionCourseProduct.durationDays}일</dd></div>
              <div><dt className="text-xs font-semibold text-slate-500">수강권 상태</dt><dd className="mt-1 text-base font-bold text-slate-950">{result.accessStatus || "active"}</dd></div>
            </dl>
          ) : null}
        </div>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link href="/course-room" className={buttonClass("primary", "md", "rounded-full px-6 font-bold")}>내 강의실로 이동</Link>
          <Link href="/courses/apply/?category=dui" className={buttonClass("secondary", "md", "rounded-full px-6 font-bold")}>결제 페이지로 이동</Link>
        </div>
      </div>
    </main>
  );
}

function InvalidPaymentSuccessContent() {
  return (
    <main className="min-h-screen bg-[#f3f6f9] px-4 py-10 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl rounded-[1.75rem] border border-[#d7e1ef] bg-white p-6 text-center shadow-[0_24px_60px_rgba(15,23,42,0.10)] sm:p-8">
        <h1 className="text-3xl font-bold sm:text-4xl">결제 정보가 없습니다.</h1>
        <p className="mt-4 text-sm leading-7 text-slate-600">공식 결제 페이지에서 결제를 진행해 주세요. 이 화면에서는 수강권을 생성하거나 변경하지 않습니다.</p>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link href="/courses/apply/?category=dui" className={buttonClass("primary", "md", "rounded-full px-6 font-bold")}>결제 페이지로 이동</Link>
          <Link href="/dashboard" className={buttonClass("secondary", "md", "rounded-full px-6 font-bold")}>내 수강권 확인</Link>
        </div>
      </div>
    </main>
  );
}

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  if (searchParams.get("paymentKey")) return <LegacyPaymentSuccessContent />;
  if (searchParams.get("paymentId") || searchParams.get("code") || searchParams.get("message")) return <PortOnePaymentSuccessContent />;
  return <InvalidPaymentSuccessContent />;
}

export default function PaymentSuccessPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[linear-gradient(180deg,#07111f_0%,#09111d_45%,#050a12_100%)] px-4 py-10 text-white sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl rounded-[2rem] border border-white/10 bg-white/[0.03] p-6 lg:p-8">
            <p className="text-sm text-white/70">결제 완료 정보를 불러오는 중입니다...</p>
          </div>
        </main>
      }
    >
      <PaymentSuccessContent />
    </Suspense>
  );
}
