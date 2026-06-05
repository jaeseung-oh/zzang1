"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { isAdminEmail } from "@/lib/admin/config";
import { defaultCourse } from "@/lib/course/catalog";
import { requireAuthenticatedUser } from "@/lib/firebase/session";

function buildStreamUrl(uid?: string) {
  return uid ? `https://iframe.videodelivery.net/${uid}` : "";
}

async function resolveCloudflareStreamUrl(uid: string) {
  const apiBaseUrl = process.env.NEXT_PUBLIC_AUTH_API_BASE_URL?.replace(/\/$/, "");

  if (!apiBaseUrl) {
    return buildStreamUrl(uid);
  }

  try {
    const response = await fetch(`${apiBaseUrl}/api/stream/token?uid=${encodeURIComponent(uid)}`, {
      method: "GET",
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error(`Stream token request failed: ${response.status}`);
    }

    const data = (await response.json()) as { videoUrl?: string };
    return data.videoUrl || buildStreamUrl(uid);
  } catch (error) {
    console.error(error);
    return buildStreamUrl(uid);
  }
}

export default function AdminLecturesPage() {
  const router = useRouter();
  const modules = defaultCourse.modules;
  const [selectedModuleId, setSelectedModuleId] = useState(modules[0]?.id ?? "");
  const selectedModule = useMemo(
    () => modules.find((module) => module.id === selectedModuleId) ?? modules[0],
    [modules, selectedModuleId]
  );
  const [selectedStreamUrl, setSelectedStreamUrl] = useState(buildStreamUrl(selectedModule?.cloudflareStreamUid));
  const [streamStatus, setStreamStatus] = useState("재생 URL 준비 중");
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [adminAllowed, setAdminAllowed] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const configuredCount = modules.filter((module) => module.cloudflareStreamUid).length;

  useEffect(() => {
    let cancelled = false;

    const checkAdmin = async () => {
      try {
        const user = await requireAuthenticatedUser();
        const email = user.email ?? "";

        if (cancelled) {
          return;
        }

        setAdminEmail(email);
        setAdminAllowed(isAdminEmail(email));
      } catch (error) {
        const message = error instanceof Error ? error.message : "";

        if (message === "AUTH_LOGIN_REQUIRED") {
          router.replace("/login?next=/admin/lectures");
        }
      } finally {
        if (!cancelled) {
          setCheckingAdmin(false);
        }
      }
    };

    void checkAdmin();

    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    let cancelled = false;

    const loadStreamUrl = async () => {
      if (!adminAllowed) {
        return;
      }

      if (!selectedModule?.cloudflareStreamUid) {
        setSelectedStreamUrl("");
        setStreamStatus("Stream UID 없음");
        return;
      }

      setStreamStatus("Signed token 발급 중");
      const streamUrl = await resolveCloudflareStreamUrl(selectedModule.cloudflareStreamUid);

      if (!cancelled) {
        setSelectedStreamUrl(streamUrl);
        setStreamStatus(streamUrl.includes(selectedModule.cloudflareStreamUid) ? "공개 UID URL 사용 중" : "Signed token URL 사용 중");
      }
    };

    void loadStreamUrl();

    return () => {
      cancelled = true;
    };
  }, [adminAllowed, selectedModule]);

  if (checkingAdmin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#eef3f8] px-4 text-[#0f172a]">
        <p className="rounded-[1rem] border border-[#d7deea] bg-white px-5 py-4 text-sm font-semibold shadow-[0_18px_48px_rgba(15,23,42,0.08)]">관리자 데이터를 불러오는 중입니다.</p>
      </main>
    );
  }

  if (!adminAllowed) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#eef3f8] px-4 text-[#0f172a]">
        <section className="max-w-md rounded-[1.25rem] border border-[#d7deea] bg-white p-6 text-center shadow-[0_18px_48px_rgba(15,23,42,0.08)]">
          <h1 className="text-2xl font-semibold">관리자 권한이 없습니다.</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">관리자 계정으로 로그인한 경우에만 접근할 수 있습니다.</p>
          <Link href="/" className="mt-5 inline-flex rounded-full bg-[#0f2a57] px-4 py-2 text-sm font-semibold text-white">사이트로 돌아가기</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#eef3f8] px-4 py-8 text-[#0f172a] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="rounded-[1.5rem] border border-[#d7deea] bg-white px-5 py-5 shadow-[0_18px_48px_rgba(15,23,42,0.08)] sm:px-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#274690]">Admin Lecture Preview</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[#0f172a] sm:text-4xl">관리자 강의 영상 확인</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
                Cloudflare Stream에 연결된 1-5강 영상을 결제나 수강 진도 저장 없이 바로 확인합니다. 실제 수강실은 수강자 권한과 진도 저장 로직을 별도로 사용합니다.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-[#d7deea] bg-[#f8fafc] px-4 py-2 text-xs font-semibold text-slate-700">
                {configuredCount}/{modules.length} 영상 연결
              </span>
              <span className="rounded-full border border-[#d7deea] bg-white px-4 py-2 text-xs font-semibold text-slate-700">{adminEmail}</span>
              <Link
                href="/course-room"
                className="rounded-full bg-[#0f2a57] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#173968]"
              >
                실제 강의실 열기
              </Link>
            </div>
          </div>
        </header>

        <div className="mt-6 grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
          <section className="rounded-[1.5rem] border border-[#d7deea] bg-white p-4 shadow-[0_18px_48px_rgba(15,23,42,0.08)]">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Lecture List</p>
                <h2 className="mt-1 text-xl font-semibold text-slate-950">강의 목록</h2>
              </div>
              <span className="rounded-full bg-[#eef4ff] px-3 py-1 text-xs font-semibold text-[#1d4ed8]">{modules.length}강</span>
            </div>

            <div className="mt-4 space-y-2">
              {modules.map((module, index) => {
                const active = module.id === selectedModule?.id;
                const hasStream = Boolean(module.cloudflareStreamUid);

                return (
                  <button
                    key={module.id}
                    type="button"
                    onClick={() => setSelectedModuleId(module.id)}
                    className={`w-full rounded-[1rem] border px-4 py-4 text-left transition hover:-translate-y-0.5 ${
                      active ? "border-[#1d4ed8] bg-[#eef4ff]" : "border-[#e2e8f0] bg-[#f8fafc] hover:border-[#9bb8ef]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Lesson {index + 1}</p>
                        <h3 className="mt-1 text-sm font-semibold leading-5 text-slate-950">{module.title}</h3>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                          hasStream ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                        }`}
                      >
                        {hasStream ? "연결됨" : "UID 없음"}
                      </span>
                    </div>
                    <p className="mt-2 truncate text-xs text-slate-500">UID: {module.cloudflareStreamUid ?? "미설정"}</p>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="overflow-hidden rounded-[1.5rem] border border-[#d7deea] bg-white shadow-[0_18px_48px_rgba(15,23,42,0.08)]">
            <div className="border-b border-slate-200 px-5 py-5 sm:px-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#274690]">Current Preview</p>
              <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">{selectedModule?.title}</h2>
                  <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">{selectedModule?.summary}</p>
                </div>
                {selectedStreamUrl ? (
                  <a
                    href={selectedStreamUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full border border-[#d7deea] bg-[#f8fafc] px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-white"
                  >
                    새 창에서 열기
                  </a>
                ) : null}
              </div>
            </div>

            <div className="bg-black">
              <div className="aspect-video w-full">
                {selectedStreamUrl ? (
                  <iframe
                    key={selectedStreamUrl}
                    src={selectedStreamUrl}
                    title={selectedModule?.title ?? "강의 영상"}
                    className="h-full w-full border-0"
                    allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <div className="flex h-full items-center justify-center px-6 text-center text-sm text-slate-300">
                    선택한 강의의 Cloudflare Stream UID가 없습니다.
                  </div>
                )}
              </div>
            </div>

            <div className="grid gap-3 px-5 py-5 text-sm sm:grid-cols-3 sm:px-6">
              <div className="rounded-[1rem] border border-[#e2e8f0] bg-[#f8fafc] p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">과정</p>
                <p className="mt-2 font-semibold text-slate-950">{defaultCourse.title}</p>
              </div>
              <div className="rounded-[1rem] border border-[#e2e8f0] bg-[#f8fafc] p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">분량</p>
                <p className="mt-2 font-semibold text-slate-950">{selectedModule?.minutes}분</p>
              </div>
              <div className="rounded-[1rem] border border-[#e2e8f0] bg-[#f8fafc] p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">재생 방식</p>
                <p className="mt-2 font-semibold text-slate-950">{streamStatus}</p>
              </div>
              <div className="rounded-[1rem] border border-[#e2e8f0] bg-[#f8fafc] p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Stream UID</p>
                <p className="mt-2 break-all font-semibold text-slate-950">{selectedModule?.cloudflareStreamUid ?? "미설정"}</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
