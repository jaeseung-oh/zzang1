import type { Metadata } from "next";
import ResourceDocumentPage from "../_components/resource-document-page";

export const metadata: Metadata = {
  title: "음주운전 반성문 예시 | 리셋 재범방지교육센터",
  description: "결제 회원에게 제공되는 음주운전 반성문 작성 예시 교육자료",
};

export default function DuiReflectionExamplePage() {
  return <ResourceDocumentPage kind="example" />;
}
