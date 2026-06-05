"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { duiPreventionCourseProduct } from "@/lib/course/product";
import { formatApplicationKrw, getApplicationCategory, getApplicationProduct } from "@/lib/course/application-products";
import { requireAuthenticatedUser } from "@/lib/firebase/session";
import { paymentConfig } from "@/lib/payment/config";
import { ensureCertificateIdentityLock } from "@/lib/firebase/user-profile";
import type { PaymentMethod } from "@/lib/payment/payment-service";

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

const paymentMethodLabels: Record<PaymentMethod, string> = {
  kakaopay: "카카오페이",
  "danal-mobile": "핸드폰결제 - 다날",
  card: "신용카드결제",
};

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
        const response = await fetch(confirmUrl, {
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

        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload?.message || "결제 승인 처리에 실패했습니다.");
        }

        setResult(payload);

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

        setError(requestError instanceof Error ? requestError.message : "결제 승인 중 오류가 발생했습니다.");
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
          서버에서 결제금액과 주문 정보를 검증한 뒤 결제내역과 수강권을 저장합니다. 결제 완료 즉시 음주운전 예방교육 수강권이 부여되며, 수강확인증은 수강권 확인 후 출력할 수 있습니다. 5강 전체 수강 완료 후에는 수료증으로 발급됩니다.
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
                <p className="mt-2 text-white/70">수강기간은 결제일로부터 {duiPreventionCourseProduct.durationDays}일이며, 수강권 확인 후 수강확인증 출력이 가능합니다. 전체 {duiPreventionCourseProduct.totalLessons}강 수강 완료 후에는 수료증으로 발급됩니다.</p>
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
                <Link href="/course-room" className="inline-flex cursor-pointer items-center justify-center rounded-full bg-[#d3ad62] px-6 py-3 text-sm font-semibold text-[#06101b] shadow-sm transition-all hover:bg-indigo-700 hover:text-white hover:shadow-lg active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-[#0d1828]">
                  수강실로 이동
                </Link>
                {result.receipt?.url ? (
                  <a href={result.receipt.url} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center rounded-full border border-[#d5deeb] bg-white px-6 py-3 text-sm font-semibold text-[#10213f] shadow-[0_10px_20px_rgba(15,23,42,0.12)] transition hover:-translate-y-0.5 hover:border-[#c4d2e4] hover:bg-[#f8fbff]">
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

function MockPaymentSuccessContent() {
  const searchParams = useSearchParams();
  const categoryId = searchParams.get("categoryId");
  const productId = searchParams.get("productId");
  const orderId = searchParams.get("orderId");
  const paymentMethod = searchParams.get("paymentMethod") as PaymentMethod | null;
  const category = useMemo(() => getApplicationCategory(categoryId), [categoryId]);
  const product = useMemo(() => getApplicationProduct(categoryId, productId), [categoryId, productId]);
  const methodLabel = paymentMethod ? paymentMethodLabels[paymentMethod] : null;

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#edf3f9_48%,#f8fafc_100%)] px-4 py-10 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl rounded-[1.75rem] border border-[#d7e1ef] bg-white p-6 text-center shadow-[0_24px_60px_rgba(15,23,42,0.10)] sm:p-8">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#06101b] text-[#e9c98d]">
          <CheckIcon />
        </div>
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.24em] text-[#274690]">Payment Complete</p>
        <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">결제가 완료되었습니다.</h1>
        <p className="mt-4 text-sm leading-7 text-slate-600">신청하신 교육을 수강할 수 있습니다.</p>

        {category && product ? (
          <div className="mt-7 rounded-[1.25rem] border border-[#dbe4ef] bg-[#f8fafc] p-5 text-left">
            <dl className="grid gap-4 sm:grid-cols-2">
              <div><dt className="text-xs font-semibold text-slate-500">신청한 교육명</dt><dd className="mt-1 text-base font-semibold text-slate-950">{category.title}</dd></div>
              <div><dt className="text-xs font-semibold text-slate-500">상품명</dt><dd className="mt-1 text-base font-semibold text-slate-950">{product.title}</dd></div>
              <div><dt className="text-xs font-semibold text-slate-500">결제금액</dt><dd className="mt-1 text-2xl font-bold text-[#0f2f5f]">{formatApplicationKrw(product.price)}</dd></div>
              <div><dt className="text-xs font-semibold text-slate-500">결제수단</dt><dd className="mt-1 text-base font-semibold text-slate-950">{methodLabel || "mock 결제"}</dd></div>
            </dl>
            {orderId ? <p className="mt-4 text-xs text-slate-500">주문번호: {orderId}</p> : null}
          </div>
        ) : (
          <div className="mt-7 rounded-[1.25rem] border border-[#dbe4ef] bg-[#f8fafc] p-5 text-sm leading-7 text-slate-600">
            결제 결과 정보가 없는 상태입니다. 수강신청 화면에서 다시 신청 정보를 확인할 수 있습니다.
          </div>
        )}

        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link href="/course-room" className="inline-flex min-h-12 cursor-pointer items-center justify-center rounded-full bg-[#06101b] px-6 py-3 text-sm font-bold text-[#e9c98d] shadow-sm transition-all hover:bg-indigo-700 hover:shadow-lg active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
            내 강의실로 이동
          </Link>
          <Link href="/" className="inline-flex min-h-12 cursor-pointer items-center justify-center rounded-full border border-[#d8e1ef] bg-white px-6 py-3 text-sm font-bold text-[#06101b] shadow-sm transition-all hover:bg-indigo-700 hover:text-white hover:shadow-lg active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
            홈으로 이동
          </Link>
        </div>
      </div>
    </main>
  );
}

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  return searchParams.get("paymentKey") ? <LegacyPaymentSuccessContent /> : <MockPaymentSuccessContent />;
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
