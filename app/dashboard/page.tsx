"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import { DUI_CBT_ADVANCED_COURSE_ID, defaultCourse, duiBasicModules, getCourseApplyHref, getCourseDefinition, getCourseModules } from "@/lib/course/catalog";
import { getFirebaseServices } from "@/lib/firebase/client";
import { requireAuthenticatedUser } from "@/lib/firebase/session";
import { buttonClass } from "@/app/components/ui/button-styles";
import { getVerifiedActiveUserEnrollments, isEnrollmentActive, type EnrollmentRecord } from "@/lib/course/enrollment-service";
import { isSuperAdmin } from "@/lib/auth/auth-role-service";
import { hasPreventionDocumentsAccess, preventionDocuments } from "@/lib/course/prevention-documents";

type ModuleProgressState = {
  watchedSeconds: number;
  durationSeconds: number;
  completionRate: number;
  lastPlaybackPositionSeconds: number;
  isCompleted: boolean;
};

type ProgressRecord = {
  courseId: string;
  completionRate: number;
  watchedSeconds: number;
  durationSeconds?: number;
  remainingSeconds?: number;
  lastPlaybackPositionSeconds?: number;
  completedModuleCount?: number;
  totalModuleCount?: number;
  moduleProgress?: Record<string, ModuleProgressState>;
  isCompleted: boolean;
  updatedAt?: { seconds: number };
};

type CertificateRecord = {
  id: string;
  documentType?: string;
  issueNumber?: string;
  certificateNo?: string;
  courseTitle?: string;
  issuedAt?: { seconds: number };
  certificateIssuedAt?: { seconds: number };
};

type EnrollmentListItem = EnrollmentRecord & { id?: string };

function maskFirestoreSegment(value: string) {
  if (!value) return "";
  if (value.length <= 8) return value.slice(0, 2) + "***";
  return value.slice(0, 4) + "***" + value.slice(-4);
}

function maskFirestorePath(path: string) {
  return path
    .split("/")
    .map((segment, index) => (index % 2 === 1 ? maskFirestoreSegment(segment) : segment))
    .join("/");
}

function logFirestoreFailure(operation: "getDoc" | "getDocs", path: string, error: unknown) {
  const errorLike = error as { code?: unknown; message?: unknown };
  console.error("[dashboard:firestore]", {
    operation,
    path: maskFirestorePath(path),
    code: typeof errorLike?.code === "string" ? errorLike.code : undefined,
    message: typeof errorLike?.message === "string" ? errorLike.message : "Firestore request failed",
  });
}

function toDate(value: unknown) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isFinite(parsed.getTime()) ? parsed : null;
  }
  if (typeof value === "object" && value !== null && "seconds" in value && typeof (value as { seconds?: unknown }).seconds === "number") {
    return new Date((value as { seconds: number }).seconds * 1000);
  }
  return null;
}

function formatDateOnly(value: unknown) {
  const date = toDate(value);
  if (!date) return "-";
  return date.toLocaleDateString("ko-KR");
}

function formatKrw(value: unknown) {
  const amount = typeof value === "number" ? value : Number(value);
  return Number.isFinite(amount) && amount > 0 ? amount.toLocaleString("ko-KR") + "원" : "-";
}

function getCourseRoomButtonLabel(progressRate: number, completed: boolean) {
  if (completed) return "다시보기";
  if (progressRate > 0) return "이어보기";
  return "수강 시작";
}

function getEnrollmentStatusLabel(enrollment: EnrollmentRecord) {
  if (isEnrollmentActive(enrollment)) return "수강 가능";
  const status = String(enrollment.enrollmentStatus || enrollment.accessStatus || enrollment.paymentStatus || "").toLowerCase();
  if (status === "refunded") return "환불";
  if (status === "cancelled" || status === "canceled") return "취소";
  if (status === "expired") return "만료";
  const expiresAt = toDate(enrollment.expiresAt);
  if (expiresAt && expiresAt.getTime() < Date.now()) return "만료";
  return "이용 불가";
}

const documentLabels: Record<string, string> = {
  completion: "음주운전 예방교육 수료증",
  "cbt-completion": "인지행동기반 재발방지교육 이수증",
  "cbt-detail": "재범방지 교육 이수 상세 내역서",
  "psychology-report": "인지행동 심리검사 결과지",
  "compliance-pledge": "준법 서약서",
};

function formatTimestamp(timestamp?: { seconds: number }) {
  if (!timestamp?.seconds) {
    return "기록 대기 중";
  }

  return new Date(timestamp.seconds * 1000).toLocaleString("ko-KR");
}

function formatDuration(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainingSeconds = safeSeconds % 60;

  if (hours > 0) {
    return `${hours}시간 ${minutes}분 ${remainingSeconds}초`;
  }

  if (minutes > 0) {
    return `${minutes}분 ${remainingSeconds}초`;
  }

  return `${remainingSeconds}초`;
}

function formatDurationOrPending(seconds?: number | null) {
  if (!seconds || seconds <= 0) {
    return "영상 로딩 후 표시";
  }

  return formatDuration(seconds);
}

function formatProgressTime(currentSeconds: number, durationSeconds: number) {
  return formatDuration(currentSeconds) + " / " + formatDurationOrPending(durationSeconds);
}

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState<ProgressRecord | null>(null);
  const [certificates, setCertificates] = useState<CertificateRecord[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentListItem[]>([]);
  const [hasActiveEnrollment, setHasActiveEnrollment] = useState(false);
  const [adminPreview, setAdminPreview] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const user = await requireAuthenticatedUser();
        const { db } = getFirebaseServices();
        const isAdmin = isSuperAdmin(user);
        const enrollments = await getVerifiedActiveUserEnrollments(user);
        const activeEnrollment = enrollments.some(isEnrollmentActive);

        const [progressSnapshot, certificateSnapshot] = await Promise.all([
          getDocs(query(collection(db, "courseProgress"), where("uid", "==", user.uid))).catch((error) => {
            logFirestoreFailure("getDocs", "courseProgress?uid=<uid>", error);
            return null;
          }),
          getDoc(doc(db, "certificates", user.uid + "_" + defaultCourse.id)).catch((error) => {
            logFirestoreFailure("getDoc", "certificates/<uid_courseId>", error);
            return null;
          }),
        ]);

        if (cancelled) {
          return;
        }

        setAdminPreview(isAdmin);
        setHasActiveEnrollment(activeEnrollment);
        setEnrollments(enrollments as EnrollmentListItem[]);
        setProgress(progressSnapshot?.docs[0]?.data() ? (progressSnapshot.docs[0].data() as ProgressRecord) : null);
        setCertificates(certificateSnapshot?.exists() ? [{
          id: certificateSnapshot.id,
          ...(certificateSnapshot.data() as Omit<CertificateRecord, "id">),
        }] : []);
      } catch (loadError) {
        console.error(loadError);
        if (!cancelled) {
          const message = loadError instanceof Error ? loadError.message : "";
          if (message === "AUTH_LOGIN_REQUIRED") {
            router.replace("/login?next=/dashboard");
            setError("로그인한 회원만 내 수강현황을 확인할 수 있습니다.");
            return;
          }

          setError(message || "수강권 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
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
  }, [router]);

  const progressSummary = useMemo(() => {
    const durationSeconds = Math.max(progress?.durationSeconds ?? 0, 0);
    const watchedSeconds = Math.min(progress?.watchedSeconds ?? 0, durationSeconds);
    const remainingSeconds = durationSeconds > 0 ? Math.max(progress?.remainingSeconds ?? durationSeconds - watchedSeconds, 0) : 0;
    const completionRate = progress?.completionRate ?? (durationSeconds > 0 ? Math.floor((watchedSeconds / durationSeconds) * 100) : 0);
    const completedModuleCount = progress?.completedModuleCount ?? Object.values(progress?.moduleProgress ?? {}).filter((item) => item.isCompleted).length;
    const totalModuleCount = progress?.totalModuleCount ?? duiBasicModules.length;
    const moduleEntries = duiBasicModules.map((module, index) => ({
      module,
      index,
      item: progress?.moduleProgress?.[module.id],
    }));
    const lastWatched = moduleEntries
      .filter((entry) => (entry.item?.lastPlaybackPositionSeconds ?? entry.item?.watchedSeconds ?? 0) > 0)
      .sort((a, b) => (b.item?.lastPlaybackPositionSeconds ?? b.item?.watchedSeconds ?? 0) - (a.item?.lastPlaybackPositionSeconds ?? a.item?.watchedSeconds ?? 0))[0];
    const statusLabel = progress?.isCompleted ? "전체 수료 완료" : completionRate >= 80 ? "곧 전체 수료" : "수강 진행 중";

    return {
      durationSeconds,
      watchedSeconds,
      remainingSeconds,
      completionRate,
      completedModuleCount,
      totalModuleCount,
      statusLabel,
      isCompleted: Boolean(progress?.isCompleted),
      moduleProgress: progress?.moduleProgress ?? {},
      lastLessonLabel: lastWatched ? `${lastWatched.index + 1}강 ${lastWatched.module.title.replace(/^\d+강\.\s*/, "")}` : "시청 기록 없음",
      lastLessonTime: lastWatched?.item?.lastPlaybackPositionSeconds ?? lastWatched?.item?.watchedSeconds ?? 0,
      certificateAvailable: Boolean(progress?.isCompleted),
    };
  }, [progress]);

  const advancedEnrollmentRecord = enrollments.find((enrollment) => {
    if (!isEnrollmentActive(enrollment)) return false;
    const course = getCourseDefinition(enrollment.courseId);
    return enrollment.courseId === DUI_CBT_ADVANCED_COURSE_ID || course?.level === "advanced";
  });
  const hasAdvancedCertificateAccess = adminPreview || Boolean(advancedEnrollmentRecord);
  const advancedBaseCertificateCourseId = advancedEnrollmentRecord?.courseId === DUI_CBT_ADVANCED_COURSE_ID ? defaultCourse.id : advancedEnrollmentRecord?.courseId || defaultCourse.id;
  const hasDocumentFormsAccess = adminPreview || enrollments.some((enrollment) => enrollment.courseId === defaultCourse.id && isEnrollmentActive(enrollment) && hasPreventionDocumentsAccess(enrollment.productId, enrollment.amount, enrollment.productTitle));

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(211,173,98,0.14),transparent_22%),linear-gradient(180deg,#09111d_0%,#0d1728_32%,#eef3f8_32%,#f4f7fb_100%)] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl rounded-[1.5rem] border border-[#d7deea] bg-white p-4 shadow-[0_30px_80px_rgba(15,23,42,0.14)] sm:rounded-[2rem] sm:p-6 lg:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#9b7a38]">My Course</p>
            <h1 className="mt-4 break-keep text-3xl font-semibold tracking-[-0.03em] text-[#0f172a] sm:text-5xl sm:tracking-[-0.04em]">내 수강현황과 발급 문서 확인</h1>
            <p className="mt-4 max-w-3xl text-sm leading-8 text-slate-600">
              강의별 진도, 누적 수강 시간, 남은 시간, 발급 문서를 한 곳에서 확인합니다.
            </p>
            <p className="mt-4 max-w-4xl rounded-2xl border-4 border-amber-400 bg-amber-100 px-5 py-4 text-base font-black leading-8 text-amber-950 shadow-[0_16px_36px_rgba(245,158,11,0.22)] sm:text-lg sm:leading-9">
              수강목록이 모두 표시될 때까지 잠시만 기다려주시기 바랍니다.
            </p>
          </div>
          <div className="w-full lg:w-auto">
            <Link href="/login" style={{ backgroundColor: "#10213f", color: "#ffffff", border: "2px solid #10213f", fontWeight: 900, boxShadow: "0 14px 28px rgba(16, 33, 63, 0.24)" }} className={buttonClass("primary", "md", "w-full rounded-2xl px-6 font-black !text-white hover:!text-white")}>
              회원정보 변경
            </Link>
          </div>
        </div>
        <section aria-label="대시보드 빠른 실행" className="sticky top-[72px] z-30 mt-6 rounded-2xl border-4 border-[#111827] bg-white p-4 text-slate-950 shadow-[0_28px_70px_rgba(15,23,42,0.34)] sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#10213f]">Dashboard Quick Actions</p>
              <h2 className="mt-1 text-2xl font-black leading-tight text-slate-950 sm:text-3xl">강의 목록과 서류 인쇄를 여기서 바로 실행하세요</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[560px]">
              <Link href="/course-room" className="group flex min-h-20 items-center gap-4 rounded-2xl border-4 border-[#10213f] bg-[#10213f] px-5 py-4 text-left !text-white shadow-[0_18px_36px_rgba(16,33,63,0.28)] transition hover:-translate-y-0.5 hover:bg-[#173968] hover:!text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-base font-black text-[#10213f]">01</span>
                <span className="min-w-0"><span className="block text-xl font-black leading-tight !text-white">강의 목록 보기</span><span className="mt-1 block text-sm font-bold !text-white/80">수강실로 이동</span></span>
              </Link>
              <Link href="/prevention-documents" className="group flex min-h-20 items-center gap-4 rounded-2xl border-4 border-[#111827] bg-[#ffdd00] px-5 py-4 text-left text-[#111827] shadow-[0_18px_36px_rgba(255,221,0,0.36)] transition hover:-translate-y-0.5 hover:bg-[#ffd000] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#fff2a8]">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#111827] text-base font-black text-[#ffdd00]">02</span>
                <span className="min-w-0"><span className="block text-xl font-black leading-tight">서류 인쇄하기</span><span className="mt-1 block text-sm font-bold text-slate-800">재발방지 서식 열기</span></span>
              </Link>
            </div>
          </div>
        </section>

        {loading ? <p className="mt-8 text-sm text-slate-600">수강현황을 불러오는 중입니다...</p> : null}
        {error ? <p className="mt-8 text-sm text-[#f2a39b]">{error}</p> : null}

        {!loading && !error && adminPreview ? <p className="mt-6 rounded-[1.25rem] border border-indigo-200 bg-indigo-50 px-5 py-4 text-sm font-semibold text-indigo-900">관리자 계정으로 접속 중입니다. 전체 과정을 확인할 수 있습니다.</p> : null}

        {!loading && !error ? (
          <section className="mt-8 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-[#274690]">내 수강권</p>
                <h2 className="mt-1 text-2xl font-bold text-slate-950">수강권 목록</h2>
              </div>
              <Link href="/courses/apply/?category=dui" style={{ backgroundColor: "#10213f", color: "#ffffff", border: "2px solid #10213f", boxShadow: "0 10px 24px rgba(16,33,63,0.24)" }} className={buttonClass("primary", "sm", "rounded-full px-5 font-black")}>강의 구매하러 가기</Link>
            </div>
            {adminPreview ? <p className="mt-4 rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-sm font-semibold text-indigo-900">관리자 계정은 모든 강의 접근이 가능합니다.</p> : null}
            {!adminPreview && enrollments.length === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-700">
                <p className="font-semibold text-slate-950">현재 이용 가능한 수강권이 없습니다.</p>
                <Link href="/courses/apply/?category=dui" style={{ backgroundColor: "#10213f", color: "#ffffff", border: "2px solid #10213f", boxShadow: "0 10px 24px rgba(16,33,63,0.24)" }} className={buttonClass("primary", "sm", "mt-4 rounded-full px-5 font-black")}>강의 구매하러 가기</Link>
              </div>
            ) : null}
            {enrollments.length ? (
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {enrollments.map((enrollment) => {
                  const active = isEnrollmentActive(enrollment);
                  const progressRate = enrollment.courseId === defaultCourse.id ? Math.max(enrollment.progress ?? 0, progressSummary.completionRate) : enrollment.progress ?? 0;
                  const completed = enrollment.courseId === defaultCourse.id ? (progressRate >= 100 || progressSummary.isCompleted) : progressRate >= 100;
                  const certificateReady = active;
                  return (
                    <article key={enrollment.courseId + (enrollment.paymentId || enrollment.orderId || "")} className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-bold text-slate-950">{enrollment.courseTitle || defaultCourse.title}</p>
                          <p className="mt-1 text-xs text-slate-500">{enrollment.productId === "basic" ? "기본형 수강권" : enrollment.productTitle || enrollment.productId || "수강권"}</p>
                        </div>
                        <span className={active ? "rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700" : "rounded-full bg-slate-200 px-3 py-1 text-xs font-bold text-slate-600"}>{getEnrollmentStatusLabel(enrollment)}</span>
                      </div>
                      {(() => {
                        const course = getCourseDefinition(enrollment.courseId);
                        const modules = getCourseModules(enrollment.courseId);
                        const documents = course?.documents || (enrollment.courseId === DUI_CBT_ADVANCED_COURSE_ID ? [{ type: "cbt-completion", title: "인지행동 개선교육 이수증", courseId: DUI_CBT_ADVANCED_COURSE_ID }] : [{ type: "course-certificate", title: "수료증", courseId: enrollment.courseId }]);
                        return (
                          <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-3">
                            <p className="text-xs font-bold text-slate-600">수강 가능한 강의</p>
                            <ol className="mt-2 space-y-1 text-xs font-semibold text-slate-800">
                              {modules.map((module, index) => <li key={module.id}>{index + 1}. {module.title.replace(/^\d+강\.\s*/, "")}</li>)}
                            </ol>
                            <p className="mt-3 text-xs font-bold text-slate-600">제공 문서</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {documents.map((document) => (
                                <Link key={document.type + document.title} href={document.type === "cbt-completion" ? "/certificate?courseId=dui-cbt-advanced&documentType=cbt-completion" : "/certificate?courseId=" + encodeURIComponent(enrollment.courseId || defaultCourse.id)} className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-800">
                                  {document.title}
                                </Link>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                      <dl className="mt-4 grid gap-2 text-xs sm:grid-cols-2">
                        <div><dt className="font-semibold text-slate-500">결제금액</dt><dd className="mt-1 text-slate-900">{formatKrw(enrollment.amount)}</dd></div>
                        <div><dt className="font-semibold text-slate-500">진행률</dt><dd className="mt-1 text-slate-900">{Math.floor(progressRate)}%</dd></div>
                        <div><dt className="font-semibold text-slate-500">수강 시작</dt><dd className="mt-1 text-slate-900">{formatDateOnly(enrollment.purchasedAt || enrollment.createdAt)}</dd></div>
                        <div><dt className="font-semibold text-slate-500">수강 만료</dt><dd className="mt-1 text-slate-900">{formatDateOnly(enrollment.expiresAt)}</dd></div>
                      </dl>
                      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                        {active ? <Link href={"/course-room?courseId=" + encodeURIComponent(enrollment.courseId || defaultCourse.id)} className="inline-flex min-h-14 w-full items-center justify-center rounded-2xl border-4 border-[#10213f] bg-[#10213f] px-6 py-4 text-base font-black !text-white shadow-[0_18px_38px_rgba(16,33,63,0.28)] transition hover:-translate-y-0.5 hover:bg-[#173968] hover:!text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200 sm:w-auto">{getCourseRoomButtonLabel(progressRate, completed)}</Link> : <Link href={getCourseApplyHref(enrollment.courseId)} className="inline-flex min-h-14 w-full items-center justify-center rounded-2xl border-4 border-[#111827] bg-[#ffdd00] px-6 py-4 text-base font-black text-[#111827] shadow-[0_18px_38px_rgba(255,221,0,0.34)] ring-2 ring-[#fff2a8] transition hover:-translate-y-0.5 hover:bg-[#ffd000] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#fff2a8] sm:w-auto">다시 구매하기</Link>}
                        {certificateReady ? <Link href={"/certificate?courseId=" + encodeURIComponent(enrollment.courseId || defaultCourse.id)} className="inline-flex min-h-14 w-full items-center justify-center rounded-2xl border-4 border-[#111827] bg-[#ffdd00] px-6 py-4 text-base font-black text-[#111827] shadow-[0_18px_38px_rgba(255,221,0,0.34)] ring-2 ring-[#fff2a8] transition hover:-translate-y-0.5 hover:bg-[#ffd000] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#fff2a8] sm:w-auto">수료증 출력</Link> : null}
                        {certificateReady && enrollment.courseId === DUI_CBT_ADVANCED_COURSE_ID ? <Link href="/certificate?courseId=dui-cbt-advanced&documentType=cbt-detail" className="inline-flex min-h-14 w-full items-center justify-center rounded-2xl border-4 border-[#111827] bg-white px-6 py-4 text-base font-black text-[#111827] shadow-[0_18px_38px_rgba(15,23,42,0.12)] transition hover:-translate-y-0.5 sm:w-auto">상세 내역서 출력</Link> : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : null}
          </section>
        ) : null}
        {!loading && !error && hasActiveEnrollment ? (
          <section id="paid-member-resources" className="mt-8 rounded-[1.5rem] border border-indigo-200 bg-[linear-gradient(135deg,#eef4ff_0%,#ffffff_65%,#fff7df_100%)] p-5 shadow-[0_18px_45px_rgba(39,70,144,0.12)] sm:p-6">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-700">Paid Member Resources</p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">결제 회원 제공 자료</h2>
            <p className="mt-3 text-sm leading-7 text-slate-700">강의를 결제하신 회원에게 반성문 작성 가이드와 작성 예시를 제공합니다.</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Link href="/resources/reflection-guide" className={buttonClass("primary", "lg", "w-full rounded-2xl px-5 text-center font-black !text-white hover:!text-white")}>반성문 작성 가이드 보기</Link>
              <Link href="/resources/dui-reflection-example" className={buttonClass("warning", "lg", "w-full rounded-2xl px-5 text-center font-black !text-black hover:!text-black")}>음주운전 반성문 예시 보기</Link>
            </div>
          </section>
        ) : null}


        {!loading && !error && !hasActiveEnrollment ? (
          <section className="mt-8 rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 p-6 text-sm leading-7 text-slate-700">
            <p className="font-semibold text-slate-950">아직 수강 중인 교육이 없습니다.</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="/courses/apply/?category=dui" style={{ backgroundColor: "#10213f", color: "#ffffff", border: "2px solid #10213f", boxShadow: "0 10px 24px rgba(16,33,63,0.24)" }} className={buttonClass("primary", "sm", "rounded-full px-5 font-black")}>수강 신청하기</Link>
              <Link href="/courses/dui-prevention" className={buttonClass("primary", "sm", "rounded-full !text-white hover:!text-white")}>강의 구성 보기</Link>
            </div>
          </section>
        ) : null}

        {!loading && !error ? (
          <div className="mt-8 grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
            <section className="space-y-6">
              <div className="rounded-[1.75rem] border border-white/10 bg-[#0d1828] p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-[#f0cb85]">현재 코스</p>
                    <h2 className="mt-3 text-2xl font-semibold text-white">{defaultCourse.title}</h2>
                  </div>
                  <span className="rounded-full border border-[#d3ad62]/30 bg-[#d3ad62]/10 px-4 py-2 text-sm font-semibold text-[#f7dfab]">
                    {progressSummary.statusLabel}
                  </span>
                </div>

                <div className="mt-5 overflow-hidden rounded-full bg-white/10">
                  <div className="h-3 rounded-full bg-gradient-to-r from-[#d3ad62] via-[#f0cb85] to-[#fff1ca]" style={{ width: `${progressSummary.completionRate}%` }} />
                </div>

                <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-white/60">누적 수강률</p>
                    <p className="mt-2 text-white">{progressSummary.completionRate}%</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-white/60">누적 시청 시간</p>
                    <p className="mt-2 text-white">{formatDuration(progressSummary.watchedSeconds)}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-white/60">남은 시간</p>
                    <p className="mt-2 text-white">{progressSummary.durationSeconds > 0 ? formatDuration(progressSummary.remainingSeconds) : "영상 로딩 후 표시"}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-white/60">완료 강의</p>
                    <p className="mt-2 text-white">{progressSummary.completedModuleCount}/{progressSummary.totalModuleCount}강</p>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-white/60">전체 길이</p>
                    <p className="mt-2 text-white">{formatDurationOrPending(progressSummary.durationSeconds)}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-white/60">완료 여부</p>
                    <p className="mt-2 text-white">{progressSummary.isCompleted ? "완료" : "진행 중"}</p>
                  </div>
                </div>

                <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-7 text-white/75">
                  <p><span className="font-semibold text-white">마지막 시청:</span> {progressSummary.lastLessonLabel} {progressSummary.lastLessonTime > 0 ? formatDuration(progressSummary.lastLessonTime) : ""}</p>
                  <p className="mt-1">마지막 저장 시각: {formatTimestamp(progress?.updatedAt)}</p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Link href="/course-room" className="inline-flex min-h-14 items-center justify-center rounded-2xl border-4 border-[#111827] bg-[#ffdd00] px-6 py-4 text-base font-black !text-black shadow-[0_18px_38px_rgba(255,221,0,0.34)] ring-2 ring-[#fff2a8] transition hover:-translate-y-0.5 hover:bg-[#ffd000] hover:!text-black">
                      이어보기
                    </Link>
                    <Link href="/course-room" className="inline-flex min-h-14 items-center justify-center rounded-2xl border-4 border-[#111827] bg-[#ffdd00] px-6 py-4 text-base font-black !text-black shadow-[0_18px_38px_rgba(255,221,0,0.34)] ring-2 ring-[#fff2a8] transition hover:-translate-y-0.5 hover:bg-[#ffd000] hover:!text-black">
                      강의 목록 보기
                    </Link>
                  </div>
                </div>
              </div>

              <div className="rounded-[1.75rem] border border-white/10 bg-[#111f33] p-6">
                <p className="text-sm font-semibold text-[#f0cb85]">강의별 수강 현황</p>
                <div className="mt-4 space-y-3">
                  {duiBasicModules.map((module, index) => {
                    const item = progressSummary.moduleProgress[module.id];
                    return (
                      <article key={module.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-semibold text-white">{index + 1}강. {module.title}</p>
                          <span className="text-xs text-white/55">{item?.isCompleted ? "완료" : `${item?.completionRate ?? 0}%`}</span>
                        </div>
                        <p className="mt-2 text-sm text-white/65">{formatProgressTime(item?.watchedSeconds ?? 0, item?.durationSeconds ?? 0)}</p>
                        <div className="mt-3 overflow-hidden rounded-full bg-white/10">
                          <div className="h-2 rounded-full bg-[#d3ad62]" style={{ width: `${item?.completionRate ?? 0}%` }} />
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>

            </section>

            <section className="rounded-[1.75rem] border border-white/10 bg-[#0d1828] p-6">
              <div className="mb-6 rounded-2xl border-4 border-[#facc15] bg-white p-5 shadow-[0_22px_54px_rgba(250,204,21,0.26)]">
                <p className="text-xl font-black text-slate-950">서류 인쇄하기</p>
                <p className="mt-1 text-sm leading-6 text-sky-900">{hasDocumentFormsAccess ? "아래 3종 서식을 열어 인쇄하거나 PDF로 저장할 수 있습니다." : "서식 포함 수강권을 선택하면 아래 3종 서식을 이용할 수 있습니다."}</p>
                <div className="mt-4 grid gap-3">
                  {preventionDocuments.map((document) => (
                    <Link key={document.id} href={`/prevention-documents?type=${document.id}`} className="flex min-h-16 items-center justify-between gap-3 rounded-2xl border-4 border-[#111827] bg-[#ffdd00] px-5 py-4 text-base font-black !text-black shadow-[0_18px_38px_rgba(255,221,0,0.34)] ring-2 ring-[#fff2a8] transition hover:-translate-y-0.5 hover:bg-[#ffd000] hover:!text-black">
                      <span>{document.title}</span>
                      <span className="shrink-0 rounded-full bg-amber-300 px-3 py-1.5 text-xs font-black text-slate-950">{hasDocumentFormsAccess ? "인쇄 · PDF 저장" : "109,000원 상품"}</span>
                    </Link>
                  ))}
                </div>
              </div>
              <p className="text-sm font-semibold text-[#f0cb85]">수료증</p>
              <h2 className="mt-3 text-3xl font-semibold text-white">수강증/수료증 확인 및 온라인 인쇄</h2>
              <p className="mt-4 text-sm leading-8 text-white/70">
                결제가 확인된 수강권은 진도율과 관계없이 수료증을 바로 확인하고 출력할 수 있습니다.
              </p>

              <div className="mt-6 space-y-4">
                {hasAdvancedCertificateAccess ? (
                  <div className="rounded-[1.5rem] border border-amber-300 bg-amber-50 p-5 text-sm leading-7 text-amber-950 shadow-[0_18px_44px_rgba(245,158,11,0.16)]">
                    <p className="font-black">심화과정 이수 서류</p>
                    <p className="mt-2">심화과정 수강권은 기본 수료증과 인지행동기반 재발방지교육 이수증을 함께 출력할 수 있습니다.</p>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <Link href={`/certificate?courseId=${encodeURIComponent(advancedBaseCertificateCourseId)}&documentType=completion`} className="inline-flex min-h-14 items-center justify-center rounded-2xl border-4 border-[#111827] bg-white px-6 py-4 text-base font-black text-[#111827] shadow-[0_18px_38px_rgba(15,23,42,0.12)] transition hover:-translate-y-0.5 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-200">
                        기본 수료증 출력
                      </Link>
                      <Link href="/certificate?courseId=dui-cbt-advanced&documentType=cbt-completion" className="inline-flex min-h-14 items-center justify-center rounded-2xl border-4 border-[#111827] bg-[#ffdd00] px-6 py-4 text-base font-black !text-black shadow-[0_18px_38px_rgba(255,221,0,0.34)] ring-2 ring-[#fff2a8] transition hover:-translate-y-0.5 hover:bg-[#ffd000] hover:!text-black focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#fff2a8]">
                        심화 이수증 출력
                      </Link>
                    </div>
                  </div>
                ) : null}
                {certificates.length ? (
                  certificates.map((certificate) => (
                    <div key={certificate.id} className="rounded-[1.5rem] border border-white/10 bg-black/20 p-5 transition hover:bg-black/30">
                      <div>
                        <p className="text-lg font-semibold text-white">{documentLabels[certificate.documentType ?? "completion"] ?? certificate.courseTitle ?? "음주운전 예방교육 수료증"}</p>
                        <p className="mt-2 text-sm text-white/65">발급번호 {certificate.certificateNo || certificate.issueNumber || "확인 중"}</p>
                        <p className="mt-1 text-sm text-white/50">발급 시각 {formatTimestamp(certificate.issuedAt || certificate.certificateIssuedAt)}</p>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-3">
                        <Link href={`/certificate?certificateId=${encodeURIComponent(certificate.id)}`} className="inline-flex min-h-14 items-center justify-center rounded-2xl border-4 border-[#111827] bg-[#ffdd00] px-6 py-4 text-base font-black !text-black shadow-[0_18px_38px_rgba(255,221,0,0.34)] ring-2 ring-[#fff2a8] transition hover:-translate-y-0.5 hover:bg-[#ffd000] hover:!text-black focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#fff2a8]">
                          서류 보기
                        </Link>
                        <Link href={`/certificate?certificateId=${encodeURIComponent(certificate.id)}&print=1`} className="inline-flex min-h-14 items-center justify-center rounded-2xl border-4 border-[#111827] bg-[#ffdd00] px-6 py-4 text-base font-black !text-black shadow-[0_18px_38px_rgba(255,221,0,0.34)] ring-2 ring-[#fff2a8] transition hover:-translate-y-0.5 hover:bg-[#ffd000] hover:!text-black focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#fff2a8]">
                          서류 인쇄하기
                        </Link>
                      </div>
                    </div>
                  ))
                ) : hasActiveEnrollment ? (
                  <div className="rounded-[1.5rem] border border-emerald-300/30 bg-emerald-400/10 p-6 text-sm leading-7 text-emerald-50">
                    <p className="font-semibold text-white">결제된 음주운전 예방교육 수강권이 확인되었습니다.</p>
                    <p className="mt-2">아래 버튼을 눌러 진도율과 관계없이 수료증을 즉시 확인하고 출력할 수 있습니다.</p>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <Link href="/certificate" className="inline-flex min-h-14 items-center justify-center rounded-2xl border-4 border-[#111827] bg-[#ffdd00] px-6 py-4 text-base font-black !text-black shadow-[0_18px_38px_rgba(255,221,0,0.34)] ring-2 ring-[#fff2a8] transition hover:-translate-y-0.5 hover:bg-[#ffd000] hover:!text-black focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#fff2a8]">
                        서류 보기
                      </Link>
                      <Link href="/certificate?print=1" className="inline-flex min-h-14 items-center justify-center rounded-2xl border-4 border-[#111827] bg-[#ffdd00] px-6 py-4 text-base font-black !text-black shadow-[0_18px_38px_rgba(255,221,0,0.34)] ring-2 ring-[#fff2a8] transition hover:-translate-y-0.5 hover:bg-[#ffd000] hover:!text-black focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#fff2a8]">
                        바로 인쇄
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-[1.5rem] border border-dashed border-white/15 bg-black/20 p-6 text-sm leading-7 text-white/65">
                    <p>결제가 확인되면 수료증을 바로 확인할 수 있습니다.</p>
                    <button type="button" disabled className="mt-4 inline-flex min-h-10 cursor-not-allowed items-center justify-center rounded-full bg-slate-600 px-4 py-2 text-sm font-bold text-slate-200 opacity-70">
                      결제 확인 후 발급 가능
                    </button>
                  </div>
                )}
              </div>
            </section>
          </div>
        ) : null}
      </div>
    </main>
  );
}
