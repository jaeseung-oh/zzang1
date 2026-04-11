"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import { getFirebaseServices } from "@/lib/firebase/client";
import {
  getCertificateIdentity,
  getUserProfile,
  upsertUserProfile,
  type StoredUserProfile,
} from "@/lib/firebase/user-profile";

type AuthMode = "signup" | "login";

type VerificationSyncResponse = {
  isEmailVerified: boolean;
  email: string | null;
};

const modeCopy = {
  signup: {
    eyebrow: "Member Registration",
    title: "수강 시작 전, 수료증 발급 정보를 정확히 등록해 주세요",
    intro:
      "실명과 생년월일은 수료증 발급 기준 정보로 사용됩니다. 가입 후 이메일 인증까지 완료해야 강의실과 발급 기능을 정상 이용할 수 있습니다.",
    benefits: [
      "등록 정보는 수료증 발급 기준으로 연결됩니다.",
      "이메일 인증 완료 후 바로 강의실 이용이 가능합니다.",
      "결제 이후에는 발급 기준 정보가 잠길 수 있습니다.",
    ],
    submitLabel: "회원가입 및 인증메일 발송",
    helperTitle: "등록 안내",
    helperBody: "필수 정보만 정확히 입력하면 바로 강의 수강과 수료증 발급 흐름으로 이어집니다.",
  },
  login: {
    eyebrow: "Member Login",
    title: "로그인 후 바로 강의실과 수료증 발급 흐름을 이용할 수 있습니다",
    intro:
      "이미 가입한 회원은 로그인 후 강의실, 내 수강현황, 수료증 발급 화면으로 이동할 수 있습니다. 인증이 끝나지 않았다면 이 화면에서 바로 처리할 수 있습니다.",
    benefits: [
      "인증 상태를 확인하고 즉시 수강을 시작할 수 있습니다.",
      "저장된 정보로 수료증 발급 흐름이 연결됩니다.",
      "결제 이후에는 발급 기준 정보가 잠길 수 있습니다.",
    ],
    submitLabel: "로그인",
    helperTitle: "이용 안내",
    helperBody: "인증이 완료된 계정은 강의실 입장과 수료증 발급 흐름을 바로 이용할 수 있습니다.",
  },
} as const;

const trustIndicators = [
  { value: "10,000+", label: "매년 수료 인원" },
  { value: "100%", label: "온라인 수강" },
  { value: "24/7", label: "PC·모바일 접속" },
];

const trustHighlights = [
  "PC / 모바일 스트리밍 완벽 지원",
  "이수 확인 후 수료증 양식 출력 가능",
  "수강생 개인정보 및 수강이력 보안 처리",
];

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
      <path d="M12 3l7 3v5c0 4.6-2.8 8.7-7 10-4.2-1.3-7-5.4-7-10V6l7-3z" stroke="currentColor" strokeWidth="1.7" />
      <path d="M9 12l2 2 4-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function StreamingIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
      <rect x="3" y="5" width="18" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.7" />
      <path d="M10 9.5l4 2.5-4 2.5V9.5z" fill="currentColor" />
      <path d="M8 21h8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function CertificateIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
      <path d="M7 4h10a2 2 0 012 2v7a2 2 0 01-2 2H7a2 2 0 01-2-2V6a2 2 0 012-2z" stroke="currentColor" strokeWidth="1.7" />
      <path d="M9 8h6M9 11h6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M10 15l-1 5 3-2 3 2-1-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
      <path d="M5 12.5l4.2 4L19 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function isValidDateOfBirth(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [yearText, monthText, dayText] = value.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);

  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return false;
  }

  const candidate = new Date(year, month - 1, day);
  if (Number.isNaN(candidate.getTime())) {
    return false;
  }

  const isSameCalendarDate =
    candidate.getFullYear() === year &&
    candidate.getMonth() === month - 1 &&
    candidate.getDate() === day;

  if (!isSameCalendarDate) {
    return false;
  }

  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  return candidate <= todayStart;
}

function getProfileName(profile: StoredUserProfile | null, user: User | null) {
  return profile?.realName?.trim() || profile?.fullName?.trim() || user?.displayName?.trim() || "회원";
}

function formatDateOfBirthInput(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);

  if (digits.length <= 4) {
    return digits;
  }

  if (digits.length <= 6) {
    return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  }

  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
}

const appOrigin = process.env.NEXT_PUBLIC_APP_ORIGIN || "https://zzang1.pages.dev";

function resolveNextPath(value: string | null) {
  if (!value) {
    return null;
  }

  return value.startsWith("/") ? value : null;
}

async function sendVerificationEmail(user: User) {
  const actionSettings = {
    url: `${appOrigin}/login`,
    handleCodeInApp: false,
  };

  await sendEmailVerification(user, actionSettings);
}

export default function AuthPage({ mode, nextPath: nextPathProp = null }: { mode: AuthMode; nextPath?: string | null }) {
  const router = useRouter();
  const copy = modeCopy[mode];
  const nextPath = resolveNextPath(nextPathProp);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<StoredUserProfile | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [realName, setRealName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [sensitiveInfoAccepted, setSensitiveInfoAccepted] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [message, setMessage] = useState("회원 계정 화면을 준비하는 중입니다.");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [isSubmitting, startSubmitTransition] = useTransition();
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isRefreshingVerification, startVerificationTransition] = useTransition();
  const [isResettingPassword, startResetTransition] = useTransition();
  const isSignupConsentComplete = termsAccepted && privacyAccepted && sensitiveInfoAccepted;

  const helperStats = useMemo(() => {
    if (!authUser) {
      return trustIndicators;
    }

    return [
      { value: authUser.emailVerified || profile?.isEmailVerified ? "ACTIVE" : "VERIFY", label: "계정 상태" },
      { value: certificateIdentityForMemo(profile).isLocked ? "LOCKED" : "EDITABLE", label: "발급 기준 정보" },
      { value: profile?.providerLabel || "EMAIL", label: "가입 방식" },
    ];
  }, [authUser, profile]);

  const handleDateOfBirthChange = (value: string) => {
    setDateOfBirth(formatDateOfBirthInput(value));
  };

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
          setMessage(mode === "signup" ? "필수 정보 등록 후 바로 회원가입을 진행할 수 있습니다." : "로그인 후 바로 강의실과 수료증 발급 흐름을 이용할 수 있습니다.");
          return;
        }

        try {
          const storedProfile = await getUserProfile(user.uid);
          setProfile(storedProfile);
          setEmail(user.email ?? storedProfile?.email ?? "");
          setRealName(storedProfile?.realName ?? storedProfile?.fullName ?? user.displayName ?? "");
          setDateOfBirth(storedProfile?.dateOfBirth ?? storedProfile?.birthDate ?? "");
          const certificateIdentity = getCertificateIdentity(storedProfile);
          setMessage(
            certificateIdentity.isLocked
              ? "수료증 발급 기준 정보가 잠겨 있습니다. 결제 이후에는 잠긴 정보가 발급에 사용됩니다."
              : user.emailVerified
                ? "수강을 시작할 준비가 되었습니다. 강의실과 발급 기능을 바로 이용할 수 있습니다."
                : "인증 메일 확인 후 계정을 활성화하면 강의실과 발급 기능을 이용할 수 있습니다."
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

  useEffect(() => {
    if (mode !== "login" || !nextPath || !authUser) {
      return;
    }

    router.replace(nextPath);
  }, [authUser, mode, nextPath, router]);

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
        if (!isSignupConsentComplete) {
          throw new Error("필수 약관과 민감정보 수집·이용 동의에 모두 체크해 주세요.");
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
          termsAccepted: true,
          privacyAccepted: true,
          sensitiveInfoAccepted: true,
        });
        await sendVerificationEmail(credential.user);

        const storedProfile = await getUserProfile(credential.user.uid);
        setProfile(storedProfile);
        setPassword("");
        setPasswordConfirm("");
        setTermsAccepted(false);
        setPrivacyAccepted(false);
        setSensitiveInfoAccepted(false);
        setMessage("인증 메일을 발송했습니다. 인증을 완료하면 바로 수강을 시작할 수 있습니다.");
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
            ? "로그인되었습니다. 바로 강의실 이용이 가능합니다."
            : "로그인은 완료됐지만 이메일 인증이 필요합니다. 인증 후 강의실 이용이 가능합니다."
        );
        setPassword("");
        router.replace(nextPath ?? "/dashboard");
      } catch (submitError) {
        console.error(submitError);
        setError(submitError instanceof Error ? submitError.message : "로그인 처리 중 오류가 발생했습니다.");
      }
    });
  };

  const handleProfileSave = () => {
    setError("");
    setIsSavingProfile(true);

    void (async () => {
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
        const certificateIdentity = getCertificateIdentity(storedProfile);
        setMessage(
          certificateIdentity.isLocked
            ? "프로필 정보가 저장되었습니다. 수료증에는 기존 잠금 정보가 계속 사용됩니다."
            : "회원 정보가 저장되었습니다. 결제 전에는 발급 기준 정보도 함께 수정됩니다."
        );
      } catch (saveError) {
        console.error(saveError);
        const message = saveError instanceof Error ? saveError.message : "";
        if (message.includes("offline")) {
          setError("회원 정보 저장 중 Firestore 연결에 실패했습니다. 새로고침 후 다시 시도해 주세요. 계속 같으면 Firestore 데이터베이스 활성화 상태를 확인해야 합니다.");
          return;
        }

        setError(saveError instanceof Error ? saveError.message : "회원 정보 저장 중 오류가 발생했습니다.");
      } finally {
        setIsSavingProfile(false);
      }
    })();
  };

  const handleResendVerification = () => {
    setError("");
    startVerificationTransition(async () => {
      try {
        if (!authUser) {
          throw new Error("로그인 후 인증 메일을 다시 보낼 수 있습니다.");
        }

        await sendVerificationEmail(authUser);
        setMessage("인증 메일을 다시 보냈습니다. 인증을 완료하면 바로 수강을 시작할 수 있습니다.");
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
            ? "이메일 인증이 확인되었습니다. 이제 강의실과 발급 기능을 이용할 수 있습니다."
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
        setTermsAccepted(false);
        setPrivacyAccepted(false);
        setSensitiveInfoAccepted(false);
        setMessage("로그아웃되었습니다.");
      } catch (logoutError) {
        console.error(logoutError);
        setError(logoutError instanceof Error ? logoutError.message : "로그아웃 중 오류가 발생했습니다.");
      }
    });
  };

  const handlePasswordReset = () => {
    setError("");
    startResetTransition(async () => {
      try {
        if (!email.trim()) {
          throw new Error("비밀번호 재설정을 위해 이메일을 먼저 입력해 주세요.");
        }

        const { auth } = getFirebaseServices();
        await sendPasswordResetEmail(auth, email.trim(), { url: `${appOrigin}/login` });
        setMessage("비밀번호 재설정 메일을 보냈습니다. 메일함을 확인해 주세요.");
      } catch (resetError) {
        console.error(resetError);
        setError(resetError instanceof Error ? resetError.message : "비밀번호 재설정 메일 발송 중 오류가 발생했습니다.");
      }
    });
  };

  const displayName = getProfileName(profile, authUser);
  const certificateIdentity = getCertificateIdentity(profile);
  const profileReady = Boolean(certificateIdentity.realName) && Boolean(certificateIdentity.dateOfBirth);
  const isVerified = Boolean(authUser?.emailVerified || profile?.isEmailVerified);

  return (
    <main className="min-h-screen bg-[#eef2f7] text-[#10213f] lg:h-screen lg:overflow-hidden">
      <div className="grid min-h-screen lg:h-screen lg:grid-cols-2">
        <section className="relative overflow-hidden bg-[linear-gradient(160deg,#08152d_0%,#10213f_42%,#173968_100%)] px-6 py-10 text-white sm:px-8 lg:flex lg:h-screen lg:flex-col lg:justify-between lg:px-12 lg:py-12 xl:px-16">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(216,178,107,0.22),transparent_24%),radial-gradient(circle_at_20%_18%,rgba(96,165,250,0.18),transparent_22%),linear-gradient(180deg,rgba(5,11,24,0.18),rgba(5,11,24,0.4))]" />
          <div className="absolute -left-12 bottom-8 h-40 w-40 rounded-full border border-white/10 bg-white/5 blur-sm" />
          <div className="absolute right-8 top-12 h-48 w-48 rounded-full border border-[#d8b26b]/20 bg-[#d8b26b]/8 blur-2xl" />

          <div className="relative z-10 flex items-center justify-between">
            <Link href="/" className="font-['Space_Grotesk'] text-sm font-bold uppercase tracking-[0.28em] text-white/92">
              RESET EDU CENTER
            </Link>
            <div className="hidden items-center gap-3 rounded-full border border-white/15 bg-white/6 px-4 py-2 text-xs text-white/72 lg:flex">
              <ShieldIcon />
              <span>전문 교육 수료 LMS</span>
            </div>
          </div>

          <div className="relative z-10 mt-12 lg:mt-0">
            <p className="text-xs font-semibold uppercase tracking-[0.34em] text-[#d8b26b]">Premium Education Access</p>
            <h1 className="mt-5 max-w-[560px] text-4xl font-semibold leading-[1.08] tracking-[-0.04em] text-white sm:text-5xl xl:text-[3.75rem]">
              가장 확실한 자기 성찰과 실천의 시작, 리셋 에듀센터
            </h1>
            <p className="mt-6 max-w-[560px] text-[15px] leading-8 text-slate-200 sm:text-base">
              공신력 있는 온라인 교육 환경에서 수강 등록, 학습 진행, 수료증 발급 안내까지 한 번에 이어집니다. PC와 모바일 어디서든 동일한 기준으로 이용할 수 있습니다.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {helperStats.map((item) => (
                <div key={item.label} className="rounded-[1.4rem] border border-white/12 bg-white/8 px-4 py-4 backdrop-blur-sm">
                  <p className="text-2xl font-semibold tracking-[-0.04em] text-white">{item.value}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-300">{item.label}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="rounded-[1.6rem] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.05))] p-5 backdrop-blur-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#d8b26b]/18 text-[#f7d9a0]">
                  <StreamingIcon />
                </div>
                <p className="mt-4 text-sm font-semibold text-white">모바일 수강 지원</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">언제 어디서든 끊김 없이 접속할 수 있는 온라인 수강 환경</p>
              </div>
              <div className="rounded-[1.6rem] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.05))] p-5 backdrop-blur-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#d8b26b]/18 text-[#f7d9a0]">
                  <CertificateIcon />
                </div>
                <p className="mt-4 text-sm font-semibold text-white">수료증 발급 흐름 안내</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">등록 정보 확인 후 발급 문서 화면까지 자연스럽게 연결되는 구조</p>
              </div>
              <div className="rounded-[1.6rem] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.05))] p-5 backdrop-blur-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#d8b26b]/18 text-[#f7d9a0]">
                  <ShieldIcon />
                </div>
                <p className="mt-4 text-sm font-semibold text-white">계정 정보 보안 관리</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">민감할 수 있는 수강 이력과 회원 정보를 분리 저장하고 보호</p>
              </div>
            </div>

            <ul className="mt-8 space-y-3 rounded-[1.7rem] border border-white/12 bg-white/6 p-6 backdrop-blur-sm">
              {trustHighlights.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm leading-7 text-slate-100">
                  <span className="mt-1 flex h-6 w-6 flex-none items-center justify-center rounded-full bg-[#d8b26b] text-[#10213f]">
                    <CheckIcon />
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="relative z-10 mt-10 rounded-[1.6rem] border border-white/12 bg-white/7 p-5 text-sm text-slate-200 backdrop-blur-sm lg:mt-12">
            <p className="font-semibold text-white">이용 전 안내</p>
            <p className="mt-2 leading-7 text-slate-300">{copy.helperBody}</p>
          </div>
        </section>

        <section className="flex min-h-[48vh] items-center justify-center px-5 py-8 sm:px-7 lg:h-screen lg:px-10 lg:py-10 xl:px-14">
          <div className="w-full max-w-[420px] rounded-[2rem] border border-[#dbe3ef] bg-white px-5 py-6 shadow-[0_28px_80px_rgba(15,23,42,0.1)] sm:px-7 sm:py-8">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#8b6a33]">{copy.eyebrow}</p>
                <h2 className="mt-2 text-[1.85rem] font-semibold tracking-[-0.04em] text-[#0f172a]">
                  {authUser ? `${displayName} 님` : mode === "signup" ? "회원가입" : "로그인"}
                </h2>
              </div>
              <Link href="/" className="rounded-full border border-[#10213f] bg-[linear-gradient(135deg,#10213f_0%,#284b84_100%)] px-4 py-2 text-xs font-bold text-white shadow-[0_10px_20px_rgba(16,33,63,0.18)] transition hover:-translate-y-0.5 hover:brightness-105">
                홈으로
              </Link>
            </div>

            <p className="mt-3 text-sm leading-7 text-slate-500">{loading ? "회원 상태를 확인하는 중입니다." : message}</p>

            {!authUser ? (
              <div className="mt-6 space-y-4">
                <div className="grid grid-cols-2 rounded-full bg-[#eef3fa] p-1 text-sm font-semibold text-slate-600">
                  <Link href="/login" className={`rounded-full px-4 py-2 text-center transition ${mode === "login" ? "bg-white text-[#10213f] shadow-sm" : "hover:text-[#10213f]"}`}>
                    로그인
                  </Link>
                  <Link href="/signup" className={`rounded-full px-4 py-2 text-center transition ${mode === "signup" ? "bg-white text-[#10213f] shadow-sm" : "hover:text-[#10213f]"}`}>
                    회원가입
                  </Link>
                </div>

                {mode === "signup" ? (
                  <>
                    <label className="block space-y-2 text-sm text-slate-700">
                      <span className="font-medium">실명</span>
                      <input
                        value={realName}
                        onChange={(event) => setRealName(event.target.value)}
                        placeholder="홍길동"
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#1f4b8f] focus:ring-4 focus:ring-[#1f4b8f]/12"
                      />
                    </label>
                    <label className="block space-y-2 text-sm text-slate-700">
                      <span className="font-medium">생년월일</span>
                      <input
                        type="text"
                        value={dateOfBirth}
                        onChange={(event) => handleDateOfBirthChange(event.target.value)}
                        inputMode="numeric"
                        maxLength={10}
                        placeholder="19900101"
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#1f4b8f] focus:ring-4 focus:ring-[#1f4b8f]/12"
                      />
                      <p className="text-xs leading-6 text-slate-500">숫자만 이어서 입력하면 자동으로 날짜 형식이 적용됩니다.</p>
                    </label>
                  </>
                ) : null}

                <label className="block space-y-2 text-sm text-slate-700">
                  <span className="font-medium">이메일</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="name@example.com"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#1f4b8f] focus:ring-4 focus:ring-[#1f4b8f]/12"
                  />
                </label>
                <label className="block space-y-2 text-sm text-slate-700">
                  <span className="font-medium">비밀번호</span>
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder={mode === "signup" ? "8자 이상 입력" : "비밀번호 입력"}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#1f4b8f] focus:ring-4 focus:ring-[#1f4b8f]/12"
                  />
                </label>
                {mode === "signup" ? (
                  <label className="block space-y-2 text-sm text-slate-700">
                    <span className="font-medium">비밀번호 확인</span>
                    <input
                      type="password"
                      value={passwordConfirm}
                      onChange={(event) => setPasswordConfirm(event.target.value)}
                      placeholder="비밀번호를 다시 입력"
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#1f4b8f] focus:ring-4 focus:ring-[#1f4b8f]/12"
                    />
                  </label>
                ) : null}

                {mode === "login" ? (
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <label className="flex items-center gap-2 text-slate-600">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(event) => setRememberMe(event.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 accent-[#1f4b8f]"
                      />
                      <span>자동 로그인</span>
                    </label>
                    <button
                      type="button"
                      onClick={handlePasswordReset}
                      disabled={isResettingPassword}
                      className="font-semibold text-[#1f4b8f] transition hover:text-[#10213f] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isResettingPassword ? "발송 중..." : "비밀번호 찾기"}
                    </button>
                  </div>
                ) : null}

                {mode === "signup" ? (
                  <div className="rounded-[1.5rem] border border-slate-200 bg-[#f8fafc] p-5">
                    <p className="text-sm font-semibold text-slate-900">필수 약관 동의</p>
                    <div className="mt-4 space-y-3">
                      <label className="flex items-start gap-3 text-sm leading-7 text-slate-600">
                        <input type="checkbox" checked={termsAccepted} onChange={(event) => setTermsAccepted(event.target.checked)} className="mt-1 h-4 w-4 accent-[#1f4b8f]" />
                        <span>[필수] <Link href="/terms" className="font-semibold text-slate-900 underline underline-offset-4">이용약관 동의</Link></span>
                      </label>
                      <label className="flex items-start gap-3 text-sm leading-7 text-slate-600">
                        <input type="checkbox" checked={privacyAccepted} onChange={(event) => setPrivacyAccepted(event.target.checked)} className="mt-1 h-4 w-4 accent-[#1f4b8f]" />
                        <span>[필수] <Link href="/privacy-policy" className="font-semibold text-slate-900 underline underline-offset-4">개인정보 수집 및 이용 동의</Link></span>
                      </label>
                      <label className="flex items-start gap-3 text-sm leading-7 text-slate-600">
                        <input type="checkbox" checked={sensitiveInfoAccepted} onChange={(event) => setSensitiveInfoAccepted(event.target.checked)} className="mt-1 h-4 w-4 accent-[#1f4b8f]" />
                        <span>[필수] 민감정보 수집 및 이용 동의 (수강 내역을 통한 범죄/수사 이력 유추 가능성 표기)</span>
                      </label>
                    </div>
                  </div>
                ) : null}

                <button
                  type="button"
                  onClick={mode === "signup" ? handleSignup : handleLogin}
                  disabled={loading || isSubmitting || (mode === "signup" && !isSignupConsentComplete)}
                  className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#10213f_0%,#1f4b8f_100%)] px-5 py-3.5 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(16,33,63,0.18)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? "처리 중..." : copy.submitLabel}
                </button>

                <p className="text-center text-sm text-slate-500">
                  {mode === "login" ? "아직 회원이 아니신가요? " : "이미 회원이신가요? "}
                  <Link href={mode === "login" ? "/signup" : "/login"} className="font-semibold text-[#1f4b8f] hover:text-[#10213f]">
                    {mode === "login" ? "회원가입" : "로그인"}
                  </Link>
                </p>
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                <div className="rounded-[1.5rem] border border-slate-200 bg-[#f8fafc] p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">계정 상태</p>
                      <p className="mt-2 text-sm leading-7 text-slate-600">
                        이메일: {authUser.email || "없음"}
                        <br />
                        인증 상태: {isVerified ? "인증 완료" : "인증 대기"}
                      </p>
                    </div>
                    <span className={`rounded-full px-4 py-2 text-xs font-semibold ${isVerified ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                      {isVerified ? "ACTIVE" : "VERIFY EMAIL"}
                    </span>
                  </div>
                </div>

                {certificateIdentity.isLocked ? (
                  <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 text-sm text-slate-600">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8b6a33]">수료증 기준 정보 잠금</p>
                    <p className="mt-3 leading-7">결제 이후에는 아래 정보가 수료증 발급 기준으로 고정됩니다.</p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-slate-200 bg-[#f8fafc] px-4 py-3">발급 기준 실명: {certificateIdentity.realName}</div>
                      <div className="rounded-2xl border border-slate-200 bg-[#f8fafc] px-4 py-3">발급 기준 생년월일: {certificateIdentity.dateOfBirth}</div>
                    </div>
                  </div>
                ) : null}

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-2 text-sm text-slate-700">
                    <span className="font-medium">실명</span>
                    <input
                      value={realName}
                      onChange={(event) => setRealName(event.target.value)}
                      placeholder="홍길동"
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-slate-900 outline-none transition focus:border-[#1f4b8f] focus:ring-4 focus:ring-[#1f4b8f]/12"
                    />
                  </label>
                  <label className="space-y-2 text-sm text-slate-700">
                    <span className="font-medium">생년월일</span>
                    <input
                      type="text"
                      value={dateOfBirth}
                      onChange={(event) => handleDateOfBirthChange(event.target.value)}
                      inputMode="numeric"
                      maxLength={10}
                      placeholder="19900101"
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-slate-900 outline-none transition focus:border-[#1f4b8f] focus:ring-4 focus:ring-[#1f4b8f]/12"
                    />
                  </label>
                </div>

                <div className="grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-[#f8fafc] px-4 py-3">저장된 실명: {profile?.realName || profile?.fullName || "아직 없음"}</div>
                  <div className="rounded-2xl border border-slate-200 bg-[#f8fafc] px-4 py-3">저장된 생년월일: {profile?.dateOfBirth || profile?.birthDate || "아직 없음"}</div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={handleProfileSave}
                    disabled={isSavingProfile}
                    className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#10213f_0%,#1f4b8f_100%)] px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSavingProfile ? "저장 중..." : "정보 저장"}
                  </button>
                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={isRefreshingVerification}
                    className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    로그아웃
                  </button>
                </div>

                {!isVerified ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={handleResendVerification}
                      disabled={isRefreshingVerification}
                      className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      인증 메일 다시 보내기
                    </button>
                    <button
                      type="button"
                      onClick={handleRefreshVerification}
                      disabled={isRefreshingVerification}
                      className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isRefreshingVerification ? "확인 중..." : "인증 상태 확인"}
                    </button>
                  </div>
                ) : null}

                {profileReady && isVerified ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Link
                      href="/dashboard"
                      className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#d3ad62_0%,#f0cb85_100%)] px-5 py-3 text-sm font-bold text-[#2f2208] shadow-[0_12px_24px_rgba(164,126,54,0.18)] transition hover:-translate-y-0.5 hover:brightness-105"
                    >
                      내 수강현황 보기
                    </Link>
                    <Link
                      href="/course-room"
                      className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-[#10213f] bg-[linear-gradient(135deg,#10213f_0%,#284b84_100%)] px-5 py-3 text-sm font-bold text-white shadow-[0_12px_24px_rgba(16,33,63,0.18)] transition hover:-translate-y-0.5 hover:brightness-105"
                    >
                      내 강의실 열기
                    </Link>
                  </div>
                ) : null}
              </div>
            )}

            {error ? <p className="mt-5 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm leading-7 text-red-700">{error}</p> : null}
          </div>
        </section>
      </div>
    </main>
  );
}

function certificateIdentityForMemo(profile: StoredUserProfile | null) {
  return getCertificateIdentity(profile);
}
