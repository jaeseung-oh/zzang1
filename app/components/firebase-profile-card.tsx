"use client";

import { useEffect, useState, useTransition } from "react";
import { ensureAnonymousSession } from "@/lib/firebase/session";
import { getUserProfile, upsertUserProfile } from "@/lib/firebase/user-profile";

type AuthMode = "signup" | "login";

type FirebaseProfileCardProps = {
  mode: AuthMode;
  provider?: string | null;
  providerLabel?: string | null;
  nickname?: string | null;
  name?: string | null;
  email?: string | null;
};

export default function FirebaseProfileCard({
  mode,
  provider,
  providerLabel,
  nickname,
  name,
  email,
}: FirebaseProfileCardProps) {
  const [firebaseUid, setFirebaseUid] = useState("");
  const [fullName, setFullName] = useState("");
  const [savedFullName, setSavedFullName] = useState("");
  const [message, setMessage] = useState("Firebase 학습 계정을 준비하는 중입니다.");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const sessionUser = await ensureAnonymousSession();
        const profile = await getUserProfile(sessionUser.uid);

        if (cancelled) {
          return;
        }

        setFirebaseUid(sessionUser.uid);
        if (profile?.fullName) {
          setFullName(profile.fullName);
          setSavedFullName(profile.fullName);
          setMessage("회원가입 시 저장한 실명이 Firebase에 연결되어 있습니다.");
        } else {
          const suggestedName = name?.trim() || nickname?.trim() || "";
          setFullName(suggestedName);
          setMessage(
            mode === "signup"
              ? "가입을 완료하려면 수료증에 사용할 실명을 저장해 주세요."
              : "로그인 후 수료증 이름을 쓰려면 먼저 실명을 Firebase에 저장해야 합니다."
          );
        }
      } catch (loadError) {
        console.error(loadError);
        if (!cancelled) {
          setError("Firebase 세션을 준비하지 못했습니다. Authentication의 Anonymous 제공자를 확인해 주세요.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [mode, name, nickname]);

  const handleSave = () => {
    setError("");

    startTransition(async () => {
      try {
        const sessionUser = await ensureAnonymousSession();
        await upsertUserProfile({
          uid: sessionUser.uid,
          fullName,
          email,
          provider,
          providerLabel,
          nickname: nickname ?? name ?? null,
        });

        setFirebaseUid(sessionUser.uid);
        setSavedFullName(fullName.trim());
        setMessage("실명이 저장되었습니다. 이제 결제, 수강 완료, 수료증 출력이 같은 Firebase 사용자 기준으로 연결됩니다.");
      } catch (saveError) {
        console.error(saveError);
        setError(saveError instanceof Error ? saveError.message : "실명 저장 중 오류가 발생했습니다.");
      }
    });
  };

  const isSaved = Boolean(savedFullName);

  return (
    <div className="mt-6 rounded-[1.5rem] border border-[#173a34]/12 bg-white/70 p-5">
      <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#a45127]">Firebase Real Name</p>
      <h3 className="mt-3 text-xl font-bold text-[#17211e]">
        {isSaved ? "수료증용 실명이 저장되었습니다" : "수료증에 사용할 실명을 저장하세요"}
      </h3>
      <p className="mt-3 text-sm leading-7 text-[#5d6762]">{message}</p>

      <div className="mt-5 grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
        <label className="space-y-2 text-sm text-[#17211e]">
          <span>실명</span>
          <input
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            placeholder="홍길동"
            disabled={loading || isPending}
            className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-[#a45127]"
          />
        </label>
        <button
          type="button"
          onClick={handleSave}
          disabled={loading || isPending}
          className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#112723] px-5 py-3 text-sm font-extrabold text-[#fff9f2] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "저장 중..." : isSaved ? "실명 다시 저장" : "실명 저장"}
        </button>
      </div>

      <div className="mt-4 grid gap-3 text-sm text-[#5d6762] md:grid-cols-2">
        <div className="rounded-2xl border border-black/10 bg-white/80 px-4 py-3">
          Firebase UID: {firebaseUid || "준비 중"}
        </div>
        <div className="rounded-2xl border border-black/10 bg-white/80 px-4 py-3">
          저장된 이름: {savedFullName || "아직 없음"}
        </div>
      </div>

      {error ? <p className="mt-4 text-sm text-[#a23f38]">{error}</p> : null}
    </div>
  );
}
