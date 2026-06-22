import type { Metadata } from "next";
import Link from "next/link";
import { buttonClass } from "@/app/components/ui/button-styles";

export const metadata: Metadata = {
  title: "반성문 작성방법과 참고할 내용 | Reset Edu Center",
  description: "반성문 작성순서, 잘못에 대한 인식, 피해와 위험에 대한 이해, 재발방지 행동계획을 본인의 경험에 맞게 정리하는 방법을 안내합니다.",
  alternates: { canonical: "/guides/reflection-letter/" },
  openGraph: { title: "반성문 작성방법과 참고할 내용 | Reset Edu Center", description: "반성문 작성순서, 잘못에 대한 인식, 피해와 위험에 대한 이해, 재발방지 행동계획을 본인의 경험에 맞게 정리하는 방법을 안내합니다.", url: "/guides/reflection-letter/", type: "article" },
};

const sections = [["1. 사건과 잘못을 구체적으로 돌아보기","사건의 경위를 변명 없이 정리하고, 당시 판단과 행동에서 무엇이 잘못되었는지 작성합니다."],["2. 피해와 사회적 위험 이해하기","직접적인 피해뿐 아니라 주변 사람과 사회에 미친 위험을 구체적으로 생각해 봅니다."],["3. 재발방지 행동계획 작성하기","위험상황을 피하는 방법, 주변의 도움을 받는 방법, 실제 생활에서 지킬 약속을 실행 가능한 수준으로 적습니다."],["피해야 할 작성 방식","책임을 다른 사람이나 상황에 돌리는 표현, 사실과 다른 과장, 결과만을 위한 형식적인 문구는 피하는 것이 좋습니다."]];

export default function GuidePage() {
 return <main className="min-h-screen bg-slate-50 px-4 py-14 text-slate-950 sm:px-6"><article className="mx-auto max-w-4xl rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-10"><p className="text-sm font-black text-indigo-700">Reset Edu Center 작성 가이드</p><h1 className="mt-4 break-keep text-3xl font-black leading-tight sm:text-5xl">반성문 작성방법과 참고할 내용</h1><p className="mt-6 text-base leading-8 text-slate-700">반성문은 예시를 그대로 복사하기보다 사건을 어떻게 인식하고 있는지, 피해와 사회적 위험을 어떻게 이해하는지, 같은 행동을 막기 위해 무엇을 실천할지를 본인의 말로 정리하는 것이 중요합니다.</p><div className="mt-10 space-y-8">{sections.map(([heading,body])=><section key={heading}><h2 className="text-xl font-black">{heading}</h2><p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-700">{body}</p></section>)}</div><div className="mt-10 rounded-2xl bg-slate-100 p-5 text-sm leading-7 text-slate-700">본 가이드는 직접 작성하기 위한 참고정보이며, 특정한 수사·재판 결과를 보장하지 않습니다.</div><div className="mt-8 flex flex-wrap gap-3"><Link href="/courses/dui-prevention/" className={buttonClass("primary","md","rounded-xl font-black")}>음주운전 예방교육 확인하기</Link><Link href="/courses/" className={buttonClass("secondary","md","rounded-xl font-black")}>과정과 가격 비교하기</Link></div></article></main>;
}