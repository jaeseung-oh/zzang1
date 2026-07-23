"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { Suspense, useEffect, useRef, useState } from "react";
import { DUI_CBT_ADVANCED_COURSE_ID, allCourseCatalog, defaultCourse, getCourseApplyHref, getCourseCertificateTitle, getCourseDefinition, getCourseModules } from "@/lib/course/catalog";
import { isAdminEmail } from "@/lib/admin/config";
import { getFirebaseServices } from "@/lib/firebase/client";
import { requireAuthenticatedUser } from "@/lib/firebase/session";
import SealStamp, { centerLogoPath, sealStampPath } from "@/app/components/SealStamp";
import { getVerifiedActiveUserEnrollments, hasCourseAccess, type EnrollmentRecord } from "@/lib/course/enrollment-service";
import { trackEvent } from "@/lib/analytics/ga";
import { buttonClass } from "@/app/components/ui/button-styles";
import { createPdfFromJpeg, downloadBlob, formatCompactDate, inlineImages, normalizeCanvasColors, sanitizeFilePart } from "@/lib/pdf-client";

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

type CertificateDocumentLink = {
  key: string;
  title: string;
  description: string;
  courseId: string;
  documentType: string;
  href: string;
  printHref: string;
  pdfHref: string;
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


function getCertificateRecordId(userId: string, courseId: string, documentType?: string | null) {
  return documentType && documentType !== "completion" ? userId + "_" + courseId + "_" + documentType : userId + "_" + courseId;
}

function getCertificateHref(courseId: string, documentType = "completion", mode?: "print" | "pdf") {
  const params = new URLSearchParams({ courseId, documentType });
  if (mode === "print") params.set("print", "1");
  if (mode === "pdf") params.set("pdf", "1");
  return "/certificate?" + params.toString();
}

function getEnrollmentDocumentCourseId(enrollment: EnrollmentRecord) {
  if (enrollment.productId === "drug-addiction-basic" || enrollment.productId === "drug-addiction-premium") return enrollment.productId;
  if (getCourseDefinition(enrollment.courseId)) return enrollment.courseId;
  if (enrollment.canonicalCourseId === "drug-addiction-relapse-prevention" && (enrollment.productId === "drug-addiction-basic" || enrollment.productId === "drug-addiction-premium")) return enrollment.productId;
  return enrollment.courseId;
}

function buildAdminCertificatePreviewEnrollments(): EnrollmentRecord[] {
  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setFullYear(expiresAt.getFullYear() + 10);

  return allCourseCatalog.map((course) => ({
    userId: "admin-preview",
    courseId: course.id,
    courseTitle: course.title,
    productId: course.productId || course.id,
    productTitle: course.level === "advanced" ? "심화과정" : "기본과정",
    paymentStatus: "paid",
    enrollmentStatus: "active",
    accessStatus: "active",
    purchasedAt: now,
    expiresAt,
    certificateAvailable: true,
    amount: course.priceKrw,
    progress: 100,
    completedLessons: course.modules.length,
    totalLessons: course.modules.length,
  }));
}

function getCertificateDocumentLinks(enrollments: EnrollmentRecord[]) {
  const documents = new Map<string, CertificateDocumentLink>();

  const addDocument = (title: string, description: string, courseId: string, documentType = "completion") => {
    const key = courseId + ":" + documentType;
    if (documents.has(key)) return;
    documents.set(key, {
      key,
      title,
      description,
      courseId,
      documentType,
      href: getCertificateHref(courseId, documentType),
      printHref: getCertificateHref(courseId, documentType, "print"),
      pdfHref: getCertificateHref(courseId, documentType, "pdf"),
    });
  };

  enrollments.forEach((enrollment) => {
    if (!enrollment.courseId) return;
    const documentCourseId = getEnrollmentDocumentCourseId(enrollment);
    const course = getCourseDefinition(documentCourseId);

    if (documentCourseId === DUI_CBT_ADVANCED_COURSE_ID) {
      addDocument(getCourseCertificateTitle(defaultCourse.id) + " 수료증", "심화과정에 포함된 기본 재범방지교육 수료증", defaultCourse.id);
      addDocument("인지행동기반 재발방지교육 이수증", "심화과정 이수증", DUI_CBT_ADVANCED_COURSE_ID, "cbt-completion");
      addDocument("재범방지 교육 이수 상세 내역서", "음주운전 심화과정 교육이수 상세내역", DUI_CBT_ADVANCED_COURSE_ID, "cbt-detail");
      return;
    }

    if (course?.documents?.length) {
      course.documents.forEach((document) => {
        if (document.type === "cbt-completion" || document.type === "cbt-detail") {
          addDocument(document.title, course.title, document.courseId || documentCourseId, document.type);
        } else {
          addDocument(document.title, course.title, document.courseId || documentCourseId);
        }
      });
      return;
    }

    addDocument(getCourseCertificateTitle(documentCourseId) + " 수료증", enrollment.courseTitle || course?.title || "결제 수강권", documentCourseId);
  });

  return Array.from(documents.values());
}

function hasCertificateDocumentAccess(enrollments: EnrollmentRecord[], courseId: string) {
  return enrollments.some((enrollment) => {
    const documentCourseId = getEnrollmentDocumentCourseId(enrollment);
    if (documentCourseId === courseId || enrollment.courseId === courseId || enrollment.canonicalCourseId === courseId) return true;
    const course = getCourseDefinition(documentCourseId);
    if (courseId === DUI_CBT_ADVANCED_COURSE_ID && course?.level === "advanced") return true;
    if (courseId === defaultCourse.id && documentCourseId === DUI_CBT_ADVANCED_COURSE_ID) return true;
    return false;
  });
}

function getDetailDocumentContext(courseId: string) {
  const normalized = courseId || defaultCourse.id;

  if (normalized.includes("digital-crime") || normalized.includes("digital")) {
    return {
      courseTitle: "디지털범죄 재범방지교육 심화과정",
      body: "위 사람은 본 기관에서 실시한 「디지털범죄 재범방지교육 심화과정」을 성실히 이수하였기에 교육 내역을 아래와 같이 확인합니다.",
      items: [
        "디지털범죄의 개념과 주요 유형",
        "디지털 행동이 현실의 피해로 이어지는 과정",
        "피해자의 심리적·사회적 피해와 재유포 위험",
        "디지털 정보의 복제성과 익명성으로 인한 책임 회피 사고 점검",
        "감정·생각·행동의 연결 과정과 왜곡된 사고 수정",
        "개인적·환경적·관계적 재범 위험요인 점검",
        "피해자 접촉 및 2차 피해 방지 원칙",
        "위험 계정, 사이트, 채팅방 등 디지털 사용환경 관리",
        "충동조절과 감정조절 전략",
        "재범방지계획, 실천계획, 실천서약 작성",
      ],
    };
  }

  if (normalized.includes("violence")) {
    return {
      courseTitle: "폭력범죄 재범방지교육 심화과정",
      body: "위 사람은 본 기관에서 실시한 「폭력범죄 재범방지교육 심화과정」을 성실히 이수하였기에 실제 강의 대본 구성에 따른 상세 교육 내역을 아래와 같이 확인합니다.",
      items: [
        "폭력의 범위와 피해 영향 이해",
        "자극·해석·충동·행동의 폭력 발생 흐름 점검",
        "위협 해석과 자존심 방어 사고 구분",
        "음주·충동성·언쟁 상황의 위험 신호 확인",
        "스트레스와 합리화가 반복 폭력으로 이어지는 구조 분석",
        "STOP 4단계와 거리두기 등 폭력 직전 멈춤 기술 학습",
        "비폭력 대화와 갈등 확대 방지 방법 학습",
        "위험상황·대체행동·피해 회복 중심 재범방지계획 작성",
      ],
    };
  }

  if (normalized.includes("gambling")) {
    return {
      courseTitle: "도박중독 재발방지교육 심화과정",
      body: "위 사람은 본 기관에서 실시한 「도박중독 재발방지교육 심화과정」을 성실히 이수하였기에 실제 강의 대본 구성에 따른 상세 교육 내역을 아래와 같이 확인합니다.",
      items: [
        "도박중독의 반복 구조와 범죄 위험 이해",
        "보상회로·손실 만회 심리·왜곡된 기대 점검",
        "손실추격·통제착각 등 생각 오류 수정 연습",
        "감정 흐름과 개인별 재발 트리거 점검",
        "앱·사이트·결제·광고 등 온라인 접근 차단 계획 수립",
        "접근 차단·대체 행동·관계 공개·전문 도움의 회복 구조 학습",
        "STOP 방법과 10분 버티기 등 충동 지연 행동 학습",
        "금전 통로 차단과 7일 재범방지 실행계획 작성",
      ],
    };
  }

  if (normalized.includes("drug-addiction") || normalized.includes("drug")) {
    return {
      courseTitle: "마약중독 재범방지교육 심화과정",
      body: "위 사람은 본 기관에서 실시한 「마약중독 재범방지교육 심화과정」을 성실히 이수하였기에 실제 강의 구성에 따른 상세 교육 내역을 아래와 같이 확인합니다.",
      items: [
        "책임, 회복, 재활을 중심으로 중독 문제를 인정하고 치료와 변화를 실천하는 태도 형성",
        "마약·향정신성의약품·대마의 구분과 투약·소지·매매·알선·처방약 오남용의 법적 위험 이해",
        "호기심, 권유, 스트레스, 불면, 우울·불안이 반복 사용과 갈망, 의존으로 이어지는 과정 학습",
        "반복 사용이 판단력, 충동조절, 보상회로, 스트레스 반응과 갈망에 미치는 영향 이해",
        "과다복용, 감염, 신체·정신건강 손상과 가족·직업·경제생활의 장기 피해 점검",
        "수면 부족, 스트레스, 위험 지인·장소·연락·검색·금전 사용 등 재사용 위험상황 차단 계획",
        "STOP 4단계로 갈망 상황에서 멈춤, 호흡, 관찰, 대체행동 선택과 도움 요청 연습",
        "인지행동교육 1: 사용을 정당화하는 자동사고와 합리화를 찾아 현실적 대안사고로 전환",
        "인지행동교육 2: 고위험 상황의 감정·생각·행동 연결고리를 기록하고 재사용 방지 행동계획 수립",
        "치료·재활기관 연계, 위험 연락처·동선 차단, 도움 요청자 지정과 단약 유지계획 수립",
      ],
    };
  }

  if (normalized.includes("sexual-offense")) {
    return {
      courseTitle: "성범죄 재범방지교육 심화과정",
      body: "위 사람은 본 기관에서 실시한 「성범죄 재범방지교육 심화과정」을 성실히 이수하였기에 실제 강의 대본 구성에 따른 상세 교육 내역을 아래와 같이 확인합니다.",
      items: [
        "존중·동의·경계와 성적 자기결정권 이해",
        "동의 없는 접촉·발언·메시지·촬영 등 성적 침해 범위 점검",
        "명확한 동의의 조건과 음주 상태의 위험성 학습",
        "피해자의 심리적·사회적·디지털 피해 영향 이해",
        "자기중심성·인지왜곡·충동성 등 위험 사고 점검",
        "음주·위계관계·반복 연락 등 위험상황 차단 계획 수립",
        "STOP 4단계와 3분 대처법을 통한 접근 중단 연습",
        "2차 피해 방지와 재범방지 선언 작성",
      ],
    };
  }

  return {
    courseTitle: "음주운전 재범방지교육 심화과정",
    body: "위 사람은 본 기관에서 실시한 「음주운전 재범방지교육 심화과정」을 성실히 이수하였기에 실제 강의 구성에 따른 상세 교육 내역을 아래와 같이 확인합니다.",
    items: [
      "음주운전이 개인의 실수를 넘어 타인의 생명과 안전을 위협하는 중대한 위험 행동임을 이해",
      "음주운전이 발생하는 전형적 상황, 사고 전개 구조, 자기합리화 표현과 책임 회피 언어 점검",
      "알코올이 판단력, 반응속도, 시야, 거리감, 주의집중과 위험 판단에 미치는 영향 학습",
      "사고 유무와 관계없이 발생할 수 있는 형사적·행정적·민사적 책임과 사회적 신뢰 손상 이해",
      "음주 후 운전으로 이어지는 자동사고, 감정 반응, 고위험 상황을 인지행동 관점에서 분석",
      "회식, 지인 모임, 숙취 상태, 익숙한 길, 가까운 거리 등 반복 위험상황별 대안 행동 수립",
      "대리운전, 택시, 대중교통, 차량 미사용, 가족 협조와 차량 열쇠 관리 등 구체적 차단 전략 학습",
      "재범방지를 위한 대안사고, 멈춤 문장, 도움 요청, 자기점검 루틴과 실천계획 작성",
    ],
  };
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
  const [certificateDocuments, setCertificateDocuments] = useState<CertificateDocumentLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [issuing, setIssuing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pdfSaving, setPdfSaving] = useState(false);
  const autoPrintStartedRef = useRef(false);
  const certificatePaperRef = useRef<HTMLElement | null>(null);

  const requestedCertificateId = searchParams.get("certificateId");
  const requestedAdminPreview = searchParams.get("adminPreview");
  const shouldAutoPrint = searchParams.get("print") === "1";
  const shouldAutoPdf = searchParams.get("pdf") === "1";
  const searchParamsKey = searchParams.toString();
  const requestedCourseParam = searchParams.get("courseId");
  const hasExplicitDocumentRequest = Boolean(requestedCourseParam || requestedCertificateId || requestedAdminPreview);
  const rawRequestedCourseId = requestedCourseParam || defaultCourse.id;
  const requestedCourseId = getCourseDefinition(rawRequestedCourseId) || rawRequestedCourseId === DUI_CBT_ADVANCED_COURSE_ID ? rawRequestedCourseId : defaultCourse.id;
  const requestedDocumentType = searchParams.get("documentType") || "";
  const requestedCourseTitle = requestedCourseId === DUI_CBT_ADVANCED_COURSE_ID ? "인지행동기반 재발방지교육" : getCourseCertificateTitle(requestedCourseId);
  const requestedTotalLessons = getCourseModules(requestedCourseId).length;
  const expectedCertificateId = uid ? getCertificateRecordId(uid, requestedCourseId, requestedDocumentType) : "";
  const profileBirthDate = profile?.certificateIdentity?.dateOfBirth || profile?.dateOfBirth || profile?.birthDate || "";
  const profileName = profile?.certificateIdentity?.realName || profile?.realName || profile?.fullName || "";
  const needsBirthDate = Boolean(uid && profile && !profileBirthDate && !certificate);

  const buildAdminPreviewCertificate = (userId: string, email: string, documentType: string = "completion", courseId = requestedCourseId): CertificateRecord => {
    const completedLessons = documentType === "attendance" ? 1 : getCourseModules(courseId).length;
    const courseTitle = documentType === "cbt-detail" ? getDetailDocumentContext(courseId).courseTitle : courseId === DUI_CBT_ADVANCED_COURSE_ID ? "인지행동기반 재발방지교육" : getCourseCertificateTitle(courseId);
    return {
      certificateId: `admin_preview_${courseId}_${documentType}`,
      certificateNo: "PREVIEW-" + documentType.toUpperCase(),
      issueNumber: "PREVIEW-" + documentType.toUpperCase(),
      userId,
      uid: userId,
      userName: "관리자 미리보기",
      birthDate: "1990-01-01",
      email,
      courseId,
      courseTitle,
      totalLessons: getCourseModules(courseId).length,
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
    const certificateId = requestedCertificateId || getCertificateRecordId(userId, requestedCourseId, requestedDocumentType);
    const path = `certificates/${certificateId}`;

    if (requestedCertificateId && requestedCertificateId !== getCertificateRecordId(userId, requestedCourseId, requestedDocumentType) && !allowAdmin) {
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
      setCertificate(null);
      setError("");
      setNotice("");
      autoPrintStartedRef.current = false;
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
        const activeEnrollments = await getVerifiedActiveUserEnrollments(user);
        const documentLinks = getCertificateDocumentLinks(activeEnrollments);
        setCertificateDocuments(documentLinks);

        if (!hasExplicitDocumentRequest && documentLinks.length > 0) {
          router.replace(documentLinks[0].href);
          return;
        }

        const canAccessCourse = hasCertificateDocumentAccess(activeEnrollments, requestedCourseId) || await hasCourseAccess(user, requestedCourseId);
        if (!canAccessCourse) {
          const message = "수강권 결제 후 이용할 수 있습니다.";
          setError(message);
          router.replace(getCourseApplyHref(requestedCourseId) + (getCourseApplyHref(requestedCourseId).includes("?") ? "&notice=" : "?notice=") + encodeURIComponent(message));
          return;
        }
      } else {
        const documentLinks = getCertificateDocumentLinks(buildAdminCertificatePreviewEnrollments());
        setCertificateDocuments(documentLinks);
        if (!hasExplicitDocumentRequest && documentLinks.length > 0) {
          router.replace(documentLinks[0].href);
          return;
        }
      }

      if (allowAdmin && (requestedAdminPreview === "attendance" || requestedAdminPreview === "completion")) {
        setCertificate(buildAdminPreviewCertificate(user.uid, user.email || userProfile?.email || "", requestedAdminPreview, requestedCourseId));
        setNotice("관리자 미리보기입니다.");
        return;
      }

      if (requestedCertificateId && requestedCertificateId !== getCertificateRecordId(user.uid, requestedCourseId, requestedDocumentType)) {
        const existing = await loadCertificate(user.uid, allowAdmin);
        if (existing) {
          setCertificate(existing);
          setNotice("요청한 교육 이수 서류가 발급되었습니다.");
        } else {
          setNotice("관리자 미리보기입니다.");
        }
        return;
      }

      if (allowAdmin) {
        setCertificate(buildAdminPreviewCertificate(user.uid, user.email || userProfile?.email || "", requestedDocumentType || "completion", requestedCourseId));
        setNotice("관리자 미리보기입니다.");
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
        body: JSON.stringify({ courseId: requestedCourseId, productId: getCourseDefinition(requestedCourseId)?.productId || undefined, documentType: requestedDocumentType || undefined }),
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
  const effectiveCourseId = certificate?.courseId || requestedCourseId;
  const effectiveCourseTitle = effectiveCourseId === DUI_CBT_ADVANCED_COURSE_ID ? "인지행동기반 재발방지교육" : getCourseCertificateTitle(effectiveCourseId);
  const effectiveDocumentType = certificate?.documentType || requestedDocumentType || "completion";
  const isCbtCertificate = effectiveCourseId === DUI_CBT_ADVANCED_COURSE_ID || effectiveDocumentType === "cbt-completion";
  const isDetailDocument = effectiveDocumentType === "cbt-detail";
  const isCompletionCertificate = effectiveDocumentType !== "attendance";
  const documentTitle = isDetailDocument ? "교육이수 상세내역서" : isCbtCertificate ? "인지행동기반 재발방지교육 이수증" : isCompletionCertificate ? "수료증" : "수강확인증";
  const documentHeading = isDetailDocument ? "교육이수 상세내역서" : isCbtCertificate ? "이 수 증" : isCompletionCertificate ? "수 료 증" : "수 강 확 인 증";
  const documentEnglishTitle = isDetailDocument ? "" : isCompletionCertificate ? "CERTIFICATE OF COMPLETION" : "CERTIFICATE OF ATTENDANCE";
  const detailContext = getDetailDocumentContext(effectiveCourseId);
  const documentBody = isDetailDocument
    ? detailContext.body
    : isCbtCertificate
      ? "위 사람은 본 기관에서 실시한 「인지행동기반 재발방지교육」을 성실히 이수하였습니다. 본 과정에서는 위법행동과 관련된 사고방식 및 행동양식을 점검하고, 위험상황 대처방법과 재범방지 실천계획을 학습하였습니다."
      : isCompletionCertificate
        ? `위 사람은 본 기관에서 실시한 「${effectiveCourseTitle}」을 성실히 이수하였습니다. 본 과정은 해당 행동의 위험성과 피해 영향을 이해하고, 재범 위험요인을 점검하여 구체적인 재범방지 실천계획을 수립하는 교육으로 구성되었습니다. 이에 교육과정을 정상적으로 이수하였음을 확인하며 본 수료증을 발급합니다.`
        : `위 사람은 본 기관에서 실시한 「${effectiveCourseTitle}」 과정에 수강 등록하고 온라인 교육 시스템을 통해 수강 중임을 확인합니다.`;

  const displayedCourseTitle = isDetailDocument ? detailContext.courseTitle : isCbtCertificate ? "인지행동기반 재발방지교육" : effectiveCourseTitle;
  const certificateRows = [
    ["교육과정명", displayedCourseTitle],
    [isCompletionCertificate ? "수료조건" : "수강상태", isCompletionCertificate ? "전체 교육과정 수강 완료" : "교육과정 수강 중"],
    [isCompletionCertificate ? "수료일자" : "발급일자", formatKoreanDate(certificate?.completedAt || issuedAt)],
  ];
  const detailEducationItems = detailContext.items;
  const detailCompletedAt = formatKoreanDate(certificate?.completedAt || issuedAt);
  const selectedCertificateDocumentType = effectiveDocumentType || (effectiveCourseId === DUI_CBT_ADVANCED_COURSE_ID ? "cbt-completion" : "completion");
  const selectedCertificateDocumentKey = effectiveCourseId + ":" + selectedCertificateDocumentType;
  useEffect(() => {
    void refresh();
  }, [searchParamsKey]);

  const renderCertificatePdfImage = async () => {
    const paper = certificatePaperRef.current;
    if (!paper || !certificate) throw new Error("저장할 수료증 정보가 없습니다.");

    const { default: html2canvas } = await import("html2canvas");
    const snapshot = paper.cloneNode(true) as HTMLElement;
    snapshot.classList.add("certificate-pdf-capture");
    snapshot.style.position = "fixed";
    snapshot.style.left = "-10000px";
    snapshot.style.top = "0";
    snapshot.style.pointerEvents = "none";
    snapshot.style.width = "210mm";
    snapshot.style.maxWidth = "210mm";
    snapshot.style.height = "297mm";
    snapshot.style.minHeight = "0";
    snapshot.style.margin = "0";
    snapshot.style.padding = isDetailDocument ? "14mm" : "20mm 18mm";
    snapshot.style.boxShadow = "none";
    snapshot.style.borderRadius = "0";
    snapshot.style.overflow = "hidden";
    snapshot.style.backgroundColor = "#ffffff";
    snapshot.style.color = "#0f172a";
    snapshot.style.borderColor = "#d9c08a";

    normalizeCanvasColors(snapshot);

    [snapshot, ...Array.from(snapshot.querySelectorAll<HTMLElement>("*"))].forEach((element) => {
      element.style.color = "#0f172a";
      element.style.backgroundColor = "transparent";
      element.style.borderColor = "transparent";
      element.style.outlineColor = "transparent";
    });

    const inner = snapshot.querySelector<HTMLElement>(".certificate-inner");
    if (inner) {
      inner.style.height = isDetailDocument ? "269mm" : "257mm";
      inner.style.minHeight = isDetailDocument ? "269mm" : "257mm";
      inner.style.padding = isDetailDocument ? "8.5mm 7.5mm" : "10.5mm 8.5mm";
      inner.style.borderWidth = "3px";
      inner.style.borderStyle = "solid";
      inner.style.borderColor = "#d9c08a";
      inner.style.overflow = "hidden";
    }

    const watermark = snapshot.querySelector<HTMLElement>(".certificate-watermark");
    if (watermark) {
      watermark.style.width = "112mm";
      watermark.style.height = "112mm";
      watermark.style.opacity = "0.055";
      watermark.style.display = "block";
    }

    const title = snapshot.querySelector<HTMLElement>(".certificate-title");
    if (title) {
      title.style.marginTop = isDetailDocument ? "6mm" : "8.5mm";
      title.style.fontSize = isDetailDocument ? "31px" : "48px";
      title.style.lineHeight = "1.18";
      title.style.color = "#111827";
    }

    const certificateNoElement = snapshot.querySelector<HTMLElement>(".certificate-no");
    if (certificateNoElement) {
      certificateNoElement.style.marginTop = "0";
      certificateNoElement.style.fontSize = "14px";
      certificateNoElement.style.color = "#475569";
    }

    const person = snapshot.querySelector<HTMLElement>(".certificate-person");
    if (person) {
      person.style.marginTop = "12.7mm";
      person.style.padding = "0";
      person.style.fontSize = "18px";
      person.style.lineHeight = "1.78";
      person.style.color = "#0f172a";
      person.querySelectorAll<HTMLElement>("span:first-child").forEach((label) => { label.style.color = "#5f4514"; });
    }

    const body = snapshot.querySelector<HTMLElement>(".certificate-body");
    if (body) {
      body.style.marginTop = "12.7mm";
      body.style.fontSize = "19px";
      body.style.lineHeight = "2.05";
      body.style.whiteSpace = "normal";
      body.style.textAlign = "center";
      body.style.wordBreak = "keep-all";
      body.style.overflowWrap = "normal";
      body.style.letterSpacing = "0";
      body.style.color = "#1f2937";
    }

    const table = snapshot.querySelector<HTMLElement>(".certificate-table");
    if (table) {
      table.style.marginTop = "10.5mm";
      table.style.fontSize = "16px";
      table.style.borderStyle = "solid";
      table.style.borderColor = "#d9c08a";
      table.style.backgroundColor = "#ffffff";
    }

    snapshot.querySelectorAll<HTMLElement>(".certificate-table-row").forEach((row) => {
      row.style.gridTemplateColumns = "39.7mm minmax(0, 1fr)";
      row.style.borderBottomStyle = "solid";
      row.style.borderBottomColor = "#eadfcb";
    });
    snapshot.querySelectorAll<HTMLElement>(".certificate-table-cell").forEach((cell) => {
      cell.style.padding = "3.2mm 4.2mm";
      cell.style.lineHeight = "1.5";
      cell.style.backgroundColor = "#ffffff";
      cell.style.color = "#111827";
      const isLabelCell = cell.parentElement?.firstElementChild === cell;
      if (isLabelCell) {
        cell.style.backgroundColor = "#fbf4e4";
        cell.style.color = "#5f4514";
      }
    });

    const detail = snapshot.querySelector<HTMLElement>(".certificate-detail");
    if (detail) {
      detail.style.marginTop = "4mm";
      detail.style.fontSize = "10.6px";
      detail.style.lineHeight = "1.38";
      detail.style.color = "#0f172a";
    }
    snapshot.querySelectorAll<HTMLElement>(".certificate-detail-intro").forEach((intro) => {
      intro.style.padding = "2.4mm 3mm";
      intro.style.lineHeight = "1.45";
      intro.style.borderStyle = "solid";
      intro.style.borderColor = "#eadfcb";
      intro.style.backgroundColor = "#fffaf0";
      intro.style.color = "#1f2937";
    });
    snapshot.querySelectorAll<HTMLElement>(".certificate-detail-section").forEach((section) => {
      section.style.marginTop = "2.4mm";
    });
    snapshot.querySelectorAll<HTMLElement>(".certificate-detail-title").forEach((heading) => {
      heading.style.fontSize = "12.2px";
      heading.style.marginBottom = "1mm";
      heading.style.lineHeight = "1.3";
      heading.style.color = "#5f4514";
    });
    snapshot.querySelectorAll<HTMLElement>(".certificate-detail-title span").forEach((badge) => {
      badge.style.width = "6mm";
      badge.style.height = "6mm";
      badge.style.fontSize = "10px";
      badge.style.color = "#ffffff";
      badge.style.backgroundColor = "#5f4514";
    });
    snapshot.querySelectorAll<HTMLElement>(".certificate-detail-grid").forEach((grid) => {
      grid.style.gridTemplateColumns = "31mm minmax(0, 1fr)";
      grid.style.borderBottomStyle = "solid";
      grid.style.borderBottomColor = "#eadfcb";
    });
    snapshot.querySelectorAll<HTMLElement>(".certificate-detail-cell").forEach((cell) => {
      cell.style.padding = "1.5mm 2.2mm";
      cell.style.lineHeight = "1.34";
      cell.style.backgroundColor = "#ffffff";
      cell.style.color = "#0f172a";
      const isLabelCell = cell.parentElement?.firstElementChild === cell;
      if (isLabelCell) {
        cell.style.backgroundColor = "#fbf4e4";
        cell.style.color = "#5f4514";
      }
    });
    snapshot.querySelectorAll<HTMLElement>(".certificate-detail-list").forEach((list) => {
      list.style.gap = "0.65mm";
      list.style.padding = "2.2mm 3mm";
      list.style.borderStyle = "solid";
      list.style.borderColor = "#d9c08a";
      list.style.backgroundColor = "#ffffff";
      list.querySelectorAll<HTMLElement>("li").forEach((item) => { item.style.color = "#0f172a"; });
      list.querySelectorAll<HTMLElement>("li span:first-child").forEach((bullet) => { bullet.style.color = "#8a6a2d"; });
    });
    snapshot.querySelectorAll<HTMLElement>(".certificate-detail-confirm").forEach((confirm) => {
      confirm.style.marginTop = "2.4mm";
      confirm.style.padding = "2.2mm 3mm";
      confirm.style.borderStyle = "solid";
      confirm.style.borderColor = "#d9c08a";
      confirm.style.backgroundColor = "#fffaf0";
      confirm.style.color = "#0f172a";
      confirm.querySelectorAll<HTMLElement>("span:first-child").forEach((label) => { label.style.color = "#8a6a2d"; });
    });

    const sign = snapshot.querySelector<HTMLElement>(".certificate-sign");
    if (sign) {
      sign.style.paddingTop = isDetailDocument ? "4mm" : "10.5mm";
      sign.querySelectorAll<HTMLElement>("p").forEach((paragraph) => { paragraph.style.color = "#111827"; });
    }

    const issuer = snapshot.querySelector<HTMLElement>(".certificate-issuer");
    if (issuer) {
      issuer.style.marginTop = isDetailDocument ? "3mm" : "6.4mm";
      issuer.style.fontSize = isDetailDocument ? "23px" : "26px";
      issuer.style.color = "#111827";
    }

    snapshot.querySelectorAll<HTMLElement>(".certificate-seal, .seal-stamp").forEach((seal) => {
      seal.style.width = isDetailDocument ? "24mm" : "27.5mm";
      seal.style.height = isDetailDocument ? "24mm" : "27.5mm";
      seal.style.display = "block";
    });

    document.body.appendChild(snapshot);
    try {
      await inlineImages(snapshot);
      await document.fonts.ready;
      const canvas = await html2canvas(snapshot, {
        backgroundColor: "#ffffff",
        scale: 2,
        useCORS: false,
        allowTaint: false,
        logging: false,
        width: snapshot.offsetWidth,
        height: snapshot.offsetHeight,
        windowWidth: snapshot.offsetWidth,
        windowHeight: snapshot.offsetHeight,
      });
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("PDF 이미지를 생성하지 못했습니다.")), "image/jpeg", 0.95));
      return { bytes: new Uint8Array(await blob.arrayBuffer()), width: canvas.width, height: canvas.height };
    } finally {
      snapshot.remove();
    }
  };

  const savePdfFile = async () => {
    if (!certificate || pdfSaving) return;
    setPdfSaving(true);
    setError("");
    try {
      trackEvent("certificate_download", { method: "pdf", document_type: isCompletionCertificate ? "completion" : "attendance" });
      const safeDate = formatCompactDate(issuedAt);
      const safeName = sanitizeFilePart(certificate.userName || profileName || "회원");
      const safeCourse = sanitizeFilePart(displayedCourseTitle);
      const safeDocument = sanitizeFilePart(documentTitle);
      const image = await renderCertificatePdfImage();
      const pdfBlob = createPdfFromJpeg(image.bytes, image.width, image.height);
      await downloadBlob(pdfBlob, `${safeName}_${safeCourse}_${safeDocument}_${safeDate}.pdf`);
    } catch (downloadError) {
      console.error(downloadError);
      setError(downloadError instanceof Error ? downloadError.message : "PDF 파일 저장 중 오류가 발생했습니다.");
    } finally {
      setPdfSaving(false);
    }
  };

  useEffect(() => {
    if ((!shouldAutoPrint && !shouldAutoPdf) || loading || !certificate || autoPrintStartedRef.current) {
      return;
    }

    autoPrintStartedRef.current = true;
    if (shouldAutoPdf) {
      window.setTimeout(() => void savePdfFile(), 120);
      return;
    }
    const previousTitle = document.title;
    const safeNo = certificateNo.replace(/[^0-9A-Za-z가-힣_-]/g, "_");
    document.title = documentTitle + "_" + safeNo;
    const timer = window.setTimeout(() => window.print(), 450);
    const titleTimer = window.setTimeout(() => {
      document.title = previousTitle;
    }, 1400);
    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(titleTimer);
      document.title = previousTitle;
    };
  }, [certificate, certificateNo, documentTitle, loading, shouldAutoPdf, shouldAutoPrint]);

  const openPrintDialog = () => {
    if (!certificate) return;
    trackEvent("certificate_download", { method: "print", document_type: isCompletionCertificate ? "completion" : "attendance" });
    const previousTitle = document.title;
    const safeNo = certificateNo.replace(/[^0-9A-Za-z가-힣_-]/g, "_");
    document.title = documentTitle + "_" + safeNo;
    window.setTimeout(() => window.print(), 0);
    window.setTimeout(() => {
      document.title = previousTitle;
    }, 1200);
  };

  return (
    <main className="min-h-screen bg-[#eef3f8] px-4 py-8 text-[#0f172a] print:bg-white print:p-0">
      <style jsx global>{`
        @page { size: A4 portrait; margin: 0; }
        @media screen and (min-width: 641px) {
          .certificate-detail-document .certificate-title { margin-top: 6mm !important; font-size: 31px !important; line-height: 1.14 !important; }
          .certificate-detail { margin-top: 4mm !important; font-size: 10.6px !important; line-height: 1.38 !important; }
          .certificate-detail-intro { padding: 2.4mm 3mm !important; line-height: 1.45 !important; }
          .certificate-detail-section { margin-top: 2.4mm !important; }
          .certificate-detail-title { font-size: 12.2px !important; margin-bottom: 1mm !important; line-height: 1.3 !important; }
          .certificate-detail-title span { width: 6mm !important; height: 6mm !important; font-size: 10px !important; }
          .certificate-detail-grid { grid-template-columns: 31mm minmax(0, 1fr) !important; }
          .certificate-detail-cell { padding: 1.5mm 2.2mm !important; line-height: 1.34 !important; }
          .certificate-detail-list { gap: 0.65mm !important; padding: 2.2mm 3mm !important; }
          .certificate-detail-confirm { margin-top: 2.4mm !important; padding: 2.2mm 3mm !important; }
          .certificate-detail-document .certificate-sign { padding-top: 4mm !important; }
          .certificate-detail-document .certificate-issuer { margin-top: 3mm !important; font-size: 23px !important; }
          .certificate-detail-document .certificate-seal, .certificate-detail-document .seal-stamp { width: 24mm !important; height: 24mm !important; }
        }
        @media screen and (max-width: 640px) {
          .certificate-wrap { overflow-x: hidden; }
          .certificate-paper { min-height: auto !important; width: 100% !important; max-width: 100% !important; padding: 14px !important; }
          .certificate-inner { min-height: auto !important; padding: 18px 14px !important; }
          .certificate-title { font-size: 30px !important; letter-spacing: 0.12em !important; }
          .certificate-identity-value { font-size: 22px !important; }
          .certificate-body { margin-top: 28px !important; font-size: 15px !important; line-height: 1.8 !important; white-space: normal !important; text-align: justify !important; text-align-last: left !important; word-break: keep-all !important; overflow-wrap: normal !important; letter-spacing: 0 !important; }
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
          body > div, body > div > div { width: 210mm !important; height: 296mm !important; margin: 0 !important; padding: 0 !important; overflow: hidden !important; }
          main { position: fixed !important; inset: 0 auto auto 0 !important; width: 210mm !important; height: 296mm !important; min-height: 0 !important; max-height: 296mm !important; margin: 0 !important; padding: 0 !important; background: #fff !important; overflow: hidden !important; }
          .certificate-wrap { width: 210mm !important; height: 296mm !important; max-width: none !important; margin: 0 !important; padding: 0 !important; overflow: hidden !important; }
          .certificate-paper {
            width: 210mm !important;
            max-width: 210mm !important;
            min-height: 0 !important;
            height: 296mm !important;
            margin: 0 !important;
            padding: 20mm 18mm !important;
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
          .certificate-inner { height: 256mm !important; min-height: 256mm !important; padding: 10.5mm 8.5mm !important; border-width: 3px !important; overflow: hidden !important; }
          .certificate-watermark { width: 112mm !important; height: 112mm !important; opacity: 0.055 !important; display: block !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .certificate-title { margin-top: 8.5mm !important; font-size: 48px !important; line-height: 1.18 !important; }
          .certificate-no { margin-top: 0 !important; font-size: 14px !important; }
          .certificate-person { margin-top: 12.7mm !important; padding: 0 !important; font-size: 18px !important; line-height: 1.78 !important; }
          .certificate-identity-value { font-size: 19px !important; }
          .certificate-identity-row { grid-template-columns: 30mm minmax(0, 1fr) !important; }
          .certificate-body { margin-top: 12.7mm !important; font-size: 19px !important; line-height: 2.05 !important; white-space: normal !important; text-align: justify !important; text-align-last: left !important; word-break: keep-all !important; overflow-wrap: normal !important; letter-spacing: 0 !important; }
          .certificate-table { margin-top: 10.5mm !important; font-size: 16px !important; }
          .certificate-table-row { grid-template-columns: 39.7mm minmax(0, 1fr) !important; }
          .certificate-table-cell { padding: 3.2mm 4.2mm !important; line-height: 1.5 !important; }
          .certificate-detail-document { padding: 14mm !important; }
          .certificate-detail-document .certificate-inner { height: 268mm !important; min-height: 268mm !important; padding: 8.5mm 7.5mm !important; }
          .certificate-detail-document .certificate-title { margin-top: 6mm !important; font-size: 31px !important; line-height: 1.14 !important; }
          .certificate-detail { margin-top: 4mm !important; font-size: 10.6px !important; line-height: 1.38 !important; }
          .certificate-detail-hero { padding: 3mm 3.5mm !important; margin-top: 5mm !important; }
          .certificate-detail-intro { padding: 2.4mm 3mm !important; line-height: 1.45 !important; }
          .certificate-detail-section { margin-top: 2.4mm !important; }
          .certificate-detail-title { font-size: 12.2px !important; margin-bottom: 1mm !important; line-height: 1.3 !important; }
          .certificate-detail-title span { width: 6mm !important; height: 6mm !important; font-size: 10px !important; }
          .certificate-detail-grid { grid-template-columns: 31mm minmax(0, 1fr) !important; }
          .certificate-detail-cell { padding: 1.5mm 2.2mm !important; line-height: 1.34 !important; }
          .certificate-detail-list { gap: 0.65mm !important; padding: 2.2mm 3mm !important; }
          .certificate-detail-confirm { margin-top: 2.4mm !important; padding: 2.2mm 3mm !important; }
          .certificate-sign { padding-top: 10.5mm !important; }
          .certificate-detail-document .certificate-sign { padding-top: 4mm !important; }
          .certificate-issuer { margin-top: 6.4mm !important; font-size: 26px !important; }
          .certificate-detail-document .certificate-issuer { margin-top: 3mm !important; font-size: 23px !important; }
          .certificate-seal, .seal-stamp { width: 27.5mm !important; height: 27.5mm !important; display: block !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .certificate-detail-document .certificate-seal, .certificate-detail-document .seal-stamp { width: 24mm !important; height: 24mm !important; }
        }
      `}</style>

      <div className="certificate-wrap mx-auto max-w-5xl print:max-w-none">
        <div className="no-print mb-5 flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#274690]">Certificate</p>
            <h1 className="mt-2 break-keep text-2xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-3xl sm:tracking-[-0.04em]">수강증/수료증 확인 및 인쇄</h1>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <button type="button" onClick={openPrintDialog} disabled={!certificate} className={buttonClass("warning", "md", "rounded-full px-5 font-black disabled:opacity-100")}>
              {documentTitle} 인쇄하기
            </button>
            <button type="button" onClick={() => void savePdfFile()} disabled={!certificate || pdfSaving} className={buttonClass("primary", "md", "rounded-full px-5 font-black disabled:opacity-100")}>
              {pdfSaving ? "PDF 생성 중" : "PDF 저장"}
            </button>
            <Link href="/dashboard" className={buttonClass("secondary", "md", "rounded-full px-5 font-semibold")}>
              마이페이지로 돌아가기
            </Link>
          </div>
        </div>

        {certificateDocuments.length ? (
          <section className="no-print mb-5 rounded-[1.5rem] border-4 border-[#10213f] bg-white p-5 shadow-[0_18px_48px_rgba(15,23,42,0.14)]">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-black text-[#274690]">내 수료증 목록</p>
                <h2 className="mt-1 text-2xl font-black tracking-[-0.03em] text-slate-950">결제한 수강권의 수료증을 한눈에 확인하세요</h2>
              </div>
              <span className="inline-flex w-fit items-center rounded-full bg-[#ffdd00] px-4 py-2 text-sm font-black text-[#111827]">총 {certificateDocuments.length}개</span>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {certificateDocuments.map((document) => {
                const selected = document.key === selectedCertificateDocumentKey;
                return (
                  <article key={document.key} className={selected ? "rounded-2xl border-4 border-[#ffdd00] bg-[#10213f] p-4 text-white shadow-[0_16px_34px_rgba(16,33,63,0.24)]" : "rounded-2xl border-2 border-slate-200 bg-slate-50 p-4 text-slate-950 shadow-sm"}>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className={selected ? "text-lg font-black text-white" : "text-lg font-black text-slate-950"}>{document.title}</p>
                        <p className={selected ? "mt-1 text-sm font-semibold text-white/75" : "mt-1 text-sm font-semibold text-slate-600"}>{document.description}</p>
                      </div>
                      {selected ? <span className="w-fit shrink-0 rounded-full bg-[#ffdd00] px-3 py-1 text-xs font-black text-[#111827]">현재 표시 중</span> : null}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Link href={document.href} className={selected ? buttonClass("warning", "sm", "rounded-full px-4 font-black !text-black hover:!text-black") : buttonClass("primary", "sm", "rounded-full px-4 font-black !text-white hover:!text-white")}>
                        보기
                      </Link>
                      <Link href={document.printHref} className={selected ? buttonClass("secondary", "sm", "rounded-full px-4 font-black") : buttonClass("warning", "sm", "rounded-full px-4 font-black !text-black hover:!text-black")}>
                        바로 인쇄
                      </Link>
                      <Link href={document.pdfHref} className={selected ? buttonClass("primary", "sm", "rounded-full px-4 font-black !text-white hover:!text-white") : buttonClass("secondary", "sm", "rounded-full px-4 font-black")}>
                        PDF 저장
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ) : null}

        {loading ? <p className="no-print rounded-[1.25rem] border border-[#d7deea] bg-white p-5 text-sm text-slate-600">서류 정보를 확인하는 중입니다...</p> : null}

        {error ? (
          <section className="no-print rounded-[1.25rem] border border-rose-200 bg-rose-50 p-5 text-sm leading-7 text-rose-800">
            <p>{error}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/course-room/?v=202607161010" className={buttonClass("secondary", "sm", "rounded-full px-4 font-semibold")}>수강실로 이동</Link>
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
            <section ref={certificatePaperRef} className={`certificate-print-root certificate-paper ${isDetailDocument ? "certificate-detail-document px-[14mm] py-[14mm]" : "certificate-completion-document px-[18mm] py-[20mm]"} mx-auto min-h-[297mm] w-full max-w-[210mm] bg-white shadow-[0_24px_72px_rgba(15,23,42,0.16)] ring-1 ring-[#d9c08a] print:ring-0`}>
              <div className={`certificate-inner relative flex h-full ${isDetailDocument ? "min-h-[269mm] px-7 py-8" : "min-h-[257mm] px-8 py-10"} flex-col overflow-hidden border-[3px] border-[#d9c08a] text-center`}>
                <img src={centerLogoPath} alt="" aria-hidden="true" className="certificate-watermark pointer-events-none absolute left-1/2 top-1/2 z-0 h-[430px] w-[430px] -translate-x-1/2 -translate-y-1/2 select-none object-contain opacity-[0.055]" />
                <div className="relative z-10 flex h-full min-h-0 flex-col">
                <p className="certificate-no self-start text-left text-sm font-semibold text-slate-600">발급번호: {certificateNo}</p>
                {documentEnglishTitle ? <p className="mt-4 text-sm font-semibold tracking-[0.26em] text-[#8a6a2d]">{documentEnglishTitle}</p> : null}
                <h2 className="certificate-title mt-8 text-5xl font-bold tracking-[0.22em] text-[#111827]">{documentHeading}</h2>

                {isDetailDocument ? (
                  <div className="certificate-detail mt-7 flex flex-1 flex-col text-left text-sm leading-6 text-slate-900">
                    <p className="certificate-detail-intro rounded-lg border border-[#eadfcb] bg-[#fffaf0] px-4 py-3 font-semibold leading-6 text-slate-800">{detailContext.body}</p>

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
                          ["교육과정명", detailContext.courseTitle],
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

                    <p className="certificate-body mx-auto mt-12 max-w-[700px] whitespace-normal break-keep text-justify text-[19px] leading-[2.05] tracking-normal text-slate-800 [overflow-wrap:normal] [text-align-last:left] [word-break:keep-all]">
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

                <div className="certificate-sign mt-auto shrink-0 pt-10">
                  <p className="text-lg font-semibold text-slate-900">{formatKoreanDate(issuedAt)}</p>
                  <div className="mt-6 flex items-center justify-center gap-5"><p className="certificate-issuer text-[26px] font-bold tracking-[0.08em] text-slate-950">{issuerName}</p><SealStamp size={104} className="certificate-seal shrink-0" withTexture /></div>
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
