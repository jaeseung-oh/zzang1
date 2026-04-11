"use client";

import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getFirebaseServices } from "@/lib/firebase/client";

const IDLE_TIMEOUT_MS = 60 * 60 * 1000;
const CHECK_INTERVAL_MS = 1000;
const ACTIVITY_THROTTLE_MS = 1000;
const ACTIVITY_EVENTS: Array<keyof WindowEventMap> = [
  "pointerdown",
  "pointermove",
  "keydown",
  "scroll",
  "touchstart",
  "click",
];
const LECTURE_ACTIVITY_EVENT = "resetedu:lecture-activity";

type LectureActivityDetail = {
  active?: boolean;
};

function formatRemainingTime(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export default function IdleSessionGuard() {
  const router = useRouter();
  const pathname = usePathname();
  const userRef = useRef<User | null>(null);
  const lastActivityAtRef = useRef(Date.now());
  const lastActivityEventAtRef = useRef(0);
  const lectureActiveRef = useRef(false);
  const logoutInFlightRef = useRef(false);
  const [displayUser, setDisplayUser] = useState<User | null>(null);
  const [remainingLabel, setRemainingLabel] = useState(formatRemainingTime(IDLE_TIMEOUT_MS));

  useEffect(() => {
    let intervalId: number | null = null;

    try {
      const { auth } = getFirebaseServices();

      const unsubscribe = onAuthStateChanged(auth, (user) => {
        userRef.current = user;
        setDisplayUser(user && !user.isAnonymous ? user : null);
        logoutInFlightRef.current = false;
        lectureActiveRef.current = false;
        lastActivityAtRef.current = Date.now();
        setRemainingLabel(formatRemainingTime(IDLE_TIMEOUT_MS));
      });

      const markActivity = () => {
        const now = Date.now();
        if (now - lastActivityEventAtRef.current < ACTIVITY_THROTTLE_MS) {
          return;
        }

        lastActivityEventAtRef.current = now;
        lastActivityAtRef.current = now;
        setRemainingLabel(formatRemainingTime(IDLE_TIMEOUT_MS));
      };

      const handleVisibilityChange = () => {
        if (!document.hidden) {
          markActivity();
        }
      };

      const handleLectureActivity = (event: Event) => {
        const detail = (event as CustomEvent<LectureActivityDetail>).detail;
        lectureActiveRef.current = Boolean(detail?.active);

        if (lectureActiveRef.current) {
          lastActivityAtRef.current = Date.now();
          setRemainingLabel(formatRemainingTime(IDLE_TIMEOUT_MS));
        }
      };

      const logoutForIdle = async () => {
        if (logoutInFlightRef.current) {
          return;
        }

        const activeUser = userRef.current;
        if (!activeUser || activeUser.isAnonymous) {
          setRemainingLabel(formatRemainingTime(IDLE_TIMEOUT_MS));
          return;
        }

        if (lectureActiveRef.current) {
          lastActivityAtRef.current = Date.now();
          setRemainingLabel(formatRemainingTime(IDLE_TIMEOUT_MS));
          return;
        }

        const remainingMs = IDLE_TIMEOUT_MS - (Date.now() - lastActivityAtRef.current);
        setRemainingLabel(formatRemainingTime(remainingMs));

        if (remainingMs > 0) {
          return;
        }

        logoutInFlightRef.current = true;

        try {
          await signOut(auth);
          window.sessionStorage.setItem("idleLogoutAt", new Date().toISOString());
          if (pathname !== "/login") {
            router.replace("/login?idle=1");
          }
        } catch (error) {
          console.error(error);
          logoutInFlightRef.current = false;
        }
      };

      for (const eventName of ACTIVITY_EVENTS) {
        window.addEventListener(eventName, markActivity, { passive: true });
      }
      document.addEventListener("visibilitychange", handleVisibilityChange);
      window.addEventListener(LECTURE_ACTIVITY_EVENT, handleLectureActivity as EventListener);
      intervalId = window.setInterval(() => {
        void logoutForIdle();
      }, CHECK_INTERVAL_MS);

      return () => {
        unsubscribe();
        if (intervalId !== null) {
          window.clearInterval(intervalId);
        }
        for (const eventName of ACTIVITY_EVENTS) {
          window.removeEventListener(eventName, markActivity);
        }
        document.removeEventListener("visibilitychange", handleVisibilityChange);
        window.removeEventListener(LECTURE_ACTIVITY_EVENT, handleLectureActivity as EventListener);
      };
    } catch (error) {
      console.error(error);
    }
  }, [pathname, router]);

  if (!displayUser) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed right-3 top-3 z-[60] px-3 sm:right-4 sm:top-4">
      <div className="rounded-full border border-[#d6deef] bg-[rgba(255,255,255,0.92)] px-3 py-1.5 text-[10px] font-semibold tracking-[0.04em] text-[#24364f] shadow-[0_10px_20px_rgba(15,23,42,0.1)] backdrop-blur sm:text-[11px]">
        로그아웃 {remainingLabel}
      </div>
    </div>
  );
}
