import type { Metadata } from "next";
import Link from "next/link";
import AuthAwareSampleLink from "@/app/components/auth-aware-sample-link";
import { buttonClass } from "@/app/components/ui/button-styles";
import { basicApplicationProduct, duiDocumentsApplicationProduct, duiCbtAdvancedApplicationProduct } from "@/lib/course/application-products";
import type { DocumentPreviewItem } from "@/app/components/document-preview-gallery";

export const metadata: Metadata = {
  title: "양형자료 준비를 돕는 온라인 예방교육 | Reset Edu Center",
  description: "음주운전 사건 이후 필요한 온라인 예방교육 수료증, 교육 이수 확인 자료, 재발방지계획서, 실천계획서, 서약서를 한 번에 준비하세요.",
  alternates: { canonical: "/" },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Reset Edu Center",
  url: "https://resetedu.kr/",
};

const applyHref = "/courses/apply?category=dui&productId=dui-documents";
const basicApplyHref = "/courses/apply?category=dui";
const homePricingCards = [
  {
    product: basicApplicationProduct,
    href: basicApplyHref,
    title: "기본과정",
    price: "59,000원",
    description: "예방교육과 기본 이수자료가 필요한 분을 위한 과정입니다.",
    includes: ["온라인 예방교육", "기본 교육 이수증", "반성문 작성 가이드"],
    buttonLabel: "기본과정 수강하기",
    tone: "basic",
  },
  {
    product: duiDocumentsApplicationProduct,
    href: "/courses/apply?category=dui&productId=dui-documents",
    title: "자료포함과정",
    price: "109,000원",
    description: "교육과 함께 반성 및 재발방지 노력을 양형자료 형태로 정리하려는 분을 위한 과정입니다.",
    includes: ["기본과정 전체", "재범방지계획서", "금주실천서약서", "위험상황 대처계획서", "자료 작성 가이드"],
    buttonLabel: "자료포함과정 수강하기",
    badge: "가장 많이 선택하는 과정",
    tone: "recommended",
  },
  {
    product: duiCbtAdvancedApplicationProduct,
    href: "/courses/apply?category=dui&productId=dui-cbt-advanced",
    title: "심화과정",
    price: "290,000원",
    description: "사고와 행동의 변화까지 심화 학습하고, 교육 이수 내역을 보다 구체적으로 정리하는 종합과정입니다.",
    includes: ["자료포함과정 전체", "인지행동 기반 재범방지교육", "인지행동 기반 재범방지교육 이수증", "재범방지교육 상세내역서"],
    buttonLabel: "심화과정 수강하기",
    badge: "심화교육 포함",
    tone: "advanced",
  },
];

function Icon({ name, className = "h-6 w-6" }: { name: string; className?: string }) {
  const common = { className: className + " fill-none stroke-current", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, viewBox: "0 0 24 24", "aria-hidden": true };
  if (name === "car") return <svg {...common}><path d="M5 16l1.5-5A3 3 0 0 1 9.4 8h5.2a3 3 0 0 1 2.9 3L19 16" /><path d="M6.5 16h11" /><circle cx="8" cy="17" r="1.5" /><circle cx="16" cy="17" r="1.5" /></svg>;
  if (name === "file") return <svg {...common}><path d="M7 3h7l5 5v13H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" /><path d="M14 3v5h5" /><path d="M9 14h6M9 17h4" /></svg>;
  if (name === "check") return <svg {...common}><path d="m5 12 4 4L19 6" /></svg>;
  if (name === "clock") return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>;
  if (name === "lock") return <svg {...common}><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V8a4 4 0 0 1 8 0v2" /></svg>;
  return <svg {...common}><path d="M12 3 19 7v5c0 4-2.8 7.2-7 9-4.2-1.8-7-5-7-9V7l7-4Z" /><path d="m8.8 12.2 2 2 4.5-4.7" /></svg>;
}

const materials = [
  ["수료증", "교육 이수 사실을 바로 확인할 수 있습니다."],
  ["교육 이수 확인 자료", "수강 기록과 이수 여부를 체계적으로 정리합니다."],
  ["재발방지계획서", "생활 변화 계획을 직접 작성할 수 있습니다."],
  ["음주예방실천계획서", "음주 관리와 실천 방향을 구체화합니다."],
  ["서약서", "재발방지 의지를 문서로 남길 수 있습니다."],
];

const homeDocumentSamples: DocumentPreviewItem[] = [
  {
    id: "home-basic-certificate",
    title: "교육수료증",
    products: ["기본과정", "자료포함과정", "심화과정"],
    statusLabel: "샘플",
    description: "",
    imageSrc: "/images/document-samples/basic-certificate-sample.jpg",
  },
  {
    id: "home-advanced-certificate",
    title: "인지행동기반 재발방지교육 수료증",
    products: ["심화과정"],
    statusLabel: "샘플",
    description: "",
    imageSrc: "/images/document-samples/cognitive-prevention-certificate-sample.jpg",
  },
  {
    id: "home-dui-prevention-sample-1",
    title: "음주재발방지 실천계획서",
    products: ["자료포함과정", "심화과정"],
    statusLabel: "샘플",
    description: "",
    imageSrc: "/images/document-samples/sobriety-pledge-sample.jpg",
  },
  {
    id: "home-dui-prevention-sample-2",
    title: "음주운전 재발방지 서약서",
    products: ["자료포함과정", "심화과정"],
    statusLabel: "샘플",
    description: "",
    imageSrc: "/images/document-samples/risk-response-plan-sample.jpg",
  },
  {
    id: "home-prevention-plan-sample",
    title: "재발방지계획서",
    products: ["자료포함과정", "심화과정"],
    statusLabel: "샘플",
    description: "",
    imageSrc: "/images/document-samples/prevention-plan-sample.jpg",
  },
];

const homeCertificateSamples = homeDocumentSamples.slice(0, 2);
const homePreventionSamples = homeDocumentSamples.slice(2);


const targetUsers = [
  "양형자료 준비를 어디서 시작해야 할지 막막한 분",
  "교육 수료증과 이수 기록을 빠르게 갖추고 싶은 분",
  "재발방지계획서를 본인 상황에 맞게 직접 작성하려는 분",
  "반성문 외에 실제 실천자료까지 준비하려는 분",
  "사건 이후 변화 의지를 정리해 보여주고 싶은 분",
];

const steps = [
  ["과정 확인", "현재 운영 중인 음주운전 예방교육과 제공 자료를 확인합니다."],
  ["상품 선택", "수료증 중심 과정 또는 재발방지 서식 포함 과정을 선택합니다."],
  ["온라인 수강", "결제 후 내 강의실에서 바로 온라인 수강을 시작합니다."],
  ["자료 정리", "수료증과 참고자료를 확인하고 필요한 자료를 출력합니다."],
];

function SectionTitle({ eyebrow, title, body }: { eyebrow: string; title: string; body?: string }) {
  return <div className="keep-korean max-w-3xl min-w-0"><p className="text-xs font-bold uppercase tracking-[0.14em] text-indigo-700">{eyebrow}</p><h2 className="mt-2 text-2xl font-black leading-tight text-slate-950 sm:text-3xl">{title}</h2>{body ? <p className="mt-3 text-sm leading-7 text-slate-700 sm:text-base">{body}</p> : null}</div>;
}

export default function HomePage() {
  return (
    <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd).replace(/</g, "\u003c") }} /><main className="keep-korean min-h-screen bg-slate-50 text-slate-950">
      <section className="relative overflow-hidden bg-[#eef4f8]">
        <div className="absolute inset-x-0 top-0 h-24 bg-white" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[minmax(0,0.92fr)_minmax(480px,1.08fr)] lg:px-8 lg:py-20">
          <div className="flex min-w-0 flex-col justify-center">
            <p className="text-sm font-black leading-6 text-[#173968]">사건 이후의 반성과 재발방지 노력을 체계적인 양형자료로 준비하세요</p>
            <h1 className="mt-5 max-w-3xl text-3xl font-black leading-tight text-slate-950 sm:text-5xl lg:text-[56px]">온라인 예방교육부터<br />양형자료 준비까지 한 번에</h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-slate-700 sm:text-lg">음주운전 사건 이후 필요한 예방교육을 온라인으로 수강하고, 교육 이수증과 재발방지 실천자료를 통해 반성과 변화의 노력을 체계적으로 정리할 수 있습니다.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="#pricing" className={buttonClass("primary", "lg", "whitespace-nowrap rounded-full px-7 font-black")}>교육과정 확인하기</Link>
              <Link href="#sample-documents" className={buttonClass("secondary", "lg", "w-full rounded-full border-[#173968] bg-white px-7 font-bold !text-[#173968] hover:!text-[#10213f] sm:w-auto")}>제공 자료 미리보기</Link>
            </div>
            <div className="mt-10 grid gap-3 sm:grid-cols-3">
              {["PC·모바일 수강 가능", "전체 강의 이수 후 이수증 발급", "안전한 결제 및 개인정보 보호"].map((item) => (
                <div key={item} className="flex min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black leading-6 text-slate-800 shadow-sm">
                  <Icon name="check" className="h-5 w-5 shrink-0 text-[#173968]" />
                  <span className="min-w-0">{item}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="relative min-h-[520px] lg:min-h-[610px]">
            <div className="absolute left-0 right-5 top-8 rounded-[1.25rem] border border-slate-300 bg-slate-950 p-2 shadow-[0_28px_70px_rgba(15,23,42,0.24)]">
              <div className="rounded-xl bg-white">
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                  <div className="flex gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-rose-400" /><span className="h-2.5 w-2.5 rounded-full bg-amber-400" /><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /></div>
                  <p className="text-xs font-black text-slate-500">Reset Edu Online Classroom</p>
                </div>
                <div className="grid gap-4 p-4 sm:grid-cols-[1.25fr_0.75fr]">
                  <div className="overflow-hidden rounded-xl bg-slate-900">
                    <div className="flex aspect-video items-center justify-center bg-[linear-gradient(135deg,#173968,#1f7668)]">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/95 text-[#173968] shadow-lg">
                        <svg className="h-7 w-7 fill-current" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
                      </div>
                    </div>
                    <div className="space-y-3 p-4">
                      <div className="h-3 w-4/5 rounded-full bg-white/80" />
                      <div className="h-2 w-2/3 rounded-full bg-white/35" />
                      <div className="h-2 rounded-full bg-white/20"><div className="h-2 w-full rounded-full bg-[#f7d9a0]" /></div>
                    </div>
                  </div>
                  <div className="grid content-between gap-3">
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                      <p className="text-xs font-black text-emerald-800">학습 진도율</p>
                      <p className="mt-2 text-4xl font-black text-emerald-900">100%</p>
                      <p className="mt-1 text-sm font-bold text-emerald-800">교육 이수 완료</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs font-black text-slate-500">다음 단계</p>
                      <div className="mt-3 space-y-2 text-sm font-bold text-slate-800">
                        <p className="flex items-center gap-2"><Icon name="check" className="h-4 w-4 text-[#173968]" />이수증 발급</p>
                        <p className="flex items-center gap-2"><Icon name="check" className="h-4 w-4 text-[#173968]" />실천자료 정리</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute bottom-9 left-4 w-[39%] max-w-[220px] rounded-[1.4rem] border-[8px] border-slate-950 bg-white shadow-[0_22px_52px_rgba(15,23,42,0.22)]">
              <div className="rounded-[0.9rem] bg-white p-3">
                <p className="text-xs font-black text-slate-500">모바일 수강</p>
                <div className="mt-3 rounded-lg bg-slate-900 p-2">
                  <div className="aspect-[9/12] rounded-md bg-[linear-gradient(145deg,#173968,#4f8f83)]" />
                </div>
                <div className="mt-3 h-2 rounded-full bg-slate-200"><div className="h-2 w-full rounded-full bg-emerald-500" /></div>
                <p className="mt-2 text-xs font-black text-emerald-700">이수 완료</p>
              </div>
            </div>
            <div className="absolute bottom-0 right-0 grid w-[62%] gap-3 sm:grid-cols-2">
              <div className="overflow-hidden rounded-xl border border-[#d6bd7d] bg-white shadow-[0_18px_42px_rgba(95,69,20,0.16)]">
                <div className="h-32 bg-white sm:h-40">
                  <img src="/images/document-samples/basic-certificate-sample.jpg" alt="교육 이수증 일부 미리보기" className="h-full w-full object-contain object-top p-2" />
                </div>
                <p className="border-t border-slate-200 px-3 py-2 text-xs font-black text-slate-800">교육 이수증</p>
              </div>
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_18px_42px_rgba(15,23,42,0.12)]">
                <div className="h-32 bg-white sm:h-40">
                  <img src="/images/document-samples/prevention-plan-sample.jpg" alt="재범방지계획서 일부 미리보기" className="h-full w-full object-contain object-top p-2" />
                </div>
                <p className="border-t border-slate-200 px-3 py-2 text-xs font-black text-slate-800">재범방지계획서</p>
              </div>
            </div>
          </div>
        </div>
      </section>


      <section id="materials" className="px-4 py-20 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl"><SectionTitle eyebrow="Materials" title="수강 후 바로 확인하고 출력할 수 있는 자료" body="교육 수강과 함께 필요한 양형자료를 한곳에서 확인하고 PDF 저장 및 출력까지 진행할 수 있습니다." /><div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5">{materials.map(([title, body]) => <article key={title} className="min-w-0 rounded-[1.25rem] border border-slate-200 bg-white p-5 shadow-sm"><Icon name="file" className="h-7 w-7 text-indigo-700" /><h3 className="mt-4 text-base font-black leading-snug text-slate-950">{title}</h3><p className="mt-2 text-sm leading-relaxed text-slate-700">{body}</p></article>)}</div></div></section>

      <section id="sample-documents" className="bg-white px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mt-8 grid gap-5 lg:grid-cols-2">
            <div className="grid gap-5 sm:grid-cols-2">
              {homeCertificateSamples.map((sample) => (
                <AuthAwareSampleLink key={sample.id} href={sample.id === "home-basic-certificate" ? basicApplyHref : "/courses/apply?category=dui&productId=dui-cbt-advanced"} data-ga-event="click_enroll" data-ga-item-id={sample.id === "home-basic-certificate" ? "dui-basic" : "dui-cbt-advanced"} data-ga-item-name={sample.title} data-ga-location="home_sample_certificate" className="group block overflow-hidden rounded-[1.25rem] border-2 border-[#173968] bg-white shadow-[0_18px_50px_rgba(23,57,104,0.14)] transition hover:-translate-y-0.5 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-[#f7d9a0]">
                  <div className="relative h-[260px] bg-white sm:h-[340px] lg:h-[370px]">
                    <img src={sample.imageSrc} alt={sample.title + " 샘플"} className="h-full w-full object-contain object-center p-2" />
                    <span className="absolute left-4 top-4 rounded-full bg-[#173968] px-3 py-1 text-xs font-black text-white shadow-sm">샘플</span>
                  </div>
                  <div className="border-t border-slate-200 p-3 sm:p-4">
                    <h3 className="break-keep text-center text-lg font-black text-slate-950">{sample.title}</h3>
                    <span className={buttonClass("primary", "sm", "mt-3 w-full rounded-xl font-black !text-white hover:!text-white")}>{sample.id === "home-basic-certificate" ? "기본과정" : "심화과정"}</span>
                  </div>
                </AuthAwareSampleLink>
              ))}
            </div>
            <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-base font-black text-slate-950">재발방지 제공자료</h3>
              <div className="mt-4 grid grid-cols-3 gap-3">
                {homePreventionSamples.map((sample) => (
                  <article key={sample.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    <div className="relative h-28 bg-white sm:h-32 lg:h-36">
                      <img src={sample.imageSrc} alt={sample.title + " 샘플"} className="h-full w-full object-contain object-center p-2" />
                      <span className="absolute left-2 top-2 rounded-full bg-[#173968] px-2.5 py-1 text-[10px] font-black text-white shadow-sm">샘플</span>
                    </div>
                    <h4 className="break-keep border-t border-slate-200 px-3 py-2 text-center text-xs font-black leading-snug text-slate-900">{sample.title}</h4>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-20 sm:px-6 lg:px-8"><div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.85fr_1.15fr]"><SectionTitle eyebrow="Why It Matters" title="반성과 재발방지 노력을 구체적인 자료로 정리하세요" body="교육 이수 자료, 재발방지계획서, 실천계획서, 서약서를 함께 준비하면 사건 이후 어떤 노력을 하고 있는지 더 분명하게 보여줄 수 있습니다. 반성문 외에 추가 자료를 준비하려는 분에게 필요한 흐름을 제공합니다." /><div className="grid gap-3 sm:grid-cols-2">{targetUsers.map((item) => <div key={item} className="flex min-w-0 gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold leading-relaxed text-slate-800"><Icon name="check" className="h-5 w-5 shrink-0 text-indigo-700" /><span className="min-w-0">{item}</span></div>)}</div></div></section>

      <section id="pricing" className="bg-white px-4 py-20 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl"><SectionTitle eyebrow="Pricing" title="3가지 수강과정 중 필요한 범위를 선택하세요" body="가격, 포함 자료, 교육 범위를 한눈에 비교할 수 있도록 구성했습니다. 결제와 수강권 부여는 기존 상품 페이지로 연결됩니다." /><div className="mt-8 grid gap-5 lg:grid-cols-3">{homePricingCards.map(({ product, href, title, price, description, includes, buttonLabel, badge, tone }) => { const isRecommended = tone === "recommended"; const isAdvanced = tone === "advanced"; return <article key={product.id} className={isRecommended ? "relative rounded-[1.5rem] border-2 border-[#173968] bg-[#173968] p-6 text-white shadow-[0_22px_54px_rgba(23,57,104,0.22)]" : isAdvanced ? "relative rounded-[1.5rem] border border-[#9db7c8] bg-[#f7fbfc] p-6 shadow-sm" : "relative rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm"}>{badge ? <span className={isRecommended ? "inline-flex rounded-full bg-white px-3 py-1 text-xs font-black text-[#173968]" : "inline-flex rounded-full bg-[#173968] px-3 py-1 text-xs font-black text-white"}>{badge}</span> : <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">기본 이수자료</span>}<h3 className={isRecommended ? "mt-4 text-2xl font-black text-white" : "mt-4 text-2xl font-black text-slate-950"}>{title}</h3><p className={isRecommended ? "mt-3 text-4xl font-black text-white" : "mt-3 text-4xl font-black text-[#173968]"}>{price}</p><p className={isRecommended ? "mt-4 min-h-[84px] text-sm leading-7 text-slate-100" : "mt-4 min-h-[84px] text-sm leading-7 text-slate-700"}>{description}</p><div className={isRecommended ? "mt-5 border-t border-white/20 pt-5" : "mt-5 border-t border-slate-200 pt-5"}><p className={isRecommended ? "text-xs font-black uppercase tracking-[0.14em] text-slate-200" : "text-xs font-black uppercase tracking-[0.14em] text-slate-500"}>포함 항목</p><ul className={isRecommended ? "mt-4 space-y-2 text-sm font-semibold leading-6 text-white" : "mt-4 space-y-2 text-sm font-semibold leading-6 text-slate-800"}>{includes.map((item) => <li key={item} className="flex min-w-0 gap-2"><Icon name="check" className={isRecommended ? "h-5 w-5 shrink-0 text-[#f7d9a0]" : isAdvanced ? "h-5 w-5 shrink-0 text-[#1f7668]" : "h-5 w-5 shrink-0 text-[#173968]"} /><span className="min-w-0">{item}</span></li>)}</ul></div><Link href={href} data-ga-event="click_enroll" data-ga-item-id={product.id} data-ga-item-name={title} data-ga-location="home" style={isRecommended ? { backgroundColor: "#ffffff", color: "#111827", borderColor: "#ffffff" } : undefined} className={buttonClass(isRecommended ? "secondary" : "primary", "md", isRecommended ? "mt-6 w-full rounded-xl font-black !text-black hover:!text-black" : "mt-6 w-full rounded-xl font-black !text-white hover:!text-white")}>{buttonLabel}</Link></article>; })}</div><p className="mt-5 text-sm leading-7 text-slate-600">제출처에서 요구하는 자료는 사건과 절차에 따라 다를 수 있습니다. 별도 안내가 있다면 해당 안내를 먼저 확인하세요.</p></div></section>

      <section id="process" className="bg-slate-900 px-4 py-20 text-white sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl"><div className="keep-korean max-w-3xl min-w-0"><p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-300">Process</p><h2 className="mt-3 text-2xl font-black leading-tight text-white sm:text-4xl">결제부터 수강, 수료증 발급, 자료 출력까지 한 번에 진행하세요</h2><p className="mt-4 text-base leading-relaxed text-slate-200">PC 또는 모바일로 바로 수강하고, 교육 이수 후 필요한 자료를 확인해 저장하거나 출력할 수 있습니다.</p></div><div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">{steps.map(([title, body], index) => <article key={title} className="min-w-0 rounded-[1.25rem] border border-white/15 bg-white/10 p-5"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-sm font-black text-slate-950">{index + 1}</div><h3 className="mt-4 text-lg font-black text-white">{title}</h3><p className="mt-2 text-sm leading-relaxed text-slate-200">{body}</p></article>)}</div><div className="mt-8"><Link href={applyHref} data-ga-event="click_enroll" data-ga-item-id="dui-documents" data-ga-item-name="음주운전 예방교육" data-ga-location="home" className={buttonClass("primary", "lg", "whitespace-nowrap rounded-full px-7 font-black focus:ring-offset-slate-900")}>지금 수강하고 자료 준비하기</Link></div></div></section>

      <section className="bg-white px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 p-5 sm:flex-row sm:items-center sm:p-6">
          <div>
            <p className="text-sm font-black text-slate-950">수강권 선택, 결제, 출력자료 이용 문의</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">상담 가능 시간 안에 연락주시면 확인 후 안내드립니다.</p>
          </div>
          <a href="tel:010-7617-8619" className="inline-flex w-full items-center justify-center rounded-lg border border-[#173968] bg-[#173968] px-5 py-3 text-center text-base font-black leading-6 !text-white shadow-sm transition hover:bg-[#102a4d] hover:!text-white sm:w-auto sm:text-lg">
            고객센터 010-7617-8619 / 09:00~19:00까지 연락 가능
          </a>
        </div>
      </section>
    </main></>
  );
}
