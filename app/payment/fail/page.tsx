import type { Metadata } from "next";
import { Suspense } from "react";
import PaymentFailContent from "./payment-fail-content";

export const metadata: Metadata = {
  title: "결제 실패 | 리셋 에듀센터",
  description: "결제 실패 안내 페이지",
};

export default function PaymentFailPage() {
  return (
    <Suspense fallback={null}>
      <PaymentFailContent />
    </Suspense>
  );
}
