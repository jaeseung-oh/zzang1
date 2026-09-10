import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { defaultCourse, getCourseModules } from "@/lib/course/catalog";
import { getFirebaseServices } from "@/lib/firebase/client";
import { paymentConfig } from "@/lib/payment/config";

export interface LessonProgress {
  userId: string;
  courseId: string;
  lessonId: string;
  currentTime: number;
  duration: number;
  progressRate: number;
  completed: boolean;
  lastWatchedAt: string;
}

export interface CourseProgress {
  userId: string;
  courseId: string;
  totalLessons: number;
  completedLessons: number;
  overallProgressRate: number;
  lastLessonId: string;
  lastLessonTime: number;
  certificateAvailable: boolean;
  updatedAt: string;
  uid?: string;
  watchedSeconds?: number;
  durationSeconds?: number;
  completionRate?: number;
  remainingSeconds?: number;
  lastPlaybackPositionSeconds?: number;
  completedModuleCount?: number;
  totalModuleCount?: number;
  moduleProgress?: Record<string, ModuleProgressLike>;
  isCompleted?: boolean;
}

export type ModuleProgressLike = {
  watchedSeconds: number;
  durationSeconds: number;
  completionRate: number;
  lastPlaybackPositionSeconds: number;
  isCompleted: boolean;
};

const completionThreshold = 95;

export function lessonProgressStorageKey(userId: string, courseId: string, lessonId: string) {
  return "lesson-progress-" + userId + "-" + courseId + "-" + lessonId;
}

export function courseProgressStorageKey(userId: string, courseId: string) {
  return "course-progress-" + userId + "-" + courseId;
}

export function calculateLessonProgress(input: {
  userId: string;
  courseId: string;
  lessonId: string;
  currentTime: number;
  duration: number;
}): LessonProgress {
  const duration = Math.max(1, Math.round(input.duration || 0));
  const currentTime = Math.min(duration, Math.max(0, Math.round(input.currentTime || 0)));
  const progressRate = Math.min(100, Math.floor((currentTime / duration) * 100));

  // TODO: 추후 watchedSegments 배열을 저장하고 실제 시청 구간을 병합해 진도율을 계산해야 합니다.
  // TODO: 사용자가 seek로 마지막 지점으로 이동해도 진도율이 과도하게 올라가지 않도록 서버 검증 구조가 필요합니다.
  return {
    userId: input.userId,
    courseId: input.courseId,
    lessonId: input.lessonId,
    currentTime,
    duration,
    progressRate,
    completed: progressRate >= completionThreshold,
    lastWatchedAt: new Date().toISOString(),
  };
}

export function calculateCourseProgress(
  userId: string,
  courseId: string,
  lessonProgressList: LessonProgress[],
  options?: { totalLessons?: number; lastLessonId?: string; lastLessonTime?: number }
): CourseProgress {
  const courseModules = getCourseModules(courseId);
  const totalLessons = options?.totalLessons ?? courseModules.length;
  const progressByLesson = new Map(lessonProgressList.map((item) => [item.lessonId, item]));
  const moduleProgress = Object.fromEntries(
    courseModules.map((module) => {
      const item = progressByLesson.get(module.id);
      const durationSeconds = Math.max(0, Math.round(item?.duration || 0));
      const watchedSeconds = Math.min(durationSeconds, Math.max(0, Math.round(item?.currentTime || 0)));
      const progressRate = Math.max(
        0,
        Math.min(100, Math.floor(item?.progressRate ?? (durationSeconds > 0 ? (watchedSeconds / durationSeconds) * 100 : 0)))
      );
      return [
        module.id,
        {
          watchedSeconds,
          durationSeconds,
          completionRate: progressRate,
          lastPlaybackPositionSeconds: watchedSeconds,
          isCompleted: Boolean(item?.completed) || progressRate >= completionThreshold,
        },
      ];
    })
  ) as Record<string, ModuleProgressLike>;
  const completedLessons = Object.values(moduleProgress).filter((item) => item.isCompleted).length;
  const durationSeconds = Object.values(moduleProgress).reduce((acc, item) => acc + item.durationSeconds, 0);
  const watchedSeconds = Object.values(moduleProgress).reduce((acc, item) => acc + item.watchedSeconds, 0);
  const averageProgressRate = totalLessons > 0
    ? Math.floor(courseModules.reduce((acc, module) => acc + moduleProgress[module.id].completionRate, 0) / totalLessons)
    : 0;
  const timeProgressRate = durationSeconds > 0 ? Math.floor((watchedSeconds / durationSeconds) * 100) : 0;
  const overallProgressRate = Math.max(averageProgressRate, timeProgressRate);
  const latest = lessonProgressList
    .slice()
    .sort((a, b) => Date.parse(b.lastWatchedAt) - Date.parse(a.lastWatchedAt))[0];
  const lastLessonTime = options?.lastLessonTime ?? latest?.currentTime ?? 0;

  return {
    userId,
    uid: userId,
    courseId,
    totalLessons,
    completedLessons,
    overallProgressRate,
    lastLessonId: options?.lastLessonId || latest?.lessonId || courseModules[0]?.id || defaultCourse.modules[0]?.id || "",
    lastLessonTime,
    certificateAvailable: totalLessons > 0 && completedLessons >= totalLessons,
    updatedAt: new Date().toISOString(),
    watchedSeconds,
    durationSeconds,
    completionRate: overallProgressRate,
    remainingSeconds: Math.max(durationSeconds - watchedSeconds, 0),
    lastPlaybackPositionSeconds: lastLessonTime,
    completedModuleCount: completedLessons,
    totalModuleCount: totalLessons,
    moduleProgress,
    isCompleted: totalLessons > 0 && completedLessons >= totalLessons,
  };
}

function readLocalJson<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeLocalJson(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function saveLessonProgressLocally(progress: LessonProgress) {
  writeLocalJson(lessonProgressStorageKey(progress.userId, progress.courseId, progress.lessonId), progress);
}

export function getLocalLessonProgress(userId: string, courseId: string, lessonId: string) {
  return readLocalJson<LessonProgress>(lessonProgressStorageKey(userId, courseId, lessonId));
}

export function saveCourseProgressLocally(progress: CourseProgress) {
  writeLocalJson(courseProgressStorageKey(progress.userId, progress.courseId), progress);
}

export function getLocalCourseProgress(userId: string, courseId: string) {
  return readLocalJson<CourseProgress>(courseProgressStorageKey(userId, courseId));
}

export async function getLessonProgress(userId: string, courseId: string, lessonId: string) {
  const local = getLocalLessonProgress(userId, courseId, lessonId);

  try {
    const courseProgress = await getCourseProgress(userId, courseId);
    const moduleProgress = courseProgress?.moduleProgress?.[lessonId];
    if (!moduleProgress) return local;
    const remote = moduleProgressToLessonProgress(userId, courseId, lessonId, moduleProgress);
    if (!local) return remote;
    return remote.progressRate >= local.progressRate || remote.currentTime >= local.currentTime ? remote : local;
  } catch {
    return local;
  }
}

export async function saveLessonProgress(progress: LessonProgress) {
  saveLessonProgressLocally(progress);

  try {
    const { db } = getFirebaseServices();
    await setDoc(
      doc(db, "courseProgress", progress.userId + "_" + progress.courseId),
      {
        uid: progress.userId,
        userId: progress.userId,
        courseId: progress.courseId,
        lastLessonId: progress.lessonId,
        lastLessonTime: progress.currentTime,
        lastPlaybackPositionSeconds: progress.currentTime,
        moduleProgress: {
          [progress.lessonId]: {
            watchedSeconds: progress.currentTime,
            durationSeconds: progress.duration,
            completionRate: progress.progressRate,
            lastPlaybackPositionSeconds: progress.currentTime,
            isCompleted: progress.completed,
          },
        },
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    return { ok: true };
  } catch (error) {
    return { ok: false, error };
  }
}

function getProgressUpdatedTime(progress: CourseProgress | null) {
  if (!progress?.updatedAt) return 0;
  const value = progress.updatedAt as unknown;
  if (typeof value === "string") return Date.parse(value) || 0;
  if (typeof value === "object" && value && "seconds" in value) return Number((value as { seconds?: number }).seconds || 0) * 1000;
  return 0;
}


async function syncSupabaseProgressLedger(progress: CourseProgress) {
  try {
    if (typeof window === "undefined") return;
    const bucket = progress.isCompleted ? "completed" : String(Math.floor(Number(progress.completionRate ?? progress.overallProgressRate ?? 0) / 10) * 10);
    const key = `resetedu:supabase-progress-ledger:${progress.userId}:${progress.courseId}:${bucket}:${progress.completedModuleCount ?? progress.completedLessons}`;
    if (window.sessionStorage.getItem(key) === "sent") return;
    const baseUrl = paymentConfig.confirmUrl.replace(/\/api\/payments\/confirm$/, "");
    if (!baseUrl) return;
    const { auth } = getFirebaseServices();
    const idToken = await auth.currentUser?.getIdToken();
    if (!idToken) return;
    const response = await fetch(baseUrl + "/api/ledger/progress", {
      method: "POST",
      headers: { Authorization: "Bearer " + idToken, "Content-Type": "application/json" },
      body: JSON.stringify({ courseId: progress.courseId, progress: progress.completionRate ?? progress.overallProgressRate, isCompleted: progress.isCompleted, completedAt: progress.isCompleted ? progress.updatedAt : null }),
      cache: "no-store",
    });
    if (response.ok) window.sessionStorage.setItem(key, "sent");
  } catch (error) {
    console.error("[supabase-ledger:progress:failed]", error);
  }
}

function courseProgressToLessonProgressList(userId: string, courseId: string, progress: CourseProgress | null) {
  return Object.entries(progress?.moduleProgress ?? {}).map(([lessonId, item]) => moduleProgressToLessonProgress(userId, courseId, lessonId, item));
}

export async function getCourseProgress(userId: string, courseId: string) {
  const local = getLocalCourseProgress(userId, courseId);

  try {
    const { db } = getFirebaseServices();
    const rootSnapshot = await getDoc(doc(db, "courseProgress", userId + "_" + courseId));
    if (rootSnapshot.exists()) {
      const remote = rootSnapshot.data() as CourseProgress;
      if (!local) return remote;
      return getProgressUpdatedTime(remote) >= getProgressUpdatedTime(local) ? remote : local;
    }

    const legacySnapshot = await getDoc(doc(db, "users", userId, "courseProgress", courseId));
    if (!legacySnapshot.exists()) return local;
    const legacy = legacySnapshot.data() as CourseProgress;
    if (!local) return legacy;
    return getProgressUpdatedTime(legacy) >= getProgressUpdatedTime(local) ? legacy : local;
  } catch {
    return local;
  }
}

export async function updateCourseProgress(userId: string, courseId: string, options?: { lastLessonId?: string; lastLessonTime?: number }) {
  const remoteProgress = await getCourseProgress(userId, courseId);
  const lessonProgressList = courseProgressToLessonProgressList(userId, courseId, remoteProgress);

  const progressByLesson = new Map(lessonProgressList.map((item) => [item.lessonId, item]));
  for (const module of getCourseModules(courseId)) {
    const local = getLocalLessonProgress(userId, courseId, module.id);
    if (!local) continue;
    const remote = progressByLesson.get(module.id);
    if (!remote || local.progressRate >= (remote.progressRate ?? 0) || local.currentTime >= (remote.currentTime ?? 0)) {
      progressByLesson.set(module.id, local);
    }
  }

  const progress = calculateCourseProgress(userId, courseId, Array.from(progressByLesson.values()), {
    totalLessons: getCourseModules(courseId).length,
    lastLessonId: options?.lastLessonId,
    lastLessonTime: options?.lastLessonTime,
  });
  saveCourseProgressLocally(progress);

  try {
    const { db } = getFirebaseServices();
    const progressPayload = {
      userId: progress.userId,
      uid: progress.userId,
      courseId: progress.courseId,
      totalLessons: progress.totalLessons,
      completedLessons: progress.completedLessons,
      overallProgressRate: progress.overallProgressRate,
      watchedSeconds: progress.watchedSeconds ?? 0,
      durationSeconds: progress.durationSeconds ?? 0,
      completionRate: progress.completionRate ?? progress.overallProgressRate,
      remainingSeconds: progress.remainingSeconds ?? 0,
      lastLessonId: progress.lastLessonId,
      lastLessonTime: progress.lastLessonTime,
      lastPlaybackPositionSeconds: progress.lastPlaybackPositionSeconds ?? progress.lastLessonTime,
      completedModuleCount: progress.completedModuleCount ?? progress.completedLessons,
      totalModuleCount: progress.totalModuleCount ?? progress.totalLessons,
      moduleProgress: progress.moduleProgress ?? {},
      isCompleted: Boolean(progress.isCompleted),
    };

    await setDoc(
      doc(db, "courseProgress", userId + "_" + courseId),
      { ...progressPayload, updatedAt: serverTimestamp() },
      { merge: true }
    );
  } catch {
    // localStorage 백업이 있으므로 수강 자체는 막지 않습니다.
  }

  return progress;
}

export function moduleProgressToLessonProgress(userId: string, courseId: string, lessonId: string, item: ModuleProgressLike): LessonProgress {
  return calculateLessonProgress({
    userId,
    courseId,
    lessonId,
    currentTime: item.lastPlaybackPositionSeconds,
    duration: item.durationSeconds,
  });
}

export async function saveCourseProgressSnapshot(
  userId: string,
  courseId: string,
  moduleProgressInput: Record<string, ModuleProgressLike>,
  options?: { lastLessonId?: string; lastLessonTime?: number }
) {
  const courseModules = getCourseModules(courseId);
  const moduleProgress = Object.fromEntries(
    courseModules.map((module) => {
      const item = moduleProgressInput[module.id];
      const durationSeconds = Math.max(0, Math.round(item?.durationSeconds || 0));
      const lastPlaybackPositionSeconds = Math.min(
        durationSeconds || Number.MAX_SAFE_INTEGER,
        Math.max(0, Math.round(item?.lastPlaybackPositionSeconds || 0))
      );
      const watchedSeconds = Math.min(
        durationSeconds || Number.MAX_SAFE_INTEGER,
        Math.max(0, Math.round(item?.watchedSeconds || 0), lastPlaybackPositionSeconds)
      );
      const safeDuration = Math.max(durationSeconds, watchedSeconds, 0);
      const completionRate = safeDuration > 0 ? Math.min(100, Math.floor((watchedSeconds / safeDuration) * 100)) : 0;
      return [
        module.id,
        {
          watchedSeconds,
          durationSeconds: safeDuration,
          completionRate,
          lastPlaybackPositionSeconds,
          isCompleted: Boolean(item?.isCompleted) || completionRate >= completionThreshold,
        },
      ];
    })
  ) as Record<string, ModuleProgressLike>;
  const totalModuleCount = courseModules.length;
  const completedModuleCount = Object.values(moduleProgress).filter((item) => item.isCompleted).length;
  const durationSeconds = Object.values(moduleProgress).reduce((sum, item) => sum + item.durationSeconds, 0);
  const watchedSeconds = Object.values(moduleProgress).reduce((sum, item) => sum + item.watchedSeconds, 0);
  const averageProgressRate = totalModuleCount > 0
    ? Math.floor(courseModules.reduce((sum, module) => sum + moduleProgress[module.id].completionRate, 0) / totalModuleCount)
    : 0;
  const timeProgressRate = durationSeconds > 0 ? Math.floor((watchedSeconds / durationSeconds) * 100) : 0;
  const completionRate = Math.max(averageProgressRate, timeProgressRate);
  const progress: CourseProgress = {
    userId,
    uid: userId,
    courseId,
    totalLessons: totalModuleCount,
    completedLessons: completedModuleCount,
    overallProgressRate: completionRate,
    lastLessonId: options?.lastLessonId || courseModules[0]?.id || defaultCourse.modules[0]?.id || "",
    lastLessonTime: options?.lastLessonTime ?? 0,
    certificateAvailable: totalModuleCount > 0 && completedModuleCount >= totalModuleCount,
    updatedAt: new Date().toISOString(),
    watchedSeconds,
    durationSeconds,
    completionRate,
    remainingSeconds: Math.max(durationSeconds - watchedSeconds, 0),
    lastPlaybackPositionSeconds: options?.lastLessonTime ?? 0,
    completedModuleCount,
    totalModuleCount,
    moduleProgress,
    isCompleted: totalModuleCount > 0 && completedModuleCount >= totalModuleCount,
  };
  saveCourseProgressLocally(progress);

  try {
    const { db } = getFirebaseServices();
    const progressPayload = {
      userId: progress.userId,
      uid: progress.userId,
      courseId: progress.courseId,
      totalLessons: progress.totalLessons,
      completedLessons: progress.completedLessons,
      overallProgressRate: progress.overallProgressRate,
      watchedSeconds: progress.watchedSeconds ?? 0,
      durationSeconds: progress.durationSeconds ?? 0,
      completionRate: progress.completionRate ?? progress.overallProgressRate,
      remainingSeconds: progress.remainingSeconds ?? 0,
      lastLessonId: progress.lastLessonId,
      lastLessonTime: progress.lastLessonTime,
      lastPlaybackPositionSeconds: progress.lastPlaybackPositionSeconds ?? progress.lastLessonTime,
      completedModuleCount: progress.completedModuleCount ?? progress.completedLessons,
      totalModuleCount: progress.totalModuleCount ?? progress.totalLessons,
      moduleProgress: progress.moduleProgress ?? {},
      isCompleted: Boolean(progress.isCompleted),
    };

    await setDoc(
      doc(db, "courseProgress", userId + "_" + courseId),
      { ...progressPayload, updatedAt: serverTimestamp() },
      { merge: true }
    );
    void syncSupabaseProgressLedger(progress);
    return { ok: true, progress };
  } catch (error) {
    return { ok: false, progress, error };
  }
}
