import type { Metadata } from "next";
import CheckoutContent from "./checkout-content";

export const metadata: Metadata = {
  title: "주문서 | 리셋 에듀센터",
  description: "음주운전 예방교육 주문서 및 결제 페이지",
};

export default function CheckoutPage() {
  return <CheckoutContent />;
}
