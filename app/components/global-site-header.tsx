"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import AuthNav from "@/app/components/auth-nav";
import { centerLogoPath } from "@/app/components/SealStamp";
import { buttonClass } from "@/app/components/ui/button-styles";
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
];

const mobileMenuItems = [
  { href: "/courses", label: "교육과정" },
  { href: "/prevention-documents", label: "제공자료" },
  { href: "/#process", label: "이용방법" },
  { href: "/about#support", label: "고객지원" },
  { href: "/dashboard", label: "로그인 또는 내 강의실" },
];

function isActive(pathname: string, href: string) {
  const current = pathname.replace(/\/$/, "") || "/";
  const target = href.split("#")[0].split("?")[0].replace(/\/$/, "") || "/";
  return current === target || (target !== "/" && current.startsWith(target + "/"));
}

function linkClass(active: boolean) {
  return active
    ? "whitespace-nowrap rounded-full border-2 border-[#173968] bg-[#173968] px-3 py-1.5 !text-white shadow-[0_8px_18px_rgba(23,57,104,0.22)] hover:!text-white sm:px-3.5 sm:py-2"
    : "whitespace-nowrap rounded-full border-2 border-slate-300 bg-white px-3 py-1.5 text-[#111827] hover:border-[#173968] hover:bg-[#173968] hover:!text-white sm:px-3.5 sm:py-2";
}

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg className="h-5 w-5 fill-none stroke-current" viewBox="0 0 24 24" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
      {open ? <><path d="M6 6l12 12" /><path d="M18 6 6 18" /></> : <><path d="M4 7h16" /><path d="M4 12h16" /><path d="M4 17h16" /></>}
    </svg>
  );
}

export default function GlobalSiteHeader() {
  const pathname = usePathname() || "/";
  const courseActive = isActive(pathname, "/courses");
  const [courseMenuOpen, setCourseMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  function closeCourseMenu() {
    setCourseMenuOpen(false);
  }

  function closeAllMenus() {
    setCourseMenuOpen(false);
    setMobileMenuOpen(false);
  }

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 text-slate-950 shadow-sm backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-2 sm:px-6 lg:hidden">
        <Link href="/" className="flex min-w-0 flex-1 items-center gap-2 text-left" aria-label="리셋 재범방지교육센터 홈" onClick={closeAllMenus}>
          <img src={centerLogoPath} alt="리셋 재범방지교육센터 로고" className="h-9 w-9 shrink-0 object-contain" />
          <span className="min-w-0 truncate text-[15px] font-black leading-tight text-[#173968]">리셋 재범방지교육센터</span>
        </Link>
        <Link href="/courses/apply?category=dui" className={buttonClass("warning", "sm", "min-h-10 rounded-full px-3 text-xs font-black !text-black hover:!text-black")}>수강 신청</Link>
        <button type="button" aria-label={mobileMenuOpen ? "모바일 메뉴 닫기" : "모바일 메뉴 열기"} aria-expanded={mobileMenuOpen} onClick={() => setMobileMenuOpen((open) => !open)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-950 shadow-sm">
          <MenuIcon open={mobileMenuOpen} />
        </button>
      </div>

      {mobileMenuOpen ? (
        <div className="fixed inset-x-0 top-[61px] z-[80] max-h-[calc(100dvh-61px)] overflow-y-auto bg-white px-4 py-5 shadow-[0_24px_70px_rgba(15,23,42,0.18)] lg:hidden">
          <div className="mx-auto mb-4 max-w-md rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <AuthNav variant="panel" onNavigate={closeAllMenus} />
          </div>
          <nav aria-label="모바일 메뉴" className="mx-auto grid max-w-md gap-2 text-base font-black text-slate-950 sm:text-lg">
            {mobileMenuItems.map((item) => (
              <Link key={item.href + item.label} href={item.href} onClick={closeAllMenus} className="flex min-h-[52px] items-center rounded-2xl border border-slate-200 bg-white px-4 py-3 transition hover:border-[#173968] hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-[#173968]/20">
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mx-auto mt-4 max-w-md rounded-2xl bg-[#f8fafc] p-4 text-sm leading-6 text-slate-700">
            교육 이수와 실천자료 준비를 한 흐름으로 진행합니다.
          </div>
        </div>
      ) : null}

      <div className="mx-auto hidden max-w-7xl flex-col gap-2 px-6 py-3 lg:flex lg:flex-row lg:flex-nowrap lg:items-center lg:justify-between lg:px-8">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <Link href="/" className="flex min-w-0 flex-1 items-center gap-2 text-left" aria-label="리셋 재범방지교육센터 홈" onClick={closeCourseMenu}>
            <img src={centerLogoPath} alt="리셋 재범방지교육센터 로고" className="h-11 w-11 shrink-0 object-contain" />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-xl font-black leading-tight text-[#173968]">리셋 재범방지교육센터</span>
              <span className="text-xs font-bold leading-tight text-slate-500">Prevention Education Center</span>
            </span>
          </Link>
        </div>

        <nav aria-label="주요 메뉴" className="flex w-auto items-center justify-center gap-2 overflow-visible pb-0 text-sm font-bold text-slate-700">
          <Link href="/about" className={linkClass(isActive(pathname, "/about"))} onClick={closeCourseMenu}>센터소개</Link>

          <div className="relative shrink-0" onMouseEnter={() => setCourseMenuOpen(true)}>
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
              <>
                <button type="button" aria-label="교육과정 메뉴 닫기" className="fixed inset-0 z-[60] cursor-default bg-transparent" onClick={closeCourseMenu} />
                <div className="absolute left-0 top-full z-[70] grid max-h-[min(70vh,420px)] w-[300px] gap-1 overflow-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_18px_45px_rgba(15,23,42,0.18)]" role="menu">
                  {courseLinks.map((item) => (
                    <Link key={item.href + item.label} href={item.href} role="menuitem" onClick={closeCourseMenu} className="rounded-xl px-3 py-2 text-sm font-bold text-slate-800 hover:bg-[#173968] hover:!text-white focus:bg-[#173968] focus:!text-white focus:outline-none">
                      {item.label}
                    </Link>
                  ))}
                </div>
              </>
            ) : null}
          </div>

          {primaryNavItems.slice(1).map((item) => (
            <Link key={item.href} href={item.href} className={linkClass(isActive(pathname, item.href))} onClick={closeCourseMenu}>
              {item.label}
            </Link>
          ))}
        </nav>

        <AuthNav />
      </div>
    </header>
  );
}
