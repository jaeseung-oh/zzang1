import type { Metadata } from "next";
import CheckoutContent from "./checkout-content";

export const metadata: Metadata = {
  title: "주문서 | 리셋 에듀센터",
  description: "토스 결제위젯 기반 주문서 및 결제 페이지",
};

export default function CheckoutPage() {
  return <CheckoutContent />;
}
