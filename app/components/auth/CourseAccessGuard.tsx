"use client";

import { useEffect, useState } from "react";
import { requireAuthenticatedUser } from "@/lib/firebase/session";
import { getCourseAvailability, hasCourseAccess } from "@/lib/course/enrollment-service";
import { isSuperAdmin } from "@/lib/auth/auth-role-service";
import { AccessDeniedCard, AccessLoadingCard } from "@/app/components/auth/AccessDeniedCard";

export function CourseAccessGuard({ courseId, children }: { courseId: string; children: React.ReactNode }) {
  const [state, setState] = useState<"loading" | "allowed" | "login" | "denied" | "comingSoon" | "error">("loading");
  const [admin, setAdmin] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const user = await requireAuthenticatedUser();
        const superAdmin = isSuperAdmin(user);
        const availability = getCourseAvailability(courseId);
        if (cancelled) return;
        setAdmin(superAdmin);
        if (availability.comingSoon && !superAdmin) { setState("comingSoon"); return; }
        const allowed = await hasCourseAccess(user, courseId);
        if (!cancelled) setState(allowed ? "allowed" : "denied");
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        if (!cancelled) setState(message === "AUTH_LOGIN_REQUIRED" ? "login" : "error");
      }
    };
    void check();
    return () => { cancelled = true; };
  }, [courseId]);

  if (state === "loading") return <AccessLoadingCard />;
  if (state === "login") return <AccessDeniedCard message="강의를 수강하려면 로그인이 필요합니다." primaryHref="/login?next=/course-room" primaryLabel="로그인하기" secondaryHref="/" secondaryLabel="홈으로 이동" />;
  if (state === "comingSoon") return <AccessDeniedCard message="해당 과정은 현재 준비중입니다." primaryHref="/courses" primaryLabel="운영 중인 과정 보기" secondaryHref="/" secondaryLabel="홈으로 이동" />;
  if (state === "denied") return <AccessDeniedCard message="이 강의는 결제 완료 후 수강할 수 있습니다." primaryHref="/courses/apply/?category=dui" primaryLabel="수강 신청하기" secondaryHref="/courses/dui-prevention" secondaryLabel="강의 구성 보기" />;
  if (state === "error") return <AccessDeniedCard message="수강권 확인 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요." primaryHref="/courses/apply/?category=dui" primaryLabel="수강 신청하기" secondaryHref="/" secondaryLabel="홈으로 이동" />;
  return <>{admin ? <span className="sr-only">관리자 권한 접근</span> : null}{children}</>;
}
