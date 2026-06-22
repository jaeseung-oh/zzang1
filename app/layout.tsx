import type { Metadata, Viewport } from "next";
import GlobalUserStatus from "./components/global-user-status";
import IdleSessionGuard from "./components/idle-session-guard";
import GlobalHomeButton from "./components/global-home-button";
import LegalFooter from "./components/legal-footer";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#07111f",
  colorScheme: "light",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://resetedu.kr"),
  title: "사건 이후 재발방지 준비를 위한 온라인 예방교육 | Reset Edu Center",
  description: "사건 이후 필요한 온라인 예방교육, 교육 수료증, 재발방지계획서, 실천계획서와 반성문 작성 가이드를 확인하세요.",
  openGraph: { title: "사건 이후 재발방지 준비를 위한 온라인 예방교육 | Reset Edu Center", description: "온라인 예방교육과 교육 수료증, 재발방지 실천자료를 한곳에서 확인하세요.", url: "https://resetedu.kr", siteName: "Reset Edu Center", locale: "ko_KR", type: "website" },
  other: {
    "naver-site-verification": "bc88a8e10a9a6ca9a188bcdf4a6d351d34c6bfdb",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body><IdleSessionGuard /><GlobalUserStatus /><GlobalHomeButton /><div className="min-h-screen bg-white">{children}</div><LegalFooter /></body>
    </html>
  );
}
