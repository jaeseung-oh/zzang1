"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function GlobalHomeButton() {
  const pathname = usePathname();
  return (
    <div className="fixed bottom-6 right-5 z-[120] sm:bottom-7 sm:right-7">
      <Link
        href="/"
        aria-label="홈으로 이동"
        className={
          "inline-flex min-h-14 items-center gap-2.5 rounded-full border-2 border-white bg-[linear-gradient(135deg,#08152d_0%,#284b84_100%)] px-5 py-3.5 text-base font-extrabold text-white shadow-[0_24px_48px_rgba(16,33,63,0.42)] transition hover:-translate-y-0.5 hover:brightness-110 ring-4 ring-white/70"
        }
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="2">
          <path d="M3 11.5 12 4l9 7.5" />
          <path d="M6.5 10.5V20h11v-9.5" />
        </svg>
        <span>홈</span>
      </Link>
    </div>
  );
}
