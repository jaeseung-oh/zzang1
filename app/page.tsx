"use client";

import { useEffect, useRef, useState } from "react";
import ReviewBoard from "./components/review-board";
import HomeUserSummary from "./components/home-user-summary";
import { onAuthStateChanged, type User } from "firebase/auth";
import { getFirebaseServices } from "@/lib/firebase/client";

const trustIndicators = [
  {
    title: "자발적 이수 확인",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="1.8">
        <path d="M12 3l7 4v5c0 4.5-3 7.8-7 9-4-1.2-7-4.5-7-9V7l7-4Z" />
        <path d="M9.5 12.5l1.8 1.8L15 10.7" />
      </svg>
    ),
  },
  {
    title: "수강 후 수료증 안내",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="1.8">
        <path d="M12 8v4l3 3" />
        <circle cx="12" cy="12" r="9" />
      </svg>
    ),
  },
  {
    title: "체계적인 학습 구성",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="1.8">
        <path d="M4 6h16v12H4z" />
        <path d="M8 10h8M8 14h5" />
      </svg>
    ),
  },
  {
    title: "온라인 수강 진행",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="1.8">
        <path d="M4 7h16M7 4v6m10-6v6M5 11h14v8H5z" />
      </svg>
    ),
  },
  {
    title: "3단계 간편 절차",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="1.8">
        <path d="M12 3v18M3 12h18" />
      </svg>
    ),
  },
  {
    title: "실천 계획 정리",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="1.8">
        <path d="M6 20h12M8 20V10m8 10V6M12 20V4" />
      </svg>
    ),
  },
];

const courseCards = [
  {
    title: "음주운전 예방교육 6강",
    summary: "현재 등록된 교육 영상을 중심으로 위험성 인지, 금주 실천 계획, 생활 패턴 점검, 책임 의식 정리를 돕는 구성입니다.",
    tags: ["핵심 영상 수강", "금주 계획", "재발 방지"],
    image: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80",
    icon: (
      <svg viewBox="0 0 24 24" className="h-7 w-7 fill-none stroke-current" strokeWidth="1.8">
        <path d="M5 16l1.5-5h11L19 16" />
        <path d="M7 16h10M8 11l1-3h6l1 3" />
        <circle cx="7.5" cy="17.5" r="1.5" />
        <circle cx="16.5" cy="17.5" r="1.5" />
      </svg>
    ),
  },
  {
    title: "성범죄 예방 교육",
    summary: "경계 인식, 관계 윤리, 피해 공감, 재발 방지 책임 인식을 중심으로 구성한 교육 프로그램입니다.",
    tags: ["관계 인식", "윤리 교육", "재발 방지"],
    image: "https://images.unsplash.com/photo-1528740561666-dc2479dc08ab?auto=format&fit=crop&w=1200&q=80",
    icon: (
      <svg viewBox="0 0 24 24" className="h-7 w-7 fill-none stroke-current" strokeWidth="1.8">
        <path d="M12 4v16M5 8h14M7 8l5 10 5-10" />
      </svg>
    ),
  },
  {
    title: "사기 예방 교육",
    summary: "신뢰 회복, 문서 책임, 거래 윤리, 재발방지 계획 정리를 다루는 교육 과정입니다.",
    tags: ["문서 책임", "신뢰 회복", "계획 수립"],
    image: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=1200&q=80",
    icon: (
      <svg viewBox="0 0 24 24" className="h-7 w-7 fill-none stroke-current" strokeWidth="1.8">
        <path d="M8 12l2.5 2.5L16 9" />
        <path d="M4 7h5l3 3h8v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7z" />
      </svg>
    ),
  },
];

const processSteps = [
  {
    step: "01",
    title: "교육 신청",
    body: "사건 유형에 맞는 과정을 선택하고 필요한 정보를 간단히 확인합니다.",
  },
  {
    step: "02",
    title: "온라인 수강 진행",
    body: "별도 방문 없이 온라인으로 교육을 수강하며 필요한 준비를 함께 진행합니다.",
  },
  {
    step: "03",
    title: "수료 확인 및 발급",
    body: "수강 완료 후 필요한 서류를 확인하고 발급 절차를 빠르게 마무리합니다.",
  },
];

const documents = [
  {
    title: "학습확인서",
    body: "온라인 수강 및 교육 이수 내역 확인용",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current" strokeWidth="1.8">
        <path d="M7 3h7l5 5v13H7z" />
        <path d="M14 3v5h5M10 13h6M10 17h6" />
      </svg>
    ),
  },
  {
    title: "금주 실천 서약서",
    body: "실천 의지와 향후 계획을 강조하는 서류",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current" strokeWidth="1.8">
        <path d="M12 21c4-4 7-6.8 7-11a4 4 0 0 0-7-2.5A4 4 0 0 0 5 10c0 4.2 3 7 7 11Z" />
      </svg>
    ),
  },
  {
    title: "재발방지 계획서",
    body: "생활 관리와 실천 방향을 정리하는 계획 문서",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current" strokeWidth="1.8">
        <path d="M6 4h12v16H6z" />
        <path d="M9 9h6M9 13h6M9 17h4" />
      </svg>
    ),
  },
];

const faqs = [
  {
    title: "교육은 모두 온라인인가요?",
    body: "네. 전 과정 온라인 수강 기준으로 구성되어 있어 별도 방문 없이 진행 가능합니다.",
  },
  {
    title: "발급 서류는 어떤 용도인가요?",
    body: "민간 교육 이수 사실과 실천 계획을 정리하는 확인용 자료로 안내됩니다. 실제 제출 필요성과 활용 가능성은 제출처 기준을 먼저 확인해 주세요.",
  },
  {
    title: "신청 후 절차는 복잡하지 않나요?",
    body: "사건 유형 확인, 수강, 발급의 3단계 구조로 최대한 단순하게 구성했습니다.",
  },
];

const stats = [
  { label: "상시 접수 운영", value: "24H" },
  { label: "온라인 수강", value: "간편" },
  { label: "발급 서류", value: "3종" },
];


const educationMenuItems = [
  "음주운전 예방교육",
  "사기 예방교육",
  "성폭력 예방교육",
  "마약 예방교육",
  "도박 예방교육",
  "폭력 예방교육",
  "재범방지 종합교육",
];

function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <div data-reveal style={{ ["--delay" as string]: `${delay}ms` }} className={className}>
      {children}
    </div>
  );
}

export default function HomePage() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isEducationMenuOpen, setIsEducationMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const educationMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 24);
    const handlePointerDown = (event: PointerEvent) => {
      if (!educationMenuRef.current?.contains(event.target as Node)) {
        setIsEducationMenuOpen(false);
      }
    };

    let unsubscribeAuth = () => {};

    try {
      const { auth } = getFirebaseServices();
      unsubscribeAuth = onAuthStateChanged(auth, (user) => {
        setCurrentUser(user && !user.isAnonymous ? user : null);
      });
    } catch (error) {
      console.error(error);
    }

    handleScroll();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
          }
        });
      },
      { threshold: 0.14, rootMargin: "0px 0px -40px 0px" }
    );

    const nodes = document.querySelectorAll("[data-reveal]");
    nodes.forEach((node) => observer.observe(node));
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("pointerdown", handlePointerDown);

    return () => {
      observer.disconnect();
      unsubscribeAuth();
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("pointerdown", handlePointerDown);
    };
  }, []);

  return (
    <main className="min-h-screen break-keep bg-[radial-gradient(circle_at_top_left,rgba(216,179,106,0.16),transparent_28%),linear-gradient(180deg,#f8fafc_0%,#eef3f8_100%)] text-slate-900">
      <style jsx>{`
        [data-reveal] {
          opacity: 0;
          transform: translateY(32px);
          transition: opacity 800ms ease, transform 800ms ease;
          transition-delay: var(--delay, 0ms);
        }

        [data-reveal].is-visible {
          opacity: 1;
          transform: translateY(0);
        }
      `}</style>
      <header className="fixed inset-x-0 top-0 z-50">
        <div className="mx-auto mt-4 max-w-7xl px-4 sm:px-6 lg:px-8">
          <div
            className={
              isScrolled
                ? "flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white/92 px-5 py-3 shadow-[0_22px_70px_rgba(3,10,20,0.18)] backdrop-blur-xl transition-all duration-300"
                : "flex items-center justify-between rounded-2xl border border-white/15 bg-white/80 px-5 py-4 shadow-[0_18px_60px_rgba(3,10,20,0.14)] backdrop-blur-xl transition-all duration-300"
            }
          >
            <a href="#" className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#06101b] text-[#e9c98d] shadow-lg">
                <svg viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current" strokeWidth="1.8">
                  <path d="M12 3l7 4v5c0 4.5-3 7.8-7 9-4-1.2-7-4.5-7-9V7l7-4Z" />
                  <path d="M9.5 12.5l1.8 1.8L15 10.7" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Premium Education</p>
                <p className="text-lg font-bold text-[#06101b]">리셋에듀센터</p>
              </div>
            </a>

            <nav className="hidden items-center gap-8 text-sm font-medium text-slate-700 md:flex">
              <a href="/about" className="transition hover:text-[#06101b]">센터소개</a>
              <div ref={educationMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setIsEducationMenuOpen((prev) => !prev)}
                  aria-expanded={isEducationMenuOpen}
                  aria-haspopup="menu"
                  className="inline-flex min-h-11 items-center gap-2 rounded-full border border-transparent px-3 py-2 text-[#24364f] transition hover:border-[#d7e1ee] hover:bg-[#f5f9ff] hover:text-[#06101b]"
                >
                  교육과정
                  <svg viewBox="0 0 20 20" className={`h-4 w-4 fill-none stroke-current transition ${isEducationMenuOpen ? "rotate-180" : ""}`} strokeWidth="1.8">
                    <path d="m5 7.5 5 5 5-5" />
                  </svg>
                </button>
                {isEducationMenuOpen ? (
                  <div className="absolute left-1/2 top-full z-20 mt-3 w-72 -translate-x-1/2 rounded-[1.5rem] border border-[#d6e0ec] bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-3 text-[13px] text-[#24364f] shadow-[0_18px_50px_rgba(3,10,20,0.16)]">
                    <div className="space-y-1">
                      {educationMenuItems.map((item) => (
                        <a
                          key={item}
                          href="#courses"
                          onClick={() => setIsEducationMenuOpen(false)}
                          className="flex min-h-11 items-center rounded-xl border border-transparent px-4 py-2.5 font-semibold text-[#24364f] transition hover:border-[#d7e1ee] hover:bg-[#eef5ff] hover:text-[#06101b]"
                        >
                          {item}
                        </a>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
              <a href="#documents" className="transition hover:text-[#06101b]">수료증 안내</a>
              <a href="#reviews" className="transition hover:text-[#06101b]">수강후기</a>
              <a href="#faq" className="transition hover:text-[#06101b]">자주 묻는 질문</a>
            </nav>

            {currentUser ? null : (
              <div className="flex items-center gap-3">
                <a href="/login" className="inline-flex items-center justify-center rounded-full border border-[#d8e1ef] bg-white px-4 py-3 text-sm font-bold text-[#0b1628] shadow-[0_10px_24px_rgba(7,16,32,0.08)] transition hover:-translate-y-0.5 hover:border-[#c7d3e6] hover:bg-[#f8fbff] hover:text-[#08111d] sm:px-5">
                  로그인
                </a>
                <a href="/signup" className="inline-flex items-center justify-center rounded-full bg-[linear-gradient(135deg,#d7b168_0%,#efd9aa_100%)] px-5 py-3 text-sm font-bold text-[#161109] shadow-[0_14px_28px_rgba(164,126,54,0.22)] transition hover:-translate-y-0.5 hover:brightness-105">
                  회원가입
                </a>
              </div>
            )}
          </div>
        </div>
      </header>

      <section id="center-intro" className="relative min-h-screen overflow-hidden">
        <div className="absolute inset-0">
          <img src="https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=1600&q=80" alt="민간 교육 배경" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(6,16,27,0.88),rgba(8,20,37,0.62))]" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:32px_32px] opacity-30" />
        </div>

        <div className="relative mx-auto flex min-h-screen max-w-7xl items-center px-4 pb-20 pt-36 sm:px-6 lg:px-8">
          <div className="grid w-full items-center gap-10 xl:grid-cols-[minmax(0,1.08fr)_minmax(340px,0.92fr)]">
            <Reveal delay={0}>
              <div>
                <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#e9c98d]/30 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-[#f6deb0]">
                  성찰과 재발 방지를 위한 민간 온라인 교육 플랫폼
                </div>
                <h1 className="max-w-4xl text-4xl font-black leading-[1.08] tracking-[-0.045em] text-white sm:text-5xl xl:text-[5.15rem]">
                  <span className="block break-keep">진정성 있는 성찰과 실천을 돕습니다.</span>
                  <span className="mt-2 block break-keep text-[#f6deb0]">민간 재발 방지 교육과 자기점검의 출발점</span>
                </h1>
                <p className="mt-6 max-w-[44rem] break-keep text-base leading-8 text-slate-200 sm:text-lg">
                  사건 이후 자신의 생활을 차분히 돌아보고, 재발 방지를 위한 학습과 실천 계획을 스스로 정리할 수 있도록 돕습니다.
                </p>
                <div className="mt-8 flex flex-wrap gap-4">
                  {currentUser ? (
                    <a href="/course-room" className="inline-flex items-center justify-center rounded-full bg-[linear-gradient(135deg,#d7b168_0%,#efd9aa_100%)] px-7 py-4 text-sm font-bold text-[#161109] shadow-[0_18px_32px_rgba(164,126,54,0.24)] transition hover:-translate-y-1 hover:brightness-105">
                      내 강의실 바로가기
                    </a>
                  ) : (
                    <a href="/signup" className="inline-flex items-center justify-center rounded-full bg-[linear-gradient(135deg,#d7b168_0%,#efd9aa_100%)] px-7 py-4 text-sm font-bold text-[#161109] shadow-[0_18px_32px_rgba(164,126,54,0.24)] transition hover:-translate-y-1 hover:brightness-105">
                      회원가입 후 시작하기
                    </a>
                  )}
                  <a href="#process" className="inline-flex items-center justify-center rounded-full border border-[#d5deeb] bg-white px-7 py-4 text-sm font-semibold text-[#10213f] shadow-[0_12px_24px_rgba(15,23,42,0.12)] transition hover:-translate-y-0.5 hover:border-[#c4d2e4] hover:bg-[#f8fbff]">
                    수강 절차 보기
                  </a>
                </div>
                <div className="mt-10 flex flex-wrap gap-6 text-sm text-slate-200">
                  {stats.map((item) => (
                    <div key={item.label}>
                      <p className="text-3xl font-black text-white">{item.value}</p>
                      <p>{item.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>

            <Reveal delay={120} className="xl:justify-self-end">
              {currentUser ? (
                <HomeUserSummary currentUser={currentUser} />
              ) : (
                <div className="max-w-[500px] rounded-[2rem] border border-white/15 bg-white/10 p-6 text-white shadow-[0_20px_80px_rgba(6,16,27,0.38)] backdrop-blur-xl sm:p-7">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs uppercase tracking-[0.24em] text-[#f6deb0]">Urgent Briefing</p>
                      <h2 className="mt-2 break-keep text-[1.45rem] font-bold leading-tight sm:text-[1.7rem]">온라인 수강 · 발급 안내</h2>
                    </div>
                    <div className="shrink-0 rounded-2xl bg-[#d8b36a]/15 p-3 text-[#f6deb0]">
                      <svg viewBox="0 0 24 24" className="h-7 w-7 fill-none stroke-current" strokeWidth="1.8">
                        <path d="M12 8v4l3 3" />
                        <circle cx="12" cy="12" r="9" />
                      </svg>
                    </div>
                  </div>
                  <div className="mt-6 grid gap-4">
                    <div className="rounded-2xl border border-white/10 bg-[#06101b]/50 p-4">
                      <p className="text-sm text-slate-300">교육 방식</p>
                      <p className="mt-2 break-keep text-xl font-semibold leading-snug">온라인 수강 진행</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-[#06101b]/50 p-4">
                      <p className="text-sm text-slate-300">안내 서류 구성</p>
                      <p className="mt-2 break-keep text-xl font-semibold leading-snug">학습확인서 · 서약서 · 계획서</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-[#06101b]/50 p-4">
                      <p className="text-sm text-slate-300">추천 대상</p>
                      <p className="mt-2 break-keep text-xl font-semibold leading-snug">교육 이수 사실과 실천 의지를 정리하고 싶은 분</p>
                    </div>
                  </div>
                  <div className="mt-6 rounded-2xl border border-[#e9c98d]/20 bg-[#d8b36a]/10 p-4 text-sm leading-7 text-[#f8e7c4] break-keep">
                    본 서비스는 법률 자문 기관이 아닌 민간 교육 플랫폼으로, 자발적인 성찰과 생활 실천 계획 정리를 돕습니다.
                  </div>
                </div>
              )}
            </Reveal>
          </div>
        </div>
      </section>

      <Reveal delay={40}>
        <section className="relative z-10 -mt-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-4 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_18px_60px_rgba(3,10,20,0.14)] md:grid-cols-3 lg:grid-cols-6">
              {trustIndicators.map((item) => (
                <div key={item.title} className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-4">
                  <div className="rounded-xl bg-[#06101b] p-2 text-[#e9c98d]">{item.icon}</div>
                  <span className="break-keep text-sm font-semibold text-slate-800">{item.title}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </Reveal>

      <Reveal>
        <section id="courses" className="py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-4 text-center">
              <div className="mx-auto inline-flex rounded-full border border-[#e4d7bb] bg-[#f7f0e2] px-4 py-2 text-xs font-bold uppercase tracking-[0.26em] text-[#6f531b]">Core Courses</div>
              <h2 className="text-3xl font-black tracking-[-0.03em] text-[#06101b] sm:text-5xl">사건 유형별 핵심 교육 과정</h2>
              <p className="mx-auto max-w-3xl break-keep text-base leading-8 text-slate-600">각 과정은 자기점검, 생활 습관 개선, 책임 의식 회복, 실천 계획 정리에 초점을 맞춰 구성되어 있습니다.</p>
            </div>
            <div className="mt-14 grid gap-6 lg:grid-cols-3">
              {courseCards.map((card, index) => (
                <Reveal key={card.title} delay={index * 100}>
                  <article className="group overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_18px_60px_rgba(3,10,20,0.14)] transition hover:-translate-y-2">
                    <div className="relative h-56 overflow-hidden">
                      <img src={card.image} alt={card.title} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#06101b]/85 to-transparent" />
                      <div className="absolute left-6 top-6 rounded-2xl bg-white/15 p-3 text-[#f6deb0] backdrop-blur-xl">{card.icon}</div>
                      <div className="absolute bottom-6 left-6">
                        <span className="rounded-full bg-[#d8b36a] px-3 py-1 text-xs font-bold text-[#06101b]">6강 구성</span>
                      </div>
                    </div>
                    <div className="p-7">
                      <h3 className="text-2xl font-black text-[#06101b]">{card.title}</h3>
                      <p className="mt-4 break-keep text-sm leading-7 text-slate-600">{card.summary}</p>
                      <div className="mt-6 flex flex-wrap gap-2">
                        {card.tags.map((tag) => (
                          <span key={tag} className="rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700">{tag}</span>
                        ))}
                      </div>
                    </div>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      </Reveal>

      <Reveal>
        <section id="process" className="bg-[#06101b] py-24 text-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <div className="mx-auto inline-flex rounded-full bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.24em] text-[#f6deb0]">Simple Process</div>
              <h2 className="mt-5 text-3xl font-black tracking-[-0.03em] sm:text-5xl">3단계로 끝나는 간단한 수강 절차</h2>
            </div>
            <div className="mt-14 grid gap-8 lg:grid-cols-3">
              {processSteps.map((item, index) => (
                <Reveal key={item.step} delay={index * 120}>
                  <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
                    <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#d8b36a] text-lg font-black text-[#06101b]">{item.step}</div>
                    <h3 className="text-2xl font-bold">{item.title}</h3>
                    <p className="mt-4 break-keep text-sm leading-7 text-slate-300">{item.body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      </Reveal>

      <Reveal>
        <section id="documents" className="py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid items-center gap-10 lg:grid-cols-[0.95fr_1.05fr]">
              <div>
                <div className="inline-flex rounded-full border border-[#e4d7bb] bg-[#f7f0e2] px-4 py-2 text-xs font-bold uppercase tracking-[0.24em] text-[#6f531b]">Documents</div>
                <h2 className="mt-5 text-3xl font-black tracking-[-0.03em] text-[#06101b] sm:text-5xl">이수 후 확인 가능한 민간 교육 자료</h2>
                <p className="mt-6 max-w-2xl break-keep text-base leading-8 text-slate-600">수강생의 자발적인 교육 참여와 실천 의지를 정리할 수 있도록 돕는 민간 교육 확인 자료 예시입니다.</p>
                <div className="mt-8 grid gap-4">
                  {documents.map((item, index) => (
                    <Reveal key={item.title} delay={index * 100}>
                      <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_18px_60px_rgba(3,10,20,0.08)]">
                        <div className="rounded-2xl bg-[#06101b] p-3 text-[#e9c98d]">{item.icon}</div>
                        <div>
                          <p className="font-bold text-[#06101b]">{item.title}</p>
                          <p className="break-keep text-sm text-slate-500">{item.body}</p>
                        </div>
                      </div>
                    </Reveal>
                  ))}
                </div>
              </div>
              <div>
                <div className="relative flex min-h-[460px] items-center justify-center rounded-[2rem] bg-gradient-to-br from-[#081425] to-[#06101b] p-10 shadow-[0_20px_80px_rgba(6,16,27,0.32)]">
                  <div className="absolute inset-0 rounded-[2rem] border border-[#d8b36a]/15" />
                  <div className="absolute left-10 top-16 w-56 rotate-[-7deg] rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl">
                    <div className="mb-4 flex items-center justify-between">
                      <span className="rounded-full border border-[#e4d7bb] bg-[#fbf5e8] px-3 py-1 text-xs font-bold text-[#6f531b]">Document 01</span>
                      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-slate-400" strokeWidth="1.8"><path d="M7 3h7l5 5v13H7z" /><path d="M14 3v5h5" /></svg>
                    </div>
                    <h3 className="text-lg font-black text-[#06101b]">학습확인서</h3>
                    <div className="mt-4 space-y-2"><div className="h-2 rounded-full bg-slate-200" /><div className="h-2 w-5/6 rounded-full bg-slate-200" /><div className="h-2 w-4/6 rounded-full bg-slate-200" /></div>
                  </div>
                  <div className="absolute top-10 z-10 w-64 rotate-[2deg] rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
                    <div className="mb-4 flex items-center justify-between">
                      <span className="rounded-full border border-[#e4d7bb] bg-[#fbf5e8] px-3 py-1 text-xs font-bold text-[#6f531b]">Document 02</span>
                      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-slate-400" strokeWidth="1.8"><path d="M12 21c4-4 7-6.8 7-11a4 4 0 0 0-7-2.5A4 4 0 0 0 5 10c0 4.2 3 7 7 11Z" /></svg>
                    </div>
                    <h3 className="text-lg font-black text-[#06101b]">금주 실천 서약서</h3>
                    <div className="mt-4 space-y-2"><div className="h-2 rounded-full bg-slate-200" /><div className="h-2 w-4/5 rounded-full bg-slate-200" /><div className="h-2 w-3/5 rounded-full bg-slate-200" /><div className="mt-5 h-10 rounded-xl bg-[#d8b36a]/15" /></div>
                  </div>
                  <div className="absolute bottom-14 right-10 w-56 rotate-[8deg] rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl">
                    <div className="mb-4 flex items-center justify-between">
                      <span className="rounded-full border border-[#e4d7bb] bg-[#fbf5e8] px-3 py-1 text-xs font-bold text-[#6f531b]">Document 03</span>
                      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-slate-400" strokeWidth="1.8"><path d="M6 4h12v16H6z" /><path d="M9 9h6M9 13h6M9 17h4" /></svg>
                    </div>
                    <h3 className="text-lg font-black text-[#06101b]">재발방지 계획서</h3>
                    <div className="mt-4 space-y-2"><div className="h-2 rounded-full bg-slate-200" /><div className="h-2 w-5/6 rounded-full bg-slate-200" /><div className="h-2 w-3/6 rounded-full bg-slate-200" /></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </Reveal>

      <Reveal>
        <section id="reviews" className="pb-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-[2rem] bg-[linear-gradient(135deg,#0b1424_0%,#13223d_100%)] p-8 text-white shadow-[0_20px_70px_rgba(6,16,27,0.22)] lg:p-10">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <div className="inline-flex rounded-full bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.24em] text-[#f0cb85]">Reviews Board</div>
                  <h2 className="mt-5 text-3xl font-black tracking-[-0.03em] sm:text-4xl">수강후기</h2>
                </div>
                <p className="max-w-2xl break-keep text-sm leading-7 text-white/70">로그인한 회원이 직접 등록한 후기 게시판입니다. 후기는 작성자 개인 경험이며, 운영자가 결과를 보증하지 않습니다.</p>
              </div>
              <div className="mt-8">
                <ReviewBoard />
              </div>
            </div>
          </div>
        </section>
      </Reveal>

      <Reveal>
        <section id="faq" className="pb-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-[2rem] bg-white p-8 shadow-[0_18px_60px_rgba(3,10,20,0.14)] lg:p-10">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <div className="inline-flex rounded-full border border-[#e4d7bb] bg-[#f7f0e2] px-4 py-2 text-xs font-bold uppercase tracking-[0.24em] text-[#6f531b]">FAQ</div>
                  <h2 className="mt-5 text-3xl font-black tracking-[-0.03em] text-[#06101b] sm:text-4xl">자주 묻는 질문</h2>
                </div>
                <p className="max-w-2xl break-keep text-sm leading-7 text-slate-600">실제 신청 전에 자주 확인하는 내용을 정리했습니다.</p>
              </div>
              <div className="mt-8 grid gap-4 lg:grid-cols-3">
                {faqs.map((item, index) => (
                  <Reveal key={item.title} delay={index * 100}>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                      <h3 className="text-lg font-bold text-[#06101b]">{item.title}</h3>
                      <p className="mt-3 break-keep text-sm leading-7 text-slate-600">{item.body}</p>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          </div>
        </section>
      </Reveal>

    </main>
  );
}
