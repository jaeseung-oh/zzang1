export type PaymentMethod = "kakaopay" | "danal-mobile" | "card";

export interface PaymentRequest {
  orderId: string;
  categoryId: string;
  categoryTitle: string;
  productId: string;
  productTitle: string;
  price: number;
  paymentMethod: PaymentMethod;
  buyerName?: string;
  buyerPhone?: string;
  buyerEmail?: string;
}

export type PaymentResult = {
  success: boolean;
  method: PaymentMethod;
  message: string;
  orderId: string;
};

export async function requestPayment(data: PaymentRequest): Promise<PaymentResult> {
  switch (data.paymentMethod) {
    case "kakaopay":
      return requestKakaoPay(data);
    case "danal-mobile":
      return requestDanalMobilePayment(data);
    case "card":
      return requestCardPayment(data);
    default:
      throw new Error("지원하지 않는 결제수단입니다.");
  }
}

async function requestKakaoPay(data: PaymentRequest): Promise<PaymentResult> {
  console.log("카카오페이 결제 요청", data);

  // TODO:
  // 1. 백엔드 API /api/payments/kakaopay/ready 호출
  // 2. orderId, itemName, amount 전달
  // 3. 카카오페이 결제 준비 응답으로 받은 redirect URL로 이동
  // 4. 결제 완료 후 /payment/success 페이지로 이동
  // 5. 실제 결제 금액은 프론트엔드 값만 신뢰하면 안 되며 백엔드에서 상품 정보와 함께 검증해야 함
  // 6. 결제 승인 결과는 반드시 서버에서 PG사 API로 검증해야 함
  // 7. 결제 성공 후 수강권 부여는 서버 검증 이후 처리해야 함
  // 8. 카카오페이는 PG사 계약 및 심사 완료 후 실제 API 키로 연동해야 함

  return {
    success: true,
    method: "kakaopay",
    message: "카카오페이 결제 요청 mock 완료",
    orderId: data.orderId,
  };
}

async function requestDanalMobilePayment(data: PaymentRequest): Promise<PaymentResult> {
  console.log("다날 핸드폰결제 요청", data);

  // TODO:
  // 1. 백엔드 API /api/payments/danal/mobile/request 호출
  // 2. 다날 결제창 호출에 필요한 파라미터 수신
  // 3. 다날 결제창 또는 redirect URL 실행
  // 4. 결제 완료 후 /payment/success 페이지로 이동
  // 5. 실제 결제 금액은 프론트엔드 값만 신뢰하면 안 되며 백엔드에서 상품 정보와 함께 검증해야 함
  // 6. 결제 승인 결과는 반드시 서버에서 PG사 API로 검증해야 함
  // 7. 결제 성공 후 수강권 부여는 서버 검증 이후 처리해야 함
  // 8. 다날 핸드폰결제는 PG사 계약 및 심사 완료 후 실제 API 키로 연동해야 함

  return {
    success: true,
    method: "danal-mobile",
    message: "다날 핸드폰결제 요청 mock 완료",
    orderId: data.orderId,
  };
}

async function requestCardPayment(data: PaymentRequest): Promise<PaymentResult> {
  console.log("신용카드 결제 요청", data);

  // TODO:
  // 1. 백엔드 API /api/payments/card/request 호출
  // 2. 카드 PG 결제창 호출
  // 3. 결제 승인 결과 확인
  // 4. 결제 완료 후 /payment/success 페이지로 이동
  // 5. 실제 결제 금액은 프론트엔드 값만 신뢰하면 안 되며 백엔드에서 상품 정보와 함께 검증해야 함
  // 6. 결제 승인 결과는 반드시 서버에서 PG사 API로 검증해야 함
  // 7. 결제 성공 후 수강권 부여는 서버 검증 이후 처리해야 함
  // 8. 카드결제는 PG사 계약 및 심사 완료 후 실제 API 키로 연동해야 함

  return {
    success: true,
    method: "card",
    message: "신용카드 결제 요청 mock 완료",
    orderId: data.orderId,
  };
}
