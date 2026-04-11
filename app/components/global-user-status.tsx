"use client";

import Link from "next/link";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getFirebaseServices } from "@/lib/firebase/client";
import { getUserProfile } from "@/lib/firebase/user-profile";

function getDisplayName(profileName?: string | null, user?: User | null) {
  return profileName?.trim() || user?.displayName?.trim() || user?.email?.split("@")[0]?.trim() || "회원";
}

export default function GlobalUserStatus() {
  const router = useRouter();
  const pathname = usePathname();
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
    <div ref={menuRef} className="fixed right-3 top-3 z-[75] sm:right-4 sm:top-4">
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsMenuOpen((prev) => !prev)}
          className="flex items-center gap-3 rounded-full border border-[#d7deea] bg-white/96 px-3 py-2 text-left text-[#10213f] shadow-[0_14px_30px_rgba(15,23,42,0.14)] backdrop-blur transition hover:bg-white"
          aria-expanded={isMenuOpen}
          aria-haspopup="menu"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[linear-gradient(135deg,#10213f_0%,#284b84_100%)] text-white">
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="1.8">
              <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
              <path d="M5 20a7 7 0 0 1 14 0" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="max-w-[140px] truncate text-[11px] font-semibold text-slate-500">로그인 상태</p>
            <p className="max-w-[140px] truncate text-sm font-bold">{displayName}님 환영합니다</p>
          </div>
          <svg viewBox="0 0 20 20" className={`h-4 w-4 shrink-0 fill-none stroke-current transition ${isMenuOpen ? "rotate-180" : ""}`} strokeWidth="1.8">
            <path d="m5 7.5 5 5 5-5" />
          </svg>
        </button>

        {isMenuOpen ? (
          <div className="absolute right-0 top-full mt-3 w-56 overflow-hidden rounded-[1.4rem] border border-[#d7deea] bg-white shadow-[0_20px_44px_rgba(15,23,42,0.16)]">
            <div className="border-b border-slate-100 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">My Account</p>
              <p className="mt-2 truncate text-sm font-bold text-[#10213f]">{displayName}님 환영합니다</p>
            </div>
            <div className="p-2">
              <Link href="/course-room" onClick={() => setIsMenuOpen(false)} className="flex min-h-11 items-center rounded-xl px-3 text-sm font-medium text-[#10213f] transition hover:bg-[#f3f7fc]">
                내 강의실
              </Link>
              <Link href="/login" onClick={() => setIsMenuOpen(false)} className="flex min-h-11 items-center rounded-xl px-3 text-sm font-medium text-[#10213f] transition hover:bg-[#f3f7fc]">
                정보 수정
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="flex min-h-11 w-full items-center rounded-xl px-3 text-sm font-medium text-[#a33b24] transition hover:bg-[#fff4f1] disabled:cursor-not-allowed disabled:opacity-60"
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
