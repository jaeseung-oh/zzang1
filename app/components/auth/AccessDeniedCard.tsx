"use client";

import Link from "next/link";

export function AccessDeniedCard({ title = "접근할 수 없습니다.", message, primaryHref = "/courses/apply", primaryLabel = "수강 신청하기", secondaryHref = "/", secondaryLabel = "홈으로 이동" }: { title?: string; message: string; primaryHref?: string; primaryLabel?: string; secondaryHref?: string; secondaryLabel?: string }) {
  return (
    <main className="min-h-screen bg-[#eef3f8] px-4 py-10 text-slate-950">
      <section className="mx-auto max-w-2xl rounded-[1.5rem] border border-[#d7deea] bg-white p-6 shadow-[0_18px_48px_rgba(15,23,42,0.08)]">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#274690]">Access</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">{title}</h1>
        <p className="mt-4 text-sm leading-7 text-slate-600">{message}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href={primaryHref} className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full bg-indigo-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-indigo-700">{primaryLabel}</Link>
          <Link href={secondaryHref} className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50">{secondaryLabel}</Link>
        </div>
      </section>
    </main>
  );
}

export function AccessLoadingCard({ message = "수강권 정보를 확인하고 있습니다." }: { message?: string }) {
  return <main className="min-h-screen bg-[#eef3f8] px-4 py-10 text-slate-950"><section className="mx-auto max-w-2xl rounded-[1.5rem] border border-[#d7deea] bg-white p-6 text-sm text-slate-600 shadow-[0_18px_48px_rgba(15,23,42,0.08)]">{message}</section></main>;
}
