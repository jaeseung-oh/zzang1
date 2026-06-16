import type { User } from "firebase/auth";
import { collection, doc, getDoc, getDocs, query, serverTimestamp, setDoc, where } from "firebase/firestore";
import { defaultCourse } from "@/lib/course/catalog";
import { duiPreventionCourseProduct } from "@/lib/course/product";
import { getApplicationCategory, getApplicationProduct } from "@/lib/course/application-products";
import { getFirebaseServices } from "@/lib/firebase/client";
import { isSuperAdmin } from "@/lib/auth/auth-role-service";

export type EnrollmentStatus = "active" | "cancelled" | "expired" | "pending" | "refunded";

export type EnrollmentRecord = {
  userId: string;
  uid?: string;
  courseId: string;
  courseTitle: string;
  productId?: string;
  productTitle?: string;
  paymentId?: string;
  orderId?: string;
  paymentStatus: "paid" | "pending" | "failed" | "cancelled" | "refunded" | string;
  enrollmentStatus?: EnrollmentStatus;
  accessStatus?: EnrollmentStatus;
  purchasedAt?: string | Date | { seconds: number } | null;
  expiresAt?: string | Date | { seconds: number } | null;
  certificateAvailable?: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type CreateEnrollmentAfterPaymentInput = {
  userId: string;
  courseId?: string;
  categoryId?: string | null;
  productId?: string | null;
  paymentId?: string;
  orderId?: string;
  paymentStatus?: string;
  purchasedAt?: string;
  expiresAt?: string | null;
};

export const OPERATING_COURSE_ID = defaultCourse.id;
export const APPLICATION_TO_COURSE_ID: Record<string, string> = { dui: defaultCourse.id };

export function resolveCourseId(courseIdOrCategory?: string | null) {
  if (!courseIdOrCategory || courseIdOrCategory === "dui") return defaultCourse.id;
  return APPLICATION_TO_COURSE_ID[courseIdOrCategory] ?? courseIdOrCategory;
}

export function getCourseAvailability(courseIdOrCategory?: string | null) {
  const categoryId = courseIdOrCategory === defaultCourse.id ? "dui" : courseIdOrCategory || "dui";
  const category = getApplicationCategory(categoryId);
  if (!category) {
    return { exists: courseIdOrCategory === defaultCourse.id, available: courseIdOrCategory === defaultCourse.id, comingSoon: false, title: defaultCourse.title };
  }
  return { exists: true, available: category.status === "available", comingSoon: category.status !== "available", title: category.title };
}

function toMillis(value: unknown) {
  if (!value) return null;
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.getTime() : null;
  if (typeof value === "string") {
    const parsed = new Date(value).getTime();
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (typeof value === "object" && value !== null && "seconds" in value && typeof (value as { seconds?: unknown }).seconds === "number") {
    return (value as { seconds: number }).seconds * 1000;
  }
  return null;
}

export function isEnrollmentActive(enrollment: EnrollmentRecord | null | undefined) {
  if (!enrollment) return false;
  const status = enrollment.enrollmentStatus ?? enrollment.accessStatus ?? "active";
  const expiresAt = toMillis(enrollment.expiresAt);
  const paymentStatus = String(enrollment.paymentStatus || "").toLowerCase();
  const accessStatus = String(status || "").toLowerCase();
  return paymentStatus === "paid" && accessStatus === "active" && (expiresAt === null || expiresAt >= Date.now());
}

export async function getUserEnrollment(userId: string, courseIdOrCategory: string) {
  const courseId = resolveCourseId(courseIdOrCategory);
  const { db } = getFirebaseServices();

  const nested = await getDoc(doc(db, "users", userId, "enrollments", courseId));
  if (nested.exists()) return nested.data() as EnrollmentRecord;

  const rootById = await getDoc(doc(db, "enrollments", userId + "_" + courseId));
  if (rootById.exists()) return rootById.data() as EnrollmentRecord;

  const rootQuery = await getDocs(query(collection(db, "enrollments"), where("courseId", "==", courseId), where("userId", "==", userId)));
  if (!rootQuery.empty) return rootQuery.docs[0].data() as EnrollmentRecord;

  const legacyQuery = await getDocs(query(collection(db, "enrollments"), where("courseId", "==", courseId), where("uid", "==", userId)));
  if (!legacyQuery.empty) return legacyQuery.docs[0].data() as EnrollmentRecord;

  return null;
}

export async function getUserEnrollments(userId: string) {
  const { db } = getFirebaseServices();
  const nested = await getDocs(collection(db, "users", userId, "enrollments"));
  const nestedRows = nested.docs.map((snapshot) => snapshot.data() as EnrollmentRecord);
  const root = await getDocs(query(collection(db, "enrollments"), where("userId", "==", userId)));
  const legacy = await getDocs(query(collection(db, "enrollments"), where("uid", "==", userId)));
  const byCourse = new Map<string, EnrollmentRecord>();
  [...nestedRows, ...root.docs.map((d) => d.data() as EnrollmentRecord), ...legacy.docs.map((d) => d.data() as EnrollmentRecord)].forEach((row) => {
    byCourse.set(row.courseId, row);
  });
  return Array.from(byCourse.values());
}

export async function hasCourseAccess(user: User | null, courseIdOrCategory: string) {
  if (!user || !courseIdOrCategory) return false;
  if (isSuperAdmin(user)) return true;
  const availability = getCourseAvailability(courseIdOrCategory);
  if (availability.comingSoon) return false;
  const enrollment = await getUserEnrollment(user.uid, courseIdOrCategory);
  return isEnrollmentActive(enrollment);
}

export async function createEnrollmentAfterPayment(input: CreateEnrollmentAfterPaymentInput) {
  // TODO: 실제 운영에서는 프론트엔드 결제 성공 화면 진입만으로 수강권을 만들지 말고, 서버에서 PG 승인 검증 후 이 구조의 enrollment를 생성해야 함.
  const courseId = resolveCourseId(input.courseId || input.categoryId || defaultCourse.id);
  const category = input.categoryId ? getApplicationCategory(input.categoryId) : null;
  const product = input.categoryId ? getApplicationProduct(input.categoryId, input.productId) : null;
  const purchasedAt = input.purchasedAt || new Date().toISOString();
  const expiresAt = input.expiresAt ?? new Date(Date.now() + duiPreventionCourseProduct.durationDays * 24 * 60 * 60 * 1000).toISOString();
  const enrollment: EnrollmentRecord = {
    userId: input.userId,
    uid: input.userId,
    courseId,
    courseTitle: category?.title || defaultCourse.title,
    productId: product?.id || input.productId || "basic",
    productTitle: product?.title || "수강 즉시 수료증 출력 과정",
    paymentId: input.paymentId,
    orderId: input.orderId,
    paymentStatus: input.paymentStatus || "paid",
    enrollmentStatus: "active",
    accessStatus: "active",
    purchasedAt,
    expiresAt,
    certificateAvailable: false,
  };

  const { db } = getFirebaseServices();
  await Promise.all([
    setDoc(doc(db, "users", input.userId, "enrollments", courseId), { ...enrollment, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }, { merge: true }),
    setDoc(doc(db, "enrollments", input.userId + "_" + courseId), { ...enrollment, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }, { merge: true }),
  ]);
  return enrollment;
}
