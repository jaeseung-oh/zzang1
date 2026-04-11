import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "센터소개 | 리셋 에듀센터",
  description:
    "리셋 에듀센터의 설립 취지와 전문 예방 교육, 성찰 및 객관적 증빙 자료 안내를 담은 센터 소개 페이지",
};

const valueCards = [
  {
    title: "전문적이고 체계적인 예방 교육",
    body: "각 범죄 유형(음주운전, 금융사기, 성폭력 방지 등)에 맞춘 세분화된 교육 모듈로, 단순한 시청을 넘어 본질적인 문제 인식을 돕습니다.",
    accent: "default",
  },
  {
    title: "진정성 있는 성찰과 자가 점검",
    body: "교육 이수 과정에서 본인의 행동을 되돌아보고, 구체적이고 실천 가능한 '재발방지 계획서'와 '금주/준법 서약서'를 스스로 작성하도록 안내합니다.",
    accent: "default",
  },
  {
    title: "객관적이고 확실한 노력의 증빙",
    body: "100% 온라인 수강 완료 즉시, 수사기관 및 법원 등에서 요구하는 '노력과 반성의 태도'를 소명할 수 있는 객관적 자료(교육 수료증, 학습 확인서)를 발급합니다. 이 자료는 변호인 제출용 양형 참고 자료로 유용하게 활용됩니다.",
    accent: "highlight",
  },
] as const;

function ValueIcon({ accent }: { accent: "default" | "highlight" }) {
  const tone = accent === "highlight" ? "text-[#8a6118]" : "text-[#173968]";

  return (
    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${accent === "highlight" ? "bg-[#fff1cf]" : "bg-[#eef4fb]"} ${tone}`}>
      <svg viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current" strokeWidth="1.8" aria-hidden="true">
        <path d="M12 3l7 4v5c0 4.5-3 7.8-7 9-4-1.2-7-4.5-7-9V7l7-4Z" />
        <path d="M9.5 12.5l1.8 1.8L15 10.7" />
      </svg>
    </div>
  );
}

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f5f7fb_0%,#eef2f7_100%)] text-[#0f172a]">
      <section className="relative overflow-hidden bg-[linear-gradient(145deg,#08152d_0%,#10213f_48%,#173968_100%)] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(240,203,133,0.18),transparent_22%),radial-gradient(circle_at_left_center,rgba(96,165,250,0.16),transparent_24%)]" />
        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
          <div className="max-w-4xl">
            <p className="inline-flex rounded-full border border-white/15 bg-white/8 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-[#f0cb85]">
              Reset Edu Center
            </p>
            <h1 className="mt-8 text-4xl font-black leading-[1.08] tracking-[-0.045em] text-white sm:text-5xl lg:text-6xl">
              단순한 후회를 넘어, 행동하는 반성의 증명
            </h1>
            <p className="mt-8 max-w-3xl text-base leading-8 text-slate-200 sm:text-lg">
              리셋 에듀센터는 음주운전, 성범죄, 사기 등 각종 위법 행위의 근본적인 원인을 점검하고, 체계적인 예방 교육을 통해 당신의 진정성 있는 변화를 객관적인 기록으로 남깁니다.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link href="/signup" className="inline-flex min-h-12 items-center justify-center rounded-full bg-[linear-gradient(135deg,#f0cb85_0%,#ffe4b1_100%)] px-7 py-4 text-sm font-bold text-[#2f2208] shadow-[0_16px_30px_rgba(164,126,54,0.28)] transition hover:-translate-y-0.5 hover:brightness-105">
                수강 신청 시작하기
              </Link>
              <Link href="/course-room" className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/18 bg-white/8 px-7 py-4 text-sm font-semibold text-white transition hover:bg-white/14">
                교육 구성 살펴보기
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200/70 bg-white/80">
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <div>
              <p className="inline-flex rounded-full border border-[#d9e2ef] bg-[#f8fbff] px-4 py-2 text-xs font-bold uppercase tracking-[0.24em] text-[#173968]">
                Our Mission
              </p>
              <h2 className="mt-6 text-3xl font-black tracking-[-0.03em] text-[#06101b] sm:text-5xl">
                변화를 향한 의지, 혼자 증명하기 어렵습니다.
              </h2>
            </div>
            <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_18px_60px_rgba(3,10,20,0.08)]">
              <p className="text-base leading-8 text-slate-700">
                사건 이후 가장 중요한 것은 '다시는 같은 실수를 반복하지 않겠다'는 재발 방지의 변함없는 의지입니다. 저희 센터는 법률적, 심리적 메커니즘을 분석하여 개발된 전문 예방 교육 커리큘럼을 제공합니다. 수강생이 자신의 과오를 깊이 성찰하고, 올바른 사회 구성원으로 복귀할 수 있도록 가장 확실한 첫걸음을 돕습니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[linear-gradient(180deg,#eef3f8_0%,#f8fafc_100%)]">
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="inline-flex rounded-full border border-[#e5d8b5] bg-[#f9f1de] px-4 py-2 text-xs font-bold uppercase tracking-[0.24em] text-[#7a5a1b]">
              Core Value
            </p>
            <h2 className="mt-6 text-3xl font-black tracking-[-0.03em] text-[#06101b] sm:text-5xl">
              수강생이 실제로 가져가는 핵심 결과를 명확하게 설계했습니다.
            </h2>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {valueCards.map((card) => (
              <article
                key={card.title}
                className={card.accent === "highlight"
                  ? "rounded-[2rem] border border-[#e8cf95] bg-[linear-gradient(180deg,#fff8e8_0%,#fff2d2_100%)] p-7 shadow-[0_22px_70px_rgba(164,126,54,0.16)]"
                  : "rounded-[2rem] border border-slate-200 bg-white p-7 shadow-[0_18px_60px_rgba(3,10,20,0.08)]"
                }
              >
                <ValueIcon accent={card.accent} />
                <h3 className={`mt-6 text-2xl font-black leading-[1.2] tracking-[-0.03em] ${card.accent === "highlight" ? "text-[#4a3510]" : "text-[#06101b]"}`}>
                  {card.title}
                </h3>
                <p className={`mt-5 text-sm leading-8 ${card.accent === "highlight" ? "text-[#5d4a21]" : "text-slate-600"}`}>
                  {card.body}
                </p>
                {card.accent === "highlight" ? (
                  <div className="mt-6 rounded-[1.5rem] border border-[#e2c57b] bg-white/70 px-5 py-4 text-sm font-semibold leading-7 text-[#4a3510]">
                    수강 완료 기록과 발급 서류를 통해 스스로의 변화와 노력을 객관적인 참고 자료로 정리할 수 있습니다.
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#0b1424] text-white">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8 shadow-[0_20px_70px_rgba(6,16,27,0.24)] lg:flex lg:items-center lg:justify-between lg:gap-8 lg:p-10">
            <div className="max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-[0.26em] text-[#f0cb85]">Conclusion</p>
              <h2 className="mt-5 text-3xl font-black tracking-[-0.03em] text-white sm:text-4xl">
                신뢰할 수 있는 교육 기록과 함께, 변화의 출발점을 정리해 보세요.
              </h2>
              <p className="mt-5 text-sm leading-8 text-slate-300 sm:text-base">
                수강 등록부터 교육 이수, 성찰 기록 정리, 발급 서류 확인까지 한 흐름으로 안내합니다. 필요한 절차를 차분히 준비할 수 있도록 플랫폼 전체를 설계했습니다.
              </p>
            </div>
            <div className="mt-8 flex flex-wrap gap-4 lg:mt-0 lg:flex-col lg:items-end">
              <Link href="/signup" className="inline-flex min-h-12 items-center justify-center rounded-full bg-[linear-gradient(135deg,#f0cb85_0%,#ffe4b1_100%)] px-7 py-4 text-sm font-bold text-[#2f2208] shadow-[0_16px_30px_rgba(164,126,54,0.28)] transition hover:-translate-y-0.5 hover:brightness-105">
                지금 수강 신청하기
              </Link>
              <Link href="/login" className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/16 bg-white/8 px-7 py-4 text-sm font-semibold text-white transition hover:bg-white/14">
                로그인 후 이어서 보기
              </Link>
            </div>
          </div>

          <div className="mt-10 rounded-[1.75rem] border border-[#d7dee8] bg-[#f3f5f8] px-6 py-6 text-sm leading-7 text-slate-600">
            안내: 본 센터의 교육 프로그램과 발급 서류는 수강생의 자발적인 개전의 정(뉘우침)을 보여주는 객관적 참고 자료입니다. 특정 재판의 결과나 감형을 법적으로 보장하지 않으며, 개별 사건에 대한 법률 대리나 법률 자문 등의 사무는 제공하지 않습니다.
          </div>
        </div>
      </section>
    </main>
  );
}
