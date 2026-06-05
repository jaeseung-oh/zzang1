export const duiPreventionCourseProduct = {
  courseId: "dui-prevention-basic",
  courseTitle: "음주운전 예방교육",
  price: 55000,
  currency: "KRW",
  durationDays: 90,
  totalLessons: 5,
  description: "음주운전의 위험성과 법적 책임, 재범 예방을 위한 온라인 예방교육 과정",
  certificateAvailable: true,
} as const;

export type PaidCourseProduct = typeof duiPreventionCourseProduct;

export function formatKrw(value: number) {
  return `${value.toLocaleString("ko-KR")}원`;
}

export function buildRefundRows(product: PaidCourseProduct = duiPreventionCourseProduct) {
  return Array.from({ length: product.totalLessons + 1 }, (_, completedLessons) => {
    const unusedLessons = Math.max(0, product.totalLessons - completedLessons);
    const refundAmount = Math.round((product.price * unusedLessons) / product.totalLessons);

    return {
      completedLessons,
      unusedLessons,
      refundAmount,
      note:
        completedLessons === 0
          ? "전액 환불 가능"
          : unusedLessons === 0
            ? "환불 불가"
            : `미수강 ${unusedLessons}강 기준 환불`,
    };
  });
}
