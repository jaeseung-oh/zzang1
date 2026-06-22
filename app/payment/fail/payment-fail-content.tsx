"use client";

import Link from "next/link";
import { buttonClass } from "@/app/components/ui/button-styles";
import { useSearchParams } from "next/navigation";

export default function PaymentFailContent() {
  const searchParams = useSearchParams();
  const message = searchParams.get("message") || "";

  return (
    <main className="min-h-screen bg-[#f3f6f9] px-4 py-10 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm lg:p-8">
        <h1 className="text-3xl font-bold text-slate-950">결제가 완료되지 않았습니다</h1>
        <p className="mt-4 text-sm leading-7 text-slate-600">
          결제 과정이 취소되었거나 처리 중 오류가 발생했습니다. 내용을 확인한 뒤 다시 시도해 주세요.
        </p>

        <div className="mt-6 rounded-xl border border-red-100 bg-red-50 p-4 text-sm leading-7 text-red-700">
          {message || "결제 실패 사유를 확인하지 못했습니다."}
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link href="/courses/apply/?category=dui" className={buttonClass("primary", "md", "rounded-full px-6 font-bold")}>
            결제 페이지로 돌아가기
          </Link>
          <Link href="/refund-policy" className={buttonClass("secondary", "md", "rounded-full px-6 font-bold")}>
            환불규정 보기
          </Link>
        </div>
      </div>
    </main>
  );
}
