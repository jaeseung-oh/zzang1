"use client";

import Link from "next/link";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getFirebaseServices } from "@/lib/firebase/client";
import { getUserProfile } from "@/lib/firebase/user-profile";

function getDisplayName(profileName?: string | null, user?: User | null) {
  return profileName?.trim() || user?.displayName?.trim() || user?.email?.split("@")[0]?.trim() || "회원";
}

export default function GlobalUserStatus() {
  const router = useRouter();
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState("회원");
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    const { auth } = getFirebaseServices();

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      const authenticatedUser = user && !user.isAnonymous ? user : null;
      setCurrentUser(authenticatedUser);
      setIsLoggingOut(false);

      if (!authenticatedUser) {
        setDisplayName("회원");
        return;
      }

      try {
        const profile = await getUserProfile(authenticatedUser.uid);
        setDisplayName(getDisplayName(profile?.realName || profile?.fullName, authenticatedUser));
      } catch (error) {
        console.error(error);
        setDisplayName(getDisplayName(null, authenticatedUser));
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  if (!currentUser) {
    return null;
  }

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      const { auth } = getFirebaseServices();
      await signOut(auth);
      if (pathname !== "/login") {
        router.replace("/login");
      }
    } catch (error) {
      console.error(error);
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="fixed right-3 top-3 z-[75] sm:right-4 sm:top-4">
      <div className="flex items-center gap-2 rounded-full border border-[#d7deea] bg-white/96 px-3 py-2 text-[#10213f] shadow-[0_14px_30px_rgba(15,23,42,0.14)] backdrop-blur">
        <Link
          href="/dashboard"
          className="min-w-0 rounded-full px-2 py-1 transition hover:bg-[#f2f6fb]"
          aria-label="내 수강현황으로 이동"
        >
          <p className="max-w-[110px] truncate text-xs font-bold">{displayName}</p>
          <p className="max-w-[110px] truncate text-[10px] text-slate-500">로그인됨</p>
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="inline-flex min-h-9 items-center justify-center rounded-full border border-[#d7deea] bg-[#f8fbff] px-3 text-[11px] font-semibold text-[#10213f] transition hover:bg-[#edf3fb] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoggingOut ? "처리 중" : "로그아웃"}
        </button>
      </div>
    </div>
  );
}
