import type { Metadata } from "next";
import CourseApplicationPage from "../../course-application/CourseApplicationPage";

export const metadata: Metadata = {
  title: "수강권 결제 | ResetEdu 재발방지교육센터",
  description: "음주운전 예방교육 수강권 결제 페이지",
};

export default function Page() {
  return <CourseApplicationPage />;
}
