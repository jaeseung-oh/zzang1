import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Suspense } from "react";
import IdleSessionGuard from "./components/idle-session-guard";
import GlobalSiteHeader from "./components/global-site-header";
import LegalFooter from "./components/legal-footer";
import GoogleAnalyticsPageTracker from "./components/analytics/google-analytics";
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
  title: "리셋 재범방지교육센터 | 온라인 재범방지교육",
  description: "음주운전, 폭력범죄, 성범죄, 도박중독, 마약중독 재범방지 온라인 교육을 제공하는 리셋 재범방지교육센터입니다.",
  openGraph: { title: "리셋 재범방지교육센터 | 온라인 재범방지교육과 실천자료 관리", description: "음주운전, 폭력범죄, 성범죄, 도박중독, 마약중독 재범방지 온라인 교육", url: "https://resetedu.kr", siteName: "리셋 재범방지교육센터", locale: "ko_KR", type: "website" },
  other: {
    "naver-site-verification": "bc88a8e10a9a6ca9a188bcdf4a6d351d34c6bfdb",
  },
};

const gaMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        {gaMeasurementId ? (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaMeasurementId}`} strategy="afterInteractive" />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${gaMeasurementId}', { send_page_view: false });
              `}
            </Script>
            <Suspense fallback={null}><GoogleAnalyticsPageTracker /></Suspense>
          </>
        ) : null}
        <IdleSessionGuard /><GlobalSiteHeader /><div className="min-h-screen bg-white">{children}</div><LegalFooter />
      </body>
    </html>
  );
}
