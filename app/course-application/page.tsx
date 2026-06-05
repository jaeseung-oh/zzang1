import type { Metadata } from "next";
import CourseApplicationPage from "./CourseApplicationPage";

export const metadata: Metadata = {
  title: "수강신청 | 리셋 에듀센터",
  description: "온라인 예방교육 카테고리와 상품 유형을 선택하고 수강신청 내용을 확인하는 페이지",
};

export default function Page() {
  return <CourseApplicationPage />;
}
