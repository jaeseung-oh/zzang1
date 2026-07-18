import type { Metadata } from "next";
import CheckoutContent from "./checkout-content";

export const metadata: Metadata = {
  title: "수강권 결제 | 리셋 재범방지교육센터",
  description: "음주운전 재범방지교육 수강권 결제 페이지",
};


export default function CheckoutPage() {
  return <CheckoutContent />;
}
