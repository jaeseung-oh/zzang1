import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "센터소개 | 리셋 에듀센터",
  description:
    "리셋 에듀센터의 설립 취지와 민간 예방 교육, 성찰 및 이수 확인 자료 안내를 담은 센터 소개 페이지",
};

const valueCards = [
  {
    title: "체계적으로 구성한 예방 교육",
    body: "각 유형에 맞춰 구성한 교육 모듈을 통해 스스로 문제를 돌아보고 재발 방지 계획을 정리할 수 있도록 돕습니다.",
    accent: "default",
  },
  {
    title: "진정성 있는 성찰과 자가 점검",
    body: "교육 이수 과정에서 본인의 행동을 되돌아보고, 실천 계획서와 서약서 초안을 스스로 정리할 수 있도록 안내합니다.",
    accent: "default",
  },
  {
    title: "이수 사실과 학습 기록 정리",
    body: "수강 완료 후 교육 이수 확인서와 학습 확인 자료를 발급 안내합니다. 해당 자료는 민간 교육 이수 사실을 정리하는 용도이며, 실제 제출 가능 여부와 해석은 제출처 판단에 따라 달라질 수 있습니다.",
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
    <main className="min-h-screen break-keep bg-[linear-gradient(180deg,#f5f7fb_0%,#eef2f7_100%)] text-[#0f172a]">
      <section className="relative overflow-hidden bg-[linear-gradient(145deg,#08152d_0%,#10213f_48%,#173968_100%)] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(240,203,133,0.18),transparent_22%),radial-gradient(circle_at_left_center,rgba(96,165,250,0.16),transparent_24%)]" />
        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
          <div className="max-w-4xl">
            <p className="inline-flex rounded-full border border-white/15 bg-white/8 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-[#f0cb85]">
              Reset Edu Center
            </p>
            <h1 className="mt-8 text-4xl font-black leading-[1.08] tracking-[-0.045em] text-white sm:text-5xl lg:text-6xl">
              성찰과 재발 방지 계획을 정리하는 민간 교육 안내
            </h1>
            <p className="mt-8 max-w-[52rem] break-keep text-base leading-8 text-slate-200 sm:text-lg">
              리셋 에듀센터는 사건 이후 생활을 돌아보고 재발 방지 계획을 정리하려는 이용자를 위해 민간 교육 과정과 이수 확인 자료 안내를 제공합니다.
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
            <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_18px_60px_rgba(3,10,20,0.08)] break-keep">
              <p className="text-base leading-8 text-slate-700">
                사건 이후 스스로의 생활을 점검하고 재발 방지 계획을 정리하는 과정이 중요할 수 있습니다. 저희 센터는 온라인 교육 수강과 이수 확인 자료 정리를 한 흐름으로 안내해, 이용자가 필요한 기록을 직접 준비할 수 있도록 돕습니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[linear-gradient(180deg,#eef3f8_0%,#f8fafc_100%)]">
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
          <div className="max-w-4xl">
            <p className="inline-flex rounded-full border border-[#e5d8b5] bg-[#f9f1de] px-4 py-2 text-xs font-bold uppercase tracking-[0.24em] text-[#7a5a1b]">
              Core Value
            </p>
            <h2 className="mt-6 text-3xl font-black tracking-[-0.03em] text-[#06101b] sm:text-5xl">
              수강 후 확인할 수 있는 핵심 안내를 정리했습니다.
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
                <p className={`mt-5 break-keep text-sm leading-8 ${card.accent === "highlight" ? "text-[#5d4a21]" : "text-slate-600"}`}>
                  {card.body}
                </p>
                {card.accent === "highlight" ? (
                  <div className="mt-6 rounded-[1.5rem] border border-[#e2c57b] bg-white/70 px-5 py-4 text-sm font-semibold leading-7 text-[#4a3510] break-keep">
                    수강 완료 기록과 발급 서류를 통해 교육 이수 사실과 실천 계획을 참고용 자료로 정리할 수 있습니다.
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
              <p className="mt-5 break-keep text-sm leading-8 text-slate-300 sm:text-base">
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

          <div className="mt-10 rounded-[1.75rem] border border-[#d7dee8] bg-[#f3f5f8] px-6 py-6 text-sm leading-7 text-slate-600 break-keep">
            안내: 본 센터의 교육 프로그램과 발급 서류는 수강생의 자발적인 교육 이수와 실천 계획을 정리하는 참고 자료입니다. 특정 절차에서의 결과나 법적 효력을 보장하지 않으며, 개별 사건에 대한 법률 대리나 법률 자문 등의 사무는 제공하지 않습니다.
          </div>
        </div>
      </section>
    </main>
  );
}
