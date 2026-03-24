"use client";

import { useEffect, useMemo, useState } from "react";

type AuthMode = "signup" | "login";

type AuthUser = {
  nickname?: string | null;
  name?: string | null;
  lastAuthMode?: AuthMode | null;
  loginCount?: number | null;
  lastLoginAt?: string | null;
};

const AUTH_API_BASE_URL = (process.env.NEXT_PUBLIC_AUTH_API_BASE_URL ?? "https://reset-edu-kakao-auth.cfv47.workers.dev").replace(/\/$/, "");

const modeCopy: Record<
  AuthMode,
  {
    eyebrow: string;
    title: string;
    intro: string;
    benefits: string[];
    idleTitle: string;
    idleMeta: string;
    readyMessage: string;
    disabledMessage: string;
    kakaoLabel: string;
    pendingMessage: string;
  }
> = {
  signup: {
    eyebrow: "Create Account",
    title: "카카오 계정으로 빠르게 가입하고 민간 교육 수강을 시작합니다",
    intro: "카카오 계정으로 바로 회원가입을 시작하고, 이후 내 강의실과 발급 자료 화면으로 자연스럽게 연결합니다.",
    benefits: [
      "카카오 계정으로 회원가입을 바로 시작할 수 있습니다.",
      "가입 후에는 내 강의실, 수강 자료, 발급 문서 흐름으로 연결할 수 있습니다.",
      "네이버는 추가 연동 계층이 필요해 현재는 카카오만 제공합니다.",
    ],
    idleTitle: "회원가입이 필요합니다",
    idleMeta: "카카오 계정으로 회원가입을 시작할 수 있습니다. 이메일 없이 닉네임과 프로필 기반으로 바로 진입합니다.",
    readyMessage: "카카오 계정으로 회원가입을 시작할 수 있습니다.",
    disabledMessage: "인증 API 주소가 설정되지 않아 카카오 회원가입을 시작할 수 없습니다.",
    kakaoLabel: "카카오로 회원가입",
    pendingMessage: "카카오 회원가입 화면으로 이동하는 중입니다.",
  },
  login: {
    eyebrow: "Member Login",
    title: "카카오 계정으로 로그인하고 내 강의실과 발급 현황을 확인합니다",
    intro: "기존 회원은 카카오 계정으로 빠르게 로그인해 내 강의실, 수강 현황, 발급 자료 흐름으로 이어질 수 있습니다.",
    benefits: [
      "카카오 계정으로 간편하게 로그인할 수 있습니다.",
      "로그인 후에는 내 강의실과 발급 자료 화면으로 바로 이동할 수 있습니다.",
      "현재 네이버 로그인은 추가 연동 계층이 필요해 비활성화되어 있습니다.",
    ],
    idleTitle: "로그인이 필요합니다",
    idleMeta: "카카오 계정으로 로그인할 수 있습니다. 이메일 없이 닉네임과 프로필 기반으로 바로 진입합니다.",
    readyMessage: "카카오 계정으로 로그인할 수 있습니다.",
    disabledMessage: "인증 API 주소가 설정되지 않아 카카오 로그인을 시작할 수 없습니다.",
    kakaoLabel: "카카오로 로그인",
    pendingMessage: "카카오 로그인 화면으로 이동하는 중입니다.",
  },
};

function getApiUrl(path: string, params?: Record<string, string>) {
  const url = new URL(path, `${AUTH_API_BASE_URL}/`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value) {
        url.searchParams.set(key, value);
      }
    });
  }
  return url.toString();
}

function getUserDisplayName(user: AuthUser | null) {
  if (!user) {
    return "회원 로그인 완료";
  }

  return user.nickname || user.name || "회원 로그인 완료";
}

function formatUserMeta(user: AuthUser | null, fallback: string) {
  if (!user) {
    return fallback;
  }

  const parts: string[] = [];
  if (user.lastAuthMode === "signup") {
    parts.push("최근 인증: 회원가입");
  } else if (user.lastAuthMode === "login") {
    parts.push("최근 인증: 로그인");
  }

  if (typeof user.loginCount === "number" && user.loginCount > 0) {
    parts.push(`누적 로그인 ${user.loginCount}회`);
  }

  if (user.lastLoginAt) {
    const date = new Date(user.lastLoginAt);
    if (!Number.isNaN(date.getTime())) {
      parts.push(`마지막 접속 ${date.toLocaleString("ko-KR")}`);
    }
  }

  return parts.join(" · ") || "카카오 프로필 연동 완료";
}

async function fetchCurrentUser() {
  const response = await fetch(getApiUrl("/api/me"), {
    method: "GET",
    credentials: "include",
  });

  const payload = await response.json().catch(() => ({ user: null }));
  if (!response.ok) {
    throw new Error(payload?.message || "현재 로그인 상태를 확인하지 못했습니다.");
  }

  return (payload?.user ?? null) as AuthUser | null;
}

export default function AuthPage({ mode }: { mode: AuthMode }) {
  const copy = modeCopy[mode];
  const hasAuthApiConfig = /^https?:\/\//.test(AUTH_API_BASE_URL);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [message, setMessage] = useState(copy.readyMessage);
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const currentYear = useMemo(() => new Date().getFullYear(), []);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      if (typeof window === "undefined") {
        return;
      }

      const url = new URL(window.location.href);
      const authError = url.searchParams.get("auth_error");
      const loggedOut = url.searchParams.get("logged_out") === "1";

      const clearAuthParams = () => {
        ["auth_error", "login", "mode", "logged_out"].forEach((key) => url.searchParams.delete(key));
        window.history.replaceState({}, document.title, url.toString());
      };

      if (authError) {
        if (!cancelled) {
          setUser(null);
          setMessage(decodeURIComponent(authError));
          setIsError(true);
          setIsLoading(false);
        }
        clearAuthParams();
        return;
      }

      if (!hasAuthApiConfig) {
        if (!cancelled) {
          setUser(null);
          setMessage(copy.disabledMessage);
          setIsError(false);
          setIsLoading(false);
        }
        return;
      }

      try {
        const currentUser = await fetchCurrentUser();
        if (cancelled) {
          return;
        }

        setUser(currentUser);
        setIsError(false);
        setMessage(
          currentUser
            ? "카카오 로그인 상태가 유지되고 있습니다."
            : loggedOut
              ? "로그아웃되었습니다. 다시 진행하려면 카카오 인증을 새로 시작해 주세요."
              : copy.readyMessage
        );
      } catch (error) {
        if (!cancelled) {
          setUser(null);
          setMessage(error instanceof Error ? error.message : "카카오 로그인 처리 중 문제가 발생했습니다.");
          setIsError(true);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }

      if (loggedOut) {
        clearAuthParams();
      }
    };

    void init();

    return () => {
      cancelled = true;
    };
  }, [copy.disabledMessage, copy.readyMessage, hasAuthApiConfig]);

  const displayName = getUserDisplayName(user);
  const userMeta = formatUserMeta(user, copy.idleMeta);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_12%_12%,rgba(207,111,63,0.18),transparent_20%),radial-gradient(circle_at_88%_0%,rgba(23,58,52,0.16),transparent_24%),linear-gradient(180deg,#fcf7f1_0%,#f1e6d6_100%)] text-[#17211e]">
      <div className="mx-auto w-[min(calc(100%-24px),1240px)] py-5 md:w-[min(calc(100%-36px),1240px)] md:py-8">
        <header className="grid gap-6 rounded-[2rem] border border-white/70 bg-[rgba(255,250,244,0.82)] p-6 shadow-[0_14px_36px_rgba(18,26,24,0.08)] backdrop-blur-xl lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)_auto] lg:items-center">
          <div>
            <a href="/" className="font-['Space_Grotesk'] text-[1.05rem] font-bold uppercase tracking-[0.12em] text-[#173a34]">
              RESET EDU CENTER
            </a>
            <p className="mt-2 max-w-[420px] text-sm leading-7 text-[#5d6762]">
              민간 교육 수강 전 회원 계정을 만들고, 이후 내 강의실과 발급 자료 화면으로 자연스럽게 연결합니다.
            </p>
          </div>
          <nav className="flex flex-wrap items-center gap-4 text-sm text-[#17211e]">
            <a href="/" className="transition hover:text-[#a45127]">홈</a>
            <a href="/#courses" className="transition hover:text-[#a45127]">교육과정</a>
            <a href="/#process" className="transition hover:text-[#a45127]">수강절차</a>
            <a href="/dashboard" className="transition hover:text-[#a45127]">대시보드</a>
          </nav>
          <div className="flex flex-wrap gap-3">
            <a
              href="/signup"
              className={`inline-flex min-h-11 items-center justify-center rounded-full px-5 py-3 text-sm font-extrabold transition hover:-translate-y-0.5 ${mode === "signup" ? "bg-gradient-to-br from-[#cf6f3f] to-[#a45127] text-[#fff9f2]" : "border border-black/10 bg-white/70 text-[#17211e]"}`}
            >
              회원가입
            </a>
            <a
              href="/login"
              className={`inline-flex min-h-11 items-center justify-center rounded-full px-5 py-3 text-sm font-extrabold transition hover:-translate-y-0.5 ${mode === "login" ? "bg-gradient-to-br from-[#112723] to-[#244b44] text-[#fff9f2]" : "border border-black/10 bg-white/70 text-[#17211e]"}`}
            >
              로그인
            </a>
          </div>
        </header>

        <section className="mt-7 rounded-[2rem] border border-white/70 bg-[rgba(255,249,241,0.84)] p-6 shadow-[0_14px_36px_rgba(18,26,24,0.08)] backdrop-blur-xl md:p-8">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
            <section className="relative">
              <div className="absolute left-0 top-0 h-28 w-28 rounded-[28px] bg-[radial-gradient(circle,rgba(207,111,63,0.16),transparent_70%)] blur-sm" />
              <div className="relative">
                <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#a45127]">{copy.eyebrow}</p>
                <h1 className="mt-4 max-w-[560px] font-['Space_Grotesk'] text-4xl font-bold leading-[0.94] tracking-[-0.05em] text-[#17211e] sm:text-5xl lg:text-6xl">
                  {copy.title}
                </h1>
                <p className="mt-5 max-w-[580px] text-base leading-8 text-[#5d6762]">{copy.intro}</p>
                <div className="mt-8 inline-flex rounded-full border border-black/10 bg-white/80 p-2">
                  <a
                    href="/signup"
                    className={`rounded-full px-5 py-3 text-sm font-extrabold ${mode === "signup" ? "bg-gradient-to-br from-[#112723] to-[#244b44] text-[#fff9f2]" : "text-[#17211e]"}`}
                  >
                    회원가입
                  </a>
                  <a
                    href="/login"
                    className={`rounded-full px-5 py-3 text-sm font-extrabold ${mode === "login" ? "bg-gradient-to-br from-[#112723] to-[#244b44] text-[#fff9f2]" : "text-[#17211e]"}`}
                  >
                    로그인
                  </a>
                </div>
                <ul className="mt-7 list-disc space-y-3 pl-5 text-sm leading-7 text-[#5d6762]">
                  {copy.benefits.map((benefit) => (
                    <li key={benefit}>{benefit}</li>
                  ))}
                </ul>
              </div>
            </section>

            <section className="space-y-6">
              <div className={`rounded-[1.75rem] border p-7 shadow-[0_14px_36px_rgba(18,26,24,0.08)] ${user ? "border-[#173a34]/20 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(244,234,219,0.96))]" : "border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.84),rgba(244,234,219,0.92))]"}`}>
                <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#a45127]">{mode === "signup" ? "회원가입" : "로그인"}</p>
                <h2 className="mt-3 font-['Space_Grotesk'] text-3xl font-bold tracking-[-0.05em] text-[#17211e]">
                  {user ? displayName : copy.idleTitle}
                </h2>
                <p className="mt-3 text-sm leading-7 text-[#5d6762]">{user ? userMeta : copy.idleMeta}</p>

                {!user ? (
                  <div className="mt-6 flex flex-wrap gap-3">
                    <button
                      type="button"
                      disabled={!hasAuthApiConfig || isLoading}
                      onClick={() => {
                        if (typeof window === "undefined") {
                          return;
                        }
                        setMessage(copy.pendingMessage);
                        setIsError(false);
                        window.location.href = getApiUrl("/api/auth/kakao/start", {
                          next: window.location.href,
                          mode,
                          prompt: mode === "signup" ? "login" : "",
                        });
                      }}
                      className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#fee500] px-5 py-3 text-sm font-extrabold text-[#191919] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {copy.kakaoLabel}
                    </button>
                    <button
                      type="button"
                      disabled
                      title="네이버 로그인은 아직 연결되지 않았습니다."
                      className="inline-flex min-h-12 items-center justify-center rounded-full border border-black/10 bg-white/70 px-5 py-3 text-sm font-bold text-[#17211e] opacity-60"
                    >
                      네이버 연동 준비 중
                    </button>
                  </div>
                ) : (
                  <div className="mt-6 flex flex-wrap gap-3">
                    <a
                      href="/dashboard"
                      className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#112723] px-5 py-3 text-sm font-extrabold text-[#fff9f2] transition hover:-translate-y-0.5"
                    >
                      내 대시보드 보기
                    </a>
                    <a
                      href="/course-room"
                      className="inline-flex min-h-12 items-center justify-center rounded-full border border-black/10 bg-white/80 px-5 py-3 text-sm font-bold text-[#17211e] transition hover:-translate-y-0.5"
                    >
                      내 강의실 열기
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        if (typeof window === "undefined") {
                          return;
                        }
                        setMessage("카카오 로그아웃 화면으로 이동하는 중입니다. 카카오 계정까지 로그아웃하려면 해당 화면에서 함께 로그아웃을 선택해 주세요.");
                        setIsError(false);
                        window.location.href = getApiUrl("/api/logout", {
                          next: window.location.href,
                          provider: "kakao",
                        });
                      }}
                      className="inline-flex min-h-12 items-center justify-center rounded-full border border-black/10 bg-white/80 px-5 py-3 text-sm font-bold text-[#17211e] transition hover:-translate-y-0.5"
                    >
                      로그아웃
                    </button>
                  </div>
                )}

                <p className={`mt-5 text-sm leading-7 ${isError ? "text-[#a23f38]" : "text-[#5d6762]"}`}>{message}</p>
              </div>

              <div className="rounded-[1.75rem] bg-[linear-gradient(135deg,rgba(17,39,35,0.94),rgba(38,76,69,0.9))] p-7 text-[#fdf4e9] shadow-[0_14px_36px_rgba(18,26,24,0.08)]">
                <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#d8b26b]">Member Access Notes</p>
                <h2 className="mt-4 font-['Space_Grotesk'] text-3xl font-bold tracking-[-0.05em]">가입 전에 확인하면 좋은 점</h2>
                <p className="mt-4 text-sm leading-7 text-[#fdf4e9]">
                  민간 교육 플랫폼 특성상 사용자는 먼저 과정을 탐색한 뒤 계정을 연결하는 경우가 많습니다. 그래서 인증 화면도 내 강의실과 발급 흐름으로 이어지도록 설계했습니다.
                </p>
                <ul className="mt-5 list-disc space-y-3 pl-5 text-sm leading-7 text-[#fdf4e9]">
                  <li>카카오 계정은 Cloudflare Worker를 통해 바로 연결됩니다.</li>
                  <li>네이버는 별도 브로커나 추가 서버 연동이 필요해 현재는 비활성화 상태입니다.</li>
                  <li>로그인 상태가 유지되면 이 화면에서 바로 대시보드와 강의실로 이동할 수 있습니다.</li>
                </ul>
              </div>
            </section>
          </div>
        </section>

        <footer className="mt-7 rounded-[2rem] border border-white/70 bg-[rgba(255,249,241,0.84)] p-6 text-sm text-[#5d6762] shadow-[0_14px_36px_rgba(18,26,24,0.08)] backdrop-blur-xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-['Space_Grotesk'] text-base font-bold uppercase tracking-[0.12em] text-[#173a34]">RESET EDU CENTER</p>
              <p className="mt-2">민간 교육 수강과 성찰·실천 계획 정리를 연결하는 회원 인증 화면.</p>
            </div>
            <div className="flex flex-wrap gap-4">
              <a href="/" className="transition hover:text-[#a45127]">홈</a>
              <a href="/dashboard" className="transition hover:text-[#a45127]">대시보드</a>
              <a href="/course-room" className="transition hover:text-[#a45127]">강의실</a>
            </div>
          </div>
          <div className="mt-5 border-t border-black/10 pt-5">© {currentYear} Reset Edu Center. All rights reserved.</div>
        </footer>
      </div>
    </main>
  );
}
