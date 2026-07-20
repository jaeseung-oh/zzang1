import type { Metadata } from "next";
import Link from "next/link";
import { buttonClass } from "@/app/components/ui/button-styles";
import { formatApplicationKrw } from "@/lib/course/application-products";
import { getApplyHref, getMainProductPair, platformCourseCategories, type CourseCategory } from "@/lib/course/platform-courses";

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
  ["결제하면 바로 들을 수 있나요?", "네. 결제가 정상적으로 완료되면 마이페이지의 내 강의실에서 바로 수강할 수 있습니다."],
  ["휴대폰으로도 수강할 수 있나요?", "PC와 모바일 모두 이용할 수 있습니다. 다만 수료증이나 작성자료를 편집하고 출력할 때는 PC 이용이 조금 더 편리할 수 있습니다."],
  ["수료증은 언제 발급되나요?", "과정별 수료 기준을 충족하면 마이페이지에서 수료증을 즉시 발급하고 PDF로 저장하거나 출력할 수 있습니다."],
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
  "drug-rehab-prevention": {
    purpose: "재사용 위험상황과 갈망을 점검하고, 접근 차단과 도움 요청 계획을 세우는 과정입니다.",
    composition: "온라인 교육 및 수료증 등 제공자료 3종",
  },
  "digital-crime": {
    purpose: "온라인 행동과 위험한 디지털 사용 습관을 점검하고, 피해자 접촉 방지와 환경관리 계획을 세우는 과정입니다.",
    composition: "온라인 교육 및 수료증 등 제공자료 3종",
  },
};

const documentSamples = [
  { title: "교육 수료증", label: "대표 자료", imageSrc: "/images/%EC%88%98%EB%A3%8C%EC%A6%9D%20%EC%98%88%EC%8B%9C%20%EC%88%98%EC%A0%95%EB%B3%B8.jpg" },
  { title: "심화교육 이수증", imageSrc: "/images/document-samples/advanced-certificate-capture.jpg" },
  { title: "재범방지계획서", imageSrc: "/images/document-samples/prevention-plan-sample.jpg" },
  { title: "실천계획서", imageSrc: "/images/document-samples/risk-response-plan-sample.jpg" },
  { title: "서약서", imageSrc: "/images/document-samples/sobriety-pledge-sample.jpg" },
  { title: "이수 상세내역서", imageSrc: "/images/%EA%B5%90%EC%9C%A1%EC%9D%B4%EC%88%98%EC%83%81%EC%84%B8%EB%82%B4%EC%97%AD%EC%84%9C.jpg" },
] as const;

const operatorInfo = [
  ["운영기관명", "보듬심리상담센터"],
  ["대표자명", "홍경자"],
  ["사업자등록번호", "861-98-01454"],
  ["사업장 주소", "경기도 수원시 영통구 센트럴타운로 106, 145호"],
  ["고객센터", "010-7617-8619"],
  ["상담 가능 시간", "평일 10:00-18:00"],
] as const;

function SectionTitle({ title, body, className = "" }: { title: string; body?: string; className?: string }) {
  return (
    <div className={"keep-korean min-w-0 " + className}>
      <h2 className="text-2xl font-black leading-tight text-slate-950 sm:text-3xl">{title}</h2>
      {body ? <p className="mt-4 text-[15px] leading-7 text-slate-700 sm:text-base sm:leading-8">{body}</p> : null}
    </div>
  );
}

function CourseCard({ course, basicPrice, advancedPrice }: { course: CourseCategory; basicPrice: string; advancedPrice: string }) {
  const copy = courseCopy[course.id] || { purpose: course.summary, composition: "온라인 교육과 제공자료" };
  return (
    <article className="border-t border-slate-300 py-6 md:px-2">
      <h3 className="text-xl font-black leading-snug text-slate-950">{course.title}</h3>
      <p className="mt-3 text-[15px] leading-7 text-slate-700">{copy.purpose}</p>
      <dl className="mt-4 grid gap-2 text-sm leading-6 text-slate-700 sm:grid-cols-2">
        <div><dt className="font-bold text-slate-950">구성</dt><dd>{copy.composition}</dd></div>
        <div><dt className="font-bold text-slate-950">기본과정</dt><dd>{basicPrice}</dd><dt className="mt-2 font-bold text-slate-950">심화과정</dt><dd>{advancedPrice}</dd></div>
      </dl>
      <Link href={"/courses/" + course.slug} className="mt-5 inline-flex min-h-11 items-center border border-slate-400 bg-white px-4 text-sm font-black text-slate-950 transition hover:border-[#173968] hover:text-[#173968]">상세보기</Link>
    </article>
  );
}

function DocumentDesk() {
  const [primary, ...secondary] = documentSamples;
  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-start">
      <div className="bg-[#e9edf1] p-4 sm:p-6">
        <div className="border border-slate-200 bg-white p-3 shadow-[0_12px_30px_rgba(15,23,42,0.12)]">
          <img src={primary.imageSrc} alt={primary.title + " 예시"} className="aspect-[1/1.18] w-full bg-slate-50 object-contain sm:aspect-[4/3]" />
        </div>
        <div className="mt-4 flex items-center justify-between gap-3"><p className="text-sm font-black text-slate-950">{primary.title}</p><span className="border border-slate-300 bg-white px-3 py-1 text-xs font-bold text-slate-700">{primary.label}</span></div>
      </div>
      <div>
        <p className="max-w-xl text-[15px] leading-7 text-slate-700">과정에 따라 제공되는 자료가 다릅니다.<br />샘플을 먼저 확인한 뒤 필요한 과정을 선택해 주세요.</p>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {secondary.map((sample) => (
            <div key={sample.title} className="bg-white">
              <div className="border border-slate-200 bg-slate-100 p-2"><img src={sample.imageSrc} alt={sample.title + " 예시"} className="aspect-[3/4] w-full object-cover object-top" /></div>
              <p className="mt-2 text-sm font-bold leading-5 text-slate-800">{sample.title}</p>
            </div>
          ))}
        </div>
        <Link href="/prevention-documents" className={buttonClass("secondary", "md", "mt-6 rounded-lg px-5 font-black shadow-none")}>실제 제공자료 확인하기</Link>
      </div>
    </div>
  );
}

export default function HomePage() {
  const listedCourses = platformCourseCategories;
  const duiCourse = listedCourses.find((course) => course.id === "dui") || listedCourses[0];
  const { basic, advanced } = getMainProductPair(duiCourse);
  const basicHref = getApplyHref(duiCourse, basic?.id);
  const advancedHref = getApplyHref(duiCourse, advanced?.id);
  const basicPrice = formatApplicationKrw(basic?.price || 49000);
  const advancedPrice = formatApplicationKrw(advanced?.price || 99000);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd).replace(/</g, "\\u003c") }} />
      <main className="keep-korean min-h-screen bg-[#f7f4ee] text-slate-950">
        <section className="bg-[#f6f8fb] px-5 py-14 sm:px-6 md:py-20 lg:px-8 lg:py-24">
          <div className="mx-auto grid max-w-[1200px] gap-10 lg:grid-cols-[minmax(0,660px)_minmax(300px,420px)] lg:items-center lg:justify-between">
            <div className="max-w-[660px]">
              <p className="text-[13px] font-semibold leading-[1.4] text-[#173968] sm:text-[15px]">양형자료 준비가 필요한 분을 위한 온라인 교육</p>
              <h1 className="mt-4 text-[clamp(32px,9vw,40px)] font-[750] leading-[1.18] text-slate-950 sm:text-[42px] sm:leading-[1.16] lg:text-[clamp(44px,5vw,64px)] lg:leading-[1.12]">
                양형자료는<br /><span className="text-[#173968]">단순한 서류의 개수가 아닙니다</span>
              </h1>
              <p className="mt-6 max-w-[620px] text-[18px] font-semibold leading-[1.5] text-slate-900 sm:text-[22px]">
                교육을 이수하고 변화하려는 과정을<br className="hidden sm:block" /> 구체적인 기록과 실천계획으로 남겨야 합니다.
              </p>
              <p className="mt-3.5 max-w-[640px] text-[15.5px] font-normal leading-[1.7] text-slate-700 sm:text-[17px] sm:leading-[1.75]">
                리셋 재범방지교육센터는 행동 원인을 돌아보고, 같은 잘못을 반복하지 않기 위한 실천계획을 세울 수 있도록 온라인 재범방지교육과 수료자료를 제공합니다.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link href={basicHref} data-ga-event="hero_course_apply_click" data-ga-location="homepage_hero" data-ga-item-id={basic?.id || "dui-documents"} data-ga-item-name="바로 교육 신청하기" className="inline-flex min-h-[52px] w-full items-center justify-center rounded-lg border-2 border-[#173968] bg-[#173968] px-[26px] text-base font-bold !text-white transition hover:bg-[#10213f] hover:!text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#173968]/25 focus-visible:ring-offset-2 sm:w-auto">바로 교육 신청하기</Link>
                <Link href="#documents" data-ga-event="hero_material_preview_click" data-ga-location="homepage_hero" data-ga-item-id="documents" data-ga-item-name="제공자료 미리보기" className="inline-flex min-h-[52px] w-full items-center justify-center rounded-lg border-2 border-slate-300 bg-white px-6 text-[15px] font-semibold text-slate-950 transition hover:border-slate-500 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-300 focus-visible:ring-offset-2 sm:w-auto">제공자료 미리보기</Link>
              </div>
              <p className="mt-[18px] max-w-[640px] text-[13px] font-medium leading-[1.6] text-slate-600 sm:text-sm sm:leading-[1.5]">온라인 수강 · 모바일 이용 · 수료증 PDF 발급<br className="sm:hidden" /> 기본 {basicPrice} · 심화 {advancedPrice}</p>
            </div>
            <div className="mt-2 hidden lg:block" aria-label="수료증과 실천자료 예시 미리보기">
              <div className="relative mx-auto h-[410px] max-w-[390px]">
                <img src="/images/document-samples/prevention-plan-sample.jpg" alt="재범방지계획서 예시" className="absolute left-0 top-16 h-[290px] w-[205px] border border-slate-200 bg-white object-cover object-top shadow-sm" />
                <img src="/images/document-samples/risk-response-plan-sample.jpg" alt="실천계획서 예시" className="absolute right-0 top-24 h-[270px] w-[190px] border border-slate-200 bg-white object-cover object-top shadow-sm" />
                <img src="/images/%EC%88%98%EB%A3%8C%EC%A6%9D%20%EC%98%88%EC%8B%9C%20%EC%88%98%EC%A0%95%EB%B3%B8.jpg" alt="리셋 재범방지교육센터 수료증 예시" className="absolute left-1/2 top-0 h-[360px] w-[255px] -translate-x-1/2 border border-slate-200 bg-white object-contain shadow-[0_18px_38px_rgba(15,23,42,0.12)]" />
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white px-4 py-14 sm:px-6 md:py-20 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(320px,0.72fr)] lg:items-center">
            <div>
              <SectionTitle title="서류보다 먼저 달라져야 하는 것이 있습니다" />
              <div className="mt-6 max-w-3xl space-y-5 text-[15px] leading-8 text-slate-700 sm:text-base">
                <p>교육 수료증과 재범방지 실천자료는 단순 첨부서류가 아니라, 교육 이수와 실천 노력을 함께 기록하는 자료입니다.</p>
                <p>같은 문제가 반복되지 않으려면 자신이 어떤 상황에서 잘못된 판단을 했는지부터 돌아봐야 합니다.</p>
                <p>리셋 재범방지교육센터의 교육은 잘못된 행동의 원인을 점검하고, 위험상황을 알아차리며, 실제 생활에서 지킬 수 있는 약속을 세우는 과정으로 구성되어 있습니다.</p>
                <p>수료증은 교육이 끝났다는 기록입니다. 교육의 목적은 그 이후의 행동을 바꾸는 데 있습니다.</p>
              </div>
            </div>
            <div className="bg-[#eef2f5] p-5"><div className="border border-slate-200 bg-white p-5"><p className="text-sm font-black text-slate-950">교육 중 작성하게 되는 내용</p><div className="mt-5 space-y-4 text-sm leading-7 text-slate-700">{[["위험상황", "언제, 누구와, 어떤 감정에서 같은 문제가 반복될 수 있는지 적어봅니다."], ["멈추는 방법", "혼자 판단하지 않고 피할 방법, 도움을 요청할 사람, 당장 할 행동을 정합니다."], ["생활 약속", "수료 후에도 확인할 수 있도록 짧고 구체적인 문장으로 남깁니다."]].map(([title, body]) => <div key={title} className="border-l-2 border-[#176b68] pl-4"><p className="font-bold text-slate-950">{title}</p><p>{body}</p></div>)}</div></div></div>
          </div>
        </section>

        <section id="courses" className="bg-[#f7f4ee] px-4 py-14 sm:px-6 md:py-20 lg:px-8">
          <div className="mx-auto max-w-7xl"><div className="grid gap-6 lg:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)]"><SectionTitle title="교육과정 선택" body="과정별 교육내용과 제공자료를 살펴본 뒤 필요한 과정을 선택합니다." /><div className="grid gap-x-8 md:grid-cols-2">{listedCourses.map((course) => <CourseCard key={course.slug} course={course} basicPrice={basicPrice} advancedPrice={advancedPrice} />)}</div></div></div>
        </section>

        <section id="documents" className="bg-white px-4 py-14 sm:px-6 md:py-20 lg:px-8"><div className="mx-auto max-w-7xl"><SectionTitle title="실제 제공자료 미리보기" body="수료증과 실천자료는 수강 후 마이페이지에서 확인합니다. 개인정보가 들어가는 부분은 실제 발급 시 수강자 정보에 맞춰 표시됩니다." className="max-w-3xl" /><DocumentDesk /></div></section>

        <section className="bg-[#f7f4ee] px-4 py-14 sm:px-6 md:py-20 lg:px-8">
          <div className="mx-auto max-w-7xl"><SectionTitle title="기본과정과 심화과정 비교" body="가격과 제공자료는 이 영역에서 한 번만 확인할 수 있도록 정리했습니다. 할인 표시 대신 현재 판매가격만 안내합니다." className="max-w-3xl" /><div className="mt-8 grid gap-5 lg:grid-cols-2">
            <Link href={basicHref} className="block border border-slate-300 bg-white p-6 transition hover:border-[#173968] focus:outline-none focus:ring-4 focus:ring-[#173968]/20 sm:p-7"><h3 className="text-2xl font-black text-slate-950">기본과정</h3><p className="mt-4 text-4xl font-black text-slate-950">{basicPrice}</p><p className="mt-5 max-w-xl text-[15px] leading-7 text-slate-700">교육 수료와 기본적인 재범방지 실천자료가 필요한 분을 위한 과정입니다.</p><p className="mt-6 font-black text-slate-950">포함 내용</p><ul className="mt-3 grid gap-2 text-sm leading-6 text-slate-700">{["온라인 예방교육", "교육 수료증", "재범방지계획서", "실천계획서", "서약서"].map((item) => <li key={item}>{item}</li>)}</ul><span className="mt-6 inline-flex min-h-11 items-center border border-slate-400 px-4 text-sm font-black text-slate-950">기본과정 신청</span></Link>
            <Link href={advancedHref} className="block border-2 border-[#173968] bg-white p-6 transition hover:bg-[#fbfcfd] focus:outline-none focus:ring-4 focus:ring-[#173968]/20 sm:p-7"><p className="w-fit bg-[#173968] px-3 py-1 text-xs font-black text-white">교육과 실천자료를 함께 준비하는 구성</p><h3 className="mt-4 text-2xl font-black text-slate-950">심화과정</h3><p className="mt-4 text-4xl font-black text-slate-950">{advancedPrice}</p><p className="mt-5 max-w-xl text-[15px] leading-7 text-slate-700">교육 이수내용과 재범방지 노력을 보다 구체적으로 정리하려는 분을 위한 과정입니다.</p><p className="mt-6 font-black text-slate-950">포함 내용</p><ul className="mt-3 grid gap-2 text-sm leading-6 text-slate-700">{["기본과정 전체", "인지행동 기반 심화교육", "심화 이수증", "교육 이수 상세내역서", "반성문 작성자료"].map((item) => <li key={item}>{item}</li>)}</ul><span className="mt-6 inline-flex min-h-11 items-center bg-[#173968] px-4 text-sm font-black text-white">심화과정 신청</span></Link>
          </div></div>
        </section>

        <section id="process" className="bg-white px-4 py-14 sm:px-6 md:py-20 lg:px-8"><div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]"><div><SectionTitle title="이용절차" body="신청부터 자료 확인까지 한 번의 절차로 안내합니다." /><ol className="mt-7 space-y-5">{useSteps.map(([title, body], index) => <li key={title} className="grid grid-cols-[2.5rem_1fr] gap-4 border-t border-slate-200 pt-5"><span className="text-sm font-black text-[#176b68]">{index + 1}.</span><div><h3 className="font-black text-slate-950">{title}</h3><p className="mt-1 text-sm leading-6 text-slate-700">{body}</p></div></li>)}</ol></div><div><SectionTitle title="FAQ" /><div className="mt-7 divide-y divide-slate-200 border-y border-slate-200">{processFaqs.map(([question, answer]) => <article key={question} className="py-5"><h3 className="font-black leading-6 text-slate-950">{question}</h3><p className="mt-2 text-sm leading-7 text-slate-700">{answer}</p></article>)}</div></div></div></section>

        <section className="bg-[#f2eee6] px-4 py-14 sm:px-6 md:py-20 lg:px-8"><div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(320px,0.8fr)]"><div><SectionTitle title="리셋 재범방지교육센터는 이렇게 운영합니다" /><div className="mt-6 max-w-3xl space-y-5 text-[15px] leading-8 text-slate-700 sm:text-base"><p>리셋 재범방지교육센터는 보듬심리상담센터가 운영하는 민간 온라인 교육기관입니다.</p><p>교육생이 단순히 영상을 재생하고 수료증만 받는 것이 아니라, 교육내용을 이해하고 자신의 생활에 적용할 수 있도록 과정과 실천자료를 함께 구성하고 있습니다.</p><p>이용 중 어려움이 있거나 발급자료에 문제가 있는 경우 고객센터에서 직접 확인해 드립니다.</p></div><div className="mt-8 flex flex-col gap-3 sm:flex-row"><Link href={advancedHref} className={buttonClass("primary", "lg", "rounded-lg px-6 font-black shadow-none")}>수강 신청하기</Link><Link href="/about#support" className={buttonClass("secondary", "lg", "rounded-lg px-6 font-black shadow-none")}>고객센터 확인</Link></div></div><dl className="border border-slate-300 bg-white p-5 sm:p-6">{operatorInfo.map(([label, value]) => <div key={label} className="grid gap-1 border-b border-slate-200 py-3 last:border-b-0 sm:grid-cols-[8.5rem_1fr]"><dt className="text-sm font-black text-slate-950">{label}</dt><dd className="text-sm leading-6 text-slate-700">{value}</dd></div>)}</dl></div></section>
      </main>
    </>
  );
}
