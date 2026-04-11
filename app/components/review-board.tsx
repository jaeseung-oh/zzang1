"use client";

import Link from "next/link";
import { onAuthStateChanged, type User } from "firebase/auth";
import { addDoc, collection, limit, onSnapshot, orderBy, query, serverTimestamp } from "firebase/firestore";
import { useEffect, useState } from "react";
import { getFirebaseServices } from "@/lib/firebase/client";
import { getUserProfile } from "@/lib/firebase/user-profile";

type ReviewItem = {
  id: string;
  authorName: string;
  courseLabel: string;
  title: string;
  body: string;
  rating: number;
  createdAtLabel: string;
};

const courseOptions = [
  "음주운전 예방교육",
  "사기 예방교육",
  "성폭력 예방교육",
  "마약 예방교육",
  "도박 예방교육",
  "폭력 예방교육",
  "재범방지 종합교육",
];

function maskDisplayName(name?: string | null, email?: string | null) {
  const base = name?.trim() || email?.split("@")[0]?.trim() || "수강생";
  if (!base) {
    return "수강생";
  }

  const chars = Array.from(base);
  if (chars.length === 1) {
    return `${chars[0]}OO`;
  }

  return `${chars[0]}${"O".repeat(Math.min(2, Math.max(chars.length - 1, 1)))}`;
}

function formatCreatedAt(value: unknown) {
  if (value && typeof value === "object" && "toDate" in value && typeof (value as { toDate: () => Date }).toDate === "function") {
    const date = (value as { toDate: () => Date }).toDate();
    return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
  }

  return "방금 등록";
}

export default function ReviewBoard() {
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState("수강생");
  const [courseLabel, setCourseLabel] = useState(courseOptions[0]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [rating, setRating] = useState(5);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const { auth, db } = getFirebaseServices();

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user && !user.isAnonymous ? user : null);
      if (!user || user.isAnonymous) {
        setDisplayName("수강생");
        return;
      }

      try {
        const profile = await getUserProfile(user.uid);
        setDisplayName(maskDisplayName(profile?.nickname || profile?.realName || profile?.fullName, user.email));
      } catch (profileError) {
        console.error(profileError);
        setDisplayName(maskDisplayName(user.displayName, user.email));
      }
    });

    const reviewsQuery = query(collection(db, "reviews"), orderBy("createdAt", "desc"), limit(6));
    const unsubscribeReviews = onSnapshot(
      reviewsQuery,
      (snapshot) => {
        const nextReviews = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            authorName: typeof data.authorName === "string" ? data.authorName : "수강생",
            courseLabel: typeof data.courseLabel === "string" ? data.courseLabel : "교육과정",
            title: typeof data.title === "string" ? data.title : "후기",
            body: typeof data.body === "string" ? data.body : "",
            rating: typeof data.rating === "number" ? data.rating : 5,
            createdAtLabel: formatCreatedAt(data.createdAt),
          } satisfies ReviewItem;
        });
        setReviews(nextReviews);
      },
      (snapshotError) => {
        console.error(snapshotError);
        setError("후기 목록을 불러오지 못했습니다. 잠시 후 다시 확인해 주세요.");
      }
    );

    return () => {
      unsubscribeAuth();
      unsubscribeReviews();
    };
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!currentUser) {
      setError("로그인 후 후기를 등록할 수 있습니다.");
      return;
    }

    if (!title.trim() || !body.trim()) {
      setError("후기 제목과 내용을 모두 입력해 주세요.");
      return;
    }

    setIsSubmitting(true);

    try {
      const { db } = getFirebaseServices();
      await addDoc(collection(db, "reviews"), {
        uid: currentUser.uid,
        authorName: displayName.trim() || "수강생",
        courseLabel,
        title: title.trim(),
        body: body.trim(),
        rating,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setTitle("");
      setBody("");
      setRating(5);
      setSuccess("후기가 등록되었습니다.");
    } catch (submitError) {
      console.error(submitError);
      setError("후기 등록 중 문제가 발생했습니다. Firestore 규칙 또는 네트워크 상태를 확인해 주세요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-[#f0cb85]">최근 등록된 후기</p>
            <p className="mt-2 text-sm leading-7 text-white/70">실제 수강 경험을 기반으로 한 후기들을 확인할 수 있습니다.</p>
          </div>
          <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white/70">최신 6건 표시</div>
        </div>

        <div className="space-y-4">
          {reviews.length ? (
            reviews.map((item) => (
              <article key={item.id} className="rounded-[1.6rem] border border-white/10 bg-white/5 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[#f0cb85]">{item.courseLabel}</p>
                    <h3 className="mt-2 text-lg font-bold text-white">{item.title}</h3>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-white">{"★".repeat(item.rating)}<span className="text-white/30">{"★".repeat(Math.max(0, 5 - item.rating))}</span></p>
                    <p className="mt-1 text-xs text-white/55">{item.createdAtLabel}</p>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-8 text-white/80">{item.body}</p>
                <p className="mt-5 text-sm font-bold text-white">{item.authorName}</p>
              </article>
            ))
          ) : (
            <div className="rounded-[1.6rem] border border-dashed border-white/15 bg-white/5 p-6 text-sm leading-7 text-white/65">아직 등록된 후기가 없습니다. 첫 후기를 남겨 보세요.</div>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="rounded-[1.8rem] border border-white/10 bg-white/[0.06] p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-[#f0cb85]">후기 작성</p>
            <p className="mt-2 text-sm leading-7 text-white/70">수강 경험과 느낀 점을 간단히 남길 수 있습니다.</p>
          </div>
          <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/75">{displayName}</div>
        </div>

        <div className="mt-6 space-y-4">
          <label className="block text-sm text-white/80">
            <span>교육과정</span>
            <select value={courseLabel} onChange={(event) => setCourseLabel(event.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-[#08111d] px-4 py-3 text-white outline-none">
              {courseOptions.map((option) => (
                <option key={option} value={option} className="text-slate-900">
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm text-white/80">
            <span>후기 제목</span>
            <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={60} className="mt-2 w-full rounded-2xl border border-white/10 bg-[#08111d] px-4 py-3 text-white outline-none" placeholder="예: 화면이 정돈되어 수강하기 편했습니다." />
          </label>

          <label className="block text-sm text-white/80">
            <span>별점</span>
            <div className="mt-2 rounded-2xl border border-white/10 bg-[#08111d] px-4 py-3">
              <select
                value={rating}
                onChange={(event) => setRating(Number(event.target.value))}
                className="w-full bg-transparent text-white outline-none"
              >
                {[5, 4, 3, 2, 1].map((score) => (
                  <option key={score} value={score} className="text-slate-900">
                    {score}점
                  </option>
                ))}
              </select>
            </div>
          </label>

          <label className="block text-sm text-white/80">
            <span>후기 내용</span>
            <textarea value={body} onChange={(event) => setBody(event.target.value)} maxLength={500} className="mt-2 min-h-40 w-full rounded-2xl border border-white/10 bg-[#08111d] px-4 py-3 text-white outline-none" placeholder="수강 흐름, 화면 편의성, 실제 도움이 된 점 등을 자유롭게 적어 주세요." />
          </label>
        </div>

        {error ? <p className="mt-4 text-sm text-[#f4b0a3]">{error}</p> : null}
        {success ? <p className="mt-4 text-sm text-[#d7efb0]">{success}</p> : null}

        <div className="mt-6 flex flex-wrap gap-3">
          {currentUser ? (
            <button type="submit" disabled={isSubmitting} className="inline-flex min-h-12 items-center justify-center rounded-full bg-[linear-gradient(135deg,#d7b168_0%,#efd9aa_100%)] px-6 py-3 text-sm font-bold text-[#161109] shadow-[0_14px_28px_rgba(164,126,54,0.22)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60">
              {isSubmitting ? "등록 중..." : "후기 등록하기"}
            </button>
          ) : (
            <Link href="/login?next=/" className="inline-flex min-h-12 items-center justify-center rounded-full bg-[linear-gradient(135deg,#10213f_0%,#284b84_100%)] px-6 py-3 text-sm font-bold text-white shadow-[0_14px_28px_rgba(16,33,63,0.22)] transition hover:-translate-y-0.5">
              로그인 후 후기 작성
            </Link>
          )}
        </div>
      </form>
    </div>
  );
}
