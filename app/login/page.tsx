import type { Metadata } from "next";
import AuthPage from "../components/auth-page";

export const metadata: Metadata = {
  title: "로그인 | 리셋에듀센터",
  description: "이메일 로그인과 이메일 인증 상태 확인이 가능한 회원 로그인 페이지",
};

export default function LoginPage() {
  return <AuthPage mode="login" />;
}
