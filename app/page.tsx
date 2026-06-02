"use client";

import { useMemo, useState } from "react";

const lessons = [
  {
    title: "음주운전 위험성과 사고 흐름 이해",
    time: "10:24",
    progress: 72,
    summary: "음주운전이 한 번의 실수가 아니라 예측 가능한 위험 행동으로 이어지는 구조를 이해합니다.",
  },
  {
    title: "알코올이 판단력과 운전능력에 미치는 영향",
    time: "09:58",
    progress: 0,
    summary: "반응속도, 시야, 거리감, 충동성 변화가 실제 운전 판단에 미치는 영향을 점검합니다.",
  },
  {
    title: "사고 사례와 법적, 사회적 책임 구조",
    time: "11:16",
    progress: 0,
    summary: "사고 이후 발생하는 책임과 관계 손상을 사례 흐름으로 정리합니다.",
  },
  {
    title: "재음주운전 위험 상황 진단과 차단 전략",
    time: "08:47",
    progress: 0,
    summary: "회식, 야간 귀가, 대리운전 취소 등 반복되기 쉬운 장면을 분해합니다.",
  },
  {
    title: "가족, 직장, 사회적 신뢰 회복 행동 설계",
    time: "10:02",
    progress: 0,
    summary: "말보다 반복 행동으로 신뢰를 회복하기 위한 실행 계획을 설계합니다.",
  },
];

const stats = [
  ["총 강의", "5강"],
  ["수강률", "14%"],
  ["이수 자료", "3종"],
  ["자동 저장", "ON"],
];

export default function HomePage() {
  const [legalAccepted, setLegalAccepted] = useState(false);
  const [legalChecked, setLegalChecked] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState(0);
  const activeLesson = lessons[selectedLesson];

  const canOpenLesson = (index: number) => index === 0 || lessons[index - 1].progress >= 100;
  const completeRate = useMemo(() => Math.round(lessons.reduce((sum, item) => sum + item.progress, 0) / lessons.length), []);

  return (
    <main className="min-h-screen overflow-hidden bg-[#06080c] text-white">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -left-40 -top-36 h-[34rem] w-[34rem] rounded-full bg-indigo-600/28 blur-[120px]" />
        <div className="absolute right-[-14rem] top-40 h-[36rem] w-[36rem] rounded-full bg-purple-600/24 blur-[130px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:72px_72px] opacity-25" />
      </div>

      {!legalAccepted ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#06080c]/88 px-4 backdrop-blur-2xl">
          <section className="w-full max-w-2xl overflow-hidden rounded-[28px] border border-white/14 bg-white/[0.08] shadow-[0_32px_120px_rgba(0,0,0,.62)] ring-1 ring-indigo-300/15 transition duration-500">
            <div className="border-b border-white/10 bg-[linear-gradient(135deg,rgba(79,70,229,.34),rgba(168,85,247,.24))] px-7 py-6">
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-indigo-100/80">Legal consent required</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white">수강 전 법적 동의가 필요합니다</h1>
              <p className="mt-4 text-sm leading-7 text-slate-200">본 서비스는 음주운전 예방을 위한 민간 온라인 교육 플랫폼이며, 법률 상담이나 특정 절차의 결과를 보장하지 않습니다.</p>
            </div>
            <div className="space-y-4 px-7 py-6">
              <div className="rounded-2xl border border-white/12 bg-[#06080c]/55 p-5 text-sm leading-7 text-slate-200">
                수강 기록과 수료 확인 자료는 교육 이수 사실을 정리하기 위한 참고 자료입니다. 제출 여부와 활용 방식은 수강자가 직접 확인해야 합니다.
              </div>
              <label className="flex items-start gap-3 rounded-2xl border border-indigo-300/20 bg-indigo-300/[0.08] px-4 py-4 text-sm leading-7 text-slate-100">
                <input className="mt-1 h-4 w-4 accent-indigo-400" type="checkbox" checked={legalChecked} onChange={(event) => setLegalChecked(event.target.checked)} />
                <span>위 고지와 민간 교육 서비스의 한계를 확인했으며, 이에 동의하고 수강을 시작합니다.</span>
              </label>
              <button
                type="button"
                disabled={!legalChecked}
                onClick={() => setLegalAccepted(true)}
                className="min-h-12 w-full rounded-full bg-[linear-gradient(135deg,#6366f1_0%,#a855f7_100%)] px-6 text-sm font-bold text-white shadow-[0_18px_42px_rgba(99,102,241,.38)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45"
              >
                동의하고 프리미엄 강의실 입장
              </button>
            </div>
          </section>
        </div>
      ) : null}

      <section className="relative mx-auto flex min-h-screen max-w-[1500px] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 rounded-[28px] border border-white/12 bg-white/[0.07] px-6 py-5 shadow-[0_24px_80px_rgba(0,0,0,.28)] backdrop-blur-2xl md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.34em] text-indigo-200/80">Premium DUI Prevention LMS</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-white sm:text-5xl">음주운전 예방교육 전문 플랫폼</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">잠금 목차, 보호된 영상 플레이어, 법적 동의, 진도 저장을 한 화면에 모은 프리미엄 온라인 강의실입니다.</p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:w-[420px]">
            {stats.map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-center backdrop-blur">
                <p className="text-[11px] text-slate-400">{label}</p>
                <p className="mt-1 text-lg font-semibold text-white">{value}</p>
              </div>
            ))}
          </div>
        </header>

        <div className="grid flex-1 gap-6 lg:grid-cols-[390px_minmax(0,1fr)]">
          <aside className="rounded-[30px] border border-white/12 bg-white/[0.075] p-5 shadow-[0_28px_90px_rgba(0,0,0,.34)] backdrop-blur-2xl">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.28em] text-purple-200/80">Curriculum</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">잠금 목차</h2>
              </div>
              <span className="rounded-full border border-indigo-300/20 bg-indigo-400/10 px-3 py-1 text-xs font-bold text-indigo-100">{completeRate}% complete</span>
            </div>

            <div className="mt-5 space-y-3">
              {lessons.map((lesson, index) => {
                const locked = !canOpenLesson(index);
                const active = selectedLesson === index;
                return (
                  <button
                    key={lesson.title}
                    type="button"
                    onClick={() => !locked && setSelectedLesson(index)}
                    className={(active ? "border-indigo-300/55 bg-indigo-500/18 shadow-[0_16px_42px_rgba(79,70,229,.24)]" : locked ? "border-white/8 bg-white/[0.035] opacity-55" : "border-white/10 bg-white/[0.06] hover:-translate-y-0.5 hover:border-purple-300/45") + " group w-full rounded-2xl border p-4 text-left transition duration-300"}
                  >
                    <div className="flex items-start gap-3">
                      <span className={(locked ? "bg-white/8 text-slate-400" : active ? "bg-[linear-gradient(135deg,#6366f1,#a855f7)] text-white" : "bg-white/10 text-indigo-100") + " flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-sm font-bold"}>
                        {locked ? "잠" : "0" + (index + 1)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <h3 className="line-clamp-2 text-sm font-semibold leading-5 text-white">{lesson.title}</h3>
                          <span className="shrink-0 text-xs font-semibold text-slate-400">{locked ? "Locked" : lesson.time}</span>
                        </div>
                        <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-400">{lesson.summary}</p>
                        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                          <div className="h-full rounded-full bg-[linear-gradient(90deg,#6366f1,#a855f7)]" style={{ width: lesson.progress + "%" }} />
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="min-w-0 rounded-[34px] border border-white/12 bg-white/[0.075] p-5 shadow-[0_28px_100px_rgba(0,0,0,.36)] backdrop-blur-2xl">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.3em] text-indigo-200/80">Protected classroom</p>
                <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">{selectedLesson + 1}강. {activeLesson.title}</h2>
                <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-300">{activeLesson.summary}</p>
              </div>
              <div className="flex gap-2">
                <span className="rounded-full border border-white/12 bg-white/[0.07] px-4 py-2 text-xs font-semibold text-slate-200">자동 저장</span>
                <span className="rounded-full border border-purple-300/24 bg-purple-400/10 px-4 py-2 text-xs font-semibold text-purple-100">동의 완료</span>
              </div>
            </div>

            <div className="mt-6 overflow-hidden rounded-[28px] border border-white/12 bg-black shadow-[0_30px_90px_rgba(0,0,0,.45)]">
              <div className="relative aspect-video bg-[radial-gradient(circle_at_50%_35%,rgba(99,102,241,.26),transparent_26%),linear-gradient(135deg,#070a12,#0b1020_48%,#14091f)]">
                <div className="absolute inset-0 bg-[linear-gradient(120deg,transparent,rgba(255,255,255,.08),transparent)]" />
                <div className="absolute left-5 top-5 rounded-full border border-white/12 bg-black/35 px-4 py-2 text-xs font-semibold text-slate-200 backdrop-blur">Premium secure player</div>
                <button type="button" className="absolute left-1/2 top-1/2 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[linear-gradient(135deg,#6366f1,#a855f7)] text-3xl shadow-[0_18px_60px_rgba(99,102,241,.45)] transition hover:scale-105" aria-label="재생">▶</button>
                <div className="absolute inset-x-5 bottom-5 rounded-2xl border border-white/10 bg-black/38 p-4 backdrop-blur-xl">
                  <div className="flex items-center justify-between text-xs text-slate-300">
                    <span>03:42</span>
                    <span>{activeLesson.time}</span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/12">
                    <div className="h-full w-[36%] rounded-full bg-[linear-gradient(90deg,#6366f1,#a855f7)]" />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {[
                ["법적 동의", "수강 전 필수 팝업 확인 완료"],
                ["강의 잠금", "이전 강의 완료 후 다음 강의 오픈"],
                ["수료 자료", "학습확인서, 금주 서약서, 재발방지 계획서"],
              ].map(([title, body]) => (
                <article key={title} className="rounded-2xl border border-white/12 bg-white/[0.06] p-5 backdrop-blur">
                  <h3 className="text-base font-semibold text-white">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-400">{body}</p>
                </article>
              ))}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
