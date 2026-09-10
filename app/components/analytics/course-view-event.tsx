"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics/ga";

export default function CourseViewEvent({ courseId, courseName }: { courseId: string; courseName: string }) {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    trackEvent("page_view_course", { category: courseId, courseName, source: params.get("utm_source") || params.get("n_media") || undefined, campaign: params.get("utm_campaign") || undefined });
  }, [courseId, courseName]);

  return null;
}
