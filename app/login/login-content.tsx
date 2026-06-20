"use client";

import { useSearchParams } from "next/navigation";
import AuthPage from "../components/auth-page";

export default function LoginContent() {
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next");
  const notice = searchParams.get("notice");

  return <AuthPage mode="login" nextPath={nextPath} notice={notice} />;
}
