import type { Metadata } from "next";
import LegalFooter from "./components/legal-footer";
import "./globals.css";

export const metadata: Metadata = {
  title: "리셋 에듀센터 | 재발 방지와 성찰을 위한 민간 온라인 교육 플랫폼",
  description:
    "사건 이후 자신의 생활을 돌아보고 재발 방지 학습과 실천 계획을 정리할 수 있도록 돕는 민간 온라인 교육 플랫폼",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body><div className="min-h-screen bg-white">{children}</div><LegalFooter /></body>
    </html>
  );
}
