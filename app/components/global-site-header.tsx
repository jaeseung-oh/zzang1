"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import AuthNav from "@/app/components/auth-nav";
import { platformCourseCategories } from "@/lib/course/platform-courses";

const primaryNavItems = [
  { href: "/about", label: "센터소개" },
  { href: "/certificate", label: "수료증 안내" },
  { href: "/#process", label: "이용방법" },
  { href: "/resources/reflection-guide", label: "교육자료" },
  { href: "/about#support", label: "고객지원" },
];

const courseLinks = [
  { href: "/courses", label: "전체 교육과정" },
  ...platformCourseCategories.map((course) => ({ href: "/courses/" + course.slug, label: course.title })),
  { href: "/courses?category=cbt", label: "인지행동 개선교육" },
];

function isActive(pathname: string, href: string) {
  const current = pathname.replace(/\/$/, "") || "/";
  const target = href.split("#")[0].split("?")[0].replace(/\/$/, "") || "/";
  return current === target || (target !== "/" && current.startsWith(target + "/"));
}

function linkClass(active: boolean) {
  return active
    ? "whitespace-nowrap rounded-full border-2 border-[#173968] bg-[#173968] px-3.5 py-2 !text-white shadow-[0_8px_18px_rgba(23,57,104,0.22)] hover:!text-white"
    : "whitespace-nowrap rounded-full border-2 border-slate-300 bg-white px-3.5 py-2 text-[#111827] hover:border-[#173968] hover:bg-[#173968] hover:!text-white";
}

export default function GlobalSiteHeader() {
  const pathname = usePathname() || "/";
  const courseActive = isActive(pathname, "/courses");
  const [courseMenuOpen, setCourseMenuOpen] = useState(false);

  function closeCourseMenu() {
    setCourseMenuOpen(false);
  }

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 text-slate-950 shadow-sm backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-3 py-2 sm:px-6 sm:py-3 lg:flex-row lg:flex-nowrap lg:items-center lg:justify-between lg:px-8">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <Link href="/" className="flex min-w-0 flex-col text-left" aria-label="ResetEdu 재발방지교육센터 홈" onClick={closeCourseMenu}>
            <span className="text-base font-black leading-tight text-[#173968] sm:text-xl">ResetEdu 재발방지교육센터</span>
            <span className="text-[11px] font-bold leading-tight text-slate-500 sm:text-xs">Prevention Education Center</span>
          </Link>
          <div className="shrink-0 lg:hidden">
            <AuthNav />
          </div>
        </div>

        <nav aria-label="주요 메뉴" className="flex w-full gap-1 overflow-x-auto pb-1 text-sm font-bold text-slate-700 [-webkit-overflow-scrolling:touch] lg:w-auto lg:items-center lg:justify-center lg:gap-2 lg:overflow-visible lg:pb-0">
          <Link href="/about" className={linkClass(isActive(pathname, "/about"))} onClick={closeCourseMenu}>센터소개</Link>

          <div className="relative shrink-0" onMouseEnter={() => setCourseMenuOpen(true)} onMouseLeave={closeCourseMenu}>
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={courseMenuOpen}
              onClick={() => setCourseMenuOpen((open) => !open)}
              onBlur={(event) => {
                if (!event.currentTarget.parentElement?.contains(event.relatedTarget as Node | null)) closeCourseMenu();
              }}
              className={linkClass(courseActive) + " cursor-pointer"}
            >
              교육과정
            </button>
            {courseMenuOpen ? (
              <div className="grid min-w-[260px] gap-1 rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_18px_45px_rgba(15,23,42,0.16)] lg:absolute lg:left-0 lg:top-full" role="menu">
                {courseLinks.map((item) => (
                  <Link
                    key={item.href + item.label}
                    href={item.href}
                    role="menuitem"
                    onClick={closeCourseMenu}
                    className="rounded-xl px-3 py-2 text-sm font-bold text-slate-800 hover:bg-[#173968] hover:!text-white focus:bg-[#173968] focus:!text-white focus:outline-none"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>

          {primaryNavItems.slice(1).map((item) => (
            <Link key={item.href} href={item.href} className={linkClass(isActive(pathname, item.href))} onClick={closeCourseMenu}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden lg:block">
          <AuthNav />
        </div>
      </div>
    </header>
  );
}
