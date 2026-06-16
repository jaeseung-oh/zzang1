"use client";

import { useEffect, useState } from "react";
import { requireAuthenticatedUser } from "@/lib/firebase/session";
import { isSuperAdmin } from "@/lib/auth/auth-role-service";
import { AccessDeniedCard, AccessLoadingCard } from "@/app/components/auth/AccessDeniedCard";

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<"loading" | "allowed" | "login" | "denied">("loading");
  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const user = await requireAuthenticatedUser();
        if (!cancelled) setState(isSuperAdmin(user) ? "allowed" : "denied");
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        if (!cancelled) setState(message === "AUTH_LOGIN_REQUIRED" ? "login" : "denied");
      }
    };
    void check();
    return () => { cancelled = true; };
  }, []);
  if (state === "loading") return <AccessLoadingCard message="관리자 권한을 확인하고 있습니다." />;
  if (state === "login") return <AccessDeniedCard message="관리자 페이지는 로그인이 필요합니다." primaryHref="/login?next=/admin/dashboard" primaryLabel="로그인하기" secondaryHref="/" secondaryLabel="홈으로 이동" />;
  if (state === "denied") return <AccessDeniedCard message="관리자 권한이 없습니다." primaryHref="/" primaryLabel="홈으로 이동" secondaryHref="/courses" secondaryLabel="강의 구성 보기" />;
  return <>{children}</>;
}
