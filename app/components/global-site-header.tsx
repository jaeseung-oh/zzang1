"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import AuthNav from "@/app/components/auth-nav";
import { centerLogoPath } from "@/app/components/SealStamp";
import { platformCourseCategories } from "@/lib/course/platform-courses";

const primaryNavItems = [
  { href: "/about", label: "센터소개" },
  { href: "/certificate", label: "수료증 안내" },
  { href: "/#process", label: "이용방법" },
  { href: "/about#support", label: "고객지원" },
];

const courseLinks = [
  { href: "/courses", label: "전체 교육과정" },
  ...platformCourseCategories.map((course) => ({ href: "/courses/" + course.slug, label: course.title })),
];

const mobileMenuItems = [
  { href: "/about", label: "센터소개" },
  { href: "/courses", label: "교육과정" },
  { href: "/certificate", label: "수료증 안내" },
  { href: "/#process", label: "이용방법" },
  { href: "/about#support", label: "고객지원" },
  { href: "/login", label: "로그인" },
  { href: "/signup", label: "회원가입" },
  { href: "/courses/apply?category=dui", label: "교육 신청하기" },
];

function isActive(pathname: string, href: string) {
  const current = pathname.replace(/\/$/, "") || "/";
  const target = href.split("#")[0].split("?")[0].replace(/\/$/, "") || "/";
  return current === target || (target !== "/" && current.startsWith(target + "/"));
}

function linkClass(active: boolean) {
  return active
    ? "reset-nav-link reset-nav-link-active whitespace-nowrap px-2 py-3 text-[#2457C5]"
    : "reset-nav-link whitespace-nowrap px-2 py-3 text-[#111827]";
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
  const [selectedNavHref, setSelectedNavHref] = useState("");
  const displayedActiveHref = selectedNavHref || (courseActive ? "/courses" : primaryNavItems.find((item) => isActive(pathname, item.href))?.href || "");
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
    <header className="global-site-header sticky top-0 z-50 border-b border-slate-200 bg-white/95 text-slate-950 shadow-sm backdrop-blur">
      <div className="mobile-header-row mx-auto flex max-w-7xl flex-col gap-1 px-3 py-1 sm:px-6 lg:hidden">
        <Link href="/" className="flex min-w-0 flex-nowrap items-center gap-2 text-left" aria-label="리셋 재범방지교육센터 홈" onClick={closeAllMenus}>
          <img src={centerLogoPath} alt="리셋 재범방지교육센터 로고" width={30} height={30} style={{ width: 30, height: 30 }} className="h-[30px] w-[30px] shrink-0 object-contain" />
          <span className="mobile-brand-text min-w-0 whitespace-nowrap text-[14px] font-black leading-none text-[#173968] min-[360px]:text-[15px] min-[390px]:text-[15.5px]">리셋 재범방지교육센터</span>
        </Link>
        <div className="grid w-full grid-cols-[1fr_1fr_1fr_2.5rem] gap-1.5">
          <Link href="/courses" onClick={closeAllMenus} className="flex h-9 min-w-0 items-center justify-center whitespace-nowrap rounded-[10px] border border-[#D8E0E8] bg-white px-1 text-[12px] font-black leading-none text-[#1F2937] shadow-none transition hover:border-[#BFD0EA] hover:bg-[#F1F6FD] hover:text-[#2457C5] focus:outline-none focus:ring-4 focus:ring-[#3B82F6]/15">교육과정</Link>
          <Link href="/login" onClick={closeAllMenus} className="flex h-9 min-w-0 items-center justify-center whitespace-nowrap rounded-[10px] border border-[#D8E0E8] bg-white px-1 text-[12px] font-black leading-none text-[#1F2937] shadow-none transition hover:border-[#BFD0EA] hover:bg-[#F1F6FD] hover:text-[#2457C5] focus:outline-none focus:ring-4 focus:ring-[#3B82F6]/15">로그인</Link>
          <Link href="/signup" onClick={closeAllMenus} className="flex h-9 min-w-0 items-center justify-center whitespace-nowrap rounded-[10px] border border-[#2457C5] bg-[#2457C5] px-1 text-[12px] font-black leading-none !text-white shadow-none transition hover:border-[#1E46A0] hover:bg-[#1E46A0] hover:!text-white focus:outline-none focus:ring-4 focus:ring-[#3B82F6]/15">회원가입</Link>
          <button type="button" aria-label={mobileMenuOpen ? "모바일 메뉴 닫기" : "모바일 메뉴 열기"} aria-expanded={mobileMenuOpen} onClick={() => { setCourseMenuOpen(false); setMobileMenuOpen((open) => !open); }} className={(mobileMenuOpen ? "border-[#173968] bg-[#173968] !text-white" : "border-[#D8E0E8] bg-white text-[#1F2937]") + " flex h-9 min-w-0 items-center justify-center rounded-[10px] border shadow-none transition hover:border-[#BFD0EA] hover:bg-[#F1F6FD] hover:text-[#2457C5] focus:outline-none focus:ring-4 focus:ring-[#3B82F6]/15"}>
            <MenuIcon open={mobileMenuOpen} />
          </button>
        </div>
      </div>

      {mobileMenuOpen ? (
        <div className="mobile-menu-panel fixed inset-x-0 top-[78px] z-[80] border-t border-slate-100 bg-white px-4 py-4 shadow-[0_24px_70px_rgba(15,23,42,0.18)] lg:hidden">
          <nav aria-label="모바일 메뉴" className="mx-auto grid max-w-md gap-2 text-[15px] font-black text-slate-950">
            {mobileMenuItems.map((item) => (
              <Link key={item.href + item.label} href={item.href} onClick={closeAllMenus} className="flex min-h-[48px] items-center justify-center rounded-xl border border-[#D8E0E8] bg-white px-4 py-3 text-center text-[15px] font-black text-[#1F2937] transition hover:border-[#173968] hover:bg-[#F1F6FD] hover:text-[#2457C5] focus:outline-none focus:ring-4 focus:ring-[#173968]/20">
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      ) : null}

      <div className="mx-auto hidden max-w-7xl flex-col gap-2 px-6 py-3 lg:flex lg:flex-row lg:flex-nowrap lg:items-center lg:justify-between lg:px-8">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <Link href="/" className="flex min-w-0 flex-1 items-center gap-2 text-left" aria-label="리셋 재범방지교육센터 홈" onClick={closeCourseMenu}>
            <img src={centerLogoPath} alt="리셋 재범방지교육센터 로고" width={44} height={44} style={{ width: 44, height: 44 }} className="h-11 w-11 shrink-0 object-contain" />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-xl font-black leading-tight text-[#173968]">리셋 재범방지교육센터</span>
              <span className="text-xs font-bold leading-tight text-slate-500">Prevention Education Center</span>
            </span>
          </Link>
        </div>

        <nav aria-label="주요 메뉴" className="flex w-auto items-center justify-center gap-2 overflow-visible pb-0 text-sm font-bold text-slate-700">
          <Link href="/about" className={linkClass(displayedActiveHref === "/about")} onClick={() => { setSelectedNavHref("/about"); closeCourseMenu(); }}>센터소개</Link>

          <div className="relative shrink-0" onMouseEnter={() => setCourseMenuOpen(true)}>
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={courseMenuOpen}
              onClick={() => { setSelectedNavHref("/courses"); setCourseMenuOpen((open) => !open); }}
              onBlur={(event) => {
                if (!event.currentTarget.parentElement?.contains(event.relatedTarget as Node | null)) closeCourseMenu();
              }}
              className={linkClass(displayedActiveHref === "/courses") + " cursor-pointer"}
            >
              교육과정
            </button>
            {courseMenuOpen ? (
              <>
                <button type="button" aria-label="교육과정 메뉴 닫기" className="fixed inset-0 z-[60] cursor-default bg-transparent" onClick={closeCourseMenu} />
                <div className="absolute left-0 top-full z-[70] grid max-h-[min(70vh,420px)] w-[300px] gap-1 overflow-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_18px_45px_rgba(15,23,42,0.18)]" role="menu">
                  {courseLinks.map((item) => (
                    <Link key={item.href + item.label} href={item.href} role="menuitem" onClick={() => { setSelectedNavHref("/courses"); closeCourseMenu(); }} className="reset-dropdown-item rounded-xl px-3 py-2 text-sm font-bold text-slate-800 hover:bg-[#F1F6FD] hover:text-[#2457C5] focus:bg-[#F1F6FD] focus:text-[#2457C5] focus:outline-none">
                      {item.label}
                    </Link>
                  ))}
                </div>
              </>
            ) : null}
          </div>

          {primaryNavItems.slice(1).map((item) => (
            <Link key={item.href} href={item.href} className={linkClass(displayedActiveHref === item.href)} onClick={() => { setSelectedNavHref(item.href); closeCourseMenu(); }}>
              {item.label}
            </Link>
          ))}
        </nav>

        <AuthNav />
      </div>
    </header>
  );
}
