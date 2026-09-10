"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { duiPreventionCourseProduct } from "@/lib/course/product";
import { normalizeCourseDisplayText } from "@/lib/course/display-names";
import { counselingEvaluationNoticeText, getApplicationProduct, isCounselingProductId } from "@/lib/course/application-products";
import { requireAuthenticatedUser } from "@/lib/firebase/session";
import { paymentConfig } from "@/lib/payment/config";
import { ensureCertificateIdentityLock } from "@/lib/firebase/user-profile";
import { invalidateEnrollmentLookupCache } from "@/lib/course/enrollment-service";
import { buttonClass } from "@/app/components/ui/button-styles";
import { trackEvent, trackGoogleAdsPurchaseConversionOnce, trackNaverPurchaseConversionOnce, trackPurchaseOnce } from "@/lib/analytics/ga";

type ConfirmResponse = {
  savedPurchaseId?: string;
  orderId?: string;
  paymentId?: string;
  method?: string;
  status?: string;
  paymentStatus?: string;
  totalAmount?: number;
  approvedAt?: string;
  expiresAt?: string;
  courseTitle?: string;
  courseId?: string;
  productId?: string;
  productTitle?: string;
  accessStatus?: string;
  virtualAccount?: {
    bank?: string | null;
    bankCode?: string | null;
    accountNumber?: string | null;
    accountType?: string | null;
    remitteeName?: string | null;
    remitterName?: string | null;
    expiredAt?: string | null;
    issuedAt?: string | null;
  };
  receipt?: {
    url?: string;
  };
};

const disclaimer =
  "본 서비스는 법률 검토나 상담을 제공하지 않으며, 자발적인 교육 이수와 생활 실천 계획 정리를 돕는 민간 교육 서비스입니다.";

const paymentSupportMessage = "결제 실패 시 언제든 고객센터 010-7727-8619로 연락주시면 즉시 조치해드리겠습니다.";

const CARD_APPROVAL_DELAY_MESSAGE =
  "안녕하세요. 리셋 재범방지교육센터입니다.\n\n결제 과정에서 카드 승인 후 수강권 반영이 지연된 것으로 확인됩니다.\n중복 결제는 하지 말아주시고, 승인 문자 또는 결제 시각을 보내주시면 확인 후 수강권을 즉시 반영해드리겠습니다.\n\n문제가 계속되면 고객센터 010-7727-8619로 연락주시면 즉시 조치해드리겠습니다.\n\n이용에 불편을 드려 죄송합니다.";

const birthDateMissingDocumentNotice = "출력서류에 생년월일이 미표시되는 경우 마이페이지-회원정보 변경에서 생년월일을 입력하여 주시기 바랍니다.";

function getPaymentDisplayErrorMessage(message?: string) {
  const raw = String(message || "");
  if (raw.includes("certificateBirthDate is not defined")) return birthDateMissingDocumentNotice;
  return raw;
}

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

function readMatchingPendingPortOneOrder(paymentId: string) {
  const raw = window.localStorage.getItem("resetedu:pending-portone-order");
  if (!raw) return null;
  try {
    const pending = JSON.parse(raw) as { paymentId?: string; categoryId?: string; productId?: string; courseId?: string; amount?: number; certificateBirthDate?: string; birthDate?: string; dateOfBirth?: string; phoneNumber?: string; buyerPhone?: string; customerPhone?: string };
    return pending.paymentId === paymentId ? pending : null;
  } catch {
    return null;
  }
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}

function formatDateTime(value?: string | null) {
  if (!value) return "확인 중";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ko-KR");
}

function formatPaymentMethod(method?: string | null) {
  if (method === "CARD" || method === "PaymentMethodCard") return "신용/체크카드";
  if (method === "TRANSFER" || method === "PaymentMethodTransfer") return "실시간 계좌이체";
  if (method === "VIRTUAL_ACCOUNT" || method === "PaymentMethodVirtualAccount") return "무통장 입금";
  return method || "확인 중";
}

function PortOnePaymentSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get("code") || "";
  const message = getPaymentDisplayErrorMessage(searchParams.get("message") || "");
  const paymentId = searchParams.get("paymentId") || "";
  const recovery = searchParams.get("recovery") === "1";
  const [loading, setLoading] = useState(!code && !message && !recovery);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ConfirmResponse | null>(null);
  const resultProductId = result?.productId || searchParams.get("productId") || "";
  const isCounselingResult = isCounselingProductId(resultProductId) || result?.productTitle === "심리상담 종합과정" || String(result?.courseTitle || "").includes("심리상담 종합과정");
  const courseRoomCourseId = resultProductId === "drug-addiction-basic" || resultProductId === "drug-addiction-premium"
    ? resultProductId
    : result?.courseId || searchParams.get("courseId") || "";
  const courseRoomHref = "/course-room/?v=202607181430" + (courseRoomCourseId ? "&courseId=" + encodeURIComponent(courseRoomCourseId) : "");
  const isAwaitingDeposit = result?.paymentStatus === "awaiting_deposit" || result?.status === "awaiting_deposit";
  const copyVirtualAccountNumber = async () => {
    const accountNumber = result?.virtualAccount?.accountNumber;
    if (!accountNumber) return;
    try {
      await navigator.clipboard.writeText(accountNumber);
    } catch (copyError) {
      console.error(copyError);
    }
  };

  useEffect(() => {
    if (code || message) {
      trackEvent("payment_fail", { code, message });
      setLoading(false);
      return;
    }
    if (recovery) {
      setError(CARD_APPROVAL_DELAY_MESSAGE);
      setLoading(false);
      return;
    }
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
        invalidateEnrollmentLookupCache(user.uid);
        const idToken = await user.getIdToken();
        const pending = readMatchingPendingPortOneOrder(paymentId);
        const categoryId = pending?.categoryId || searchParams.get("categoryId") || searchParams.get("category") || "dui";
        const productId = pending?.productId || searchParams.get("productId") || "basic";
        const product = getApplicationProduct(categoryId, productId);
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
            categoryId,
            productId,
            amount,
            legalDisclaimerAccepted: true,
            finalReviewResponsibilityAccepted: true,
            certificateBirthDate: pending?.certificateBirthDate || pending?.birthDate || pending?.dateOfBirth || null,
            birthDate: pending?.birthDate || pending?.certificateBirthDate || pending?.dateOfBirth || null,
            dateOfBirth: pending?.dateOfBirth || pending?.certificateBirthDate || pending?.birthDate || null,
            phoneNumber: pending?.phoneNumber || pending?.buyerPhone || pending?.customerPhone || null,
            buyerPhone: pending?.buyerPhone || pending?.phoneNumber || pending?.customerPhone || null,
            customerPhone: pending?.customerPhone || pending?.phoneNumber || pending?.buyerPhone || null,
          }),
        });

        if (!cancelled) {
          setResult(payload);
          invalidateEnrollmentLookupCache(user.uid);
          const isDepositWaiting = payload?.paymentStatus === "awaiting_deposit" || payload?.status === "awaiting_deposit";
          if (!isDepositWaiting) {
            const entitlementCourseId = payload.courseId || pending?.courseId || searchParams.get("courseId") || product?.courseId || duiPreventionCourseProduct.courseId;
            window.localStorage.setItem("resetedu:recent-paid-entitlement", JSON.stringify({
              paymentId: payload.paymentId || paymentId,
              orderId: payload.orderId || payload.savedPurchaseId || paymentId,
              courseId: entitlementCourseId,
              productId: payload.productId || productId,
              savedAt: new Date().toISOString(),
            }));
            const purchaseTransactionId = payload.savedPurchaseId || payload.orderId || paymentId;
            trackPurchaseOnce({
              transaction_id: purchaseTransactionId,
              value: typeof payload.totalAmount === "number" ? payload.totalAmount : amount,
              currency: "KRW",
              items: [{ item_id: productId, item_name: payload.courseTitle || duiPreventionCourseProduct.courseTitle, price: typeof payload.totalAmount === "number" ? payload.totalAmount : amount, quantity: 1 }],
            });
            trackGoogleAdsPurchaseConversionOnce({
              transaction_id: purchaseTransactionId,
              value: typeof payload.totalAmount === "number" ? payload.totalAmount : amount,
              currency: "KRW",
            });
            trackNaverPurchaseConversionOnce({
              transaction_id: purchaseTransactionId,
              value: typeof payload.totalAmount === "number" ? payload.totalAmount : amount,
            });
            trackEvent("payment_success", { orderId: purchaseTransactionId, productId: payload.productId || productId, price: typeof payload.totalAmount === "number" ? payload.totalAmount : amount });
          }
          window.localStorage.removeItem("resetedu:pending-portone-order");
        }

        if (!(payload?.paymentStatus === "awaiting_deposit" || payload?.status === "awaiting_deposit")) {
          try {
            await ensureCertificateIdentityLock({
              uid: user.uid,
              purchaseId: payload.savedPurchaseId || payload.orderId || paymentId,
              lockSource: "payment",
            });
          } catch (lockError) {
            console.error(lockError);
          }
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
          const rawDetail = syncError instanceof Error && "status" in syncError
            ? `${(syncError as any).responseText || syncError.message}`
            : CARD_APPROVAL_DELAY_MESSAGE;
          const detail = getPaymentDisplayErrorMessage(rawDetail) || CARD_APPROVAL_DELAY_MESSAGE;
          setError(detail);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void syncPayment();
    return () => { cancelled = true; };
  }, [code, message, paymentId, recovery, router, searchParams]);

  if (code || message) {
    return (
      <main className="min-h-screen bg-[#f3f6f9] px-4 py-8 text-slate-950 sm:px-6 sm:py-10 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm sm:p-6 lg:p-8">
          <h1 className="text-[1.9rem] font-bold leading-tight text-slate-950 sm:text-3xl">결제가 완료되지 않았습니다</h1>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            결제가 취소되었거나 처리 중 문제가 발생했습니다. 내용을 확인한 뒤 다시 시도해 주세요.
          </p>
          <div className="mt-6 rounded-xl border border-red-100 bg-red-50 p-4 text-sm leading-7 text-red-700">
            {message || "결제 실패 사유를 확인하지 못했습니다."}
          </div>
          <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold leading-7 text-amber-900">
            {paymentSupportMessage}
          </p>
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
        <h1 className="mt-5 text-3xl font-bold text-slate-950 sm:text-4xl">{isAwaitingDeposit ? "무통장 입금대기" : "결제 완료 확인"}</h1>
        <p className="mt-4 text-sm leading-7 text-slate-600">
          {loading ? "서버에서 결제 상태와 금액을 검증하는 중입니다." : error ? "결제 검증을 완료하지 못했습니다." : isAwaitingDeposit ? "입금 확인 전이며, 입금이 확인되면 수강권이 자동으로 활성화됩니다." : "결제 검증이 완료되어 수강권이 반영되었습니다."}
        </p>
        {isCounselingResult && !isAwaitingDeposit ? <div className="mt-7 rounded-xl border-2 border-[#d3b271] bg-[#fffaf0] p-5 text-left text-sm font-bold leading-7 text-[#5f4514]"><p className="text-base font-black text-slate-950">결제가 정상적으로 완료되었습니다.</p><p className="mt-2">심리상담 종합과정은 담당자가 결제 내용을 확인한 후 1영업일 이내 개별 연락드립니다.</p><p className="mt-2 text-slate-800">{counselingEvaluationNoticeText}</p></div> : null}

        <div className="mt-7 rounded-xl border border-slate-200 bg-slate-50 p-5 text-left">
          {loading ? <p className="text-sm text-slate-600">결제 정보를 확인하는 중입니다...</p> : null}
          {error ? <p className="whitespace-pre-line text-sm leading-7 text-red-700">{error}</p> : null}
          {!loading && result && isAwaitingDeposit ? (
            <div className="space-y-5">
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
                <p className="text-sm font-black text-amber-900">입금대기</p>
                <h2 className="mt-2 text-2xl font-black text-slate-950">무통장 입금 계좌가 발급되었습니다</h2>
                <p className="mt-3 text-sm leading-7 text-slate-700">아래 계좌로 입금해 주세요. 입금이 확인되면 수강권이 자동으로 활성화됩니다.</p>
              </div>
              <dl className="grid gap-4 sm:grid-cols-2">
                <div><dt className="text-xs font-semibold text-slate-500">입금금액</dt><dd className="mt-1 text-3xl font-black text-[#10213f]">{typeof result.totalAmount === "number" ? result.totalAmount.toLocaleString("ko-KR") + "원" : "확인 중"}</dd></div>
                <div><dt className="text-xs font-semibold text-slate-500">주문번호</dt><dd className="mt-1 break-all text-base font-bold text-slate-950">{result.orderId || result.paymentId || paymentId}</dd></div>
                <div><dt className="text-xs font-semibold text-slate-500">은행명</dt><dd className="mt-1 text-base font-bold text-slate-950">{result.virtualAccount?.bank || result.virtualAccount?.bankCode || "확인 중"}</dd></div>
                <div><dt className="text-xs font-semibold text-slate-500">입금기한</dt><dd className="mt-1 text-base font-bold text-slate-950">{formatDateTime(result.virtualAccount?.expiredAt)}</dd></div>
                <div className="sm:col-span-2"><dt className="text-xs font-semibold text-slate-500">계좌번호</dt><dd className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center"><span className="break-all text-xl font-black text-slate-950">{result.virtualAccount?.accountNumber || "확인 중"}</span>{result.virtualAccount?.accountNumber ? <button type="button" onClick={() => void copyVirtualAccountNumber()} className={buttonClass("secondary", "sm", "rounded-full px-4 font-bold")}>계좌번호 복사</button> : null}</dd></div>
              </dl>
            </div>
          ) : null}
          {!loading && result && !isAwaitingDeposit ? (
            <dl className="grid gap-4 sm:grid-cols-2">
              <div><dt className="text-xs font-semibold text-slate-500">상품명</dt><dd className="mt-1 text-base font-bold text-slate-950">{String(normalizeCourseDisplayText(result.courseTitle || result.productTitle || duiPreventionCourseProduct.courseTitle))} 수강권</dd></div>
              <div><dt className="text-xs font-semibold text-slate-500">결제금액</dt><dd className="mt-1 text-2xl font-bold text-[#10213f]">{typeof result.totalAmount === "number" ? result.totalAmount.toLocaleString("ko-KR") + "원" : "확인 완료"}</dd></div>
              <div><dt className="text-xs font-semibold text-slate-500">결제수단</dt><dd className="mt-1 text-base font-bold text-slate-950">{formatPaymentMethod(result.method)}</dd></div>
              <div><dt className="text-xs font-semibold text-slate-500">수강권 상태</dt><dd className="mt-1 text-base font-bold text-slate-950">{result.accessStatus || "active"}</dd></div>
            </dl>
          ) : null}
        </div>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
          {!isAwaitingDeposit ? <Link href={courseRoomHref} className={buttonClass("primary", "md", "rounded-full px-6 font-bold")}>내 강의실로 이동</Link> : null}
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
