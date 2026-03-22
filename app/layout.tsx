import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "리셋 리갈 에듀 | 범죄 예방 및 양형자료 전문 온라인 교육 센터",
  description:
    "음주운전, 성범죄, 마약 사건 등 형사절차 제출용 양형자료를 1시간 안에 준비할 수 있도록 설계된 24시간 자동 발급 교육 플랫폼",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
