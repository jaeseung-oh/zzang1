import type { Metadata } from "next";
import { Suspense } from "react";
import LoginContent from "./login-content";

export const metadata: Metadata = {
  title: "로그인 | ResetEdu 재발방지교육센터",
  description: "이메일 계정으로 강의실과 수료증 발급 흐름을 이용하는 회원 로그인 페이지",
};

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}
