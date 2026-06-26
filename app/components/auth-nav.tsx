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

export default function AuthNav({ applyHref = "/courses/apply?category=dui" }: { applyHref?: string }) {
  const router = useRouter();
  const [state, setState] = useState<AuthState>({ loading: true, user: null });
  const [isLoggingOut, setIsLoggingOut] = useState(false);

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
      router.replace("/");
      router.refresh();
    } catch (error) {
      console.error(error);
      setIsLoggingOut(false);
    }
  };

  if (state.loading) {
    return <div aria-label="인증 상태 확인 중" className="min-h-10 w-[236px] sm:w-[312px]" />;
  }

  if (!state.user) {
    return (
      <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2 sm:flex-none sm:flex-nowrap">
        <Link href="/login" className={buttonClass("secondary", "sm", "whitespace-nowrap rounded-full px-4 font-bold")}>로그인</Link>
        <Link href="/signup" className={buttonClass("primary", "sm", "whitespace-nowrap rounded-full px-4 font-bold !text-white hover:!text-white")}>회원가입</Link>
        <Link href={applyHref} className={buttonClass("warning", "sm", "whitespace-nowrap rounded-full px-4 font-black !text-black hover:!text-black")}>수강 신청하기</Link>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2 sm:flex-none sm:flex-nowrap">
      <Link href="/dashboard" className={buttonClass("secondary", "sm", "whitespace-nowrap rounded-full px-4 font-bold")}>마이페이지</Link>
      <button type="button" onClick={handleLogout} disabled={isLoggingOut} className={buttonClass("danger", "sm", "whitespace-nowrap rounded-full px-4 font-bold disabled:opacity-100")}>
        {isLoggingOut ? "로그아웃 중..." : "로그아웃"}
      </button>
      <Link href={applyHref} className={buttonClass("warning", "sm", "whitespace-nowrap rounded-full px-4 font-black !text-black hover:!text-black")}>수강 신청하기</Link>
    </div>
  );
}
