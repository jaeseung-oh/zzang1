import { doc, getDoc, getDocs, serverTimestamp, setDoc, collection } from "firebase/firestore";
import { defaultCourse } from "@/lib/course/catalog";
import { getFirebaseServices } from "@/lib/firebase/client";

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
  const totalLessons = options?.totalLessons ?? defaultCourse.modules.length;
  const completedLessons = lessonProgressList.filter((item) => item.completed).length;
  const progressByLesson = new Map(lessonProgressList.map((item) => [item.lessonId, item.progressRate]));
  const sum = defaultCourse.modules.reduce((acc, module) => acc + (progressByLesson.get(module.id) ?? 0), 0);
  const overallProgressRate = totalLessons > 0 ? Math.floor(sum / totalLessons) : 0;
  const latest = lessonProgressList
    .slice()
    .sort((a, b) => Date.parse(b.lastWatchedAt) - Date.parse(a.lastWatchedAt))[0];

  return {
    userId,
    courseId,
    totalLessons,
    completedLessons,
    overallProgressRate,
    lastLessonId: options?.lastLessonId || latest?.lessonId || defaultCourse.modules[0]?.id || "",
    lastLessonTime: options?.lastLessonTime ?? latest?.currentTime ?? 0,
    certificateAvailable: completedLessons >= totalLessons,
    updatedAt: new Date().toISOString(),
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
    const { db } = getFirebaseServices();
    const snapshot = await getDoc(doc(db, "users", userId, "courseProgress", courseId, "lessons", lessonId));
    if (!snapshot.exists()) return local;
    const remote = snapshot.data() as LessonProgress;
    if (!local) return remote;
    return Date.parse(remote.lastWatchedAt) >= Date.parse(local.lastWatchedAt) ? remote : local;
  } catch {
    return local;
  }
}

export async function saveLessonProgress(progress: LessonProgress) {
  saveLessonProgressLocally(progress);

  try {
    const { db } = getFirebaseServices();
    // TODO: 실제 운영에서는 사용자의 구매 여부를 서버 또는 Firestore Security Rules로 검증해야 함.
    // TODO: 진도율과 수료 여부는 프론트엔드 값만 신뢰하면 안 됨.
    // TODO: 수료증 발급은 서버 검증된 진도율 기준으로 처리해야 함.
    // TODO: 사용자가 개발자도구로 currentTime이나 completed 값을 조작할 수 있으므로 서버 검증 구조가 필요함.
    await setDoc(
      doc(db, "users", progress.userId, "courseProgress", progress.courseId, "lessons", progress.lessonId),
      {
        ...progress,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    return { ok: true };
  } catch (error) {
    return { ok: false, error };
  }
}

export async function getCourseProgress(userId: string, courseId: string) {
  const local = getLocalCourseProgress(userId, courseId);

  try {
    const { db } = getFirebaseServices();
    const snapshot = await getDoc(doc(db, "users", userId, "courseProgress", courseId));
    if (!snapshot.exists()) return local;
    const remote = snapshot.data() as CourseProgress;
    if (!local) return remote;
    return Date.parse(remote.updatedAt) >= Date.parse(local.updatedAt) ? remote : local;
  } catch {
    return local;
  }
}

export async function updateCourseProgress(userId: string, courseId: string, options?: { lastLessonId?: string; lastLessonTime?: number }) {
  const lessonProgressList: LessonProgress[] = [];

  try {
    const { db } = getFirebaseServices();
    const snapshot = await getDocs(collection(db, "users", userId, "courseProgress", courseId, "lessons"));
    snapshot.docs.forEach((item) => lessonProgressList.push(item.data() as LessonProgress));
  } catch {
    for (const module of defaultCourse.modules) {
      const local = getLocalLessonProgress(userId, courseId, module.id);
      if (local) lessonProgressList.push(local);
    }
  }

  const progress = calculateCourseProgress(userId, courseId, lessonProgressList, {
    totalLessons: defaultCourse.modules.length,
    lastLessonId: options?.lastLessonId,
    lastLessonTime: options?.lastLessonTime,
  });
  saveCourseProgressLocally(progress);

  try {
    const { db } = getFirebaseServices();
    await setDoc(
      doc(db, "users", userId, "courseProgress", courseId),
      {
        ...progress,
        updatedAt: progress.updatedAt,
        updatedAtServer: serverTimestamp(),
      },
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
