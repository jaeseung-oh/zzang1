"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { buttonClass } from "@/app/components/ui/button-styles";

export default function EducationDocumentsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/prevention-documents");
  }, [router]);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12 text-slate-950">
      <section className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-black text-[#173968]">제공자료</p>
        <h1 className="mt-2 text-2xl font-black">기존 작성자료 페이지로 이동합니다</h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">재발방지계획서, 음주예방실천계획서, 음주운전 재발방지 서약서는 기존 제공자료 화면에서 확인하고 인쇄할 수 있습니다.</p>
        <Link href="/prevention-documents" className={buttonClass("primary", "md", "mt-5 w-full rounded-xl px-5 font-black sm:w-auto")}>제공자료 열기</Link>
      </section>
    </main>
  );
}
