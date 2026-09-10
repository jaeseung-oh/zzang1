import type { Metadata } from "next";
import Link from "next/link";
import { buttonClass } from "@/app/components/ui/button-styles";
import MobileDocumentCarousel from "@/app/components/mobile-document-carousel";
import { CourseRecommendation, IntentBanner } from "@/app/components/conversion-tools";
import { APPLICATION_PRICES, formatApplicationKrw } from "@/lib/course/application-products";
import { getMainProductPair, platformCourseCategories, type CourseCategory } from "@/lib/course/platform-courses";
import { operatorInfoRows, siteInfo } from "@/lib/site-info";

export const metadata: Metadata = {
  title: "리셋 재범방지교육센터",
  description: "음주운전, 폭력범죄, 성범죄, 도박중독, 마약중독 재범방지 온라인 교육을 제공하는 리셋 재범방지교육센터입니다.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "리셋 재범방지교육센터",
    description: "음주운전, 폭력범죄, 성범죄, 도박중독, 마약중독, 디지털범죄 재범방지 온라인 교육",
    url: "https://resetedu.kr/",
    siteName: "리셋 재범방지교육센터",
    locale: "ko_KR",
    type: "website",
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "리셋 재범방지교육센터",
  alternateName: "리셋 재범방지교육센터",
  url: "https://resetedu.kr/",
  parentOrganization: {
    "@type": "Organization",
    name: "보듬심리상담센터",
  },
};

const processFaqs = [
  ["교육 수료 후 어떤 자료를 받을 수 있나요?", "과정에 따라 교육 수료증, 재발방지계획서, 실천계획서, 서약서 등의 자료를 발급받을 수 있습니다. 심화이수과정에서는 인지행동기반 재범방지교육 / 이수증, 교육이수 상세내역서, 교육 소감문 작성자료가 추가로 제공됩니다."],
  ["발급받은 자료를 경찰·검찰·법원 등에 제출할 수 있나요?", "교육 수료증 및 재범방지 실천자료는 교육 참여와 재범방지를 위한 노력을 정리하는 자료로 활용할 수 있습니다. 다만 개별 사건에서의 제출 필요성, 활용 가능 여부 및 평가 결과는 사건의 내용과 제출기관의 판단에 따라 달라질 수 있습니다."],
  ["기본 수료과정과 심화이수과정 중 어떤 과정을 선택해야 하나요?", "교육 이수와 기본적인 수료자료가 필요한 경우에는 기본 수료과정을 선택할 수 있습니다. 교육이수 내용과 재범방지를 위한 노력을 보다 구체적으로 정리하고 싶다면 심화이수과정을 권장합니다. 심화이수과정에는 기본 수료과정의 구성과 함께 인지행동기반 재범방지교육 / 이수증과 교육이수 상세내역서가 추가로 제공됩니다."],
  ["수료증과 제공자료는 언제 확인할 수 있나요?", "결제 후 내 강의실에서 교육을 수강하고, 마이페이지에서 과정별 자료를 확인할 수 있습니다. 수료증과 이수증 등 출력서류는 사이트 내 발급 화면에서 확인하거나 PDF로 저장할 수 있습니다."],
] as const;

const useSteps = [
  ["과정 선택", "교육 내용과 제공자료를 확인합니다."],
  ["결제", "회원가입 후 원하는 과정을 결제합니다."],
  ["온라인 수강", "내 강의실에서 PC 또는 모바일로 교육을 수강합니다."],
  ["자료 확인", "수료 후 수료증과 제공자료를 PDF로 저장 및 즉시 출력할 수 있습니다."],
] as const;

const courseCopy: Record<string, { purpose: string; composition: string }> = {
  dui: {
    purpose: "음주 상황과 운전을 분리하지 못했던 원인을 돌아보고, 다시 같은 선택을 하지 않기 위한 생활 규칙을 세우는 과정입니다.",
    composition: "온라인 교육 및 수료증 등 제공자료 3종",
  },
  "violence-prevention": {
    purpose: "분노와 충동이 행동으로 이어지는 순간을 이해하고, 갈등 상황에서 멈추고 대처하는 방법을 연습합니다.",
    composition: "온라인 교육 및 수료증 등 제공자료 3종",
  },
  "gambling-relapse-prevention": {
    purpose: "도박 충동이 올라오는 상황을 살펴보고, 돈과 시간, 휴대폰 사용을 관리하는 기준을 정합니다.",
    composition: "온라인 교육 및 수료증 등 제공자료 3종",
  },
  "sexual-offense-prevention": {
    purpose: "동의와 경계에 대한 이해를 다시 확인하고, 위험한 생각이나 행동을 멈추기 위한 기준을 배웁니다.",
    composition: "온라인 교육 및 수료증 등 제공자료 3종",
  },
  "prostitution-prevention": {
    purpose: "성매매로 이어질 수 있는 스트레스, 음주, 외로움, 야간 스마트폰 사용과 접근경로를 점검하고 차단 기준을 세우는 과정입니다.",
    composition: "온라인 교육 및 수료증 등 제공자료 3종",
  },
  "drug-rehab-prevention": {
    purpose: "재사용 위험상황과 갈망을 점검하고, 접근 차단과 도움 요청 계획을 세우는 과정입니다.",
    composition: "온라인 교육 및 수료증 등 제공자료 3종",
  },
  "digital-crime": {
    purpose: "온라인 행동과 위험한 디지털 사용 습관을 점검하고, 피해자 접촉 방지와 환경관리 계획을 세우는 과정입니다.",
    composition: "온라인 교육 및 수료증 등 제공자료 3종",
  },
  "fraud-prevention": {
    purpose: "거래 책임과 금전 의사결정 과정을 점검하고 재범방지 기준을 세우는 과정입니다.",
    composition: "온라인 교육 및 수료증 등 제공자료 3종",
  },
  "unlicensed-driving-prevention": {
    purpose: "면허 상태 확인과 차량 접근 차단 기준을 정리해 무면허운전을 반복하지 않도록 돕는 과정입니다.",
    composition: "온라인 교육 및 수료증 등 제공자료 3종",
  },
  "hangover-driving-prevention": {
    purpose: "전날 음주와 다음 날 운전 위험을 점검하고 숙취운전 예방 생활 기준을 세우는 과정입니다.",
    composition: "온라인 교육 및 수료증 등 제공자료 3종",
  },
  "voice-phishing-prevention": {
    purpose: "보이스피싱 범죄 구조와 가담 위험요인을 점검하고, 유사한 범죄 제안을 차단하기 위한 실천 기준을 세우는 과정입니다.",
    composition: "온라인 교육 및 수료증 등 제공자료 3종",
  },
  "digital-sexual-crime-prevention": {
    purpose: "디지털성범죄의 피해 영향과 온라인 위험 행동을 점검하고, 책임 있는 디지털 행동 기준을 세우는 과정입니다.",
    composition: "온라인 교육 및 수료증 등 제공자료 3종",
  },
  "legal-compliance-awareness": {
    purpose: "법규 준수 태도와 생활 속 판단 기준을 점검하고 같은 문제가 반복되지 않도록 실천 기준을 세우는 과정입니다.",
    composition: "온라인 교육 및 수료증 등 제공자료 3종",
  },
};

const courseVisuals: Record<string, { label: string; imageSrc: string }> = {
  dui: { label: "음주 판단", imageSrc: "/images/resetedu-course-20260721-dui.jpg" },
  "violence-prevention": { label: "분노 조절", imageSrc: "/images/resetedu-course-20260721-violence.jpg" },
  "gambling-relapse-prevention": { label: "충동 관리", imageSrc: "/images/resetedu-course-20260721-gambling.jpg" },
  "sexual-offense-prevention": { label: "동의와 경계", imageSrc: "/images/resetedu-course-20260721-sexual-offense.jpg" },
  "prostitution-prevention": { label: "접근경로 차단", imageSrc: "/images/%EC%84%B1%EB%A7%A4%EB%A7%A4icon.png" },
  "drug-rehab-prevention": { label: "회복 계획", imageSrc: "/images/resetedu-course-20260721-drug.jpg" },
  "digital-crime": { label: "디지털 사용", imageSrc: "/images/resetedu-course-20260721-digital.jpg" },
  "fraud-prevention": { label: "거래 책임", imageSrc: "/images/%EC%82%AC%EA%B8%B0icon.png" },
  "unlicensed-driving-prevention": { label: "면허 확인", imageSrc: "/images/%EB%AC%B4%EB%A9%B4%ED%97%88%EC%9A%B4%EC%A0%84icon.png" },
  "hangover-driving-prevention": { label: "숙취 위험", imageSrc: "/images/%EC%88%99%EC%B7%A8%EC%9A%B4%EC%A0%84icon.png" },
  "reckless-retaliatory-driving-prevention": { label: "운전 분노", imageSrc: "/images/%EB%82%9C%ED%8F%AD%EB%B3%B4%EB%B3%B5%EC%9A%B4%EC%A0%84ICON.png" },
  "defamation-insult-prevention": { label: "표현 책임", imageSrc: "/images/%EB%AA%85%EC%98%88%ED%9B%BC%EC%86%90icon.png" },
  "voice-phishing-prevention": { label: "범죄 제안 차단", imageSrc: "/images/%EB%B3%B4%EC%9D%B4%EC%8A%A4%ED%94%BC%EC%8B%B1ICON.png" },
  "digital-sexual-crime-prevention": { label: "디지털 경계", imageSrc: "/images/%EB%94%94%EC%A7%80%ED%84%B8%EC%84%B1%EB%B2%94%EC%A3%84ICON.png" },
  "legal-compliance-awareness": { label: "준법 기준", imageSrc: "/images/%EC%A4%80%EB%B2%95%EC%9D%98%EC%8B%9Dicon.png" },
};

const educationReviewImageSrc = "/images/%EA%B5%90%EC%9C%A1%EC%86%8C%EA%B0%90%EB%AC%B8.jpg";

function getCourseImageClass(imageSrc: string) {
  const lower = imageSrc.toLowerCase();
  return lower.includes("icon") || lower.endsWith(".png") ? "h-full w-full object-contain p-1" : "h-full w-full object-cover";
}

type DocumentSample = {
  title: string;
  label?: string;
  imageSrc?: string;
  privateNotice?: string;
};

const documentSamples: readonly DocumentSample[] = [
  { title: "교육 수료증", label: "대표 발급자료", imageSrc: "/images/%EA%B8%B0%EB%B3%B8%EC%88%98%EB%A3%8C%EC%A6%9D%20%EC%88%98%EC%A0%95%EB%B3%B8.jpg" },
  { title: "인지행동기반 재범방지교육 / 이수증", label: "심화이수과정 제공", imageSrc: "/images/%EC%9D%B8%EC%A7%80%ED%96%89%EB%8F%99%EC%9D%B4%EC%88%98%EC%A6%9D%20%EC%83%98%ED%94%8C.png" },
  { title: "교육이수 상세내역서", label: "심화이수과정 제공", imageSrc: "/images/%EA%B5%90%EC%9C%A1%EC%9D%B4%EC%88%98%EC%83%81%EC%84%B8%EB%82%B4%EC%97%AD%EC%84%9C.jpg" },
  { title: "교육 소감문", label: "심화이수과정 제공", imageSrc: educationReviewImageSrc },
  { title: "심리상담 의견서", label: "심리상담 종합과정 제공", privateNotice: "보안이 중요한 자료이므로 이미지는 비공개입니다." },
  { title: "기관탄원서", label: "심리상담 종합과정 제공", privateNotice: "보안이 중요한 자료이므로 이미지는 비공개입니다." },
  { title: "재발방지계획서", label: undefined, imageSrc: "/images/document-samples/prevention-plan-sample.jpg" },
  { title: "서약서", label: undefined, imageSrc: "/images/document-samples/risk-response-plan-sample.jpg" },
  { title: "실천계획서", label: undefined, imageSrc: "/images/document-samples/sobriety-pledge-sample.jpg" },
] as const;

const basicDocumentCards = [
  ["온라인 재범방지교육", "사건 유형별 교육을 PC와 모바일로 수강합니다."],
  ["교육 수료증", "교육과정을 정상적으로 이수한 사실을 확인할 수 있는 자료"],
  ["재발방지계획서", "위험상황과 재발방지를 위한 구체적인 실천계획을 정리하는 자료"],
  ["실천계획서", "교육 내용을 실제 생활에서 어떻게 실천할지 구체화하는 자료"],
  ["재범방지 서약서", "향후 재범방지를 위한 본인의 실천 의지를 정리하는 자료"],
] as const;

const advancedDocumentCards = [
  ["인지행동기반 재범방지교육 / 이수증", "인지행동기반 재범방지교육 이수 내용을 별도로 확인할 수 있는 자료", "/images/%EC%9D%B8%EC%A7%80%ED%96%89%EB%8F%99%EC%9D%B4%EC%88%98%EC%A6%9D%20%EC%83%98%ED%94%8C.png"],
  ["교육이수 상세내역서", "교육과정 및 주요 학습내용을 보다 구체적으로 확인할 수 있는 자료", "/images/%EA%B5%90%EC%9C%A1%EC%9D%B4%EC%88%98%EC%83%81%EC%84%B8%EB%82%B4%EC%97%AD%EC%84%9C.jpg"],
  ["교육 소감문", "교육 후 느낀 점과 재발방지 실천계획을 직접 정리하는 자료", educationReviewImageSrc],
] as const;

const counselingDocumentCards = [
  ["심리상담의견서", "개별 심리상담과 종합평가 내용을 바탕으로 작성·발급되는 상담 과정 추가 자료"],
  ["상담기관 탄원서", "개인별 상황과 변화 노력이 반영될 수 있도록 상담기관에서 작성·발급하는 자료"],
] as const;


const planChoiceCards = [
  {
    title: "기본 수료과정",
    priceKey: "PREVENTION_BASIC" as const,
    badge: "",
    subtitle: "",
    recommend: "교육 이수 및 기본 재범방지자료가 필요한 경우",
    description: "온라인 재범방지교육을 이수하고 수료증 및 기본적인 재범방지 실천자료를 발급받을 수 있는 과정입니다.",
    cta: "기본 수료과정 수강하기",
    href: "/courses",
    items: ["온라인 재범방지교육", "교육 수료증", "재발방지계획서", "실천계획서", "재범방지 서약서"],
  },
  {
    title: "심화이수과정",
    priceKey: "PREVENTION_ADVANCED" as const,
    badge: "가장 많이 선택",
    subtitle: "기본과정보다 교육과 이수자료를 더 충실하게 준비하는 과정",
    recommend: "기본 수료과정보다 교육내용과 이수 확인자료를 더 충실히 준비하고 싶은 경우",
    description: "기본 수료과정의 모든 구성에 더해 인지행동기반 재범방지교육과 추가 이수증, 교육이수 상세내역서, 교육 소감문까지 함께 준비할 수 있는 과정입니다.",
    cta: "심화이수과정 수강하기",
    href: "/courses",
    items: ["기본 수료과정 전체 포함", "+ 인지행동기반(CBT) 재범방지교육 및 추가 이수증", "+ 교육이수 상세내역서", "+ 교육 소감문"],
  },
  {
    title: "심리상담 종합과정",
    priceKey: "COUNSELING_COMPREHENSIVE" as const,
    badge: "상위 과정",
    subtitle: "",
    recommend: "교육과 함께 개별 심리상담 및 상담 관련 자료까지 준비하고 싶은 경우",
    description: "심화이수과정의 모든 제공 내용에 더해 방문 없이 가능한 유선 심리상담과 심리상담의견서·상담기관 탄원서 발급 절차를 포함한 과정입니다.",
    cta: "심리상담 종합과정 보기",
    href: "/courses",
    items: ["심화이수과정 전체 포함", "+ 유선 상담 가능(방문 없이 진행)", "+ 심리상담의견서", "+ 상담기관 탄원서"],
  },
] as const;

const operatorInfo = operatorInfoRows;

function SectionTitle({ title, body, className = "" }: { title: string; body?: string; className?: string }) {
  return (
    <div className={"keep-korean min-w-0 " + className}>
      <h2 className="text-[28px] font-black leading-tight text-slate-950 sm:text-4xl">{title}</h2>
      {body ? <p className="mt-4 break-keep text-[17px] leading-8 text-slate-700 sm:text-lg sm:leading-9">{body}</p> : null}
    </div>
  );
}

function CourseCard({ course, basicPrice, advancedPrice, counselingPrice }: { course: CourseCategory; basicPrice: string; advancedPrice: string; counselingPrice: string }) {
  const copy = courseCopy[course.id] || { purpose: course.summary, composition: "온라인 교육과 제공자료" };
  const visual = courseVisuals[course.id] || { label: "교육 과정", imageSrc: "/images/resetedu-logo-mark.png" };
  return (
    <article className="group flex h-full flex-col border border-slate-300 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#173968] hover:shadow-[0_18px_38px_rgba(15,23,42,0.12)] sm:p-6">
      <div className="flex items-start gap-4">
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100 sm:h-[72px] sm:w-[72px]">
          <img src={visual.imageSrc} alt="" aria-hidden="true" className={getCourseImageClass(visual.imageSrc)} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-black text-slate-500">{visual.label}</p>
          <h3 className="mt-1 break-keep text-[22px] font-black leading-snug text-slate-950">{course.title}</h3>
        </div>
      </div>
      <p className="mt-4 min-h-[88px] break-keep text-base leading-8 text-slate-700 sm:text-[17px]">{copy.purpose}</p>
      <div className="mt-4 flex flex-wrap gap-2 text-sm font-black text-slate-700"><span className="bg-slate-100 px-3 py-1.5">온라인 수강</span><span className="bg-slate-100 px-3 py-1.5">수료자료 발급</span><span className="bg-[#fffaf0] px-3 py-1.5 text-[#5f4514]">심리상담 종합과정 선택 가능</span></div>
      <div className="mt-5 grid grid-cols-3 gap-3 border-y border-slate-200 py-4 text-base">
        <div><p className="text-sm font-black text-slate-500">기본 수료</p><p className="mt-1 text-lg font-black tracking-tight text-slate-950">{basicPrice}</p><p className="mt-1 text-xs font-bold text-slate-500">교육+기본서류</p></div>
        <div><p className="text-sm font-black text-slate-500">심화이수</p><p className="mt-1 text-lg font-black tracking-tight text-[#173968]">{advancedPrice}</p><p className="mt-1 text-xs font-bold text-[#173968]">+ CBT 이수자료</p></div>
        <div><p className="break-keep text-sm font-black text-slate-500">심리상담 종합</p><p className="mt-1 text-lg font-black tracking-tight text-[#5f4514]">{counselingPrice}</p><p className="mt-1 text-xs font-bold text-[#5f4514]">+ 의견서·탄원서</p></div>
      </div>
      <div className="mt-auto pt-5">
        <Link href={"/courses/" + course.slug} className="inline-flex min-h-12 w-full items-center justify-between border border-slate-400 bg-white px-4 text-base font-black text-slate-950 transition group-hover:border-[#173968] group-hover:bg-[#173968] group-hover:!text-white">
          <span>과정 자세히 보기</span><span aria-hidden="true">→</span>
        </Link>
      </div>
    </article>
  );
}

function DocumentPreviewSurface({ sample, priority = false }: { sample: DocumentSample; priority?: boolean }) {
  if (!sample.imageSrc) {
    return (
      <div className="flex aspect-[3/4] w-full flex-col items-center justify-center border border-dashed border-slate-300 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-5 text-center">
        <div className="relative h-16 w-12 border-2 border-[#173968] bg-white shadow-sm">
          <span className="absolute right-0 top-0 h-4 w-4 border-b border-l border-[#d7deea] bg-[#eef4fb]" />
          <span className="absolute left-2 right-2 top-7 h-0.5 bg-slate-300" />
          <span className="absolute left-2 right-2 top-10 h-0.5 bg-slate-200" />
        </div>
        <p className="mt-5 text-base font-black leading-6 text-slate-950">이미지 비공개</p>
        <p className="mt-2 max-w-[13rem] break-keep text-sm font-bold leading-6 text-slate-600">{sample.privateNotice || "개인정보 및 상담내용 보호를 위해 예시 이미지는 공개하지 않습니다."}</p>
        <span className="mt-4 border border-[#d3b271] bg-[#fffaf0] px-3 py-1 text-xs font-black text-[#5f4514]">보안 자료</span>
      </div>
    );
  }

  return (
    <div className="flex aspect-[3/4] w-full items-center justify-center border border-slate-200 bg-[#f8fafc] p-3">
      <img
        src={sample.imageSrc}
        alt={sample.title + " 예시"}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        className="h-full w-full object-contain"
      />
    </div>
  );
}

function DocumentSampleCard({ sample, index }: { sample: DocumentSample; index: number }) {
  const isPreventionPlan = sample.title === "재발방지계획서";
  return (
    <article className={isPreventionPlan ? "group flex h-full min-w-0 flex-col overflow-hidden rounded-lg border-2 border-[#173968] bg-white shadow-[0_18px_40px_rgba(23,57,104,0.16)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_22px_48px_rgba(23,57,104,0.2)]" : "group flex h-full min-w-0 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-[#173968] hover:shadow-[0_16px_34px_rgba(15,23,42,0.12)]"}>
      {isPreventionPlan ? <div className="flex items-center justify-between border-b border-[#d7deea] bg-[#f6f8fb] px-4 py-2"><span className="text-xs font-black text-[#173968]">중요 제출자료</span><span className="text-[11px] font-bold text-slate-500">11개 항목 구성</span></div> : null}
      <DocumentPreviewSurface sample={sample} priority={index < 2} />
      <div className="flex min-h-[92px] flex-col justify-between gap-3 border-t border-slate-200 px-4 py-4">
        <div className="min-w-0">
          <h3 className="break-keep text-base font-black leading-6 text-slate-950">{sample.title}</h3>
          {sample.label ? <p className="mt-1 break-keep text-xs font-black leading-5 text-[#176b68]">{sample.label}</p> : <p className={isPreventionPlan ? "mt-1 break-keep text-xs font-black leading-5 text-[#173968]" : "mt-1 text-xs font-bold leading-5 text-slate-500"}>{isPreventionPlan ? "과정별 위험요인·대처전략 반영" : "기본 수료과정 제공"}</p>}
        </div>
      </div>
    </article>
  );
}

function PreventionDocumentBundleCard({ samples, startIndex }: { samples: readonly DocumentSample[]; startIndex: number }) {
  return (
    <article className="group col-span-2 flex h-full min-w-0 flex-col overflow-hidden rounded-lg border-2 border-[#173968] bg-white shadow-[0_18px_42px_rgba(23,57,104,0.16)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_22px_48px_rgba(23,57,104,0.2)]">
      <div className="flex items-center justify-between border-b border-[#d7deea] bg-[#173968] px-4 py-2 text-white">
        <span className="text-xs font-black">제출자료 3종 세트</span>
        <span className="text-[11px] font-bold text-[#dbeafe]">기본 수료과정 제공</span>
      </div>
      <div className="grid grid-cols-3 gap-3 border-b border-slate-200 bg-[#f6f8fb] p-3">
        {samples.map((sample, index) => (
          <div key={sample.title} className="min-w-0">
            <DocumentPreviewSurface sample={sample} priority={startIndex + index < 2} />
            <p className="mt-2 break-keep text-center text-xs font-black leading-4 text-slate-700">{sample.title}</p>
          </div>
        ))}
      </div>
      <div className="flex min-h-[112px] flex-col justify-between gap-2 px-4 py-4">
        <div className="min-w-0">
          <h3 className="break-keep text-lg font-black leading-6 text-slate-950">재발방지계획서 등 3종세트</h3>
          <p className="mt-2 break-keep text-sm font-bold leading-6 text-slate-600">단순히 형식을 갖춘 제출자료가 아닙니다. 모든 제공자료는 각 교육과정의 핵심 내용과 재범방지 실천요소를 충실히 반영하여 과정별 특성에 맞게 구성됩니다.</p>
        </div>
      </div>
    </article>
  );
}

function DocumentDesk() {
  const officialDocuments = documentSamples.slice(0, 4);
  const confidentialDocuments = documentSamples.slice(4, 6);
  const preventionPackDocuments = documentSamples.slice(6);
  const processChips = ["기본 수료", "심화이수", "심리상담 종합"] as const;

  return (
    <div className="mt-8 border-2 border-slate-800 bg-[#f8fafc] p-4 shadow-[0_22px_60px_rgba(15,23,42,0.12)] sm:p-6 lg:p-8">
      <div className="flex flex-col gap-5 border-b-2 border-slate-800 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="w-fit border border-[#173968] bg-white px-3 py-1 text-sm font-black text-[#173968]">제출자료 예시</p>
          <h3 className="mt-4 break-keep text-[26px] font-black leading-tight text-slate-950 sm:text-3xl">수료증부터 재범방지 노력까지, 과정별 자료를 함께 준비합니다.</h3>
          <p className="mt-3 max-w-3xl whitespace-pre-line break-keep text-base leading-8 text-slate-700 sm:text-[17px]">교육 이수 사실을 확인할 수 있는 수료증을 중심으로, 교육이수 상세내역서, 교육소감문, 재발방지계획서, 실천계획서, 서약서 등 과정별 양형자료를 함께 준비할 수 있도록 구성했습니다.</p>
        </div>
        <div className="flex flex-wrap gap-2" aria-label="과정별 제공자료 구분">
          {processChips.map((chip) => <span key={chip} className="rounded-lg border border-slate-400 bg-white px-4 py-2 text-sm font-black text-slate-800">{chip}</span>)}
        </div>
      </div>


      <div className="mt-7">
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-xl font-black text-slate-950">주요 발급자료</h3>
          <span className="hidden text-sm font-bold text-slate-500 sm:inline">대표·심화 과정 자료</span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
          {officialDocuments.map((sample, index) => <DocumentSampleCard key={sample.title} sample={sample} index={index} />)}
        </div>
      </div>

      <div className="mt-9">
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-xl font-black text-slate-950">재발방지 제출자료</h3>
          <span className="hidden text-sm font-bold text-slate-500 sm:inline">기본 수료과정 제공 핵심자료</span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
          {confidentialDocuments.map((sample, index) => <DocumentSampleCard key={sample.title} sample={sample} index={officialDocuments.length + index} />)}
          <PreventionDocumentBundleCard samples={preventionPackDocuments} startIndex={officialDocuments.length + confidentialDocuments.length} />
        </div>
      </div>

      <div className="mt-7 flex flex-col gap-3 border-t-2 border-slate-800 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="break-keep text-sm font-bold leading-6 text-slate-600">실제 발급 문서는 수강자 정보와 이수 기록에 맞춰 생성되며, 보안 자료는 예시 이미지를 공개하지 않습니다.</p>
        <Link href="/prevention-documents" className={buttonClass("secondary", "md", "rounded-lg px-5 font-black shadow-none")}>실제 제공자료 확인하기</Link>
      </div>
    </div>
  );
}

function PlanChoiceCard({ plan }: { plan: (typeof planChoiceCards)[number] }) {
  const isAdvanced = plan.title === "심화이수과정";
  const isCounseling = plan.title === "심리상담 종합과정";
  const price = formatApplicationKrw(APPLICATION_PRICES[plan.priceKey]);
  return (
    <Link href={plan.href} className={isCounseling ? "plan-card plan-card-counseling group block border-2 border-[#d3b271] bg-white p-6 shadow-[0_18px_45px_rgba(211,178,113,0.18)] transition hover:bg-[#fffdf7] focus:outline-none focus:ring-4 focus:ring-[#d3b271]/30 sm:p-7" : isAdvanced ? "plan-card plan-card-advanced group block border-2 border-[#173968] bg-white p-6 shadow-[0_18px_45px_rgba(23,57,104,0.12)] transition hover:bg-[#fbfcfd] focus:outline-none focus:ring-4 focus:ring-[#173968]/20 sm:p-7" : "plan-card plan-card-basic group block border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-[#176b68] hover:shadow-[0_18px_45px_rgba(15,23,42,0.12)] focus:outline-none focus:ring-4 focus:ring-[#176b68]/20 sm:p-7"}>
      {plan.badge ? <p className={isCounseling ? "w-fit bg-[#d3b271] px-3 py-1.5 text-sm font-black text-slate-950" : "w-fit bg-[#173968] px-3 py-1.5 text-sm font-black text-white"}>{plan.badge}</p> : null}
      <h3 className={plan.badge ? "mt-4 text-3xl font-black text-slate-950" : "text-3xl font-black text-slate-950"}>{plan.title}</h3>
      {plan.subtitle ? <p className="mt-2 break-keep text-sm font-black leading-6 text-slate-500">{plan.subtitle}</p> : null}
      <p className="mt-3 break-keep text-base font-black leading-7 text-[#176b68]">{plan.recommend}</p>
      <p className={isCounseling ? "mt-4 text-[44px] font-black tracking-tight leading-none text-[#5f4514] sm:text-5xl" : isAdvanced ? "mt-4 text-[44px] font-black tracking-tight leading-none text-[#173968] sm:text-5xl" : "mt-4 text-[44px] font-black tracking-tight leading-none text-slate-950 sm:text-5xl"}>{price}</p>
      <p className="mt-5 max-w-xl break-keep text-base leading-8 text-slate-700 sm:text-[17px]">{plan.description}</p>
      <p className="mt-6 text-lg font-black text-slate-950">{isCounseling ? "심화이수과정보다 추가되는 항목" : isAdvanced ? "기본 수료과정보다 추가되는 항목" : "제공 항목"}</p>
      <ul className="mt-3 grid gap-2.5 text-[17px] leading-8 text-slate-700">
        {plan.items.map((item) => <li key={item} className={item.startsWith("+") ? isCounseling ? "font-black text-[#b91c1c]" : "font-bold text-[#173968]" : "font-semibold text-slate-800"}>{item}</li>)}
      </ul>
      <span className={isCounseling ? "mt-6 inline-flex min-h-12 w-full items-center justify-center bg-[#5f4514] px-5 text-base font-black text-white transition group-hover:bg-[#10213f] sm:w-auto" : isAdvanced ? "mt-6 inline-flex min-h-12 w-full items-center justify-center bg-[#173968] px-5 text-base font-black text-white transition group-hover:bg-[#10213f] sm:w-auto" : "mt-6 inline-flex min-h-12 w-full items-center justify-center border border-slate-400 px-5 text-base font-black text-slate-950 transition group-hover:border-[#173968] group-hover:bg-[#173968] group-hover:text-white sm:w-auto"}>{plan.cta}</span>
    </Link>
  );
}


const mobileCourseOrder = [
  "dui",
  "sexual-offense-prevention",
  "prostitution-prevention",
  "digital-sexual-crime-prevention",
  "violence-prevention",
  "fraud-prevention",
  "voice-phishing-prevention",
  "drug-rehab-prevention",
  "gambling-relapse-prevention",
  "digital-crime",
  "unlicensed-driving-prevention",
  "reckless-retaliatory-driving-prevention",
  "defamation-insult-prevention",
  "hangover-driving-prevention",
  "legal-compliance-awareness",
] as const;

const mobileCourseCopy: Record<string, { title: string; description: string }> = {
  dui: { title: "음주운전", description: "음주 판단과 재운전 위험 예방" },
  "sexual-offense-prevention": { title: "성범죄", description: "동의와 경계 인식 개선" },
  "prostitution-prevention": { title: "성매매", description: "접근경로 차단과 재발 위험관리" },
  "digital-sexual-crime-prevention": { title: "디지털성범죄", description: "온라인 경계와 책임 행동 점검" },
  "violence-prevention": { title: "폭력범죄", description: "분노·충동 조절과 갈등 대처" },
  "fraud-prevention": { title: "사기", description: "거래 책임과 판단 기준 회복" },
  "voice-phishing-prevention": { title: "보이스피싱", description: "범죄 제안과 고위험 상황 차단" },
  "drug-rehab-prevention": { title: "마약", description: "재사용 위험관리와 회복 계획" },
  "gambling-relapse-prevention": { title: "도박", description: "도박 충동과 재발 위험 관리" },
  "digital-crime": { title: "디지털범죄", description: "온라인 행동과 디지털 위험관리" },
  "unlicensed-driving-prevention": { title: "무면허운전", description: "면허 확인과 차량 접근 차단" },
  "reckless-retaliatory-driving-prevention": { title: "난폭·보복운전", description: "운전 중 분노와 보복행동 예방" },
  "defamation-insult-prevention": { title: "악플·모욕·명예훼손", description: "감정적 표현 전 멈춤과 확인" },
  "hangover-driving-prevention": { title: "숙취운전", description: "전날 음주와 다음 날 운전 예방" },
  "legal-compliance-awareness": { title: "준법의식", description: "법규 준수와 생활 기준 점검" },
};

const mobileWritingTopics = [
  ["나의 위험상황", "언제, 누구와, 어떤 감정에서 같은 문제가 반복될 수 있는지 정리합니다."],
  ["같은 행동을 멈추는 방법", "혼자 판단하지 않고 피할 방법, 도움을 요청할 사람, 당장 할 행동을 정합니다."],
  ["앞으로 지킬 생활약속", "수료 후에도 확인할 수 있도록 짧고 구체적인 문장으로 남깁니다."],
] as const;

const mobileSteps = [
  ["회원가입", "회원가입 페이지에서 수강 계정을 만듭니다."],
  ["내 사건 유형 확인", "사건 유형에 맞는 교육과정을 확인합니다."],
  ["필요한 교육 수준 선택", "기본 수료·심화이수·심리상담 종합과정 중 선택합니다."],
  ["자료 즉시 출력 및 저장", "수료 후 수료증 등 자료를 즉시 출력하거나 PDF로 저장합니다."],
] as const;

function MobileSectionTitle({ title, body }: { title: string; body?: string }) {
  return (
    <div className="min-w-0">
      <h2 className="break-keep text-[24px] font-black leading-tight text-slate-950">{title}</h2>
      {body ? <p className="mt-2 break-keep text-[15px] font-semibold leading-6 text-slate-600">{body}</p> : null}
    </div>
  );
}

function MobileHomePage({ listedCourses, basicPrice, advancedPrice, counselingPrice }: { listedCourses: CourseCategory[]; basicPrice: string; advancedPrice: string; counselingPrice: string }) {
  const courseById = new Map(listedCourses.map((course) => [course.id, course]));
  const orderedCourses = mobileCourseOrder.map((id) => courseById.get(id)).filter((course): course is CourseCategory => Boolean(course));

  return (
    <main className="home-reskin home-reskin-mobile keep-korean min-h-screen scroll-smooth bg-[#f7f4ee] pb-[calc(88px+env(safe-area-inset-bottom))] text-slate-950 md:hidden">
      <section className="bg-[#f6f8fb] px-4 pb-8 pt-6">
        <div className="mx-auto max-w-[430px] border border-slate-200 bg-white px-5 py-7 shadow-[0_14px_34px_rgba(15,23,42,0.08)]">
          <p className="text-sm font-black text-[#173968]">온라인 재범방지교육 전문 교육기관</p>
          <p className="mt-3 break-keep text-[31px] font-black leading-[1.18] tracking-normal text-slate-950">사건 이후 필요한 재범방지교육,<br />온라인으로 준비하세요</p>
          <p className="mt-4 break-keep text-[15px] font-semibold leading-7 text-slate-700">사건 유형에 맞는 재범방지교육을 온라인으로 이수하고, 수료증과 재범방지계획서 등 과정별 양형자료를 함께 준비할 수 있습니다.</p>
          <p className="mt-4 break-keep text-lg font-black leading-7 text-slate-950">양형자료 준비에 꼭 수십만원씩 들여야 할까요?</p>
          <p className="mt-2 break-keep text-[15px] font-semibold leading-7 text-slate-700">교육 이수부터 수료증·재범방지계획서·실천계획서 등 <strong className="font-black text-[#173968]">핵심자료 하나하나 충실한 내용으로 함께 제공합니다.</strong></p>
          <p className="mt-4 w-fit border-l-4 border-[#173968] bg-[#eef4fb] px-3 py-2 text-sm font-black leading-6 text-[#173968]">교육 이수부터 양형자료 준비까지 한 번에</p>
          <div className="mt-5 grid gap-2 text-[15px] font-black leading-5 text-slate-950" aria-label="과정별 가격">
            <span className="rounded-xl border border-slate-200 bg-[#f8fafc] px-3 py-2">기본 수료 49,000원</span>
            <span className="border border-[#c8d4e6] bg-white px-3 py-2 text-[#173968]">심화이수과정 99,000원</span>
            <span className="border border-[#d3b271] bg-[#fffaf0] px-3 py-2 text-[#5f4514]">심리상담 종합 199,000원</span>
          </div>
          <div className="mt-5">
            <CourseRecommendation triggerLabel="나에게 맞는 교육 찾기" compact />
          </div>
          <p className="mt-3 text-center text-xs font-bold leading-5 text-slate-500">온라인 즉시 수강 · PC·모바일 수강 · 수료 후 PDF 발급</p>
        </div>
        <div className="mx-auto mt-4 max-w-[430px] border border-slate-200 bg-[#f6f8fb] p-4 shadow-[0_10px_26px_rgba(15,23,42,0.06)]">
          <p className="w-fit border-l-4 border-[#173968] bg-[#eef4fb] px-3 py-1.5 text-xs font-black leading-5 text-[#173968]">이용방법</p>
          <ol className="mt-3 grid gap-2.5">
            <li>
              <a href="/signup/" className="grid min-h-[58px] grid-cols-[3rem_1fr] items-center gap-3 border-2 border-[#173968] bg-white px-3 py-2.5 shadow-sm transition active:scale-[0.99]">
                <span className="flex h-10 w-10 items-center justify-center bg-[#173968] text-base font-black leading-none text-white">1</span>
                <p className="home-usage-step-title break-keep !text-[16px] !font-black !leading-6 text-slate-950">회원가입</p>
              </a>
            </li>
            <li>
              <a href="#mobile-course-grid" className="grid min-h-[58px] grid-cols-[3rem_1fr] items-center gap-3 border-2 border-[#173968] bg-white px-3 py-2.5 shadow-sm transition active:scale-[0.99]">
                <span className="flex h-10 w-10 items-center justify-center bg-[#173968] text-base font-black leading-none text-white">2</span>
                <p className="home-usage-step-title break-keep !text-[16px] !font-black !leading-6 text-slate-950">내 사건 유형 확인</p>
              </a>
            </li>
            <li>
              <a href="/courses/" className="grid min-h-[58px] grid-cols-[3rem_1fr] items-center gap-3 border-2 border-[#173968] bg-white px-3 py-2.5 shadow-sm transition active:scale-[0.99]">
                <span className="flex h-10 w-10 items-center justify-center bg-[#173968] text-base font-black leading-none text-white">3</span>
                <p className="home-usage-step-title break-keep !text-[16px] !font-black !leading-6 text-slate-950">필요한 교육 수준 선택</p>
              </a>
            </li>
            <li className="grid min-h-[58px] grid-cols-[3rem_1fr] items-center gap-3 border-2 border-[#d3b271] bg-[#fffaf0] px-3 py-2.5 shadow-sm">
              <span className="flex h-10 w-10 items-center justify-center bg-[#5f4514] text-base font-black leading-none text-white">4</span>
              <p className="home-usage-step-title break-keep !text-[16px] !font-black !leading-6 text-slate-950">수료 후 수료증 등 자료 즉시 출력 및 PDF 저장</p>
            </li>
          </ol>
        </div>
      </section>

      <section id="mobile-course-grid" className="scroll-mt-20 bg-[#f7f4ee] px-4 py-9">
        <MobileSectionTitle title="어떤 교육이 필요하신가요?" body="내 사건 유형에 맞는 교육을 먼저 확인하세요." />
        <div className="mt-5 grid grid-cols-2 gap-3">
          {orderedCourses.map((course) => {
            const visual = courseVisuals[course.id] || { label: course.shortTitle, imageSrc: "/images/resetedu-logo-mark.png" };
            const copy = mobileCourseCopy[course.id] || { title: course.shortTitle, description: course.summary };
            return (
              <Link key={course.slug} href={"/courses/" + course.slug} className="group relative flex min-h-[154px] flex-col border border-slate-200 bg-white p-3.5 shadow-sm transition active:scale-[0.99] active:border-[#173968]">
                <div className="flex h-[68px] w-[68px] items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                  <img src={visual.imageSrc} alt={copy.title + " 교육 아이콘"} width={72} height={72} loading="lazy" decoding="async" className={getCourseImageClass(visual.imageSrc)} />
                </div>
                <h3 className="mt-3 break-keep text-[17px] font-black leading-6 text-slate-950">{copy.title}</h3>
                <p className="mt-1 line-clamp-2 break-keep pr-3 text-[12.5px] font-semibold leading-5 text-slate-600">{copy.description}</p>
                <span className="absolute bottom-3 right-3 text-xl font-black text-slate-400 transition group-active:text-[#173968]" aria-hidden="true">›</span>
              </Link>
            );
          })}
          <Link href="/courses" className="relative flex min-h-[154px] flex-col justify-center border border-slate-300 bg-white p-3.5 shadow-sm transition active:scale-[0.99] active:border-[#173968]">
            <div className="flex h-[68px] w-[68px] items-center justify-center rounded-lg border border-slate-200 bg-[#eef4fb] text-3xl font-black text-[#173968]">≡</div>
            <h3 className="mt-3 text-[17px] font-black leading-6 text-slate-950">전체 교육과정</h3>
            <p className="mt-1 text-[12.5px] font-semibold leading-5 text-slate-600">과정 한 번에 보기</p>
            <span className="absolute bottom-3 right-3 text-xl font-black text-slate-400" aria-hidden="true">›</span>
          </Link>
        </div>
        <Link href="/courses" className="mx-auto mt-5 flex min-h-11 w-fit items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-black text-slate-950">전체 교육과정 보기</Link>
      </section>

      <section className="bg-white px-4 py-9">
        <MobileSectionTitle title="기본 수료·심화이수·심리상담 종합과정" body="가격과 제공 구성을 비교한 뒤 필요한 과정을 선택하세요." />
        <div className="mt-5 grid gap-4">
          <Link href="/courses" className="group flex min-h-full flex-col rounded-[1.25rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#176b68] hover:shadow-[0_18px_45px_rgba(15,23,42,0.12)] focus:outline-none focus:ring-4 focus:ring-[#176b68]/20">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.12em] text-[#176b68]">기본 수료과정</p>
                <h3 className="mt-2 break-keep text-2xl font-black leading-snug text-slate-950">기본 수료과정</h3>
              </div>
              <span className="w-fit rounded-full border border-[#176b68]/20 bg-slate-50 px-3 py-1.5 text-sm font-black text-[#176b68]">기본 수료자료 과정</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-sm font-black text-slate-700"><span className="rounded-full bg-slate-100 px-3 py-1.5">온라인 수강</span><span className="rounded-full bg-slate-100 px-3 py-1.5">수료자료 발급</span></div>
            <p className="mt-4 text-[34px] font-black leading-none tracking-tight text-slate-950 min-[380px]:text-[38px]">{basicPrice}</p>
            <p className="mt-3 break-keep text-base font-bold leading-7 text-slate-700">교육 이수 및 기본 재범방지자료가 필요한 경우</p>
            <div className="mt-5 flex-1">
              <p className="text-lg font-black text-slate-950">포함 구성</p>
              <p className="mt-2 break-keep text-base font-semibold leading-7 text-slate-800">수료증 · 재발방지계획서 · 실천계획서 · 서약서 등</p>
            </div>
            <span className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[#F9D84A] px-3 text-center text-base font-black leading-5 !text-black transition hover:!text-black group-hover:border-[#176b68]">기본 수료과정 보기</span>
          </Link>
          <Link href="/courses" className="group flex min-h-full flex-col rounded-[1.25rem] border-2 border-[#173968] bg-white p-5 shadow-[0_18px_45px_rgba(23,57,104,0.12)] transition hover:-translate-y-0.5 hover:shadow-[0_28px_65px_rgba(23,57,104,0.22)] focus:outline-none focus:ring-4 focus:ring-[#173968]/20">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.12em] text-[#176b68]">심화이수과정</p>
                <h3 className="mt-2 break-keep text-2xl font-black leading-snug text-slate-950">심화이수과정</h3>
              </div>
              <span className="w-fit rounded-full bg-[#173968] px-3 py-1.5 text-sm font-black text-white">가장 많이 선택</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-sm font-black text-slate-700"><span className="rounded-full bg-slate-100 px-3 py-1.5">온라인 수강</span><span className="rounded-full bg-slate-100 px-3 py-1.5">수료자료 발급</span></div>
            <p className="mt-3 break-keep text-sm font-black leading-5 text-slate-500">기본과정보다 교육과 이수자료를 더 충실하게 준비하는 과정</p>
            <p className="mt-4 text-[34px] font-black leading-none tracking-tight text-[#173968] min-[380px]:text-[38px]">{advancedPrice}</p>
            <p className="mt-3 break-keep text-base font-bold leading-7 text-slate-700">기본 수료과정보다 교육내용과 이수 확인자료를 더 충실히 준비하고 싶은 경우</p>
            <div className="mt-5 flex-1">
              <p className="text-lg font-black text-slate-950">기본 수료과정보다 추가되는 구성</p>
              <p className="mt-2 break-keep text-base font-semibold leading-7 text-slate-800">기본 수료과정 전체 + <strong className="font-black text-[#173968]">인지행동기반 재범방지교육 / 이수증</strong> + <strong className="font-black text-[#173968]">교육이수 상세내역서</strong> + <strong className="font-black text-[#173968]">교육 소감문</strong></p>
            </div>
            <span className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[#2457C5] px-3 text-center text-base font-black leading-5 text-white transition group-hover:bg-[#10213f]">심화이수과정 보기</span>
          </Link>
          <Link href="/courses" className="group flex min-h-full flex-col rounded-[1.25rem] border-2 border-[#d3b271] bg-white p-5 shadow-[0_18px_45px_rgba(211,178,113,0.18)] transition hover:-translate-y-0.5 hover:shadow-[0_28px_65px_rgba(23,57,104,0.18)] focus:outline-none focus:ring-4 focus:ring-[#d3b271]/30">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.12em] text-[#176b68]">심리상담 종합과정</p>
                <h3 className="mt-2 break-keep text-2xl font-black leading-snug text-slate-950">심리상담 종합과정</h3>
              </div>
              <span className="w-fit rounded-full bg-[#d3b271] px-3 py-1.5 text-sm font-black text-slate-950">상위 과정</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-sm font-black text-slate-700"><span className="rounded-full bg-slate-100 px-3 py-1.5">온라인 수강</span><span className="rounded-full bg-slate-100 px-3 py-1.5">수료자료 발급</span><span className="rounded-full bg-[#fffaf0] px-3 py-1.5 text-[#5f4514]">유선 상담 가능</span></div>
            <p className="mt-4 text-[34px] font-black leading-none tracking-tight text-[#5f4514] min-[380px]:text-[38px]">{counselingPrice}</p>
            <p className="mt-3 break-keep text-base font-bold leading-7 text-slate-700">교육과 함께 개별 심리상담 및 상담 관련 자료까지 준비하고 싶은 경우</p>
            <div className="mt-5 flex-1">
              <p className="text-lg font-black text-slate-950">심화이수과정보다 추가되는 구성</p>
              <p className="mt-2 break-keep text-base font-semibold leading-7 text-slate-800">심화이수과정 전체 + <strong className="font-black text-[#b91c1c]">심리상담의견서</strong> + <strong className="font-black text-[#b91c1c]">상담기관 탄원서</strong></p>
              <p className="mt-2 break-keep text-sm font-black leading-6 text-[#b91c1c]">유선 상담 가능 · 1영업일 이내 개별 연락</p>
            </div>
            <span className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[#5f4514] px-3 text-center text-base font-black leading-5 text-white transition group-hover:bg-[#10213f]">상담과정 보기</span>
          </Link>
        </div>
      </section>

      <section className="bg-white px-4 py-9">
        <MobileSectionTitle title="과정에 따라 이런 자료를 준비할 수 있습니다" body="선택한 교육과정에 따라 수료증과 재범방지 실천자료, 교육이수 확인자료 등을 발급받을 수 있습니다." />
        <div className="mt-5 grid gap-3">
          <article className="rounded-[1.25rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#176b68] hover:shadow-[0_18px_45px_rgba(15,23,42,0.12)]">
            <p className="w-fit bg-slate-950 px-3 py-1 text-xs font-black text-white">기본 수료과정 제공자료</p>
            <p className="mt-3 break-keep text-sm font-black leading-6 text-slate-700">온라인 교육 이수 후 기본 재범방지 실천자료를 함께 확인하는 구성입니다.</p>
            <ul className="mt-3 grid gap-2 text-sm font-semibold leading-6 text-slate-700">
              {basicDocumentCards.map(([title]) => <li key={title} className="border border-slate-200 bg-[#f8fafc] px-3 py-2"><span className="font-black text-[#173968]">{title}</span></li>)}
            </ul>
          </article>
          <article className="rounded-[1.25rem] border-2 border-[#173968] bg-white p-5 shadow-[0_18px_45px_rgba(23,57,104,0.12)] transition hover:-translate-y-0.5 hover:shadow-[0_28px_65px_rgba(23,57,104,0.22)]">
            <p className="w-fit bg-[#173968] px-3 py-1 text-xs font-black text-white">심화이수과정 추가 제공자료</p>
            <p className="mt-3 break-keep text-sm font-black leading-6 text-[#173968]">심화이수과정은 기본 수료과정 제공자료를 모두 포함합니다.</p>
            <ul className="mt-3 grid gap-2 text-sm font-semibold leading-6 text-slate-700">
              {advancedDocumentCards.map(([title]) => <li key={title} className="rounded-xl border border-slate-200 bg-white px-3 py-2"><span className="font-black text-[#173968]">{title}</span></li>)}
            </ul>
          </article>
          <article className="rounded-[1.25rem] border-2 border-[#d3b271] bg-white p-5 shadow-[0_18px_45px_rgba(211,178,113,0.18)] transition hover:-translate-y-0.5 hover:shadow-[0_28px_65px_rgba(23,57,104,0.18)]">
            <p className="w-fit bg-[#d3b271] px-3 py-1 text-xs font-black text-slate-950">심리상담 종합과정 추가 제공자료</p>
            <p className="mt-3 break-keep text-sm font-black leading-6 text-[#5f4514]">심리상담 종합과정은 심화이수과정의 모든 자료를 포함합니다.</p>
            <ul className="mt-3 grid gap-2 text-sm font-semibold leading-6 text-slate-700">
              {counselingDocumentCards.map(([title]) => <li key={title} className="rounded-xl border border-[#d3b271]/60 bg-[#fffaf0] px-3 py-2"><span className="font-black text-[#b91c1c]">{title}</span></li>)}
            </ul>
          </article>
        </div>
        <MobileDocumentCarousel documents={documentSamples} />
        <p className="mt-4 text-center text-xs font-semibold leading-5 text-slate-500">과정에 따라 제공되는 자료가 다를 수 있습니다.</p>
        <Link href="/certificate" className="mx-auto mt-3 flex min-h-11 w-fit items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-black text-slate-950">제공자료 자세히 보기</Link>
      </section>

      <section className="bg-[#f2eee6] px-4 py-9">
        <MobileSectionTitle title="운영기관 정보" />
        <p className="mt-4 break-keep text-[15px] font-semibold leading-7 text-slate-700">리셋 재범방지교육센터는 보듬심리상담센터가 운영하는 민간 온라인 교육기관입니다. 운영기관과 자격, 상담 가능시간을 투명하게 안내합니다.</p>
        <dl className="mt-5 border border-slate-300 bg-white p-4">
          {operatorInfo.map(([label, value]) => (
            <div key={label} className="border-b border-slate-200 py-3 last:border-b-0">
              <dt className="text-sm font-black text-slate-950">{label}</dt>
              <dd className="mt-1 break-keep text-sm font-semibold leading-6 text-slate-600">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="bg-white px-4 py-9">
        <MobileSectionTitle title="리셋 교육의 특징" />
        <div className="mt-4 space-y-4 break-keep text-[15px] font-semibold leading-7 text-slate-700">
          <p>음주운전·폭력·성범죄·마약·도박·사기·무면허운전 등 사건 유형별 재범방지교육을 온라인으로 수강하고, 교육 수료 후 수료증과 재범방지 실천자료를 발급받을 수 있습니다.</p><p>단순히 많은 자료를 제공하는 것보다, 교육내용과 재범방지 노력이 충실하게 반영될 수 있도록 과정별 교육과 실천자료를 구성합니다.</p>
          <p>교육 수료증 및 재범방지 실천자료는 교육 참여와 재범방지를 위한 노력을 정리하는 자료로 활용할 수 있습니다. 다만 개별 사건에서의 제출 및 활용 결과는 사건과 제출기관의 판단에 따라 달라질 수 있습니다.</p>
        </div>
        <div className="mt-6 border border-slate-200 bg-white p-4">
          <h3 className="text-base font-black text-slate-950">교육에서는 이런 내용을 함께 정리합니다</h3>
          <div className="mt-3 grid gap-2.5">
            {mobileWritingTopics.map(([title, body], index) => (
              <details key={title} className="border border-slate-200 bg-[#f8fafc] p-3">
                <summary className="cursor-pointer break-keep text-sm font-black leading-6 text-slate-950">{index + 1}. {title}</summary>
                <p className="mt-2 break-keep text-sm font-semibold leading-6 text-slate-600">{body}</p>
              </details>
            ))}
          </div>
        </div>
        <div className="mt-4 border border-slate-200 bg-white p-4">
          <h3 className="text-base font-black text-slate-950">제공자료 상세</h3>
          <div className="mt-3 grid gap-2.5">
            {[...basicDocumentCards, ...advancedDocumentCards].map(([title, body]) => (
              <details key={title} className="border border-slate-200 bg-[#f8fafc] p-3">
                <summary className="cursor-pointer break-keep text-sm font-black leading-6 text-slate-950">{title}</summary>
                <p className="mt-2 break-keep text-sm font-semibold leading-6 text-slate-600">{body}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-9">
        <MobileSectionTitle title="이용방법" />
        <ol className="mt-5 grid gap-0">
          {mobileSteps.map(([title, body], index) => (
            <li key={title} className="grid grid-cols-[2.75rem_1fr] gap-3 border-l border-slate-200 pb-5 last:border-l-transparent last:pb-0">
              <span className="-ml-px flex h-9 w-9 items-center justify-center rounded-full bg-[#173968] text-xs font-black text-white">{String(index + 1).padStart(2, "0")}</span>
              <div className="pt-1">
                <h3 className="text-base font-black text-slate-950">{title}</h3>
                <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="bg-[#f7f4ee] px-4 py-9">
        <MobileSectionTitle title="FAQ" />
        <div className="mt-5 grid gap-3">
          {processFaqs.map(([question, answer]) => (
            <details key={question} className="border border-slate-200 bg-white p-4">
              <summary className="cursor-pointer break-keep text-base font-black leading-6 text-slate-950">{question}</summary>
              <p className="mt-3 break-keep text-sm font-semibold leading-7 text-slate-600">{answer}</p>
            </details>
          ))}
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-10px_28px_rgba(15,23,42,0.12)] backdrop-blur">
        <div className="mx-auto grid max-w-md grid-cols-[1fr_0.78fr] gap-2">
          <a href="#mobile-course-grid" className="flex min-h-11 w-full items-center justify-center rounded-lg bg-[#173968] px-3 text-[15px] font-black !text-white">교육과정 선택하기</a>
          <a href={siteInfo.supportPhoneHref} data-ga-event="customer_center_click" data-ga-location="mobile_sticky" className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-lg border border-[#173968] bg-white px-3 text-[15px] font-black text-[#173968]" aria-label="전화 문의하기">
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.08 4.18 2 2 0 0 1 4.06 2h3a2 2 0 0 1 2 1.72c.12.9.32 1.77.59 2.61a2 2 0 0 1-.45 2.11L8.09 9.55a16 16 0 0 0 6.36 6.36l1.11-1.11a2 2 0 0 1 2.11-.45c.84.27 1.71.47 2.61.59A2 2 0 0 1 22 16.92Z" /></svg>
            문의하기
          </a>
        </div>
      </div>
    </main>
  );
}

export default function HomePage() {
  const listedCourses = platformCourseCategories;
  const duiCourse = listedCourses.find((course) => course.id === "dui") || listedCourses[0];
  const { basic, advanced } = getMainProductPair(duiCourse);
  const basicPrice = formatApplicationKrw(basic?.price || 49000);
  const advancedPrice = formatApplicationKrw(advanced?.price || 99000);
  const counselingPrice = formatApplicationKrw(APPLICATION_PRICES.COUNSELING_COMPREHENSIVE);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd).replace(/</g, "\\u003c") }} />
      <IntentBanner defaultCategoryId="dui" />
      <MobileHomePage listedCourses={listedCourses} basicPrice={basicPrice} advancedPrice={advancedPrice} counselingPrice={counselingPrice} />
      <main className="home-reskin home-reskin-desktop hidden keep-korean min-h-screen bg-[#f7f4ee] text-slate-950 md:block">
        <section className="bg-[#f6f8fb] px-4 py-10 sm:px-5 md:py-12 lg:px-6 lg:py-14">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.72fr)] lg:items-stretch">
            <div className="flex min-w-0 flex-col justify-center">
              <p className="text-base font-black text-[#173968]">온라인 재범방지교육 전문 교육기관</p>
              <h1 className="mt-4 max-w-4xl break-keep text-5xl font-black leading-[1.12] tracking-normal text-slate-950 lg:text-[64px]">사건 이후 필요한 재범방지교육,<br />온라인으로 준비하세요</h1>
              <p className="mt-6 max-w-3xl break-keep text-xl font-semibold leading-9 text-slate-700">사건 유형에 맞는 재범방지교육을 온라인으로 이수하고, 수료증과 재범방지계획서 등 과정별 양형자료를 함께 준비할 수 있습니다.</p>
              <p className="mt-6 break-keep text-2xl font-black leading-8 text-slate-950">양형자료 준비에 꼭 수십만원씩 들여야 할까요?</p>
              <p className="mt-3 max-w-3xl break-keep text-lg font-semibold leading-8 text-slate-700">교육 이수부터 수료증·재범방지계획서·실천계획서 등 <strong className="font-black text-[#173968]">핵심자료 하나하나 충실한 내용으로 함께 제공합니다.</strong></p>
              <p className="mt-6 w-fit border-l-4 border-[#173968] bg-[#eef4fb] px-4 py-3 text-lg font-black text-[#173968]">교육 이수부터 양형자료 준비까지 한 번에</p>
              <div className="mt-7 flex flex-wrap gap-3 text-base font-black text-slate-950" aria-label="과정별 가격">
                <span className="border border-slate-300 bg-white px-4 py-3">기본 수료 49,000원</span>
                <span className="border border-[#c8d4e6] bg-white px-4 py-3 text-[#173968]">심화이수과정 99,000원</span>
                <span className="border border-[#d3b271] bg-[#fffaf0] px-4 py-3 text-[#5f4514]">심리상담 종합 199,000원</span>
              </div>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <CourseRecommendation triggerLabel="나에게 맞는 교육 찾기" />
                <p className="text-sm font-bold text-slate-500">온라인 즉시 수강 · PC·모바일 수강 · 수료 후 PDF 발급</p>
              </div>
            </div>
            <aside className="relative flex h-full flex-col justify-center overflow-hidden border border-slate-200 bg-[#f6f8fb] p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)] lg:p-7">
              <img src="/images/%EB%A6%AC%EC%85%8B%EC%97%90%EB%93%80%EC%84%BC%ED%84%B0%20%EB%A1%9C%EA%B3%A0%EB%A7%8C1.png" alt="" aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 h-[26rem] w-[26rem] -translate-x-1/2 -translate-y-1/2 select-none object-contain opacity-[0.08] lg:h-[32rem] lg:w-[32rem]" />
              <p className="relative z-10 w-fit border-l-4 border-[#173968] bg-[#eef4fb] px-3 py-2 text-sm font-black leading-6 text-[#173968]">이용방법</p>
              <ol className="relative z-10 mt-5 grid gap-3">
                <li>
                  <a href="/signup/" className="grid min-h-[78px] grid-cols-[4rem_1fr] items-center gap-4 border-2 border-[#173968] bg-white px-4 py-3 shadow-sm transition hover:bg-[#f8fafc] focus:outline-none focus:ring-4 focus:ring-[#173968]/20">
                    <span className="flex h-12 w-12 items-center justify-center bg-[#173968] text-xl font-black leading-none text-white">1</span>
                    <p className="home-usage-step-title break-keep !text-[16px] !font-black !leading-6 text-slate-950">회원가입</p>
                  </a>
                </li>
                <li>
                  <a href="#courses" className="grid min-h-[78px] grid-cols-[4rem_1fr] items-center gap-4 border-2 border-[#173968] bg-[#f8fafc] px-4 py-3 shadow-sm transition hover:bg-white focus:outline-none focus:ring-4 focus:ring-[#173968]/20">
                    <span className="flex h-12 w-12 items-center justify-center bg-[#173968] text-xl font-black leading-none text-white">2</span>
                    <p className="home-usage-step-title break-keep !text-[16px] !font-black !leading-6 text-slate-950">내 사건 유형 확인</p>
                  </a>
                </li>
                <li>
                  <a href="/courses/" className="grid min-h-[78px] grid-cols-[4rem_1fr] items-center gap-4 border-2 border-[#173968] bg-white px-4 py-3 shadow-sm transition hover:bg-[#f8fafc] focus:outline-none focus:ring-4 focus:ring-[#173968]/20">
                    <span className="flex h-12 w-12 items-center justify-center bg-[#173968] text-xl font-black leading-none text-white">3</span>
                    <p className="home-usage-step-title break-keep !text-[16px] !font-black !leading-6 text-slate-950">필요한 교육 수준 선택</p>
                  </a>
                </li>
                <li className="grid min-h-[78px] grid-cols-[4rem_1fr] items-center gap-4 border-2 border-[#d3b271] bg-[#fffaf0] px-4 py-3 shadow-sm">
                  <span className="flex h-12 w-12 items-center justify-center bg-[#5f4514] text-xl font-black leading-none text-white">4</span>
                  <p className="home-usage-step-title break-keep !text-[16px] !font-black !leading-6 text-slate-950">수료 후 수료증 등 자료 즉시 출력 및 PDF 저장</p>
                </li>
              </ol>
            </aside>
          </div>
        </section>

        <section id="courses" className="bg-[#f7f4ee] px-4 py-14 sm:px-6 md:py-20 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <SectionTitle title="어떤 교육이 필요하신가요?" body="내 사건 유형에 해당하는 교육을 먼저 확인하고, 상세보기에서 커리큘럼과 제공자료를 확인하세요." className="max-w-2xl" />
              <Link href="/courses" className="inline-flex min-h-12 w-full items-center justify-center border border-slate-400 bg-white px-5 text-base font-black text-slate-950 transition hover:border-[#173968] hover:bg-[#173968] hover:!text-white sm:w-auto">전체 과정 보기</Link>
            </div>
            <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {listedCourses.map((course) => <CourseCard key={course.slug} course={course} basicPrice={basicPrice} advancedPrice={advancedPrice} counselingPrice={counselingPrice} />)}
            </div>
          </div>
        </section>


        <section className="bg-[#f7f4ee] px-4 py-14 sm:px-6 md:py-20 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <SectionTitle title="기본 수료·심화이수·심리상담 종합과정 선택 기준" body="가격과 제공 구성을 비교한 뒤 필요한 과정을 선택하세요. 각 과정별 실제 제공자료와 기능은 기존 과정 구성 그대로 안내됩니다." className="max-w-3xl" />
            <div className="mt-8 grid gap-5 lg:grid-cols-3">
              {planChoiceCards.map((plan) => <PlanChoiceCard key={plan.title} plan={plan} />)}
            </div>
          </div>
        </section>

        <section id="documents" className="bg-white px-4 py-14 sm:px-6 md:py-20 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <SectionTitle title="과정에 따라 이런 자료를 준비할 수 있습니다" body="선택한 교육과정에 따라 수료증과 재범방지 실천자료, 교육이수 확인자료 등을 발급받을 수 있습니다." className="max-w-3xl" />
            <div className="mt-8 grid gap-5 lg:grid-cols-3">
              <aside className="border border-slate-200 bg-white p-5 shadow-sm">
                <p className="w-fit bg-slate-950 px-3 py-1.5 text-sm font-black text-white">기본 수료과정 제공자료</p>
                <p className="mt-4 break-keep text-base font-black leading-7 text-slate-700">온라인 교육 이수 후 기본 재범방지 실천자료를 함께 확인하는 구성입니다.</p>
                <div className="mt-4 grid gap-3">
                  {basicDocumentCards.map(([title, body]) => <article key={title} className="border border-slate-200 bg-[#f8fafc] p-4"><p className="text-xl font-black text-[#173968]">{title}</p><p className="mt-2 break-keep text-base leading-7 text-slate-700">{body}</p></article>)}
                </div>
              </aside>
              <aside className="border-2 border-[#173968] bg-white p-5 shadow-[0_18px_45px_rgba(23,57,104,0.10)]">
                <p className="w-fit bg-[#173968] px-3 py-1.5 text-sm font-black text-white">심화이수과정 추가 제공자료</p>
                <p className="mt-4 break-keep text-base font-black leading-7 text-[#173968]">심화이수과정은 기본 수료과정 제공자료를 모두 포함합니다.</p>
                <div className="mt-4 grid gap-3">
                  {advancedDocumentCards.map(([title, body]) => <article key={title} className="border border-slate-200 bg-white p-4"><p className="text-xl font-black text-[#173968]">{title}</p><p className="mt-2 break-keep text-base leading-7 text-slate-700">{body}</p></article>)}
                </div>
              </aside>
              <aside className="border-2 border-[#d3b271] bg-white p-5 shadow-[0_18px_45px_rgba(211,178,113,0.14)]">
                <p className="w-fit bg-[#d3b271] px-3 py-1.5 text-sm font-black text-slate-950">심리상담 종합과정 추가 제공자료</p>
                <p className="mt-4 break-keep text-base font-black leading-7 text-[#5f4514]">심리상담 종합과정은 심화이수과정의 모든 자료를 포함합니다.</p>
                <div className="mt-4 grid gap-3">
                  {counselingDocumentCards.map(([title, body]) => <article key={title} className="border border-[#d3b271]/60 bg-[#fffaf0] p-4"><p className="text-xl font-black text-[#b91c1c]">{title}</p><p className="mt-2 break-keep text-base font-semibold leading-7 text-slate-700">{body}</p></article>)}
                </div>
                <div className="mt-4 rounded-xl border border-[#d3b271] bg-[#fffaf0] p-4">
                  <p className="break-keep text-base font-black leading-7 text-[#5f4514]">심화이수과정의 모든 자료를 포함하고, 유선 심리상담으로 개인의 상황과 변화 과정을 구체적으로 정리해드립니다.</p>
                  <p className="mt-3 text-sm font-black text-slate-950">상담 진행 안내</p>
                  <p className="mt-2 break-keep text-sm font-bold leading-6 text-[#5f4514]">결제 완료 후 <strong className="font-black text-[#b91c1c]">1영업일 이내 담당 심리상담사가 개별 연락드립니다.</strong></p>
                  <p className="mt-2 break-keep text-sm font-bold leading-6 text-[#b91c1c]">상담은 별도 방문 없이 유선으로도 진행 가능합니다.</p>
                  <p className="mt-2 break-keep text-sm font-semibold leading-6 text-slate-700">사건 경위, 현재 상황, 재발 위험요인, 생활환경 및 향후 실천계획 등을 상담으로 확인하며, <strong className="font-black text-slate-950">심리상담의견서 및 상담기관 탄원서</strong>는 상담 및 종합평가 내용을 바탕으로 작성됩니다.</p>
                </div>
              </aside>
            </div>
            <DocumentDesk />
          </div>
        </section>

        <section className="bg-[#f2eee6] px-4 py-14 sm:px-6 md:py-20 lg:px-8"><div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(320px,0.8fr)]"><div><SectionTitle title="리셋 교육의 특징과 운영기관" /><div className="mt-6 max-w-3xl space-y-5 break-keep text-base leading-8 text-slate-700 sm:text-lg sm:leading-9"><p>리셋 재범방지교육센터는 보듬심리상담센터가 운영하는 민간 온라인 교육기관입니다.</p><p>교육생이 단순히 영상을 재생하고 수료증만 받는 것이 아니라, 교육내용을 이해하고 자신의 생활에 적용할 수 있도록 과정과 실천자료를 함께 구성하고 있습니다.</p><p>단순히 많은 자료를 제공하는 것보다, 교육내용과 재범방지 노력이 충실하게 반영될 수 있도록 과정별 교육과 실천자료를 구성합니다.</p><p>이용 중 어려움이 있거나 발급자료에 문제가 있는 경우 고객센터에서 직접 확인해 드립니다.</p></div><div className="mt-8 flex flex-col gap-3 sm:flex-row"><Link href="/courses" className={buttonClass("primary", "lg", "rounded-lg px-6 font-black shadow-none")}>수강 신청하기</Link><Link href="/about#support" className={buttonClass("secondary", "lg", "rounded-lg px-6 font-black shadow-none")}>고객센터 확인</Link></div></div><dl className="border border-slate-300 bg-white p-5 sm:p-6">{operatorInfo.map(([label, value]) => <div key={label} className="grid gap-1 border-b border-slate-200 py-3 last:border-b-0 sm:grid-cols-[8.5rem_1fr]"><dt className="text-base font-black text-slate-950">{label}</dt><dd className="text-base leading-7 text-slate-700">{value}</dd></div>)}</dl></div></section>
        <section id="process" className="bg-white px-4 py-14 sm:px-6 md:py-20 lg:px-8"><div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]"><div><SectionTitle title="이용절차" body="신청부터 자료 확인까지 한 번의 절차로 안내합니다." /><ol className="mt-7 space-y-5">{useSteps.map(([title, body], index) => <li key={title} className="grid grid-cols-[2.75rem_1fr] gap-4 border-t border-slate-200 pt-5"><span className="text-base font-black text-[#176b68]">{index + 1}.</span><div><h3 className="text-lg font-black text-slate-950">{title}</h3><p className="mt-1 break-keep text-base leading-7 text-slate-700">{body}</p></div></li>)}</ol></div><div><SectionTitle title="FAQ" /><div className="mt-7 grid gap-3">{processFaqs.map(([question, answer]) => <details key={question} className="border border-slate-200 bg-white p-5"><summary className="cursor-pointer break-keep text-lg font-black leading-7 text-slate-950">{question}</summary><p className="mt-3 break-keep text-base leading-8 text-slate-700">{answer}</p></details>)}</div></div></div></section>

      </main>
    </>
  );
}
