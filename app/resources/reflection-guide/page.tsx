import type { Metadata } from "next";
import ResourceDocumentPage from "../_components/resource-document-page";

export const metadata: Metadata = {
  title: "반성문 작성 가이드와 참고 예시 | ResetEdu Prevention Education Center",
  description: "형사사건 반성문에 포함할 내용, 작성순서, 피해야 할 표현과 재발방지 계획 작성방법을 확인하세요.",
};

export default function ReflectionGuidePage() {
  return <ResourceDocumentPage kind="guide" />;
}
