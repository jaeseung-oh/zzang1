"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

type ConfirmResponse = {
  savedPurchaseId?: string;
  orderId?: string;
  method?: string;
  totalAmount?: number;
  approvedAt?: string;
  receipt?: {
    url?: string;
  };
};

const disclaimer =
  "본 서비스는 법률 검토나 상담을 제공하지 않으며, 스스로 양형자료를 준비할 수 있도록 돕는 교육 및 보조 양식 제공 서비스입니다.";

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ConfirmResponse | null>(null);

  useEffect(() => {
    const paymentKey = searchParams.get("paymentKey");
    const orderId = searchParams.get("orderId");
    const amountValue = searchParams.get("amount");
    const uid = searchParams.get("uid");
    const courseId = searchParams.get("courseId");

    if (!paymentKey || !orderId || !amountValue) {
      setError("결제 승인에 필요한 정보가 누락되었습니다.");
      setLoading(false);
      return;
    }

    const confirmUrl = process.env.NEXT_PUBLIC_TOSS_CONFIRM_URL;
    if (!confirmUrl) {
      setError("결제 승인 함수 URL이 설정되지 않았습니다.");
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
        const response = await fetch(confirmUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            paymentKey,
            orderId,
            amount,
            uid,
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
      } catch (requestError) {
        console.error(requestError);
        setError(requestError instanceof Error ? requestError.message : "결제 승인 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [searchParams]);

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#07111f_0%,#09111d_45%,#050a12_100%)] px-4 py-10 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl rounded-[2rem] border border-white/10 bg-white/[0.03] p-6 shadow-[0_30px_80px_rgba(0,0,0,0.3)] lg:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#f0cb85]">Toss Payments</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-white">결제 완료 확인</h1>
        <p className="mt-4 text-sm leading-8 text-white/70">
          결제 승인 후 구매 이력을 저장하고, 수강 및 자료 발급 단계로 연결합니다.
        </p>

        <div className="mt-6 rounded-[1.5rem] border border-[#d3ad62]/20 bg-[#d3ad62]/10 p-4 text-sm leading-7 text-[#f7dfab]">
          {disclaimer}
        </div>

        <div className="mt-8 rounded-[1.5rem] border border-white/10 bg-[#0d1828] p-5">
          {loading ? <p className="text-sm text-white/75">결제 승인 정보를 확인하는 중입니다...</p> : null}

          {error ? <p className="text-sm text-[#f2a39b]">{error}</p> : null}

          {!loading && result ? (
            <div className="space-y-4 text-sm text-white/80">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-white">결제가 정상 승인되었습니다.</p>
                <p className="mt-2 text-white/70">저장된 구매 ID: {result.savedPurchaseId || result.orderId}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-white/60">결제 수단</p>
                  <p className="mt-2 text-white">{result.method || "확인 중"}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-white/60">결제 금액</p>
                  <p className="mt-2 text-white">{typeof result.totalAmount === "number" ? `${result.totalAmount.toLocaleString("ko-KR")}원` : "확인 중"}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link href="/" className="inline-flex items-center justify-center rounded-full bg-[#d3ad62] px-6 py-3 text-sm font-semibold text-[#06101b] transition hover:bg-[#f0cb85]">
                  메인으로 돌아가기
                </Link>
                {result.receipt?.url ? (
                  <a href={result.receipt.url} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
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
