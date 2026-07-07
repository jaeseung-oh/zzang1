import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "결제하기 | ResetEdu 재발방지교육센터",
  description: "신청한 온라인 예방교육 상품의 결제수단을 선택하고 결제 요청을 진행하는 페이지",
};

export default function Page() {
  redirect("/courses/apply/?category=dui");
}
