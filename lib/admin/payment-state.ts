export type AdminPaymentRecord = Record<string, any>;

const paidStatuses = new Set(["paid", "completed", "complete", "success", "approved", "done", "paid_success", "payment_success"]);
const failedStatuses = new Set(["failed", "fail", "error", "verification_failed", "verify_failed"]);
const attemptStatuses = new Set(["pending", "payment_attempt", "attempt", "requested", "ready", "awaiting_deposit", "virtual_account_issued", "deposit_waiting"]);
const notPaidStatuses = new Set(["failed", "fail", "error", "verification_failed", "verify_failed", "pending", "payment_attempt", "attempt", "requested", "ready", "awaiting_deposit", "virtual_account_issued", "deposit_waiting", "cancelled", "canceled", "refunded"]);

function parseDateTime(value: any) {
  if (!value) return null;
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value : null;
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isFinite(parsed.getTime()) ? parsed : null;
  }
  if (typeof value === "object" && typeof value.seconds === "number") return new Date(value.seconds * 1000);
  return null;
}

function getRawStatus(row?: AdminPaymentRecord | null) {
  return String(row?.paymentStatus || row?.status || row?.orderStatus || row?.rawResponse?.status || "").toLowerCase();
}

export function isPaidRecord(row?: AdminPaymentRecord | null) {
  const status = getRawStatus(row);
  const paymentState = String(row?.paymentState || row?.state || "").trim().toLowerCase();
  const rawStatus = String(row?.rawResponse?.status || row?.rawResponse?.paymentStatus || "").toUpperCase();
  const hasPaidTime = Boolean(row?.approvedAt || row?.paidAt || row?.paymentApprovedAt || row?.paid_at);
  const hasPaidAmount = Number(row?.paidAmount || row?.amount || row?.totalAmount || 0) > 0;
  const hardBlocked = ["failed", "fail", "error", "verification_failed", "verify_failed", "cancelled", "canceled", "refunded"].includes(status)
    || paymentState.includes("환불") || paymentState.includes("취소") || paymentState.includes("실패");
  if (hardBlocked) return false;
  if (notPaidStatuses.has(status) && !hasPaidTime && rawStatus !== "PAID" && !paymentState.includes("결제완료") && paymentState !== "성공" && !paymentState.includes("success")) return false;
  return paidStatuses.has(status)
    || rawStatus === "PAID"
    || paymentState.includes("결제완료")
    || paymentState === "성공"
    || paymentState.includes("success")
    || hasPaidTime
    || Boolean(row?.receiptUrl)
    || Boolean(row?.completedAt && hasPaidAmount);
}

export function isFailedPayment(row?: AdminPaymentRecord | null) {
  const status = getRawStatus(row);
  return failedStatuses.has(status) || Boolean(row?.errorCode || row?.errorMessage || row?.failureCode || row?.failureMessage);
}

export function isRefundRecord(row?: AdminPaymentRecord | null) {
  const status = String(row?.refundStatus || row?.paymentStatus || row?.status || row?.cancelStatus || "").toLowerCase();
  return status.includes("refund") || status === "cancelled" || status === "canceled" || Boolean(row?.refundedAt || row?.refundRequestedAt || row?.cancelledAt || row?.canceledAt);
}

export function isPaymentAttemptRecord(row?: AdminPaymentRecord | null) {
  if (!row) return false;
  const status = getRawStatus(row);
  return attemptStatuses.has(status) || Boolean(row.attemptedAt || row.requestedAt || row.orderedAt || row.createdAt || row.paymentId || row.orderId || row.paymentKey);
}

export function getPaymentRecordKey(row?: AdminPaymentRecord | null) {
  return String(row?.paymentId || row?.orderId || row?.paymentKey || row?.merchantUid || row?.id || "").trim();
}

export function getPaymentTime(row?: AdminPaymentRecord | null) {
  return row?.approvedAt || row?.paidAt || row?.refundedAt || row?.refundRequestedAt || row?.failedAt || row?.attemptedAt || row?.orderedAt || row?.createdAt || row?.updatedAt;
}

export function getPaymentFinalityRank(row?: AdminPaymentRecord | null) {
  if (isRefundRecord(row)) return 4;
  if (isPaidRecord(row)) return 3;
  if (isPaymentAttemptRecord(row)) return 2;
  if (isFailedPayment(row)) return 1;
  return 0;
}

export function chooseCanonicalPaymentRecord(current: AdminPaymentRecord, next: AdminPaymentRecord) {
  const currentRank = getPaymentFinalityRank(current);
  const nextRank = getPaymentFinalityRank(next);
  if (nextRank !== currentRank) return nextRank > currentRank ? next : current;
  const currentTime = parseDateTime(getPaymentTime(current))?.getTime() || 0;
  const nextTime = parseDateTime(getPaymentTime(next))?.getTime() || 0;
  if (nextTime !== currentTime) return nextTime > currentTime ? next : current;
  const sourcePriority: Record<string, number> = { payments: 0, purchases: 1, orders: 2, userSummary: 3 };
  return (sourcePriority[next.recordSource] ?? 9) < (sourcePriority[current.recordSource] ?? 9) ? next : current;
}

export function getPaymentStatusText(row?: AdminPaymentRecord | null) {
  if (!row) return "미결제";
  const status = getRawStatus(row);
  if (isRefundRecord(row)) return status.includes("refund") ? "환불완료" : "결제취소";
  if (["awaiting_deposit", "virtual_account_issued", "ready", "deposit_waiting"].includes(status) || row.virtualAccount || row.vbankIssuedAt) return "입금대기";
  if (isPaidRecord(row)) return "결제완료";
  if (isPaymentAttemptRecord(row)) return "결제시도";
  if (isFailedPayment(row)) return "결제실패";
  return "미결제";
}

export function hasPaymentAttempt(payments: AdminPaymentRecord[], logs: AdminPaymentRecord[] = []) {
  if (payments.some(isPaymentAttemptRecord)) return true;
  return logs.some((row) => {
    const type = String(row.type || row.action || row.status || "").toLowerCase();
    return type.includes("attempt") || type.includes("order") || type.includes("payment") || type.includes("created");
  });
}

export function getMemberPaymentState(payments: AdminPaymentRecord[], logs: AdminPaymentRecord[] = [], options?: { loaded?: boolean }) {
  if (payments.some(isRefundRecord)) return "환불요청/완료";
  if (payments.some(isPaidRecord)) return "결제완료";
  if (hasPaymentAttempt(payments, logs)) return "결제시도";
  if (payments.some(isFailedPayment) || logs.some((row) => String(row.type || row.action || row.status || "").toLowerCase().includes("fail"))) return "결제실패";
  if (options?.loaded === false) return "로딩 중";
  return "미결제";
}

export function getPaymentState(payments: AdminPaymentRecord[]) {
  if (payments.some(isRefundRecord)) return "환불요청/완료";
  if (payments.some(isPaidRecord)) return "결제완료";
  if (payments.some(isPaymentAttemptRecord)) return "결제시도";
  if (payments.some(isFailedPayment)) return "결제실패";
  return payments.length ? "결제시도" : "미결제";
}

export function getPaymentSuccessState(payments: AdminPaymentRecord[]) {
  if (payments.some(isPaidRecord)) return "성공";
  if (payments.some(isPaymentAttemptRecord)) return "진행중";
  if (payments.some(isFailedPayment)) return "실패";
  return payments.length ? "미성공" : "기록 없음";
}

export function getPaymentAttemptStats(payments: AdminPaymentRecord[], logs: AdminPaymentRecord[]) {
  const attemptKeys = new Set<string>();
  payments.forEach((row) => { const key = getPaymentRecordKey(row) || row.id; if (key) attemptKeys.add(key); });
  logs.forEach((row) => { const type = String(row.type || row.action || row.status || "").toLowerCase(); if (type.includes("attempt") || type.includes("order_created") || type.includes("created")) attemptKeys.add(getPaymentRecordKey(row) || row.id); });
  const success = payments.filter(isPaidRecord).length;
  const failed = payments.filter(isFailedPayment).length + logs.filter((row) => String(row.type || row.action || row.status || "").toLowerCase().includes("failed")).length;
  const totalPaidAmount = payments.filter(isPaidRecord).reduce((sum, row) => sum + Number(row.amount || row.paidAmount || 0), 0);
  return { attempts: attemptKeys.size || payments.length, success, failed, totalPaidAmount };
}

export function buildAdminPaymentSummary(row: AdminPaymentRecord | null | undefined) {
  if (!row) return null;
  return {
    paymentState: getPaymentStatusText(row),
    paymentStatus: row.paymentStatus || row.status || null,
    paymentId: row.paymentId || row.paymentKey || row.orderId || null,
    orderId: row.orderId || row.paymentId || null,
    productId: row.productId || null,
    courseId: row.canonicalCourseId || row.courseId || null,
    courseTitle: row.courseTitle || row.productTitle || row.orderName || null,
    productTitle: row.productTitle || row.courseTitle || row.orderName || null,
    amount: Number(row.amount || row.paidAmount || 0),
    method: row.method || row.payMethod || row.paymentMethod || null,
    paidAt: row.approvedAt || row.paidAt || null,
    lastPaymentAt: getPaymentTime(row) || null,
    updatedAt: row.updatedAt || row.createdAt || null,
  };
}
