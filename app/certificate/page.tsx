"use client";

import Link from "next/link";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { Suspense, useEffect, useState } from "react";
import { defaultCourse } from "@/lib/course/catalog";
import { getFirebaseServices } from "@/lib/firebase/client";
import { ensureAnonymousSession } from "@/lib/firebase/session";

type TimestampLike = {
  seconds: number;
};

type UserProfileRecord = {
  fullName?: string;
  realName?: string;
  dateOfBirth?: string;
};

type CertificateRecord = {
  id: string;
  uid: string;
  courseId: string;
  documentType: string;
  issueNumber: string;
  downloadUrl: string;
  courseTitle?: string;
  issuedAt?: TimestampLike;
};

type ProgressRecord = {
  courseId: string;
  courseTitle: string;
  isCompleted: boolean;
};

type PurchaseRecord = {
  courseId: string;
  paymentStatus: string;
};

type CertificateViewData = {
  studentName: string;
  birthDate: string;
  courseTitle: string;
  issueDate: string;
  printedDate: string;
  docNumber: string;
  downloadUrl: string;
};

function formatIssueDate(timestamp?: TimestampLike) {
  if (!timestamp?.seconds) {
    return new Date().toLocaleDateString("ko-KR");
  }

  return new Date(timestamp.seconds * 1000).toLocaleDateString("ko-KR");
}

function formatBirthDate(value?: string) {
  if (!value) {
    return "생년월일 정보 없음";
  }

  const matched = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!matched) {
    return value;
  }

  const [, year, month, day] = matched;
  return `${Number(year)}년 ${Number(month)}월 ${Number(day)}일`;
}

function formatDuration(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);

  if (hours > 0) {
    return minutes > 0 ? `${hours}시간 ${minutes}분` : `${hours}시간`;
  }

  return `${minutes}분`;
}

function buildFallbackData(): CertificateViewData {
  const today = new Date().toLocaleDateString("ko-KR");

  return {
    studentName: "홍길동",
    birthDate: "1990년 1월 1일",
    courseTitle: "음주운전 예방 교육",
    issueDate: today,
    printedDate: today,
    docNumber: "발급 대기 중",
    downloadUrl: "",
  };
}

function CertificatePageContent() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [certificateData, setCertificateData] = useState<CertificateViewData>(buildFallbackData);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const user = await ensureAnonymousSession();
        const { db } = getFirebaseServices();

        const [userSnapshot, purchaseSnapshot, progressSnapshot, certificateSnapshot] = await Promise.all([
          getDoc(doc(db, "users", user.uid)),
          getDocs(query(collection(db, "purchases"), where("uid", "==", user.uid), where("paymentStatus", "==", "paid"))),
          getDocs(query(collection(db, "courseProgress"), where("uid", "==", user.uid), where("isCompleted", "==", true))),
          getDocs(query(collection(db, "certificates"), where("uid", "==", user.uid), where("documentType", "==", "completion"))),
        ]);

        if (cancelled) {
          return;
        }

        const userProfile = userSnapshot.exists() ? (userSnapshot.data() as UserProfileRecord) : null;
        const fullName = userProfile?.realName?.trim() || userProfile?.fullName?.trim();
        if (!fullName) {
          setError("회원가입 화면에서 실명을 먼저 저장해야 수료증을 출력할 수 있습니다.");
          return;
        }

        const paidPurchases = purchaseSnapshot.docs.map((snapshot) => snapshot.data() as PurchaseRecord);
        if (!paidPurchases.length) {
          setError("결제 완료 이력이 없어 수료증을 출력할 수 없습니다.");
          return;
        }

        const completedProgressList = progressSnapshot.docs.map((snapshot) => snapshot.data() as ProgressRecord);
        if (!completedProgressList.length) {
          setError("아직 수강 완료 상태가 아니어서 수료증을 출력할 수 없습니다.");
          return;
        }

        const certificates = certificateSnapshot.docs
          .map((snapshot) => ({ id: snapshot.id, ...(snapshot.data() as Omit<CertificateRecord, "id">) }))
          .sort((a, b) => (b.issuedAt?.seconds || 0) - (a.issuedAt?.seconds || 0));

        const completionCertificate = certificates[0];
        if (!completionCertificate) {
          setError("수료증 원본 문서가 아직 준비되지 않았습니다. 수강실에서 다시 저장해 주세요.");
          return;
        }

        const matchedProgress = completedProgressList.find((progress) => progress.courseId === completionCertificate.courseId);
        if (!matchedProgress) {
          setError("완료된 수강 이력이 수료증과 연결되지 않았습니다.");
          return;
        }

        const hasPaidPurchaseForCourse = paidPurchases.some((purchase) => purchase.courseId === completionCertificate.courseId);
        if (!hasPaidPurchaseForCourse) {
          setError("이 수료증에 연결된 결제 완료 이력이 확인되지 않았습니다.");
          return;
        }

        const printedDate = new Date().toLocaleDateString("ko-KR");

        setCertificateData({
          studentName: fullName,
          birthDate: formatBirthDate(userProfile?.dateOfBirth),
          courseTitle: (completionCertificate.courseTitle || matchedProgress.courseTitle || "수료 과정 확인 필요").replace("수료", "").trim(),
          issueDate: formatIssueDate(completionCertificate.issuedAt),
          printedDate,
          docNumber: completionCertificate.issueNumber || "문서번호 확인 필요",
          downloadUrl: completionCertificate.downloadUrl,
        });
      } catch (loadError) {
        console.error(loadError);
        if (!cancelled) {
          setError("수료증 정보를 불러오지 못했습니다. Firebase 인증과 Firestore 데이터를 확인해 주세요.");
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
  }, []);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(179,138,61,0.12),transparent_28%),linear-gradient(180deg,#f6f2e9_0%,#e9dfcf_100%)] px-4 py-8 text-[#1f2430] print:bg-white print:p-0">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-[1160px] flex-col items-center justify-center gap-6 print:min-h-0 print:max-w-none print:gap-0">
        {loading ? (
          <div className="w-full max-w-3xl rounded-[1.75rem] border border-[rgba(179,138,61,0.24)] bg-white/80 p-6 text-center text-sm text-[#5f6775] print:hidden">
            수료증 정보를 불러오는 중입니다...
          </div>
        ) : null}

        {error ? (
          <div className="w-full max-w-3xl rounded-[1.75rem] border border-[#d9967b] bg-[#fff6f2] p-6 text-center text-sm text-[#7f3f2c] print:hidden">
            <p>{error}</p>
            <div className="mt-4 flex justify-center gap-3">
              <Link href="/signup" className="rounded-full border border-[#7f3f2c]/20 px-5 py-2 font-semibold">
                회원가입 화면
              </Link>
              <Link href="/course-room" className="rounded-full border border-[#7f3f2c]/20 px-5 py-2 font-semibold">
                수강실로 돌아가기
              </Link>
            </div>
          </div>
        ) : (
          <>
            <section
              className="relative w-full overflow-hidden rounded-[1.4rem] border-[12px] border-[#d9c08a] bg-[linear-gradient(180deg,#fefdf9_0%,#fbf7ee_42%,#f7f1e4_100%)] shadow-[0_24px_72px_rgba(33,27,18,0.18)] before:pointer-events-none before:absolute before:inset-[18px] before:rounded-[0.85rem] before:border before:border-[rgba(172,138,70,0.9)] before:content-[''] after:pointer-events-none after:absolute after:inset-[34px] after:rounded-[0.55rem] after:border after:border-[rgba(172,138,70,0.36)] after:content-[''] print:min-h-0 print:w-full print:rounded-none print:shadow-none"
              style={{ maxWidth: "1122px" }}
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[linear-gradient(180deg,rgba(10,20,39,0.06),transparent)]" />
              <div className="relative z-10 flex min-h-[793px] flex-col px-8 py-10 sm:px-[72px] sm:py-[60px] print:min-h-0">
                <div className="border-b border-[rgba(15,23,42,0.08)] pb-8 text-center">
                  <p className="text-[12px] font-semibold uppercase tracking-[0.34em] text-[#9c7b3b]">Certificate Of Completion</p>
                  <h1 className="mt-5 text-[40px] font-bold tracking-[0.18em] text-[#101826] sm:text-[58px]">수 료 증</h1>
                  <p className="mt-4 text-[15px] leading-7 text-[#556070]">리셋에듀센터 전문 교육과정 이수 확인서</p>
                </div>

                <div className="mt-10 space-y-7 text-[#172131]">
                  <div className="grid gap-4 rounded-[1.5rem] border border-[rgba(15,23,42,0.08)] bg-white/75 px-6 py-6 shadow-[0_16px_32px_rgba(15,23,42,0.05)] sm:grid-cols-2">
                    <div>
                      <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-[#8d6f39]">성명</p>
                      <p className="mt-3 text-[28px] font-bold tracking-[0.04em] text-[#0f172a] sm:text-[36px]">{certificateData.studentName}</p>
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-[#8d6f39]">생년월일</p>
                      <p className="mt-3 text-[24px] font-semibold text-[#0f172a] sm:text-[30px]">{certificateData.birthDate}</p>
                    </div>
                  </div>

                  <div className="px-2 text-center text-[20px] leading-[2.0] text-[#2a3342] sm:px-8 sm:text-[24px]">
                    <p>위 사람은 본 기관이 운영하는</p>
                    <p className="mt-2 text-[24px] font-bold text-[#0f172a] sm:text-[34px]">「{certificateData.courseTitle}」</p>
                    <p className="mt-3">과정을 성실히 이수하고,</p>
                    <p>총 {defaultCourse.modules.length}강의 교육 전 과정을 수료하였음을 증명합니다.</p>
                  </div>

                  <div className="grid gap-4 rounded-[1.5rem] border border-[rgba(15,23,42,0.08)] bg-[linear-gradient(180deg,rgba(255,255,255,0.82),rgba(249,244,233,0.96))] px-6 py-6 sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d6f39]">과정명</p>
                      <p className="mt-3 text-lg font-semibold text-[#0f172a]">{certificateData.courseTitle}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d6f39]">수료시간</p>
                      <p className="mt-3 text-lg font-semibold text-[#0f172a]">총 {formatDuration(defaultCourse.durationMinutes * 60)}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d6f39]">수료일자</p>
                      <p className="mt-3 text-lg font-semibold text-[#0f172a]">{certificateData.issueDate}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d6f39]">문서번호</p>
                      <p className="mt-3 text-lg font-semibold text-[#0f172a]">{certificateData.docNumber}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-auto grid gap-8 pt-12 sm:grid-cols-[1fr_auto] sm:items-end">
                  <div className="space-y-3 text-[15px] leading-7 text-[#4f5968]">
                    <p>출력일자: {certificateData.printedDate}</p>
                    <p>본 문서는 교육생 실명, 결제 이력 및 수강 완료 상태를 기준으로 발급된 공식 교육 수료 확인서입니다.</p>
                  </div>

                  <div className="text-left sm:text-right">
                    <p className="text-[28px] font-bold tracking-[0.04em] text-[#111827]">리셋에듀센터장</p>
                    <p className="mt-2 text-sm font-semibold uppercase tracking-[0.18em] text-[#8d6f39]">Director / Official Seal</p>
                    <div className="mt-4 inline-grid h-[132px] w-[132px] place-items-center rounded-full border-[5px] border-[rgba(166,126,51,0.58)] bg-[radial-gradient(circle,rgba(239,224,187,0.58)_0%,rgba(232,210,154,0.28)_52%,transparent_70%)] text-center text-[15px] font-bold leading-[1.45] tracking-[0.16em] text-[rgba(130,93,28,0.92)] shadow-[inset_0_0_0_8px_rgba(255,255,255,0.55)]">
                      리셋<br />에듀센터<br />직인
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <div className="flex flex-wrap justify-center gap-3 print:hidden">
              <button
                type="button"
                onClick={() => window.print()}
                className="rounded-full bg-[linear-gradient(135deg,#2b2a26,#5b4522)] px-7 py-4 text-[17px] font-bold text-[#fff8ea] shadow-[0_14px_28px_rgba(35,29,18,0.18)] transition hover:-translate-y-0.5"
              >
                수료증 인쇄하기 / PDF로 저장하기
              </button>
              {certificateData.downloadUrl ? (
                <a
                  href={certificateData.downloadUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-[rgba(179,138,61,0.34)] bg-white/70 px-7 py-4 text-[17px] font-bold text-[#5b4522] transition hover:bg-white"
                >
                  원본 PDF 열기
                </a>
              ) : null}
            </div>
          </>
        )}
      </div>
    </main>
  );
}

export default function CertificatePage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(179,138,61,0.12),transparent_28%),linear-gradient(180deg,#f6f2e9_0%,#e9dfcf_100%)] px-4 py-8 text-[#1f2430]">
          <div className="mx-auto max-w-3xl rounded-[1.75rem] border border-[rgba(179,138,61,0.24)] bg-white/80 p-6 text-center text-sm text-[#5f6775]">
            수료증 화면을 준비하는 중입니다...
          </div>
        </main>
      }
    >
      <CertificatePageContent />
    </Suspense>
  );
}
