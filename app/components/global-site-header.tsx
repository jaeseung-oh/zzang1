"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import AuthNav from "@/app/components/auth-nav";

const navItems = [
  { href: "/about", label: "센터소개" },
  { href: "/courses", label: "교육과정" },
  { href: "/certificate", label: "수료증" },
];

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="2" aria-hidden="true">
      <path d="M12 3 19 7v5c0 4-2.8 7.2-7 9-4.2-1.8-7-5-7-9V7l7-4Z" />
      <path d="m8.8 12.2 2 2 4.5-4.7" />
    </svg>
  );
}

export default function GlobalSiteHeader() {
  const pathname = usePathname();
  const normalizedPath = pathname?.replace(/\/$/, "") || "/";

  return (
    <header className="sticky top-0 z-50 border-b-2 border-slate-200 bg-white/98 text-slate-950 shadow-sm backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:flex-nowrap lg:px-8">
        <Link href="/" className="flex min-w-0 items-center gap-3 text-left" aria-label="Reset Edu Center 홈">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white">
            <ShieldIcon />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-black leading-5 text-slate-950">Reset Edu Center</span>
            <span className="block text-xs font-semibold leading-4 text-slate-600">온라인 예방교육</span>
          </span>
        </Link>

        <nav className="order-3 flex w-full gap-1 overflow-x-auto text-sm font-bold text-slate-700 lg:order-2 lg:w-auto lg:items-center lg:justify-center lg:gap-2 lg:overflow-visible">
          {navItems.map((item) => {
            const itemPath = item.href.replace(/\/$/, "");
            const active = normalizedPath === itemPath || (itemPath !== "" && normalizedPath.startsWith(itemPath + "/"));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  active
                    ? "whitespace-nowrap rounded-full border-2 border-[#111827] bg-[#ffdd00] px-3.5 py-2 text-[#111827] shadow-[0_8px_18px_rgba(255,221,0,0.28)]"
                    : "whitespace-nowrap rounded-full border-2 border-slate-300 bg-white px-3.5 py-2 text-[#111827] hover:border-[#0052cc] hover:bg-[#0052cc] hover:text-white"
                }
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="order-2 lg:order-3">
          <AuthNav />
        </div>
      </div>
    </header>
  );
}
