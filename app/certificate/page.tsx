"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { Suspense, useEffect, useRef, useState } from "react";
import { DUI_CBT_ADVANCED_COURSE_ID, defaultCourse, duiBasicModules, duiCbtAdvancedModules } from "@/lib/course/catalog";
import { isAdminEmail } from "@/lib/admin/config";
import { getFirebaseServices } from "@/lib/firebase/client";
import { requireAuthenticatedUser } from "@/lib/firebase/session";
import SealStamp, { centerLogoPath } from "@/app/components/SealStamp";
import { hasCourseAccess } from "@/lib/course/enrollment-service";
import { trackEvent } from "@/lib/analytics/ga";
import { buttonClass } from "@/app/components/ui/button-styles";

const issuerFallback = "리셋에듀센터";

type TimestampLike = { seconds: number } | string | Date | null;

type UserProfileRecord = {
  fullName?: string;
  realName?: string;
  dateOfBirth?: string;
  birthDate?: string;
  email?: string | null;
  phoneNumber?: string | null;
  certificateIdentity?: {
    realName?: string;
    dateOfBirth?: string;
  };
};

type CertificateRecord = {
  certificateId: string;
  certificateNo?: string;
  issueNumber?: string;
  userId?: string;
  uid?: string;
  userName: string;
  birthDate: string;
  email?: string;
  courseId: string;
  courseTitle: string;
  totalLessons: number;
  completedLessons: number;
  completedAt?: TimestampLike;
  issuedAt?: TimestampLike;
  certificateIssuedAt?: TimestampLike;
  issuerName?: string;
  issuerBusinessNumber?: string;
  issuerContact?: string;
  issuerEmail?: string;
  documentType?: "completion" | "attendance" | string;
};

function maskFirestoreSegment(value: string) {
  if (!value) return "";
  if (value.length <= 8) return value.slice(0, 2) + "***";
  return value.slice(0, 4) + "***" + value.slice(-4);
}

function maskFirestorePath(path: string) {
  const segments = path.split("/");
  return segments
    .map((segment, index) => (index % 2 === 1 ? maskFirestoreSegment(segment) : segment))
    .join("/");
}

function logFirestoreFailure(operation: "getDoc" | "setDoc", path: string, error: unknown) {
  const errorLike = error as { code?: unknown; message?: unknown };
  console.error("[certificate:firestore]", {
    operation,
    path: maskFirestorePath(path),
    code: typeof errorLike?.code === "string" ? errorLike.code : undefined,
    message: typeof errorLike?.message === "string" ? errorLike.message : "Firestore request failed",
  });
}

function toDate(value?: TimestampLike) {
  if (!value) return null;
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value : null;
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isFinite(parsed.getTime()) ? parsed : null;
  }
  if (typeof value === "object" && "seconds" in value) {
    return new Date(value.seconds * 1000);
  }
  return null;
}

function formatKoreanDate(value?: TimestampLike) {
  const date = toDate(value) ?? new Date();
  return `${date.getFullYear()}년 ${String(date.getMonth() + 1).padStart(2, "0")}월 ${String(date.getDate()).padStart(2, "0")}일`;
}

function formatBirthDate(value?: string) {
  const matched = value?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!matched) return value || "생년월일 정보 없음";
  return `${matched[1]}년 ${matched[2]}월 ${matched[3]}일`;
}

function isValidBirthDate(value: string) {
  const matched = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!matched) return false;
  const year = Number(matched[1]);
  const month = Number(matched[2]);
  const day = Number(matched[3]);
  const candidate = new Date(year, month - 1, day);
  const valid =
    !Number.isNaN(candidate.getTime()) &&
    candidate.getFullYear() === year &&
    candidate.getMonth() === month - 1 &&
    candidate.getDate() === day;
  if (!valid) return false;
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return candidate <= todayStart;
}

function CertificatePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [uid, setUid] = useState("");
  const [profile, setProfile] = useState<UserProfileRecord | null>(null);
  const [birthDateInput, setBirthDateInput] = useState("");
  const [certificate, setCertificate] = useState<CertificateRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [issuing, setIssuing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const autoPrintStartedRef = useRef(false);

  const requestedCertificateId = searchParams.get("certificateId");
  const requestedAdminPreview = searchParams.get("adminPreview");
  const shouldAutoPrint = searchParams.get("print") === "1";
  const requestedCourseId = searchParams.get("courseId") === DUI_CBT_ADVANCED_COURSE_ID ? DUI_CBT_ADVANCED_COURSE_ID : defaultCourse.id;
  const requestedDocumentType = searchParams.get("documentType") || "";
  const requestedCourseTitle = requestedCourseId === DUI_CBT_ADVANCED_COURSE_ID ? "인지행동기반 재발방지교육 심화과정" : defaultCourse.title;
  const requestedTotalLessons = requestedCourseId === DUI_CBT_ADVANCED_COURSE_ID ? duiCbtAdvancedModules.length : duiBasicModules.length;
  const expectedCertificateId = uid ? `${uid}_${requestedCourseId}` : "";
  const profileBirthDate = profile?.certificateIdentity?.dateOfBirth || profile?.dateOfBirth || profile?.birthDate || "";
  const profileName = profile?.certificateIdentity?.realName || profile?.realName || profile?.fullName || "";
  const needsBirthDate = Boolean(uid && profile && !profileBirthDate && !certificate);

  const buildAdminPreviewCertificate = (userId: string, email: string, documentType: "attendance" | "completion"): CertificateRecord => {
    const completedLessons = documentType === "completion" ? duiBasicModules.length : 1;
    return {
      certificateId: `admin_preview_${documentType}`,
      certificateNo: documentType === "completion" ? "PREVIEW-COMPLETION" : "PREVIEW-ATTENDANCE",
      issueNumber: documentType === "completion" ? "PREVIEW-COMPLETION" : "PREVIEW-ATTENDANCE",
      userId,
      uid: userId,
      userName: "관리자 미리보기",
      birthDate: "1990-01-01",
      email,
      courseId: defaultCourse.id,
      courseTitle: defaultCourse.title,
      totalLessons: duiBasicModules.length,
      completedLessons,
      completedAt: new Date(),
      issuedAt: new Date(),
      certificateIssuedAt: new Date(),
      issuerName: issuerFallback,
      documentType,
    };
  };

  const loadCertificate = async (userId: string, allowAdmin = false) => {
    const { db } = getFirebaseServices();
    const certificateId = requestedCertificateId || `${userId}_${requestedCourseId}`;
    const path = `certificates/${certificateId}`;

    if (requestedCertificateId && requestedCertificateId !== `${userId}_${requestedCourseId}` && !allowAdmin) {
      throw new Error("다른 사용자의 수료증은 조회할 수 없습니다.");
    }

    let snapshot;
    try {
      snapshot = await getDoc(doc(db, "certificates", certificateId));
    } catch (error) {
      logFirestoreFailure("getDoc", path, error);
      throw error;
    }
    if (!snapshot.exists()) {
      return null;
    }

    const data = snapshot.data() as Omit<CertificateRecord, "certificateId">;
    if ((data.userId || data.uid) !== userId && !allowAdmin) {
      throw new Error("다른 사용자의 수료증은 조회할 수 없습니다.");
    }

    return { certificateId: snapshot.id, ...data };
  };

  const refresh = async () => {
    try {
      setLoading(true);
      setError("");
      const user = await requireAuthenticatedUser();
      const token = await user.getIdTokenResult();
      const allowAdmin = token.claims.admin === true || isAdminEmail(user.email);
      const { db } = getFirebaseServices();
      const userSnapshot = await getDoc(doc(db, "users", user.uid));
      const userProfile = userSnapshot.exists() ? (userSnapshot.data() as UserProfileRecord) : null;
      setUid(user.uid);
      setProfile(userProfile);
      setBirthDateInput(userProfile?.dateOfBirth || userProfile?.birthDate || "");

      if (!allowAdmin) {
        const canAccessCourse = await hasCourseAccess(user, requestedCourseId);
        if (!canAccessCourse) {
          const message = "수강권 결제 후 이용할 수 있습니다.";
          setError(message);
          router.replace("/courses/apply/?category=dui&notice=" + encodeURIComponent(message));
          return;
        }
      }

      if (allowAdmin && (requestedAdminPreview === "attendance" || requestedAdminPreview === "completion")) {
        setCertificate(buildAdminPreviewCertificate(user.uid, user.email || userProfile?.email || "", requestedAdminPreview));
        setNotice("관리자 미리보기입니다.");
        return;
      }

      if (requestedCertificateId && requestedCertificateId !== `${user.uid}_${requestedCourseId}`) {
        const existing = await loadCertificate(user.uid, allowAdmin);
        if (existing) {
          setCertificate(existing);
          setNotice("요청한 교육 이수 서류가 발급되었습니다.");
        } else {
          setNotice("관리자 미리보기입니다.");
        }
        return;
      }

      const birthDate = userProfile?.certificateIdentity?.dateOfBirth || userProfile?.dateOfBirth || userProfile?.birthDate || "";
      if (!birthDate) {
        setNotice("수강확인증 발급을 위해 생년월일 정보가 필요합니다.");
        return;
      }

      await issueCertificate(user.uid);
    } catch (loadError) {
      console.error(loadError);
      const message = loadError instanceof Error ? loadError.message : "";
      if (message === "AUTH_LOGIN_REQUIRED") {
        router.replace("/login?next=/certificate");
        setError("로그인 후 수료증을 발급받을 수 있습니다.");
        return;
      }
      setError(message || "서류 발급 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  };

  const issueCertificate = async (currentUid = uid) => {
    setIssuing(true);
    try {
      const user = await requireAuthenticatedUser();
      const apiBaseUrl = process.env.NEXT_PUBLIC_AUTH_API_BASE_URL?.replace(/\/$/, "");
      if (!apiBaseUrl) {
        throw new Error("서류 발급 API 설정이 없습니다.");
      }
      const idToken = await user.getIdToken();
      const response = await fetch(`${apiBaseUrl}/api/certificates/issue`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ courseId: requestedCourseId, documentType: requestedDocumentType || undefined }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.message || "서류 발급 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
      }
      const lookupUid = currentUid || user.uid;
      const issued = await loadCertificate(lookupUid);
      setCertificate(issued);
      setNotice("요청한 교육 이수 서류가 발급되었습니다.");
    } catch (issueError) {
      console.error(issueError);
      const message = issueError instanceof Error ? issueError.message : "";
      setError(message || "서류 발급 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setIssuing(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  useEffect(() => {
    if (!shouldAutoPrint || loading || !certificate || autoPrintStartedRef.current) {
      return;
    }

    autoPrintStartedRef.current = true;
    const timer = window.setTimeout(() => window.print(), 450);
    return () => window.clearTimeout(timer);
  }, [certificate, loading, shouldAutoPrint]);


  const saveBirthDateAndIssue = async () => {
    if (!uid || !profile) return;
    setError("");
    setNotice("");

    if (!isValidBirthDate(birthDateInput)) {
      setError("생년월일은 YYYY-MM-DD 형식으로 입력해 주세요. 예: 1990-01-01");
      return;
    }

    const { db } = getFirebaseServices();
    try {
      await setDoc(
        doc(db, "users", uid),
        {
          dateOfBirth: birthDateInput,
          birthDate: birthDateInput,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (error) {
      logFirestoreFailure("setDoc", `users/${uid}`, error);
      throw error;
    }
    setProfile({ ...profile, dateOfBirth: birthDateInput, birthDate: birthDateInput });
    setNotice("입력한 생년월일을 저장했습니다. 서류 발급을 진행합니다.");
    await issueCertificate(uid);
  };

  const certificateNo = certificate?.certificateNo || certificate?.issueNumber || "발급번호 확인 중";
  const issuedAt = certificate?.issuedAt || certificate?.certificateIssuedAt || certificate?.completedAt || null;
  const issuerName = certificate?.issuerName || issuerFallback;
  const effectiveDocumentType = requestedDocumentType || certificate?.documentType || "completion";
  const isCbtCertificate = requestedCourseId === DUI_CBT_ADVANCED_COURSE_ID;
  const isDetailDocument = effectiveDocumentType === "cbt-detail";
  const isCompletionCertificate = certificate?.documentType !== "attendance";
  const documentTitle = isDetailDocument ? "교육이수 상세내역서" : isCbtCertificate ? "인지행동기반 재발방지교육 이수증" : isCompletionCertificate ? "수료증" : "수강확인증";
  const documentHeading = isDetailDocument ? "교육이수 상세내역서" : isCbtCertificate ? "이 수 증" : isCompletionCertificate ? "수 료 증" : "수 강 확 인 증";
  const documentEnglishTitle = isDetailDocument ? "" : isCompletionCertificate ? "CERTIFICATE OF COMPLETION" : "CERTIFICATE OF ATTENDANCE";
  const documentBody = isDetailDocument
    ? "위 사람은 본 기관에서 운영하는 음주운전 예방교육과 인지행동기반 재발방지교육으로 구성된 재범방지 교육과정을 성실히 이수하였기에 아래와 같이 상세 교육 내역을 확인합니다."
    : isCbtCertificate
      ? "위 사람은 리셋에듀센터의 「인지행동 기반 재범방지교육 심화과정」을 성실히 이수하였습니다. 본 과정에서는 위법행동과 관련된 사고방식 및 행동양식을 점검하고, 위험상황 대처방법과 재범방지 실천계획을 학습하였습니다."
      : isCompletionCertificate
        ? "위 사람은 본 기관에서 운영하는 「음주운전 예방교육」 교육과정을 성실히 이수하였기에 이 증서를 수여합니다."
        : "위 사람은 본 기관에서 운영하는 「음주운전 예방교육」 과정에 수강 등록하고 온라인 교육 시스템을 통해 수강 중임을 확인합니다.";

  const displayedCourseTitle = isDetailDocument ? "인지행동 기반 음주운전 재범방지교육 심화과정" : requestedCourseTitle;
  const certificateRows = [
    ["교육과정명", displayedCourseTitle],
    [isCompletionCertificate ? "수료조건" : "수강상태", isCompletionCertificate ? "전체 교육과정 수강 완료" : "교육과정 수강 중"],
    [isCompletionCertificate ? "수료일자" : "발급일자", formatKoreanDate(certificate?.completedAt || issuedAt)],
  ];
  const detailEducationItems = [
    "인지행동이론의 기본 원리와 사고·감정·행동의 상호관계 이해",
    "음주운전으로 이어지는 개인의 사고방식과 행동과정 점검",
    "음주 후 운전을 정당화하거나 위험성을 축소하는 인지 왜곡 이해",
    "자동적 사고와 충동적 판단을 인식하고 대안적 사고로 전환하는 방법 학습",
    "음주운전 발생 원인과 개인적·환경적 위험요인 분석",
    "회식, 지인 모임, 숙취 상태 등 재범 가능성이 높은 상황 점검",
    "감정과 충동을 조절하고 위험상황에서 행동을 멈추는 대처방법 학습",
    "음주가 판단력, 반응속도 및 운전능력에 미치는 영향 이해",
    "음주운전의 형사적·행정적·사회적 결과와 타인에게 미치는 피해 인식",
    "대리운전, 택시, 대중교통 이용 및 차량 미사용 원칙 수립",
    "가족 협조, 차량 열쇠 관리 및 귀가수단 사전 확보 방법 학습",
    "재범방지를 위한 대안행동과 구체적인 실천계획 수립",
    "책임 있는 의사결정과 지속적인 자기점검 방법 학습",
  ];
  const detailCompletedAt = formatKoreanDate(certificate?.completedAt || issuedAt);

  const openPrintDialog = (mode: "print" | "pdf") => {
    if (!certificate) return;
    trackEvent("certificate_download", { method: mode, document_type: isCompletionCertificate ? "completion" : "attendance" });
    const previousTitle = document.title;
    const safeNo = certificateNo.replace(/[^0-9A-Za-z가-힣_-]/g, "_");
    document.title = documentTitle + "_" + safeNo;
    window.setTimeout(() => window.print(), mode === "pdf" ? 80 : 0);
    window.setTimeout(() => {
      document.title = previousTitle;
    }, 1200);
  };

  return (
    <main className="min-h-screen bg-[#eef3f8] px-4 py-8 text-[#0f172a] print:bg-white print:p-0">
      <style jsx global>{`
        @page { size: A4 portrait; margin: 0; }
        @media screen and (max-width: 640px) {
          .certificate-wrap { overflow-x: hidden; }
          .certificate-paper { min-height: auto !important; width: 100% !important; max-width: 100% !important; padding: 14px !important; }
          .certificate-inner { min-height: auto !important; padding: 18px 14px !important; }
          .certificate-title { font-size: 30px !important; letter-spacing: 0.12em !important; }
          .certificate-identity-value { font-size: 22px !important; }
          .certificate-body { margin-top: 28px !important; font-size: 15px !important; line-height: 1.8 !important; }
          .certificate-identity-row, .certificate-table-row { grid-template-columns: 96px minmax(0, 1fr) !important; }
          .certificate-table-cell { padding: 10px 12px !important; font-size: 13px !important; }
          .certificate-sign { padding-top: 32px !important; }
          .certificate-issuer { font-size: 22px !important; }
          .certificate-seal, .seal-stamp { width: 76px !important; height: 76px !important; }
        }
        @media print {
          html, body { width: 210mm !important; height: 297mm !important; margin: 0 !important; background: #fff !important; overflow: hidden !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          body * { visibility: hidden !important; }
          .certificate-print-root, .certificate-print-root * { visibility: visible !important; }
          body > header, body > footer, header, footer, nav, aside, button, .no-print, .no-print * { display: none !important; visibility: hidden !important; }
          body > div, body > div > div { width: 210mm !important; height: 297mm !important; margin: 0 !important; padding: 0 !important; overflow: hidden !important; }
          main { position: fixed !important; inset: 0 auto auto 0 !important; width: 210mm !important; height: 297mm !important; min-height: 0 !important; max-height: 297mm !important; margin: 0 !important; padding: 0 !important; background: #fff !important; overflow: hidden !important; }
          .certificate-wrap { width: 210mm !important; height: 297mm !important; max-width: none !important; margin: 0 !important; padding: 0 !important; overflow: hidden !important; }
          .certificate-paper {
            width: 210mm !important;
            max-width: 210mm !important;
            min-height: 0 !important;
            height: 297mm !important;
            margin: 0 !important;
            padding: 8mm !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            page-break-before: avoid !important;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
            break-before: avoid !important;
            break-after: avoid !important;
            break-inside: avoid !important;
            overflow: hidden !important;
          }
          .certificate-inner { height: 281mm !important; min-height: 281mm !important; padding: 8mm 10mm !important; border-width: 2px !important; overflow: hidden !important; }
          .certificate-watermark { width: 112mm !important; height: 112mm !important; opacity: 0.055 !important; display: block !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .certificate-title { margin-top: 10mm !important; font-size: 39px !important; line-height: 1.18 !important; }
          .certificate-no { margin-top: 0 !important; font-size: 12px !important; }
          .certificate-person { margin-top: 11mm !important; padding: 5mm !important; font-size: 19px !important; line-height: 1.7 !important; }
          .certificate-identity-value { font-size: 19px !important; }
          .certificate-identity-row { grid-template-columns: 30mm minmax(0, 1fr) !important; }
          .certificate-body { margin-top: 11mm !important; font-size: 17.5px !important; line-height: 1.75 !important; }
          .certificate-table { margin-top: 10mm !important; font-size: 14px !important; }
          .certificate-table-row { grid-template-columns: 36mm minmax(0, 1fr) !important; }
          .certificate-table-cell { padding: 2.6mm 3.2mm !important; line-height: 1.5 !important; }
          .certificate-detail-document .certificate-inner { padding: 7mm 9mm !important; }
          .certificate-detail-document .certificate-title { margin-top: 4mm !important; font-size: 33px !important; line-height: 1.18 !important; }
          .certificate-detail { margin-top: 5mm !important; font-size: 12.2px !important; line-height: 1.48 !important; }
          .certificate-detail-hero { padding: 3mm 3.5mm !important; margin-top: 5mm !important; }
          .certificate-detail-section { margin-top: 3.2mm !important; }
          .certificate-detail-title { font-size: 13.2px !important; margin-bottom: 1.4mm !important; line-height: 1.35 !important; }
          .certificate-detail-title span { width: 6mm !important; height: 6mm !important; font-size: 10px !important; }
          .certificate-detail-grid { grid-template-columns: 31mm minmax(0, 1fr) !important; }
          .certificate-detail-cell { padding: 1.8mm 2.4mm !important; line-height: 1.45 !important; }
          .certificate-detail-list { gap: 0.85mm !important; padding: 3mm 3.5mm !important; }
          .certificate-detail-confirm { margin-top: 2.8mm !important; padding: 2.8mm 3.2mm !important; }
          .certificate-sign { padding-top: 8mm !important; }
          .certificate-detail-document .certificate-sign { padding-top: 5mm !important; }
          .certificate-issuer { margin-top: 6mm !important; font-size: 27px !important; }
          .certificate-detail-document .certificate-issuer { margin-top: 4mm !important; font-size: 25px !important; }
          .certificate-seal, .seal-stamp { width: 30mm !important; height: 30mm !important; display: block !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .certificate-detail-document .certificate-seal, .certificate-detail-document .seal-stamp { width: 27mm !important; height: 27mm !important; }
        }
      `}</style>

      <div className="certificate-wrap mx-auto max-w-5xl print:max-w-none">
        <div className="no-print mb-5 flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#274690]">Certificate</p>
            <h1 className="mt-2 break-keep text-2xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-3xl sm:tracking-[-0.04em]">수강증/수료증 확인 및 인쇄</h1>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <button type="button" onClick={() => openPrintDialog("print")} disabled={!certificate} className={buttonClass("warning", "md", "rounded-full px-5 font-black disabled:opacity-100")}>
              {documentTitle} 인쇄하기
            </button>
            <button type="button" onClick={() => openPrintDialog("pdf")} disabled={!certificate} className={buttonClass("primary", "md", "rounded-full px-5 font-black disabled:opacity-100")}>
              PDF 저장
            </button>
            <Link href="/dashboard" className={buttonClass("secondary", "md", "rounded-full px-5 font-semibold")}>
              마이페이지로 돌아가기
            </Link>
          </div>
        </div>

        {loading ? <p className="no-print rounded-[1.25rem] border border-[#d7deea] bg-white p-5 text-sm text-slate-600">서류 정보를 확인하는 중입니다...</p> : null}

        {error ? (
          <section className="no-print rounded-[1.25rem] border border-rose-200 bg-rose-50 p-5 text-sm leading-7 text-rose-800">
            <p>{error}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/course-room" className={buttonClass("secondary", "sm", "rounded-full px-4 font-semibold")}>수강실로 이동</Link>
              <Link href="/dashboard" className={buttonClass("secondary", "sm", "rounded-full px-4 font-semibold")}>마이페이지</Link>
            </div>
          </section>
        ) : null}

        {!loading && needsBirthDate ? (
          <section className="no-print rounded-[1.5rem] border border-[#d7deea] bg-white p-6 shadow-[0_18px_48px_rgba(15,23,42,0.08)]">
            <p className="text-sm font-semibold text-[#173968]">수강확인증 발급을 위해 생년월일 정보가 필요합니다.</p>
            <p className="mt-2 text-sm leading-7 text-slate-600">입력한 생년월일은 수강확인증 및 수료증 발급 목적으로 사용됩니다. 서류 발급 이후 성명과 생년월일은 발급 당시 정보로 고정됩니다.</p>
            <label className="mt-5 block max-w-sm text-sm font-semibold text-slate-800">
              생년월일
              <input value={birthDateInput} onChange={(event) => setBirthDateInput(event.target.value)} placeholder="1990-01-01" className="mt-2 min-h-12 w-full rounded-xl border border-[#d7deea] px-4 outline-none focus:border-[#173968]" />
            </label>
            <button type="button" onClick={() => void saveBirthDateAndIssue()} disabled={issuing} className={buttonClass("warning", "md", "mt-4 rounded-full px-5 font-bold disabled:opacity-50")}>
              {issuing ? "발급 중" : "생년월일 저장 후 서류 발급"}
            </button>
          </section>
        ) : null}

        {notice && !loading ? <p className="no-print mb-4 rounded-full border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-semibold text-emerald-800">{notice}</p> : null}

        {certificate ? (
          <>
            <section className={`certificate-print-root certificate-paper ${isDetailDocument ? "certificate-detail-document" : "certificate-completion-document"} mx-auto min-h-[297mm] w-full max-w-[210mm] bg-white px-[18mm] py-[20mm] shadow-[0_24px_72px_rgba(15,23,42,0.16)] ring-1 ring-[#d9c08a] print:ring-0`}>
              <div className="certificate-inner relative flex h-full min-h-[257mm] flex-col overflow-hidden border-[3px] border-[#d9c08a] px-8 py-10 text-center">
                <img src={centerLogoPath} alt="" aria-hidden="true" className="certificate-watermark pointer-events-none absolute left-1/2 top-1/2 z-0 h-[430px] w-[430px] -translate-x-1/2 -translate-y-1/2 select-none object-contain opacity-[0.055]" />
                <div className="relative z-10 flex h-full min-h-0 flex-col">
                <p className="certificate-no self-start text-left text-sm font-semibold text-slate-600">발급번호: {certificateNo}</p>
                {documentEnglishTitle ? <p className="mt-4 text-sm font-semibold tracking-[0.26em] text-[#8a6a2d]">{documentEnglishTitle}</p> : null}
                <h2 className="certificate-title mt-8 text-5xl font-bold tracking-[0.22em] text-[#111827]">{documentHeading}</h2>

                {isDetailDocument ? (
                  <div className="certificate-detail mt-8 text-left text-sm leading-6 text-slate-900">
                    <section className="certificate-detail-section mt-4">
                      <h3 className="certificate-detail-title mb-2 flex items-center gap-2 text-base font-black text-[#5f4514]"><span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#5f4514] text-xs text-white">1</span>교육 이수자 정보</h3>
                      <div className="space-y-1.5 px-1 text-[15px] leading-7 text-slate-950">
                        <p><span className="font-bold text-[#5f4514]">성명:</span> <span className="font-semibold">{certificate.userName || profileName}</span></p>
                        <p><span className="font-bold text-[#5f4514]">생년월일:</span> <span className="font-semibold">{formatBirthDate(certificate.birthDate)}</span></p>
                      </div>
                    </section>

                    <section className="certificate-detail-section mt-4">
                      <h3 className="certificate-detail-title mb-2 flex items-center gap-2 text-base font-black text-[#5f4514]"><span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#5f4514] text-xs text-white">2</span>교육과정 정보</h3>
                      <div className="overflow-hidden rounded-lg border border-[#d9c08a] bg-white">
                        {[
                          ["교육과정명", "인지행동 기반 음주운전 재범방지교육 심화과정"],
                          ["수료조건", "전체 교육과정 수강 완료"],
                          ["수료일자", detailCompletedAt],
                        ].map(([label, value]) => (
                          <div key={label} className="certificate-detail-grid grid grid-cols-[120px_minmax(0,1fr)] border-b border-[#eadfcb] last:border-b-0">
                            <div className="certificate-detail-cell bg-[#fbf4e4] px-3 py-2 font-bold text-[#5f4514]">{label}</div>
                            <div className="certificate-detail-cell px-3 py-2 font-semibold text-slate-950">{value}</div>
                          </div>
                        ))}
                      </div>
                    </section>

                    <section className="certificate-detail-section mt-4">
                      <h3 className="certificate-detail-title mb-2 flex items-center gap-2 text-base font-black text-[#5f4514]"><span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#5f4514] text-xs text-white">3</span>주요 교육내용</h3>
                      <ul className="certificate-detail-list grid gap-1.5 rounded-lg border border-[#d9c08a] bg-white px-4 py-3 font-semibold text-slate-900">
                        {detailEducationItems.map((item) => <li key={item} className="flex gap-2"><span className="font-black text-[#8a6a2d]">·</span><span>{item}</span></li>)}
                      </ul>
                    </section>

                    <section className="certificate-detail-section mt-4">
                      <h3 className="certificate-detail-title mb-2 flex items-center gap-2 text-base font-black text-[#5f4514]"><span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#5f4514] text-xs text-white">4</span>교육 이수 확인</h3>
                      <div className="certificate-detail-confirm rounded-lg border-2 border-[#d9c08a] bg-[#fffaf0] px-4 py-3 font-semibold text-slate-900">
                        <div className="grid gap-1.5">
                          <p className="flex gap-2"><span className="font-black text-[#8a6a2d]">확인</span><span>온라인 동영상 강의 100% 수료</span></p>
                          <p className="flex gap-2"><span className="font-black text-[#8a6a2d]">확인</span><span>전체 교육과정 이수 완료</span></p>
                        </div>

                      </div>
                    </section>
                  </div>
                ) : (
                  <>
                    <div className="certificate-person mx-auto mt-12 w-full max-w-[620px] space-y-2 text-left text-lg leading-8 text-slate-950">
                      <p><span className="font-bold text-[#5f4514]">성명:</span> <span className="font-semibold">{certificate.userName || profileName}</span></p>
                      <p><span className="font-bold text-[#5f4514]">생년월일:</span> <span className="font-semibold">{formatBirthDate(certificate.birthDate)}</span></p>
                    </div>

                    <p className="certificate-body mx-auto mt-12 max-w-[620px] break-keep text-left text-xl leading-[2.1] text-slate-800">
                      {documentBody}
                    </p>

                    <div className="certificate-table mt-10 overflow-hidden rounded-xl border border-[#d9c08a] text-left text-base">
                      {certificateRows.map(([label, value]) => (
                        <div key={label} className="certificate-table-row grid grid-cols-[150px_minmax(0,1fr)] border-b border-[#eadfcb] last:border-b-0">
                          <div className="certificate-table-cell bg-[#fbf4e4] px-4 py-3 font-bold text-[#5f4514]">{label}</div>
                          <div className="certificate-table-cell px-4 py-3 font-semibold text-slate-900">{value}</div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                <div className="certificate-sign mt-auto pt-12">
                  <p className="text-lg font-semibold text-slate-900">{formatKoreanDate(issuedAt)}</p>
                  <div className="mt-8 flex items-center justify-center gap-5"><p className="certificate-issuer text-3xl font-bold tracking-[0.08em] text-slate-950">{issuerName}</p><SealStamp size={112} className="certificate-seal shrink-0" withTexture /></div>
                  {(certificate.issuerBusinessNumber || certificate.issuerContact || certificate.issuerEmail) ? (
                    <p className="mt-4 text-sm leading-7 text-slate-500">
                      {certificate.issuerBusinessNumber ? `사업자등록번호 ${certificate.issuerBusinessNumber}` : ""}
                      {certificate.issuerContact ? ` · 연락처 ${certificate.issuerContact}` : ""}
                      {certificate.issuerEmail ? ` · 이메일 ${certificate.issuerEmail}` : ""}
                    </p>
                  ) : null}
                </div>
                </div>
              </div>
            </section>

          </>
        ) : null}
      </div>
    </main>
  );
}

export default function CertificatePage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#eef3f8] px-4 py-8 text-[#0f172a]">수강증/수료증 화면을 준비하는 중입니다...</main>}>
      <CertificatePageContent />
    </Suspense>
  );
}
