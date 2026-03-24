import type { Metadata } from "next";
import AuthPage from "../components/auth-page";

export const metadata: Metadata = {
  title: "회원가입 | 리셋에듀센터",
  description: "카카오 계정으로 회원가입하고 내 강의실과 발급 자료 흐름으로 연결되는 인증 페이지",
};

export default function SignupPage() {
  return <AuthPage mode="signup" />;
}
