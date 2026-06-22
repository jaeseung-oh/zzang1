import type { Metadata } from "next";
import Link from "next/link";
import { buttonClass } from "@/app/components/ui/button-styles";

export const metadata: Metadata = {
  title: "재발방지계획서 작성방법과 실천항목 | Reset Edu Center",
  description: "사건 발생 원인, 반복 위험상황, 구체적인 행동수칙과 생활 실천계획을 직접 정리하는 방법을 안내합니다.",
  alternates: { canonical: "/guides/prevention-plan/" },
  openGraph: { title: "재발방지계획서 작성방법과 실천항목 | Reset Edu Center", description: "사건 발생 원인, 반복 위험상황, 구체적인 행동수칙과 생활 실천계획을 직접 정리하는 방법을 안내합니다.", url: "/guides/prevention-plan/", type: "article" },
};

const sections = [["1. 발생 원인과 위험상황 점검","행동이 발생한 상황, 잘못된 판단, 반복 가능성을 높이는 환경과 습관을 구분해 적습니다."],["2. 상황별 대처방법 정하기","음주 권유 거절, 차량 이용 차단, 가족과의 확인 약속처럼 실제 상황에서 바로 실행할 행동을 정합니다."],["3. 점검 가능한 실천항목 만들기","막연한 다짐보다 실행 주기, 확인 방법, 도움을 요청할 사람을 함께 작성하면 계획을 지속적으로 점검하기 쉽습니다."],["4. 본인의 말로 검토하기","완성한 계획이 실제 생활과 맞는지, 서로 모순되는 내용은 없는지 확인하고 본인의 경험에 맞게 수정합니다."]];

export default function GuidePage() {
 return <main className="min-h-screen bg-slate-50 px-4 py-14 text-slate-950 sm:px-6"><article className="mx-auto max-w-4xl rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-10"><p className="text-sm font-black text-indigo-700">Reset Edu Center 작성 가이드</p><h1 className="mt-4 break-keep text-3xl font-black leading-tight sm:text-5xl">재발방지계획서 작성방법과 실천항목</h1><p className="mt-6 text-base leading-8 text-slate-700">재발방지계획서는 정해진 정답을 채우는 문서가 아니라, 본인의 위험요인과 생활환경을 점검하고 같은 문제가 반복되지 않도록 실행할 행동을 구체화하는 자료입니다.</p><div className="mt-10 space-y-8">{sections.map(([heading,body])=><section key={heading}><h2 className="text-xl font-black">{heading}</h2><p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-700">{body}</p></section>)}</div><div className="mt-10 rounded-2xl bg-slate-100 p-5 text-sm leading-7 text-slate-700">본 가이드는 직접 작성하기 위한 참고정보이며, 특정한 수사·재판 결과를 보장하지 않습니다.</div><div className="mt-8 flex flex-wrap gap-3"><Link href="/courses/dui-prevention/" className={buttonClass("primary","md","rounded-xl font-black")}>음주운전 예방교육 확인하기</Link><Link href="/courses/" className={buttonClass("secondary","md","rounded-xl font-black")}>과정과 가격 비교하기</Link></div></article></main>;
}