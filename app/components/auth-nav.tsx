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
      <div className="flex min-w-0 flex-1 flex-nowrap items-center justify-end gap-1.5 sm:flex-none sm:gap-2">
        <Link href="/login" className={buttonClass("secondary", "sm", "whitespace-nowrap rounded-full px-3 text-xs font-bold sm:px-4 sm:text-sm")}>로그인</Link>
        <Link href="/signup" className={buttonClass("primary", "sm", "hidden whitespace-nowrap rounded-full px-4 font-bold !text-white hover:!text-white sm:inline-flex")}>회원가입</Link>
        <Link href={applyHref} className={buttonClass("warning", "sm", "whitespace-nowrap rounded-full px-3 text-xs font-black !text-black hover:!text-black sm:px-4 sm:text-sm")}>수강 신청하기</Link>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-1 flex-nowrap items-center justify-end gap-1.5 sm:flex-none sm:gap-2">
      <Link href="/dashboard" className={buttonClass("secondary", "sm", "whitespace-nowrap rounded-full px-3 text-xs font-bold sm:px-4 sm:text-sm")}>마이페이지</Link>
      <button type="button" onClick={handleLogout} disabled={isLoggingOut} className={buttonClass("danger", "sm", "hidden whitespace-nowrap rounded-full px-4 font-bold disabled:opacity-100 sm:inline-flex")}>
        {isLoggingOut ? "로그아웃 중..." : "로그아웃"}
      </button>
      <Link href={applyHref} className={buttonClass("warning", "sm", "whitespace-nowrap rounded-full px-3 text-xs font-black !text-black hover:!text-black sm:px-4 sm:text-sm")}>수강 신청하기</Link>
    </div>
  );
}
