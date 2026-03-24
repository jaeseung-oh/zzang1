import type { Metadata } from "next";
import AuthPage from "../components/auth-page";

export const metadata: Metadata = {
  title: "로그인 | 리셋에듀센터",
  description: "카카오 계정으로 로그인하고 내 강의실과 발급 현황을 확인하는 인증 페이지",
};

export default function LoginPage() {
  return <AuthPage mode="login" />;
}
