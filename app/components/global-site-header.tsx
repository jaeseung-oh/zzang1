"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import AuthNav from "@/app/components/auth-nav";
import { centerFullLogoPath } from "@/app/components/SealStamp";

const navItems = [
  { href: "/about", label: "센터소개" },
  { href: "/courses", label: "교육과정" },
  { href: "/certificate", label: "수료증" },
];


export default function GlobalSiteHeader() {
  const pathname = usePathname();
  const normalizedPath = pathname?.replace(/\/$/, "") || "/";

  return (
    <header className="sticky top-0 z-50 border-b-2 border-slate-200 bg-white/98 text-slate-950 shadow-sm backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-3 py-2 sm:px-6 sm:py-3 lg:flex-row lg:flex-nowrap lg:items-center lg:justify-between lg:px-8">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <Link href="/" className="flex min-w-0 items-center text-left" aria-label="Reset Edu Center 홈">
            <img src={centerFullLogoPath} alt="Reset Edu Center" className="h-9 w-auto max-w-[150px] object-contain sm:h-12 sm:max-w-[230px]" />
          </Link>
          <div className="shrink-0 lg:hidden">
            <AuthNav />
          </div>
        </div>

        <nav className="flex w-full gap-1 overflow-x-auto pb-1 text-sm font-bold text-slate-700 [-webkit-overflow-scrolling:touch] lg:w-auto lg:items-center lg:justify-center lg:gap-2 lg:overflow-visible lg:pb-0">
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

        <div className="hidden lg:block">
          <AuthNav />
        </div>
      </div>
    </header>
  );
}
