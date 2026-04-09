"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  reload,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import { getFirebaseServices } from "@/lib/firebase/client";
import { getUserProfile, upsertUserProfile, type StoredUserProfile } from "@/lib/firebase/user-profile";

type AuthMode = "signup" | "login";

type VerificationSyncResponse = {
  isEmailVerified: boolean;
  email: string | null;
};

const modeCopy = {
  signup: {
    eyebrow: "Member Registration",
    title: "실명과 생년월일을 확인한 뒤 이메일 인증으로 회원가입을 완료합니다",
    intro:
      "교육 수료 후 발급되는 수료증에는 회원가입 시 입력한 실명과 생년월일이 연결됩니다. 가입 직후 인증 메일을 확인해야 계정이 정상 활성화됩니다.",
    benefits: [
      "실명과 생년월일을 회원가입 단계에서 필수로 저장합니다.",
      "이메일 인증이 끝나야 정상적인 회원 계정으로 활성화됩니다.",
      "가입 후에는 내 강의실, 수강 저장, 수료증 발급 흐름이 같은 계정으로 연결됩니다.",
    ],
    submitLabel: "회원가입 및 인증메일 발송",
    helperTitle: "회원가입 필수 정보",
    helperBody: "실명과 생년월일은 수료증 발급 정보와 직접 연결되므로 정확히 입력해야 합니다.",
  },
  login: {
    eyebrow: "Member Login",
    title: "이메일로 로그인하고 인증 상태를 확인한 뒤 강의실과 발급 화면으로 이동합니다",
    intro:
      "이미 가입한 회원은 이메일과 비밀번호로 로그인할 수 있습니다. 이메일 인증이 아직 끝나지 않았다면 이 화면에서 다시 인증 메일을 보내고 확인 상태를 갱신할 수 있습니다.",
    benefits: [
      "이메일과 비밀번호로 로그인합니다.",
      "인증 메일 재발송과 인증 완료 확인을 바로 처리할 수 있습니다.",
      "인증이 완료되면 대시보드, 강의실, 수료증 흐름과 연결됩니다.",
    ],
    submitLabel: "로그인",
    helperTitle: "로그인 안내",
    helperBody: "이메일 인증이 끝나지 않은 계정은 로그인 후에도 수강 및 발급 흐름이 제한될 수 있습니다.",
  },
} as const;

function isValidDateOfBirth(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return false;
  }

  return date.toISOString().slice(0, 10) === value && date <= new Date();
}

function getProfileName(profile: StoredUserProfile | null, user: User | null) {
  return profile?.realName?.trim() || profile?.fullName?.trim() || user?.displayName?.trim() || "회원";
}

async function sendVerificationEmail(user: User) {
  const actionSettings =
    typeof window === "undefined"
      ? undefined
      : {
          url: `${window.location.origin}/login`,
          handleCodeInApp: false,
        };

  await sendEmailVerification(user, actionSettings);
}

export default function AuthPage({ mode }: { mode: AuthMode }) {
  const copy = modeCopy[mode];
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<StoredUserProfile | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [realName, setRealName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [message, setMessage] = useState("회원 계정 화면을 준비하는 중입니다.");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [isSubmitting, startSubmitTransition] = useTransition();
  const [isSavingProfile, startProfileTransition] = useTransition();
  const [isRefreshingVerification, startVerificationTransition] = useTransition();
  const currentYear = useMemo(() => new Date().getFullYear(), []);

  useEffect(() => {
    let unsubscribe: () => void = () => {};

    try {
      const { auth } = getFirebaseServices();

      unsubscribe = onAuthStateChanged(auth, async (user) => {
        setLoading(true);
        setAuthUser(user);
        setError("");

        if (!user) {
          setProfile(null);
          setLoading(false);
          setMessage(mode === "signup" ? "실명, 생년월일, 이메일을 입력해 회원가입을 진행해 주세요." : "가입한 이메일 계정으로 로그인해 주세요.");
          return;
        }

        try {
          const storedProfile = await getUserProfile(user.uid);
          setProfile(storedProfile);
          setEmail(user.email ?? storedProfile?.email ?? "");
          setRealName(storedProfile?.realName ?? storedProfile?.fullName ?? user.displayName ?? "");
          setDateOfBirth(storedProfile?.dateOfBirth ?? storedProfile?.birthDate ?? "");
          setMessage(
            user.emailVerified
              ? "이메일 인증이 완료된 계정입니다. 강의실과 수료증 발급 흐름으로 이어질 수 있습니다."
              : "인증 메일을 확인한 뒤 아래의 인증 상태 확인 버튼을 눌러 계정을 활성화해 주세요."
          );
        } catch (loadError) {
          console.error(loadError);
          setProfile(null);
          setMessage("회원 정보를 불러오지 못했습니다.");
          setError(loadError instanceof Error ? loadError.message : "회원 정보를 불러오는 중 오류가 발생했습니다.");
        } finally {
          setLoading(false);
        }
      });
    } catch (initError) {
      console.error(initError);
      setLoading(false);
      setAuthUser(null);
      setProfile(null);
      setMessage("인증 서비스를 초기화하지 못했습니다.");
      setError(initError instanceof Error ? initError.message : "Firebase 인증 설정을 확인해 주세요.");
    }

    return () => unsubscribe();
  }, [mode]);

  const syncVerificationStatus = async () => {
    const { functions } = getFirebaseServices();
    const syncCallable = httpsCallable<undefined, VerificationSyncResponse>(functions, "syncEmailVerificationStatus");
    const result = await syncCallable();

    if (authUser) {
      const storedProfile = await getUserProfile(authUser.uid);
      setProfile(storedProfile);
    }

    return result.data;
  };

  const handleSignup = () => {
    setError("");
    startSubmitTransition(async () => {
      try {
        if (!email.trim()) {
          throw new Error("이메일을 입력해 주세요.");
        }
        if (password.length < 8) {
          throw new Error("비밀번호는 8자 이상이어야 합니다.");
        }
        if (password !== passwordConfirm) {
          throw new Error("비밀번호 확인이 일치하지 않습니다.");
        }
        if (!realName.trim()) {
          throw new Error("수료증 발급을 위해 실명을 입력해 주세요.");
        }
        if (!isValidDateOfBirth(dateOfBirth)) {
          throw new Error("생년월일을 YYYY-MM-DD 형식으로 정확히 입력해 주세요.");
        }

        const { auth } = getFirebaseServices();
        const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await updateProfile(credential.user, { displayName: realName.trim() });
        await upsertUserProfile({
          uid: credential.user.uid,
          fullName: realName,
          realName,
          dateOfBirth,
          email: credential.user.email,
          provider: "password",
          providerLabel: "이메일 회원가입",
          isEmailVerified: credential.user.emailVerified,
        });
        await sendVerificationEmail(credential.user);

        const storedProfile = await getUserProfile(credential.user.uid);
        setProfile(storedProfile);
        setPassword("");
        setPasswordConfirm("");
        setMessage("인증 메일을 발송했습니다. 메일함에서 인증 링크를 누른 뒤 이 화면으로 돌아와 인증 상태를 확인해 주세요.");
      } catch (submitError) {
        console.error(submitError);
        setError(submitError instanceof Error ? submitError.message : "회원가입 처리 중 오류가 발생했습니다.");
      }
    });
  };

  const handleLogin = () => {
    setError("");
    startSubmitTransition(async () => {
      try {
        if (!email.trim() || !password) {
          throw new Error("이메일과 비밀번호를 입력해 주세요.");
        }

        const { auth } = getFirebaseServices();
        const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
        const storedProfile = await getUserProfile(credential.user.uid);
        setProfile(storedProfile);
        setMessage(
          credential.user.emailVerified
            ? "로그인되었습니다. 인증이 완료된 계정입니다."
            : "로그인은 되었지만 이메일 인증이 아직 완료되지 않았습니다. 인증 메일을 확인해 주세요."
        );
        setPassword("");
      } catch (submitError) {
        console.error(submitError);
        setError(submitError instanceof Error ? submitError.message : "로그인 처리 중 오류가 발생했습니다.");
      }
    });
  };

  const handleProfileSave = () => {
    setError("");
    startProfileTransition(async () => {
      try {
        if (!authUser) {
          throw new Error("로그인 후 다시 시도해 주세요.");
        }
        if (!realName.trim()) {
          throw new Error("수료증 발급을 위해 반드시 실명을 입력해 주세요.");
        }
        if (!isValidDateOfBirth(dateOfBirth)) {
          throw new Error("생년월일을 YYYY-MM-DD 형식으로 입력해 주세요.");
        }

        await upsertUserProfile({
          uid: authUser.uid,
          fullName: realName,
          realName,
          dateOfBirth,
          email: authUser.email,
          provider: authUser.providerData[0]?.providerId ?? "password",
          providerLabel: "이메일 회원",
          isEmailVerified: authUser.emailVerified,
        });

        const storedProfile = await getUserProfile(authUser.uid);
        setProfile(storedProfile);
        setMessage("회원 정보가 저장되었습니다. 수료증에는 저장된 실명과 생년월일이 기준으로 사용됩니다.");
      } catch (saveError) {
        console.error(saveError);
        setError(saveError instanceof Error ? saveError.message : "회원 정보 저장 중 오류가 발생했습니다.");
      }
    });
  };

  const handleResendVerification = () => {
    setError("");
    startVerificationTransition(async () => {
      try {
        if (!authUser) {
          throw new Error("로그인 후 인증 메일을 다시 보낼 수 있습니다.");
        }

        await sendVerificationEmail(authUser);
        setMessage("인증 메일을 다시 보냈습니다. 받은편지함 또는 스팸함에서 인증 링크를 확인해 주세요.");
      } catch (verificationError) {
        console.error(verificationError);
        setError(verificationError instanceof Error ? verificationError.message : "인증 메일 재발송 중 오류가 발생했습니다.");
      }
    });
  };

  const handleRefreshVerification = () => {
    setError("");
    startVerificationTransition(async () => {
      try {
        if (!authUser) {
          throw new Error("로그인 후 인증 상태를 확인할 수 있습니다.");
        }

        await reload(authUser);
        const { auth } = getFirebaseServices();
        const refreshedUser = auth.currentUser;
        if (!refreshedUser) {
          throw new Error("인증 상태를 다시 불러오지 못했습니다. 다시 로그인해 주세요.");
        }

        const synced = await syncVerificationStatus();
        setAuthUser(refreshedUser);
        setMessage(
          synced.isEmailVerified
            ? "이메일 인증이 확인되었습니다. 이제 정상적인 회원 계정으로 활성화되었습니다."
            : "아직 인증이 확인되지 않았습니다. 메일의 인증 링크를 먼저 완료해 주세요."
        );
      } catch (verificationError) {
        console.error(verificationError);
        setError(verificationError instanceof Error ? verificationError.message : "인증 상태 확인 중 오류가 발생했습니다.");
      }
    });
  };

  const handleLogout = () => {
    setError("");
    startVerificationTransition(async () => {
      try {
        const { auth } = getFirebaseServices();
        await signOut(auth);
        setProfile(null);
        setPassword("");
        setPasswordConfirm("");
        setMessage("로그아웃되었습니다.");
      } catch (logoutError) {
        console.error(logoutError);
        setError(logoutError instanceof Error ? logoutError.message : "로그아웃 중 오류가 발생했습니다.");
      }
    });
  };

  const displayName = getProfileName(profile, authUser);
  const profileReady = Boolean(profile?.realName?.trim() || profile?.fullName?.trim()) && Boolean(profile?.dateOfBirth || profile?.birthDate);
  const isVerified = Boolean(authUser?.emailVerified || profile?.isEmailVerified);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_12%_12%,rgba(207,111,63,0.18),transparent_20%),radial-gradient(circle_at_88%_0%,rgba(23,58,52,0.16),transparent_24%),linear-gradient(180deg,#fcf7f1_0%,#f1e6d6_100%)] text-[#17211e]">
      <div className="mx-auto w-[min(calc(100%-24px),1240px)] py-5 md:w-[min(calc(100%-36px),1240px)] md:py-8">
        <header className="grid gap-6 rounded-[2rem] border border-white/70 bg-[rgba(255,250,244,0.82)] p-6 shadow-[0_14px_36px_rgba(18,26,24,0.08)] backdrop-blur-xl lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)_auto] lg:items-center">
          <div>
            <Link href="/" className="font-['Space_Grotesk'] text-[1.05rem] font-bold uppercase tracking-[0.12em] text-[#173a34]">
              RESET EDU CENTER
            </Link>
            <p className="mt-2 max-w-[420px] text-sm leading-7 text-[#5d6762]">
              교육 이수 계정을 만들고, 실명 기반 수료증 발급과 수강 기록을 하나의 회원 정보로 연결합니다.
            </p>
          </div>
          <nav className="flex flex-wrap items-center gap-4 text-sm text-[#17211e]">
            <Link href="/" className="transition hover:text-[#a45127]">홈</Link>
            <Link href="/#courses" className="transition hover:text-[#a45127]">교육과정</Link>
            <Link href="/course-room" className="transition hover:text-[#a45127]">강의실</Link>
            <Link href="/dashboard" className="transition hover:text-[#a45127]">대시보드</Link>
          </nav>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/signup"
              className={`inline-flex min-h-11 items-center justify-center rounded-full px-5 py-3 text-sm font-extrabold transition hover:-translate-y-0.5 ${mode === "signup" ? "bg-gradient-to-br from-[#cf6f3f] to-[#a45127] text-[#fff9f2]" : "border border-black/10 bg-white/70 text-[#17211e]"}`}
            >
              회원가입
            </Link>
            <Link
              href="/login"
              className={`inline-flex min-h-11 items-center justify-center rounded-full px-5 py-3 text-sm font-extrabold transition hover:-translate-y-0.5 ${mode === "login" ? "bg-gradient-to-br from-[#112723] to-[#244b44] text-[#fff9f2]" : "border border-black/10 bg-white/70 text-[#17211e]"}`}
            >
              로그인
            </Link>
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
                <ul className="mt-7 list-disc space-y-3 pl-5 text-sm leading-7 text-[#5d6762]">
                  {copy.benefits.map((benefit) => (
                    <li key={benefit}>{benefit}</li>
                  ))}
                </ul>
                <div className="mt-7 rounded-[1.75rem] border border-[#173a34]/12 bg-white/70 p-6">
                  <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#a45127]">{copy.helperTitle}</p>
                  <p className="mt-3 text-sm leading-7 text-[#5d6762]">{copy.helperBody}</p>
                  <div className="mt-5 grid gap-3 text-sm text-[#17211e] sm:grid-cols-2">
                    <div className="rounded-2xl border border-black/10 bg-white/80 px-4 py-3">실명: 수료증 성명으로 사용</div>
                    <div className="rounded-2xl border border-black/10 bg-white/80 px-4 py-3">생년월일: 수료증 본인 식별 정보</div>
                    <div className="rounded-2xl border border-black/10 bg-white/80 px-4 py-3">이메일: 인증 및 계정 복구 기준</div>
                    <div className="rounded-2xl border border-black/10 bg-white/80 px-4 py-3">이메일 인증: 계정 활성화 필수</div>
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-6">
              <div className="rounded-[1.75rem] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(244,234,219,0.96))] p-7 shadow-[0_14px_36px_rgba(18,26,24,0.08)]">
                <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#a45127]">{mode === "signup" ? "회원가입" : "로그인"}</p>
                <h2 className="mt-3 font-['Space_Grotesk'] text-3xl font-bold tracking-[-0.05em] text-[#17211e]">
                  {authUser ? `${displayName} 계정` : mode === "signup" ? "회원 정보를 입력해 주세요" : "가입한 계정으로 로그인해 주세요"}
                </h2>
                <p className="mt-3 text-sm leading-7 text-[#5d6762]">
                  {loading ? "회원 상태를 확인하는 중입니다." : message}
                </p>

                {!authUser ? (
                  <div className="mt-6 space-y-4">
                    {mode === "signup" ? (
                      <>
                        <label className="block space-y-2 text-sm text-[#17211e]">
                          <span>실명</span>
                          <input
                            value={realName}
                            onChange={(event) => setRealName(event.target.value)}
                            placeholder="홍길동"
                            className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-[#a45127]"
                          />
                          <p className="text-xs leading-6 text-[#7a6656]">수료증 발급을 위해 반드시 실명을 입력해주세요.</p>
                        </label>
                        <label className="block space-y-2 text-sm text-[#17211e]">
                          <span>생년월일</span>
                          <input
                            type="date"
                            value={dateOfBirth}
                            onChange={(event) => setDateOfBirth(event.target.value)}
                            className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-[#a45127]"
                          />
                        </label>
                      </>
                    ) : null}

                    <label className="block space-y-2 text-sm text-[#17211e]">
                      <span>이메일</span>
                      <input
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="name@example.com"
                        className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-[#a45127]"
                      />
                    </label>
                    <label className="block space-y-2 text-sm text-[#17211e]">
                      <span>비밀번호</span>
                      <input
                        type="password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="8자 이상 입력"
                        className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-[#a45127]"
                      />
                    </label>
                    {mode === "signup" ? (
                      <label className="block space-y-2 text-sm text-[#17211e]">
                        <span>비밀번호 확인</span>
                        <input
                          type="password"
                          value={passwordConfirm}
                          onChange={(event) => setPasswordConfirm(event.target.value)}
                          placeholder="비밀번호를 다시 입력"
                          className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-[#a45127]"
                        />
                      </label>
                    ) : null}

                    <button
                      type="button"
                      onClick={mode === "signup" ? handleSignup : handleLogin}
                      disabled={loading || isSubmitting}
                      className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[#112723] px-5 py-3 text-sm font-extrabold text-[#fff9f2] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSubmitting ? "처리 중..." : copy.submitLabel}
                    </button>
                  </div>
                ) : (
                  <div className="mt-6 space-y-5">
                    <div className="rounded-[1.5rem] border border-black/10 bg-white/80 p-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold text-[#17211e]">계정 상태</p>
                          <p className="mt-2 text-sm leading-7 text-[#5d6762]">
                            이메일: {authUser.email || "없음"}
                            <br />
                            인증 상태: {isVerified ? "인증 완료" : "인증 대기"}
                          </p>
                        </div>
                        <span className={`rounded-full px-4 py-2 text-xs font-extrabold ${isVerified ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                          {isVerified ? "ACTIVE" : "VERIFY EMAIL"}
                        </span>
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="space-y-2 text-sm text-[#17211e]">
                        <span>실명</span>
                        <input
                          value={realName}
                          onChange={(event) => setRealName(event.target.value)}
                          placeholder="홍길동"
                          className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-[#a45127]"
                        />
                        <p className="text-xs leading-6 text-[#7a6656]">수료증 발급을 위해 반드시 실명을 입력해주세요.</p>
                      </label>
                      <label className="space-y-2 text-sm text-[#17211e]">
                        <span>생년월일</span>
                        <input
                          type="date"
                          value={dateOfBirth}
                          onChange={(event) => setDateOfBirth(event.target.value)}
                          className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-[#a45127]"
                        />
                      </label>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={handleProfileSave}
                        disabled={isSavingProfile}
                        className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#cf6f3f] px-5 py-3 text-sm font-extrabold text-[#fff9f2] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isSavingProfile ? "저장 중..." : "회원 정보 저장"}
                      </button>
                      {!isVerified ? (
                        <>
                          <button
                            type="button"
                            onClick={handleResendVerification}
                            disabled={isRefreshingVerification}
                            className="inline-flex min-h-12 items-center justify-center rounded-full border border-black/10 bg-white/80 px-5 py-3 text-sm font-bold text-[#17211e] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            인증 메일 다시 보내기
                          </button>
                          <button
                            type="button"
                            onClick={handleRefreshVerification}
                            disabled={isRefreshingVerification}
                            className="inline-flex min-h-12 items-center justify-center rounded-full border border-black/10 bg-white/80 px-5 py-3 text-sm font-bold text-[#17211e] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isRefreshingVerification ? "확인 중..." : "인증 상태 확인"}
                          </button>
                        </>
                      ) : null}
                      <button
                        type="button"
                        onClick={handleLogout}
                        disabled={isRefreshingVerification}
                        className="inline-flex min-h-12 items-center justify-center rounded-full border border-black/10 bg-white/80 px-5 py-3 text-sm font-bold text-[#17211e] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        로그아웃
                      </button>
                    </div>

                    <div className="grid gap-3 text-sm text-[#5d6762] md:grid-cols-2">
                      <div className="rounded-2xl border border-black/10 bg-white/80 px-4 py-3">
                        저장된 실명: {profile?.realName || profile?.fullName || "아직 없음"}
                      </div>
                      <div className="rounded-2xl border border-black/10 bg-white/80 px-4 py-3">
                        저장된 생년월일: {profile?.dateOfBirth || profile?.birthDate || "아직 없음"}
                      </div>
                    </div>

                    {profileReady && isVerified ? (
                      <div className="flex flex-wrap gap-3">
                        <Link
                          href="/dashboard"
                          className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#112723] px-5 py-3 text-sm font-extrabold text-[#fff9f2] transition hover:-translate-y-0.5"
                        >
                          내 대시보드 보기
                        </Link>
                        <Link
                          href="/course-room"
                          className="inline-flex min-h-12 items-center justify-center rounded-full border border-black/10 bg-white/80 px-5 py-3 text-sm font-bold text-[#17211e] transition hover:-translate-y-0.5"
                        >
                          내 강의실 열기
                        </Link>
                      </div>
                    ) : null}
                  </div>
                )}

                {error ? <p className="mt-5 text-sm leading-7 text-[#a23f38]">{error}</p> : null}
              </div>

              <div className="rounded-[1.75rem] bg-[linear-gradient(135deg,rgba(17,39,35,0.94),rgba(38,76,69,0.9))] p-7 text-[#fdf4e9] shadow-[0_14px_36px_rgba(18,26,24,0.08)]">
                <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#d8b26b]">Activation Flow</p>
                <h2 className="mt-4 font-['Space_Grotesk'] text-3xl font-bold tracking-[-0.05em]">회원가입 후 계정이 활성화되는 순서</h2>
                <ol className="mt-5 list-decimal space-y-3 pl-5 text-sm leading-7 text-[#fdf4e9]">
                  <li>실명, 생년월일, 이메일, 비밀번호를 입력해 계정을 생성합니다.</li>
                  <li>가입 즉시 인증 메일이 발송됩니다.</li>
                  <li>메일의 인증 링크를 누른 뒤 다시 로그인 화면으로 돌아옵니다.</li>
                  <li>인증 상태 확인 버튼으로 계정 활성화 여부를 갱신합니다.</li>
                  <li>활성화가 끝나면 강의실과 수료증 발급 흐름을 정상 이용할 수 있습니다.</li>
                </ol>
              </div>
            </section>
          </div>
        </section>

        <footer className="mt-7 rounded-[2rem] border border-white/70 bg-[rgba(255,249,241,0.84)] p-6 text-sm text-[#5d6762] shadow-[0_14px_36px_rgba(18,26,24,0.08)] backdrop-blur-xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-['Space_Grotesk'] text-base font-bold uppercase tracking-[0.12em] text-[#173a34]">RESET EDU CENTER</p>
              <p className="mt-2">실명 기반 수료증 발급을 위한 회원가입 및 이메일 인증 화면.</p>
            </div>
            <div className="flex flex-wrap gap-4">
              <Link href="/" className="transition hover:text-[#a45127]">홈</Link>
              <Link href="/dashboard" className="transition hover:text-[#a45127]">대시보드</Link>
              <Link href="/course-room" className="transition hover:text-[#a45127]">강의실</Link>
            </div>
          </div>
          <div className="mt-5 border-t border-black/10 pt-5">© {currentYear} Reset Edu Center. All rights reserved.</div>
        </footer>
      </div>
    </main>
  );
}
