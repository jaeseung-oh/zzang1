"use client";

import Link from "next/link";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getFirebaseServices } from "@/lib/firebase/client";
import { buttonClass } from "@/app/components/ui/button-styles";

type AuthState = {
  loading: boolean;
  user: User | null;
};

type AuthNavProps = {
  applyHref?: string;
  variant?: "header" | "panel";
  onNavigate?: () => void;
};

export default function AuthNav({ applyHref = "/courses/apply?category=dui", variant = "header", onNavigate }: AuthNavProps) {
  const router = useRouter();
  const [state, setState] = useState<AuthState>({ loading: true, user: null });
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const isPanel = variant === "panel";
  const wrapperClassName = isPanel
    ? "grid w-full gap-2"
    : "flex min-w-0 flex-1 flex-nowrap items-center justify-end gap-1.5 sm:flex-none sm:gap-2";
  const compactButtonClassName = isPanel
    ? "min-h-12 w-full justify-center rounded-2xl px-4 text-sm font-black"
    : "whitespace-nowrap rounded-full px-3 text-xs font-bold sm:px-4 sm:text-sm";
  const primaryButtonClassName = isPanel
    ? "min-h-12 w-full justify-center rounded-2xl px-4 text-sm font-black !text-white hover:!text-white"
    : "hidden whitespace-nowrap rounded-full px-4 font-bold !text-white hover:!text-white sm:inline-flex";
  const logoutButtonClassName = isPanel
    ? "min-h-12 w-full justify-center rounded-2xl px-4 text-sm font-black disabled:opacity-100"
    : "whitespace-nowrap rounded-full px-3 text-xs font-bold disabled:opacity-100 sm:px-4 sm:text-sm";
  const applyButtonClassName = isPanel
    ? "min-h-12 w-full justify-center rounded-2xl px-4 text-sm font-black !text-black hover:!text-black"
    : "whitespace-nowrap rounded-full px-3 text-xs font-black !text-black hover:!text-black sm:px-4 sm:text-sm";

  useEffect(() => {
    const { auth } = getFirebaseServices();
    return onAuthStateChanged(auth, (user) => {
      setState({ loading: false, user: user && !user.isAnonymous ? user : null });
      setIsLoggingOut(false);
    });
  }, []);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const { auth } = getFirebaseServices();
      await signOut(auth);
      onNavigate?.();
      router.replace("/");
      router.refresh();
    } catch (error) {
      console.error(error);
      setIsLoggingOut(false);
    }
  };

  if (state.loading) {
    return <div aria-label="인증 상태 확인 중" className={isPanel ? "min-h-12 w-full" : "min-h-9 w-[112px] sm:min-h-10 sm:w-[312px]"} />;
  }

  if (!state.user) {
    return (
      <div className={wrapperClassName}>
        <Link href="/login" onClick={onNavigate} className={buttonClass("secondary", "sm", compactButtonClassName)}>로그인</Link>
        <Link href="/signup" onClick={onNavigate} className={buttonClass("primary", "sm", primaryButtonClassName)}>회원가입</Link>
        <Link href={applyHref} onClick={onNavigate} className={buttonClass("warning", "sm", applyButtonClassName)}><span className={isPanel ? "" : "sm:hidden"}>수강 신청</span><span className={isPanel ? "hidden" : "hidden sm:inline"}>교육 신청하기</span></Link>
      </div>
    );
  }

  return (
    <div className={wrapperClassName}>
      <Link href="/dashboard" onClick={onNavigate} className={buttonClass("secondary", "sm", compactButtonClassName)}>마이페이지</Link>
      <button type="button" onClick={handleLogout} disabled={isLoggingOut} className={buttonClass("danger", "sm", logoutButtonClassName)}>
        {isLoggingOut ? "로그아웃 중..." : "로그아웃"}
      </button>
      <Link href={applyHref} onClick={onNavigate} className={buttonClass("warning", "sm", applyButtonClassName)}><span className={isPanel ? "" : "sm:hidden"}>수강 신청</span><span className={isPanel ? "hidden" : "hidden sm:inline"}>교육 신청하기</span></Link>
    </div>
  );
}
