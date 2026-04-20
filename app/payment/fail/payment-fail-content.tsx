"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function PaymentFailContent() {
  const searchParams = useSearchParams();
  const code = searchParams.get("code") || "";
  const message = searchParams.get("message") || "";

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#07111f_0%,#09111d_45%,#050a12_100%)] px-4 py-10 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl rounded-[2rem] border border-white/10 bg-white/[0.03] p-6 shadow-[0_30px_80px_rgba(0,0,0,0.3)] lg:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#f0cb85]">Toss Payments</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-white">결제가 완료되지 않았습니다</h1>
        <p className="mt-4 text-sm leading-8 text-white/70">
          결제 과정이 취소되었거나 인증 중 오류가 발생했습니다. 오류 내용을 확인한 뒤 다시 시도해 주세요.
        </p>

        <div className="mt-8 rounded-[1.5rem] border border-rose-300/20 bg-rose-300/10 p-5 text-sm leading-7 text-rose-100">
          <p>
            <span className="font-semibold text-white">오류 코드:</span> {code || "알 수 없음"}
          </p>
          <p className="mt-2">
            <span className="font-semibold text-white">오류 메시지:</span> {message || "결제 실패 사유를 전달받지 못했습니다."}
          </p>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/checkout" className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#d3ad62] px-6 py-3 text-sm font-semibold text-[#06101b] transition hover:bg-[#f0cb85]">
            주문서로 돌아가기
          </Link>
          <Link href="/refund-policy" className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#d5deeb] bg-white px-6 py-3 text-sm font-semibold text-[#10213f] shadow-[0_10px_20px_rgba(15,23,42,0.12)] transition hover:-translate-y-0.5 hover:border-[#c4d2e4] hover:bg-[#f8fbff]">
            환불규정 보기
          </Link>
        </div>
      </div>
    </main>
  );
}
