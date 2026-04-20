import type { Metadata } from "next";
import PaymentFailContent from "./payment-fail-content";

export const metadata: Metadata = {
  title: "결제 실패 | 리셋 에듀센터",
  description: "토스 결제 실패 안내 페이지",
};

export default function PaymentFailPage() {
  return <PaymentFailContent />;
}
