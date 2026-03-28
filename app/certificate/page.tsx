"use client";

import Link from "next/link";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { Suspense, useEffect, useState } from "react";
import { getFirebaseServices } from "@/lib/firebase/client";
import { ensureAnonymousSession } from "@/lib/firebase/session";

type TimestampLike = {
  seconds: number;
};

type UserProfileRecord = {
  fullName?: string;
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
  courseTitle: string;
  issueDate: string;
  docNumber: string;
  downloadUrl: string;
};

function formatIssueDate(timestamp?: TimestampLike) {
  if (!timestamp?.seconds) {
    return new Date().toLocaleDateString("ko-KR");
  }

  return new Date(timestamp.seconds * 1000).toLocaleDateString("ko-KR");
}

function buildFallbackData(): CertificateViewData {
  return {
    studentName: "홍길동",
    courseTitle: "음주운전 예방교육 수료",
    issueDate: new Date().toLocaleDateString("ko-KR"),
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
        const fullName = userProfile?.fullName?.trim();
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

        setCertificateData({
          studentName: fullName,
          courseTitle: completionCertificate.courseTitle || matchedProgress.courseTitle || "수료 과정 확인 필요",
          issueDate: formatIssueDate(completionCertificate.issuedAt),
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
              className="relative w-full overflow-hidden border-[10px] border-[#e6d3a4] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,252,245,0.98))] shadow-[0_18px_60px_rgba(41,33,18,0.18)] before:pointer-events-none before:absolute before:inset-[18px] before:border-2 before:border-[rgba(179,138,61,0.9)] before:content-[''] after:pointer-events-none after:absolute after:inset-[34px] after:border-2 after:border-[rgba(179,138,61,0.45)] after:content-[''] print:min-h-0 print:w-full print:shadow-none"
              style={{ maxWidth: "1122px" }}
            >
              <div className="absolute left-6 top-6 h-[120px] w-[120px] border-l-[3px] border-t-[3px] border-[rgba(179,138,61,0.55)]" />
              <div className="absolute right-6 top-6 h-[120px] w-[120px] border-r-[3px] border-t-[3px] border-[rgba(179,138,61,0.55)]" />
              <div className="absolute bottom-6 left-6 h-[120px] w-[120px] border-b-[3px] border-l-[3px] border-[rgba(179,138,61,0.55)]" />
              <div className="absolute bottom-6 right-6 h-[120px] w-[120px] border-b-[3px] border-r-[3px] border-[rgba(179,138,61,0.55)]" />

              <div className="relative z-10 flex min-h-[793px] flex-col px-10 py-14 sm:px-[88px] sm:py-[70px] print:min-h-0">
                <p className="m-0 text-center text-[18px] tracking-[0.35em] text-[#b38a3d]">CERTIFICATE OF COMPLETION</p>
                <h1 className="mt-[18px] text-center font-serif text-[44px] font-bold tracking-[0.18em] sm:text-[62px]">수 료 증</h1>
                <p className="text-center text-[18px] tracking-[0.08em] text-[#5f6775]">음주운전 예방교육 공식 수료 확인서</p>

                <div className="mt-14 text-center leading-[1.9] sm:mt-[58px]">
                  <p className="text-[20px] sm:text-[24px]">아래의 교육생은 본 기관이 시행한</p>
                  <div className="mx-auto my-7 inline-block border-b-2 border-[rgba(31,36,48,0.35)] px-[18px] pb-2 text-[38px] font-bold sm:mb-5 sm:text-[56px]">
                    {certificateData.studentName}
                  </div>
                  <p className="text-[20px] sm:text-[24px]">교육과정을 성실히 이수하였으므로</p>
                  <div className="mt-2 inline-block border border-[rgba(179,138,61,0.45)] bg-[rgba(179,138,61,0.08)] px-7 py-3 text-[22px] sm:text-[28px]">
                    {certificateData.courseTitle}
                  </div>
                  <p className="mt-7 text-[18px] text-[#5f6775] sm:text-[20px]">위와 같이 수료를 증명합니다.</p>
                </div>

                <div className="mt-auto grid gap-8 pt-10 sm:grid-cols-[1fr_auto] sm:items-end">
                  <div className="text-[18px] leading-[1.8]">
                    <div><strong className="inline-block min-w-[88px] text-[#b38a3d]">수료일자</strong><span>{certificateData.issueDate}</span></div>
                    <div><strong className="inline-block min-w-[88px] text-[#b38a3d]">문서번호</strong><span>{certificateData.docNumber}</span></div>
                    <div><strong className="inline-block min-w-[88px] text-[#b38a3d]">발급용도</strong><span>교육 수료 확인 및 제출용</span></div>
                  </div>

                  <div className="text-left sm:text-right">
                    <p className="m-0 text-[28px] font-bold tracking-[0.08em] sm:text-[32px]">RESET EDU CENTER</p>
                    <div className="mt-[14px] grid h-[104px] w-[104px] place-items-center rounded-full border-[3px] border-[rgba(179,138,61,0.72)] text-center text-[18px] font-bold leading-[1.35] text-[rgba(179,138,61,0.82)] sm:ml-auto">
                      공식
                      <br />
                      인증
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
