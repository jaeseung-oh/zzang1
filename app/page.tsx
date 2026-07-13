import type { Metadata } from "next";
import Link from "next/link";
import { buttonClass } from "@/app/components/ui/button-styles";
import DocumentPreviewGallery, { type DocumentPreviewItem } from "@/app/components/document-preview-gallery";
import { formatApplicationKrw } from "@/lib/course/application-products";
import { getApplyHref, getMainProductPair, platformCourseCategories, processSteps } from "@/lib/course/platform-courses";

export const metadata: Metadata = {
  title: "리셋에듀센터 | 온라인 재범방지교육과 실천자료",
  description: "단순한 서류 준비를 넘어 자기성찰과 행동 변화를 위한 온라인 재범방지교육을 제공합니다. 교육 수료증과 재범방지 실천자료를 체계적으로 확인하고 작성할 수 있습니다.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "반성에서 행동 변화까지, 리셋에듀센터",
    description: "온라인 재범방지교육부터 수료증과 실천자료 작성까지 체계적으로 준비하세요.",
    url: "https://resetedu.kr/",
    siteName: "ResetEdu 재발방지교육센터",
    locale: "ko_KR",
    type: "website",
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "ResetEdu Prevention Education Center",
  alternateName: "ResetEdu 재발방지교육센터",
  url: "https://resetedu.kr/",
};

const practiceKeywords = ["자기성찰", "행동 원인 이해", "재범방지교육", "실천계획", "교육 이수 기록", "위험상황 대처", "지속적인 행동 변화"];

const trustBadges = [
  ["PC·모바일 수강 가능", "휴대폰에서도 강의와 자료를 확인할 수 있습니다."],
  ["결제 후 바로 수강 시작", "신청 완료 후 내 강의실에서 과정을 진행합니다."],
  ["수료증 및 작성자료 확인 가능", "수강 후 필요한 자료를 직접 작성·출력합니다."],
] as const;

const heroValueCards = [
  ["행동 원인 이해", "잘못된 행동이 발생한 원인과 위험요인을 스스로 점검합니다."],
  ["재범방지 계획 수립", "같은 상황이 반복되었을 때 다르게 행동할 수 있도록 구체적인 실천계획을 세웁니다."],
  ["교육과 변화의 기록", "교육 수료증과 실천자료를 통해 교육 이수와 변화의 과정을 체계적으로 기록합니다."],
] as const;

const serviceNotice = "본 교육은 자기성찰과 재범방지 실천을 지원하는 민간 온라인 교육서비스입니다. 수사·재판 결과, 감형 또는 선처를 보장하지 않으며, 법률상담·사건대리·법률문서 작성 서비스를 제공하지 않습니다.";

const mobileProcessSteps = [
  ["과정 선택", "필요한 교육 범위를 고릅니다."],
  ["결제 완료", "신청 후 바로 시작합니다."],
  ["내 강의실에서 수강", "모바일로 강의를 봅니다."],
  ["수료증·자료 확인 및 출력", "자료를 저장하거나 출력합니다."],
] as const;

const paymentFaqs = [
  ["결제 후 바로 수강할 수 있나요?", "네. 결제 완료 후 내 강의실에서 바로 수강을 시작할 수 있습니다."],
  ["모바일에서도 수강 가능한가요?", "네. PC와 모바일에서 강의 수강과 자료 확인이 가능합니다."],
  ["수료증은 언제 확인할 수 있나요?", "과정 수강을 완료하면 내 강의실에서 수료증을 확인할 수 있습니다."],
  ["자료는 PDF로 저장하거나 출력할 수 있나요?", "제공 자료는 확인 후 PDF 저장 또는 출력 흐름으로 사용할 수 있습니다."],
  ["법적 효과가 보장되나요?", "본 자료는 민간 교육자료이며, 특정 수사·재판·행정절차상 결과를 보장하지 않습니다."],
] as const;

const homeCertificateSamples: DocumentPreviewItem[] = [
  { id: "home-basic-certificate", title: "수료증", products: ["기본과정", "심화과정"], statusLabel: "샘플", description: "온라인 재범방지교육 이수 내용을 확인할 수 있는 기본 수료증 샘플입니다.", imageSrc: "/images/%EC%88%98%EB%A3%8C%EC%A6%9D%20%EC%98%88%EC%8B%9C%20%EC%88%98%EC%A0%95%EB%B3%B8.jpg" },
  { id: "home-advanced-certificate", title: "심화 이수증", products: ["심화과정"], statusLabel: "샘플", description: "심화과정에서 제공되는 인지행동기반 재발방지교육 이수증 샘플입니다.", imageSrc: "/images/document-samples/advanced-certificate-capture.jpg" },
  { id: "home-prevention-plan", title: "재발방지계획서", products: ["기본과정", "심화과정"], statusLabel: "서식", description: "사건 이후 생활 개선 노력을 문서로 정리하는 작성 서식입니다.", imageSrc: "/images/document-samples/prevention-plan-sample.jpg" },
  { id: "home-risk-response-plan", title: "실천계획서", products: ["기본과정", "심화과정"], statusLabel: "서식", description: "위험 상황과 대처 행동을 직접 정리하는 실천자료입니다.", imageSrc: "/images/document-samples/risk-response-plan-sample.jpg" },
];

function Icon({ name, className = "h-6 w-6" }: { name: string; className?: string }) {
  const common = { className: className + " fill-none stroke-current", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, viewBox: "0 0 24 24", "aria-hidden": true };
  if (name === "check") return <svg {...common}><path d="m5 12 4 4L19 6" /></svg>;
  if (name === "file") return <svg {...common}><path d="M7 3h7l5 5v13H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" /><path d="M14 3v5h5" /><path d="M9 13h6M9 17h4" /></svg>;
  if (name === "list") return <svg {...common}><path d="M8 6h13M8 12h13M8 18h13" /><path d="m3 6 .6.6L5 5.2M3 12l.6.6L5 11.2M3 18l.6.6L5 17.2" /></svg>;
  if (name === "chart") return <svg {...common}><path d="M4 19V5" /><path d="M4 19h16" /><path d="M8 16v-5" /><path d="M12 16V8" /><path d="M16 16v-3" /></svg>;
  if (name === "phone") return <svg {...common}><path d="M8 2h8a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z" /><path d="M11 18h2" /></svg>;
  if (name === "card") return <svg {...common}><path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" /><path d="M3 10h18" /></svg>;
  if (name === "print") return <svg {...common}><path d="M6 9V3h12v6" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><path d="M6 14h12v7H6z" /></svg>;
  return <svg {...common}><path d="M12 3 19 7v5c0 4-2.8 7.2-7 9-4.2-1.8-7-5-7-9V7l7-4Z" /><path d="m8.8 12.2 2 2 4.5-4.7" /></svg>;
}

function SectionTitle({ eyebrow, title, body }: { eyebrow?: string; title: string; body?: string }) {
  return <div className="keep-korean max-w-3xl min-w-0">{eyebrow ? <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#176b68]">{eyebrow}</p> : null}<h2 className="mt-2 text-2xl font-black leading-tight text-slate-950 sm:text-3xl">{title}</h2>{body ? <p className="mt-3 text-[15px] leading-7 text-slate-700 sm:text-base">{body}</p> : null}</div>;
}

function MobileStickyCTA() {
  return <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 shadow-[0_-14px_35px_rgba(15,23,42,0.14)] backdrop-blur md:hidden"><div className="mx-auto flex max-w-md items-center gap-3"><p className="min-w-0 flex-1 text-xs font-black leading-5 text-slate-700">수강 후 자료<br />확인 가능</p><Link href="#courses" className={buttonClass("warning", "md", "min-h-12 flex-[1.35] rounded-full px-5 text-sm font-black !text-black hover:!text-black")}>교육과정 보기</Link></div></div>;
}

function TrustBadges() {
  return <section aria-label="서비스 신뢰 정보" className="bg-white px-4 py-6 sm:px-6 md:py-10 lg:px-8"><div className="mx-auto grid max-w-7xl gap-3 md:grid-cols-3">{trustBadges.map(([title, body], index) => <article key={title} className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm md:bg-white"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e8f4f3] text-[#176b68]"><Icon name={index === 0 ? "phone" : index === 1 ? "card" : "print"} className="h-5 w-5" /></span><div><h2 className="text-[15px] font-black leading-6 text-slate-950 md:text-base">{title}</h2><p className="mt-1 text-sm leading-6 text-slate-600">{body}</p></div></article>)}</div></section>;
}

function ProcessSteps({ applyHref }: { applyHref: string }) {
  return <section id="process" className="bg-[#f8fafc] px-4 py-10 sm:px-6 md:bg-white md:py-16 lg:px-8"><div className="mx-auto max-w-7xl"><SectionTitle title="결제 후 이렇게 진행됩니다" body="과정 선택부터 수료증·자료 확인까지 모바일에서도 한 흐름으로 진행합니다." /><div className="mt-6 grid gap-3 md:hidden">{mobileProcessSteps.map(([title, body], index) => <article key={title} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#173968] text-sm font-black text-white">{index + 1}</span><div><h3 className="text-base font-black text-slate-950">{title}</h3><p className="mt-0.5 text-sm leading-6 text-slate-600">{body}</p></div></article>)}</div><div className="mt-8 hidden gap-4 md:grid md:grid-cols-4">{processSteps.map(([title, body], index) => <article key={title} className="rounded-[1rem] border border-slate-200 bg-slate-50 p-5"><p className="text-sm font-black text-[#176b68]">0{index + 1}</p><h3 className="mt-2 text-lg font-black">{title}</h3><p className="mt-3 text-sm leading-7 text-slate-700">{body}</p></article>)}</div><Link href={applyHref} className={buttonClass("primary", "lg", "mt-6 w-full rounded-full font-black md:hidden")}>결제 후 바로 수강하기</Link></div></section>;
}

function MobilePricingCards({ basicHref, advancedHref, basicPrice, advancedPrice }: { basicHref: string; advancedHref: string; basicPrice: string; advancedPrice: string }) {
  const cards = [
    { title: "기본과정", price: basicPrice, fit: "교육 이수와 기본 실천자료가 필요한 분", includes: ["온라인 재범방지교육", "교육 수료증", "재발방지계획서", "실천계획서", "서약서"], href: basicHref, cta: "수강 신청하기" },
    { title: "심화과정", price: advancedPrice, fit: "반성 및 재발방지 노력을 더 체계적으로 정리하려는 분", includes: ["온라인 재범방지교육", "기본 3종 서식", "반성문 작성 서식", "심화 이수증", "상세 내역서"], href: advancedHref, cta: "수강 신청하기", recommended: true },
    { title: "사건유형별 과정", price: "49,000원부터", fit: "음주·폭력·도박·성범죄 유형에 맞춰 고르고 싶은 분", includes: ["유형별 재범방지교육", "수료증", "과정별 재발방지 서식", "PDF 저장", "모바일 수강"], href: "/courses", cta: "자세히 보기" },
  ];

  return <div className="grid gap-4 md:hidden">{cards.map((card) => <article key={card.title} className={card.recommended ? "relative rounded-2xl border-2 border-[#173968] bg-white p-5 shadow-[0_18px_45px_rgba(23,57,104,0.18)]" : "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"}>{card.recommended ? <span className="absolute right-4 top-4 rounded-full bg-[#173968] px-3 py-1 text-xs font-black text-white">가장 많이 선택</span> : null}<h3 className="pr-24 text-xl font-black text-slate-950">{card.title}</h3><p className="mt-3 text-3xl font-black text-slate-950">{card.price}</p><p className="mt-3 text-[15px] font-bold leading-6 text-slate-700">{card.fit}</p><ul className="mt-4 grid gap-2">{card.includes.map((item) => <li key={item} className="flex gap-2 text-sm font-bold leading-6 text-slate-800"><Icon name="check" className="mt-1 h-4 w-4 shrink-0 text-[#176b68]" />{item}</li>)}</ul><Link href={card.href} className={buttonClass(card.recommended ? "primary" : "secondary", "md", "mt-5 w-full rounded-full font-black")}>{card.cta}</Link></article>)}</div>;
}

function PaymentFaqSection({ applyHref }: { applyHref: string }) {
  return <section className="bg-white px-4 py-12 sm:px-6 md:py-16 lg:px-8"><div className="mx-auto max-w-7xl"><SectionTitle title="결제 전 확인하세요" body="수강과 자료 이용 전에 자주 묻는 내용을 짧게 정리했습니다." /><div className="mt-6 grid gap-3 md:grid-cols-2">{paymentFaqs.map(([question, answer]) => <article key={question} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 md:p-5"><h3 className="text-[15px] font-black leading-6 text-slate-950 md:text-base">{question}</h3><p className="mt-2 text-sm leading-6 text-slate-700 md:text-[15px] md:leading-7">{answer}</p></article>)}</div><Link href={applyHref} className={buttonClass("primary", "lg", "mt-6 w-full rounded-full font-black md:hidden")}>지금 수강 신청하기</Link></div></section>;
}

export default function HomePage() {
  const duiCourse = platformCourseCategories.find((course) => course.id === "dui") || platformCourseCategories[0];
  const { basic, advanced } = getMainProductPair(duiCourse);
  const basicHref = getApplyHref(duiCourse, basic?.id);
  const advancedHref = getApplyHref(duiCourse, advanced?.id);
  const recommendedHref = advanced ? advancedHref : basicHref;
  const basicPrice = formatApplicationKrw(basic?.price || 49000);
  const advancedPrice = formatApplicationKrw(advanced?.price || 99000);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd).replace(/</g, "\\u003c") }} />
      <main className="keep-korean min-h-screen bg-slate-50 pb-24 text-slate-950 md:pb-0">
        <section className="relative overflow-hidden bg-[#edf4f8] px-4 py-8 sm:px-6 md:py-14 lg:px-8">
          <div className="absolute inset-x-0 top-0 hidden h-24 bg-white md:block" />
          <div className="relative mx-auto grid max-w-7xl gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.78fr)] lg:items-center">
            <div className="min-w-0">
              <p className="inline-flex w-fit rounded-full border border-[#176b68]/25 bg-white px-3 py-1.5 text-xs font-black leading-5 text-[#176b68] shadow-sm sm:px-4 sm:text-sm">형식적인 자료 준비를 넘어, 실제 변화를 위한 교육</p>
              <h1 className="mt-5 max-w-4xl break-keep text-[2.35rem] font-black leading-[1.12] text-slate-950 sm:text-5xl lg:text-[4rem]">
                양형자료는<br />단순한 서류의 개수가 아닙니다
              </h1>
              <div className="mt-5 max-w-3xl space-y-4 break-keep text-[15px] leading-7 text-slate-700 sm:text-lg sm:leading-8">
                <p>교육 수료증과 재범방지 실천자료는<br className="hidden sm:block" /> 교육을 이수하고 변화를 위해 노력한 과정을 기록하는 자료입니다.</p>
                <p>서류를 형식적으로 갖추는 데 그치지 않고,<br className="hidden sm:block" /> 자신의 행동 원인을 이해하고 같은 잘못을 반복하지 않기 위한<br className="hidden lg:block" /> 구체적인 실천계획을 세우는 것이 중요합니다.</p>
              </div>
              <div className="mt-6 max-w-3xl rounded-[1rem] border-l-4 border-[#176b68] bg-white px-5 py-4 shadow-sm">
                <p className="break-keep text-[15px] font-bold leading-7 text-slate-900 sm:text-base sm:leading-8">리셋에듀센터는 교육생이 실제로 교육내용을 이해하고, 위험상황에 대처하는 방법과 재범방지 계획을 스스로 정리할 수 있도록 교육과정을 구성했습니다.</p>
              </div>
              <p className="mt-6 max-w-3xl break-keep text-xl font-black leading-8 text-[#10213f] sm:text-2xl sm:leading-9">단순한 자료 준비를 넘어,<br />진정성 있는 반성과 지속적인 행동 변화를 시작해 보세요.</p>
              <p className="mt-3 max-w-3xl break-keep text-base font-bold leading-7 text-slate-700 sm:text-lg">온라인 재범방지교육부터 수료증과 실천자료 작성까지 체계적으로 제공합니다.</p>
              <div className="mt-6 grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 md:flex md:flex-wrap">
                <Link href="#courses" className={buttonClass("primary", "lg", "w-full whitespace-nowrap rounded-full px-5 text-[15px] font-black md:w-auto md:px-7")}>교육과정 확인하기</Link>
                <Link href="#documents" className={buttonClass("secondary", "lg", "w-full rounded-full px-5 text-[15px] font-black md:w-auto md:px-7")}>수료증·제공자료 미리보기</Link>
              </div>
              <div className="mt-5 hidden flex-wrap gap-2 md:flex">{practiceKeywords.map((item) => <span key={item} className="rounded-full border border-[#176b68]/15 bg-white px-3 py-1.5 text-xs font-black text-slate-700 shadow-sm">{item}</span>)}</div>
            </div>

            <div className="grid gap-4">
              <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.14)] sm:p-6">
                <div className="flex items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#e8f4f3] text-[#176b68]"><Icon name="list" className="h-6 w-6" /></span>
                  <div>
                    <p className="text-sm font-black text-[#176b68]">Learning Flow</p>
                    <h2 className="mt-1 break-keep text-2xl font-black leading-tight text-slate-950">교육을 이해하고, 계획을 세우고, 기록합니다</h2>
                  </div>
                </div>
                <div className="mt-5 grid gap-3">
                  {["행동 원인과 위험요인 점검", "위험상황 대처 방법 학습", "재범방지 실천계획 정리", "수료증과 실천자료로 과정 기록"].map((item, index) => <div key={item} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#173968] text-xs font-black text-white">{index + 1}</span>{item}</div>)}
                </div>
              </div>
              <p className="rounded-[1rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold leading-6 text-amber-950 sm:text-[15px] sm:leading-7">{serviceNotice}</p>
            </div>
          </div>
          <div className="relative mx-auto mt-8 grid max-w-7xl gap-4 md:grid-cols-3">
            {heroValueCards.map(([title, body], index) => <article key={title} className="rounded-[1rem] border border-slate-200 bg-white p-5 shadow-sm"><Icon name={index === 0 ? "shield" : index === 1 ? "chart" : "file"} className="h-8 w-8 text-[#176b68]" /><h2 className="mt-4 break-keep text-lg font-black text-slate-950">{title}</h2><p className="mt-3 break-keep text-sm leading-7 text-slate-700">{body}</p></article>)}
          </div>
        </section>

        <TrustBadges />

        <section id="courses" className="bg-white px-4 py-10 sm:px-6 md:py-16 lg:px-8"><div className="mx-auto max-w-7xl"><SectionTitle title="내게 맞는 과정을 선택하세요" body="교육 이수와 실천자료 정리 범위에 맞춰 기본과정 또는 심화과정을 선택할 수 있습니다." /><div className="mt-6"><MobilePricingCards basicHref={basicHref} advancedHref={advancedHref} basicPrice={basicPrice} advancedPrice={advancedPrice} /></div><div className="mt-8 hidden items-center gap-5 md:grid lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]"><Link href={basicHref} className="group flex min-h-full flex-col rounded-[1.25rem] border border-slate-200 bg-slate-50 p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-[#176b68] hover:shadow-[0_18px_50px_rgba(15,23,42,0.12)] focus:outline-none focus:ring-4 focus:ring-[#176b68]/20" aria-label="기본과정 시작하기"><p className="w-fit rounded-full border border-[#176b68]/20 bg-white px-3 py-1 text-xs font-black text-[#176b68]">부담 없이 시작하는 기본 과정</p><h3 className="mt-4 text-2xl font-black">기본과정</h3><p className="mt-4 text-sm font-bold text-slate-500 line-through">69,000원</p><p className="mt-1 text-4xl font-black text-slate-950">{basicPrice}</p><p className="mt-4 text-sm leading-7 text-slate-700">재범방지교육 이수 및 기본 실천자료를 함께 정리할 수 있는 과정</p><ul className="mt-6 flex-1 space-y-2">{["온라인 재범방지교육", "교육 수료증 PDF 발급", "재발방지계획서 서식", "음주예방실천계획서 서식", "음주운전 재발방지 서약서 서식", "인쇄 및 PDF 저장"].map((item) => <li key={item} className="flex gap-2 text-sm font-bold leading-7 text-slate-800"><Icon name="check" className="mt-1 h-4 w-4 shrink-0 text-[#176b68]" />{item}</li>)}</ul><span className={buttonClass("secondary", "md", "mt-6 rounded-full px-6 font-black transition group-hover:border-[#176b68] group-hover:bg-white")}>기본과정 시작하기</span><p className="mt-4 text-xs font-bold leading-5 text-slate-500">자료 구성 개편에 따라 현재 가격이 적용되고 있습니다.</p></Link><Link href={advancedHref} className="group relative flex min-h-full scale-[1.01] flex-col overflow-hidden rounded-[1.25rem] border-2 border-[#173968] bg-white p-6 shadow-[0_28px_80px_rgba(23,57,104,0.24)] transition hover:-translate-y-0.5 hover:shadow-[0_32px_88px_rgba(23,57,104,0.3)] focus:outline-none focus:ring-4 focus:ring-[#173968]/20 lg:p-7" aria-label="심화과정 시작하기"><div className="absolute inset-x-0 top-0 h-1.5 bg-[#173968]" /><p className="w-fit rounded-full bg-[#173968] px-3 py-1 text-xs font-black text-white">가장 많이 선택하는 과정</p><h3 className="mt-4 text-2xl font-black">심화과정</h3><p className="mt-4 text-sm font-bold text-slate-500 line-through">129,000원</p><p className="mt-1 text-5xl font-black text-slate-950">{advancedPrice}</p><p className="mt-4 text-sm leading-7 text-slate-700">자기성찰과 재범방지 실천자료까지 함께 정리할 수 있는 심화 과정</p><ul className="mt-6 flex-1 space-y-2">{["온라인 재범방지교육", "교육 수료증 PDF 발급", "재발방지계획서 서식", "음주예방실천계획서 서식", "음주운전 재발방지 서약서 서식", "반성문 작성 서식", "인지행동기반 재발방지교육 이수증", "재범방지 교육 이수 상세 내역서", "인쇄 및 PDF 저장"].map((item) => <li key={item} className="flex gap-2 text-sm font-bold leading-7 text-slate-800"><Icon name="check" className="mt-1 h-4 w-4 shrink-0 text-[#173968]" />{item}</li>)}</ul><span className={buttonClass("primary", "md", "mt-6 rounded-full px-6 font-black transition group-hover:bg-[#10213f]")}>심화과정 시작하기</span><p className="mt-4 text-xs font-bold leading-5 text-slate-500">재범방지교육 이수와 함께 재발방지 실천자료를 체계적으로 정리할 수 있습니다.</p></Link></div><div className="mt-6 hidden gap-3 rounded-[1rem] border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2 md:grid lg:grid-cols-4">{["온라인 즉시 수강 가능", "PDF 저장 및 출력 지원", "모바일·PC 이용 가능", "실천자료 직접 작성 가능"].map((item) => <div key={item} className="flex items-center gap-2 text-sm font-black text-slate-800"><Icon name="check" className="h-4 w-4 shrink-0 text-[#176b68]" />{item}</div>)}</div></div></section>

        <ProcessSteps applyHref={recommendedHref} />

        <section className="hidden px-4 py-16 sm:px-6 md:block lg:px-8"><div className="mx-auto max-w-7xl"><SectionTitle eyebrow="Education" title="교육·기록·생활개선을 한 흐름으로 정리합니다" body="사건 이후 어떤 자료를 준비해야 할지 막막한 상황에서, 재범방지교육 수강부터 자기점검과 실천자료 정리까지 단계적으로 확인할 수 있습니다." /><div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">{[["재범방지교육", "사건 유형별 위험요인과 책임 인식을 차분히 학습합니다."], ["자기점검", "반복될 수 있는 상황, 습관, 감정 반응을 직접 점검합니다."], ["실천계획", "재발방지계획서 서식과 실천계획서 서식을 실행 가능한 문장으로 정리합니다."], ["자료 관리", "수료증과 실천자료를 확인하고 PDF 저장 및 출력을 진행합니다."]].map(([title, body]) => <article key={title} className="rounded-[1rem] border border-slate-200 bg-white p-5 shadow-sm"><Icon name="shield" className="h-8 w-8 text-[#176b68]" /><h3 className="mt-4 text-lg font-black">{title}</h3><p className="mt-3 text-sm leading-7 text-slate-700">{body}</p></article>)}</div></div></section>

        <section id="documents" className="bg-white px-4 py-10 sm:px-6 md:py-16 lg:px-8"><div className="mx-auto max-w-7xl"><SectionTitle title="제공자료 미리보기" body="수료증, 재발방지계획서, 서약서, 실천계획서 등 수강 후 확인할 자료 샘플입니다." /><div className="mt-6 md:mt-8"><DocumentPreviewGallery documents={homeCertificateSamples} columnsClassName="grid-cols-2 lg:grid-cols-4" showPreviewButton={false} /></div><Link href="/prevention-documents" className={buttonClass("secondary", "lg", "mt-6 w-full rounded-full font-black md:hidden")}>제공자료 확인하기</Link></div></section>

        <section className="px-4 py-10 sm:px-6 md:py-16 lg:px-8"><div className="mx-auto max-w-7xl"><SectionTitle title="사건 유형별 재범방지교육" body="현재 운영 중인 온라인 재범방지교육을 확인하고, 필요한 경우 심화과정을 선택해 자기점검과 실천자료를 함께 정리할 수 있습니다." /><div className="mt-6 grid gap-4 md:mt-8 md:grid-cols-2 xl:grid-cols-4">{platformCourseCategories.map((course) => <Link key={course.slug} href={"/courses/" + course.slug} className="group flex min-h-full flex-col rounded-[1rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#176b68] hover:shadow-[0_18px_45px_rgba(15,23,42,0.12)]"><h3 className="text-lg font-black leading-snug text-slate-950 md:text-xl">{course.title}</h3><p className="mt-3 flex-1 text-sm leading-7 text-slate-700 md:mt-4">{course.summary}</p><span className="mt-4 text-sm font-black text-[#173968] group-hover:underline md:mt-5">과정 자세히 보기</span></Link>)}</div><Link href="/courses" className={buttonClass("primary", "lg", "mt-6 w-full rounded-full font-black md:hidden")}>내게 맞는 과정 보기</Link></div></section>

        <PaymentFaqSection applyHref={recommendedHref} />

        <section className="px-4 pb-12 sm:px-6 md:pb-16 lg:px-8"><div className="mx-auto max-w-7xl rounded-[1.25rem] bg-[#07111f] p-6 text-white shadow-[0_20px_60px_rgba(7,17,31,0.24)] sm:p-8"><h2 className="text-2xl font-black sm:text-3xl">ResetEdu 재발방지교육센터</h2><p className="mt-3 max-w-3xl text-sm leading-7 text-slate-200">온라인 재범방지교육과 실천자료 관리를 통해 사건 이후의 생활개선과 재발방지 노력을 체계적으로 정리하세요.</p><Link href="#courses" className={buttonClass("darkSecondary", "lg", "mt-6 w-full rounded-full px-7 font-black focus:ring-offset-[#07111f] sm:w-auto")}>교육과정 확인하기</Link></div></section>
      </main>
      <MobileStickyCTA />
    </>
  );
}
