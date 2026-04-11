"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function GlobalHomeButton() {
  const pathname = usePathname();
  return (
    <div className="fixed bottom-5 right-5 z-[90] sm:bottom-6 sm:right-6">
      <Link
        href="/"
        aria-label="홈으로 이동"
        className={
          "inline-flex min-h-12 items-center gap-2 rounded-full border-2 border-white bg-[linear-gradient(135deg,#10213f_0%,#284b84_100%)] px-4 py-3 text-sm font-bold text-white shadow-[0_20px_40px_rgba(16,33,63,0.38)] transition hover:-translate-y-0.5 hover:brightness-105 ring-4 ring-[#10213f]/18"
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
