"use client";

import Link from "next/link";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getFirebaseServices } from "@/lib/firebase/client";
import { getUserProfile } from "@/lib/firebase/user-profile";

function getDisplayName(profileName?: string | null, user?: User | null) {
  return profileName?.trim() || user?.displayName?.trim() || user?.email?.split("@")[0]?.trim() || "회원";
}

export default function GlobalUserStatus() {
  const router = useRouter();
    const menuRef = useRef<HTMLDivElement | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState("회원");
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const { auth } = getFirebaseServices();

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      const authenticatedUser = user && !user.isAnonymous ? user : null;
      setCurrentUser(authenticatedUser);
      setIsLoggingOut(false);
      setIsMenuOpen(false);

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

    const handlePointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);

    return () => {
      unsubscribe();
      window.removeEventListener("pointerdown", handlePointerDown);
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
      setIsMenuOpen(false);
      router.replace("/");
    } catch (error) {
      console.error(error);
      setIsLoggingOut(false);
    }
  };

  return (
    <div ref={menuRef} className="fixed right-2 top-2 z-[75] sm:right-3 sm:top-3">
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsMenuOpen((prev) => !prev)}
          className="flex items-center gap-2 rounded-full border border-[#d7deea] bg-white/96 px-2.5 py-1.5 text-left text-[#10213f] shadow-[0_12px_24px_rgba(15,23,42,0.14)] backdrop-blur transition hover:bg-white"
          aria-expanded={isMenuOpen}
          aria-haspopup="menu"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[linear-gradient(135deg,#10213f_0%,#284b84_100%)] text-white">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-none stroke-current" strokeWidth="1.8">
              <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
              <path d="M5 20a7 7 0 0 1 14 0" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="max-w-[112px] truncate text-[12px] font-bold text-[#10213f] sm:max-w-[132px]">{displayName}님</p>
            <p className="text-[10px] font-medium text-slate-500">로그인됨</p>
          </div>
          <svg viewBox="0 0 20 20" className={`h-3.5 w-3.5 shrink-0 fill-none stroke-current transition ${isMenuOpen ? "rotate-180" : ""}`} strokeWidth="1.8">
            <path d="m5 7.5 5 5 5-5" />
          </svg>
        </button>

        {isMenuOpen ? (
          <div className="absolute right-0 top-full mt-2 w-56 overflow-hidden rounded-[1.2rem] border-2 border-[#b7c7dc] bg-white shadow-[0_22px_40px_rgba(15,23,42,0.2)]">
            <div className="border-b border-[#d4dfec] bg-[#eef4fb] px-3.5 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#5a6b85]">My Account</p>
              <p className="mt-1.5 truncate text-sm font-bold text-[#10213f]">{displayName}님 환영합니다</p>
            </div>
            <div className="space-y-2.5 p-3">
              <Link href="/course-room" onClick={() => setIsMenuOpen(false)} className="flex min-h-11 items-center rounded-xl border border-[#10213f] bg-[linear-gradient(135deg,#10213f_0%,#284b84_100%)] px-3.5 text-sm font-bold text-white shadow-[0_12px_24px_rgba(16,33,63,0.22)] transition hover:-translate-y-0.5 hover:brightness-105">
                내 강의실
              </Link>
              <Link href="/login" onClick={() => setIsMenuOpen(false)} className="flex min-h-11 items-center rounded-xl border border-[#10213f] bg-[linear-gradient(135deg,#10213f_0%,#284b84_100%)] px-3.5 text-sm font-bold text-white shadow-[0_12px_24px_rgba(16,33,63,0.22)] transition hover:-translate-y-0.5 hover:brightness-105">
                정보 수정
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="flex min-h-11 w-full items-center rounded-xl border-2 border-[#efc9bf] bg-[#fff5f1] px-3.5 text-sm font-bold text-[#922f1b] transition hover:border-[#dfa899] hover:bg-[#ffebe4] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoggingOut ? "로그아웃 중..." : "로그아웃"}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
