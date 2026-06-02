import { duiPreventionCourseProduct } from "@/lib/course/product";

export type RefundCalculationResult = {
  refundable: boolean;
  refundAmount: number;
  reason: string;
  unusedLessons: number;
  completedLessons: number;
  pricePerLesson: number;
};

type CalculateRefundOptions = {
  totalAmount: number;
  totalLessons: number;
  completedLessons: number;
  purchasedAt?: string | Date | null;
  expiresAt?: string | Date | null;
  certificateIssued?: boolean;
  paymentStatus?: string | null;
};

function toTime(value?: string | Date | null) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  const time = date.getTime();
  return Number.isFinite(time) ? time : null;
}

export function calculateRefundAmount({
  totalAmount,
  totalLessons,
  completedLessons,
  expiresAt,
  certificateIssued = false,
  paymentStatus = "paid",
}: CalculateRefundOptions): RefundCalculationResult {
  const safeTotalLessons = Math.max(0, Math.floor(totalLessons));
  const safeCompletedLessons = Math.min(safeTotalLessons, Math.max(0, Math.floor(completedLessons)));
  const pricePerLesson = safeTotalLessons > 0 ? Math.floor(totalAmount / safeTotalLessons) : 0;
  const unusedLessons = Math.max(0, safeTotalLessons - safeCompletedLessons);
  const refundAmount = unusedLessons * pricePerLesson;
  const expiresTime = toTime(expiresAt);

  if (paymentStatus !== "paid") {
    return { refundable: false, refundAmount: 0, reason: "결제내역이 정상 결제 상태가 아닙니다.", unusedLessons, completedLessons: safeCompletedLessons, pricePerLesson };
  }

  if (expiresTime !== null && expiresTime < Date.now()) {
    return { refundable: false, refundAmount: 0, reason: "수강기간 90일이 만료되어 환불이 제한됩니다.", unusedLessons, completedLessons: safeCompletedLessons, pricePerLesson };
  }

  if (certificateIssued) {
    return { refundable: false, refundAmount: 0, reason: "수료증이 발급되어 환불이 불가합니다.", unusedLessons, completedLessons: safeCompletedLessons, pricePerLesson };
  }

  if (safeCompletedLessons >= safeTotalLessons) {
    return { refundable: false, refundAmount: 0, reason: `전체 ${safeTotalLessons}강 수강 완료로 환불이 불가합니다.`, unusedLessons, completedLessons: safeCompletedLessons, pricePerLesson };
  }

  if (unusedLessons <= 0 || refundAmount <= 0) {
    return { refundable: false, refundAmount: 0, reason: "미수강 강의가 없어 환불이 불가합니다.", unusedLessons, completedLessons: safeCompletedLessons, pricePerLesson };
  }

  return {
    refundable: true,
    refundAmount,
    reason: safeCompletedLessons === 0 ? "전액 환불 가능" : `미수강 ${unusedLessons}강 기준 환불 가능`,
    unusedLessons,
    completedLessons: safeCompletedLessons,
    pricePerLesson,
  };
}

export function calculateDuiCourseRefund(completedLessons: number, purchasedAt?: string | Date | null, expiresAt?: string | Date | null, certificateIssued = false, paymentStatus = "paid") {
  return calculateRefundAmount({
    totalAmount: duiPreventionCourseProduct.price,
    totalLessons: duiPreventionCourseProduct.totalLessons,
    completedLessons,
    purchasedAt,
    expiresAt,
    certificateIssued,
    paymentStatus,
  });
}
