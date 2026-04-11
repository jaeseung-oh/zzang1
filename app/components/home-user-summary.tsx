"use client";

import Link from "next/link";
import type { User } from "firebase/auth";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import { getFirebaseServices } from "@/lib/firebase/client";
import { getUserProfile } from "@/lib/firebase/user-profile";

type HomeUserSummaryProps = {
  currentUser: User;
};

type ProgressItem = {
  watchedSeconds?: number;
  isCompleted?: boolean;
  updatedAt?: unknown;
  createdAt?: unknown;
};

function formatDate(value: unknown) {
  if (value && typeof value === "object" && "toDate" in value && typeof (value as { toDate: () => Date }).toDate === "function") {
    const date = (value as { toDate: () => Date }).toDate();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}.${month}.${day}`;
  }

  return "학습 기록 없음";
}

export default function HomeUserSummary({ currentUser }: HomeUserSummaryProps) {
  const [realName, setRealName] = useState(currentUser.displayName?.trim() || currentUser.email?.split("@")[0]?.trim() || "회원");
  const [progressItems, setProgressItems] = useState<ProgressItem[]>([]);

  useEffect(() => {
    let active = true;

    const loadProfile = async () => {
      try {
        const profile = await getUserProfile(currentUser.uid);
        if (active) {
          setRealName(profile?.realName?.trim() || profile?.fullName?.trim() || currentUser.displayName?.trim() || currentUser.email?.split("@")[0]?.trim() || "회원");
        }
      } catch (error) {
        console.error(error);
      }
    };

    loadProfile();

    const { db } = getFirebaseServices();
    const progressQuery = query(collection(db, "courseProgress"), where("uid", "==", currentUser.uid));
    const unsubscribe = onSnapshot(progressQuery, (snapshot) => {
      if (!active) {
        return;
      }
      setProgressItems(snapshot.docs.map((doc) => doc.data() as ProgressItem));
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [currentUser]);

  const summary = useMemo(() => {
    const ongoingCount = progressItems.filter((item) => !item.isCompleted && (item.watchedSeconds ?? 0) > 0).length;
    const completedCount = progressItems.filter((item) => Boolean(item.isCompleted)).length;
    const latestTimestamp = progressItems
      .map((item) => item.updatedAt ?? item.createdAt ?? null)
      .find((value) => Boolean(value));

    return {
      ongoingCount,
      completedCount,
      recentStudyDate: latestTimestamp ? formatDate(latestTimestamp) : "학습 기록 없음",
    };
  }, [progressItems]);

  return (
    <div className="max-w-[440px] rounded-[2rem] border border-white/15 bg-white/10 p-6 text-white shadow-[0_20px_80px_rgba(6,16,27,0.38)] backdrop-blur-xl">
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[linear-gradient(135deg,#10213f_0%,#284b84_100%)] text-white shadow-[0_14px_30px_rgba(16,33,63,0.26)]">
          <svg viewBox="0 0 24 24" className="h-7 w-7 fill-none stroke-current" strokeWidth="1.8">
            <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
            <path d="M5 20a7 7 0 0 1 14 0" />
          </svg>
        </div>
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.24em] text-[#f6deb0]">Member Summary</p>
          <h2 className="mt-2 truncate text-2xl font-bold">{realName} 님</h2>
          <p className="mt-1 text-sm text-slate-300">현재 학습 상태와 빠른 이동 메뉴를 한 번에 확인할 수 있습니다.</p>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-[1.4rem] border border-white/10 bg-[#06101b]/50 p-4">
          <p className="text-xs text-slate-300">진행 중인 강의</p>
          <p className="mt-3 text-2xl font-bold">{summary.ongoingCount}건</p>
        </div>
        <div className="rounded-[1.4rem] border border-white/10 bg-[#06101b]/50 p-4">
          <p className="text-xs text-slate-300">수료 완료</p>
          <p className="mt-3 text-2xl font-bold">{summary.completedCount}건</p>
        </div>
        <div className="rounded-[1.4rem] border border-white/10 bg-[#06101b]/50 p-4">
          <p className="text-xs text-slate-300">최근 학습일</p>
          <p className="mt-3 text-sm font-bold">{summary.recentStudyDate}</p>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Link href="/course-room" className="inline-flex min-h-12 items-center justify-center rounded-full bg-[linear-gradient(135deg,#d7b168_0%,#efd9aa_100%)] px-5 py-3 text-sm font-bold text-[#161109] shadow-[0_14px_28px_rgba(164,126,54,0.24)] transition hover:-translate-y-0.5 hover:brightness-105">
          최근 강의 이어서 보기
        </Link>
        <Link href="/certificate" className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/20 bg-[#0a1627]/55 px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#13233d]">
          수료증 및 서류 발급
        </Link>
      </div>
    </div>
  );
}
