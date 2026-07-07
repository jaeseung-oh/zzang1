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
  title: "ResetEdu 재발방지교육센터 | 온라인 예방교육과 실천자료 관리",
  description: "사건 이후 필요한 온라인 예방교육, 교육 수료증, 재발방지계획서, 생활개선계획과 양형자료 준비 참고자료를 확인하세요.",
  openGraph: { title: "ResetEdu 재발방지교육센터 | 온라인 예방교육과 실천자료 관리", description: "온라인 예방교육부터 양형자료 준비를 위한 실천자료까지 한곳에서 확인하세요.", url: "https://resetedu.kr", siteName: "ResetEdu 재발방지교육센터", locale: "ko_KR", type: "website" },
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
