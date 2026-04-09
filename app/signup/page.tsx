import type { Metadata } from "next";
import AuthPage from "../components/auth-page";

export const metadata: Metadata = {
  title: "회원가입 | 리셋에듀센터",
  description: "실명, 생년월일, 이메일 인증을 포함한 교육 수료 회원가입 페이지",
};

export default function SignupPage() {
  return <AuthPage mode="signup" />;
}
