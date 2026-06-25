"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics/ga";

export default function CourseViewEvent({ courseId, courseName }: { courseId: string; courseName: string }) {
  useEffect(() => {
    trackEvent("course_view", { course_id: courseId, course_name: courseName });
  }, [courseId, courseName]);

  return null;
}
