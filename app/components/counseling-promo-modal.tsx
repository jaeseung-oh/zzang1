"use client";

import { useEffect, useRef, useState } from "react";

const APPLY_HREF = "https://resetedu.kr/courses/";
const STORAGE_KEY = "resetedu:counseling-promo-hidden-until";

export default function CounselingPromoModal() {
  const [open, setOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const currentUrl = new URL(window.location.href);
    const isApplyTargetPage = currentUrl.pathname.replace(/\/$/, "") === "/courses/apply" && currentUrl.searchParams.get("category") === "dui" && currentUrl.searchParams.get("productId") === "dui-cbt-counseling";
    if (isApplyTargetPage) return;
    const hiddenUntil = Number(window.localStorage.getItem(STORAGE_KEY) || "0");
    if (hiddenUntil > Date.now()) return;
    const timer = window.setTimeout(() => setOpen(true), 1300);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!open) return;
    closeButtonRef.current?.focus();
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  function close() {
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/62 px-4 py-[4dvh] text-slate-950 backdrop-blur-[2px] sm:px-5 sm:py-5" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="counseling-promo-title" className="relative flex max-h-[92dvh] w-full max-w-[390px] flex-col overflow-hidden rounded-[1.15rem] border border-slate-200 bg-white shadow-[0_28px_90px_rgba(15,23,42,0.28)] sm:max-w-[720px]">
        <h2 id="counseling-promo-title" className="sr-only">심리상담 종합과정 홍보</h2>
        <div className="min-h-0 overflow-y-auto bg-white">
          <img
            src="/images/심리상담종합과정홍보.png"
            alt="심리상담 종합과정 안내"
            className="block h-auto w-full object-contain"
            loading="eager"
            decoding="async"
          />
        </div>
        <div className="grid gap-2 border-t border-slate-200 bg-white p-3 sm:grid-cols-[0.8fr_1.2fr] sm:p-4">
          <button ref={closeButtonRef} type="button" onClick={close} className="inline-flex min-h-12 w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-5 text-base font-black text-slate-700 transition hover:border-[#173968] hover:text-[#173968] focus:outline-none focus:ring-4 focus:ring-[#173968]/20">
            닫기
          </button>
          <a href={APPLY_HREF} onClick={close} className="inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-[#173968] px-5 text-base font-black !text-white transition hover:bg-[#10213f] focus:outline-none focus:ring-4 focus:ring-[#173968]/25">
            심리상담종합과정 둘러보기
          </a>
        </div>
      </section>
    </div>
  );
}
