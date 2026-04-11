"use client";

import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { getFirebaseServices } from "@/lib/firebase/client";

const IDLE_TIMEOUT_MS = 60 * 60 * 1000;
const CHECK_INTERVAL_MS = 30 * 1000;
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

export default function IdleSessionGuard() {
  const router = useRouter();
  const pathname = usePathname();
  const userRef = useRef<User | null>(null);
  const lastActivityAtRef = useRef(Date.now());
  const lastActivityEventAtRef = useRef(0);
  const lectureActiveRef = useRef(false);
  const logoutInFlightRef = useRef(false);

  useEffect(() => {
    let intervalId: number | null = null;

    try {
      const { auth } = getFirebaseServices();

      const unsubscribe = onAuthStateChanged(auth, (user) => {
        userRef.current = user;
        logoutInFlightRef.current = false;
        lastActivityAtRef.current = Date.now();
      });

      const markActivity = () => {
        const now = Date.now();
        if (now - lastActivityEventAtRef.current < ACTIVITY_THROTTLE_MS) {
          return;
        }

        lastActivityEventAtRef.current = now;
        lastActivityAtRef.current = now;
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
        }
      };

      const logoutForIdle = async () => {
        if (logoutInFlightRef.current) {
          return;
        }

        const activeUser = userRef.current;
        if (!activeUser) {
          return;
        }

        if (lectureActiveRef.current) {
          lastActivityAtRef.current = Date.now();
          return;
        }

        if (Date.now() - lastActivityAtRef.current < IDLE_TIMEOUT_MS) {
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

  return null;
}
