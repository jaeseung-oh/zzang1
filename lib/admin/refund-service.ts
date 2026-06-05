export type RefundRequestInput = {
  paymentId: string;
  refundAmount: number;
  reason: string;
};

export async function requestRefund(_input: RefundRequestInput) {
  return {
    ok: false,
    disabled: true,
    message: "실제 환불 처리는 PG사 관리자 페이지 또는 환불 API 연동 후 가능합니다.",
  };
}
