# Payment Backend Deploy

이 프로젝트는 프론트엔드를 Cloudflare Pages에 두고, 결제 승인/수강권 발급은 Cloudflare Worker에서 처리합니다. Firebase Functions Blaze 업그레이드를 피하기 위해 결제 승인 로직은 Worker `/api/payments/confirm`으로 이동했습니다.

## 1. 유료교육 상품

- courseId: `dui-prevention-basic`
- 상품명: `음주운전 예방교육`
- 결제금액: 상품별 실제 결제금액
- 강의 수: `총 5강`
- 수강기간: `결제일로부터 90일`
- 환불 산정 기준: `실제 결제금액 × 미수강 강의 수 / 전체 강의 수`
- 설정 위치: `lib/course/product.ts`

## 2. Cloudflare Pages 환경 변수

```text
NEXT_PUBLIC_AUTH_API_BASE_URL=https://reset-edu-kakao-auth.cfv47.workers.dev
NEXT_PUBLIC_PAYMENT_PROVIDER=toss-payments
NEXT_PUBLIC_PAYMENT_CLIENT_KEY=토스_결제위젯_클라이언트키
NEXT_PUBLIC_PAYMENT_CONFIRM_URL=https://reset-edu-kakao-auth.cfv47.workers.dev/api/payments/confirm
NEXT_PUBLIC_SITE_URL=https://resetedu.kr
NEXT_PUBLIC_TOSS_PAYMENT_METHOD_VARIANT_KEY=DEFAULT
NEXT_PUBLIC_TOSS_AGREEMENT_VARIANT_KEY=DEFAULT
```

Next.js 브라우저 코드는 `NEXT_PUBLIC_*`를 사용합니다. `VITE_PAYMENT_CLIENT_KEY`, `VITE_PAYMENT_PROVIDER`, `VITE_SITE_URL`은 다른 빌드 도구로 옮길 때 사용할 호환 이름으로 `.env.example`에만 병기했습니다.

## 3. Cloudflare Worker secrets

아래 값은 프론트엔드에 노출하지 말고 Worker secret으로 등록합니다.

```bash
npx wrangler secret put PAYMENT_SECRET_KEY --config wrangler.worker.toml
npx wrangler secret put FIREBASE_CLIENT_EMAIL --config wrangler.worker.toml
npx wrangler secret put FIREBASE_PRIVATE_KEY --config wrangler.worker.toml
npx wrangler secret put ADMIN_API_KEY --config wrangler.worker.toml
```

Worker 공개 vars는 `wrangler.worker.toml`에 있습니다.

- `FIREBASE_PROJECT_ID`
- `FIREBASE_WEB_API_KEY`
- `PAYMENT_PROVIDER`

## 4. 결제 성공 흐름

1. 사용자가 `/checkout`에서 환불규정 및 수강기간 90일 제한에 동의
2. Toss 결제위젯 결제창 호출
3. 성공 시 `/payment/success?paymentKey=...&orderId=...&amount=...&courseId=dui-prevention-basic` 이동
4. 성공 페이지가 Firebase ID 토큰과 함께 Worker `/api/payments/confirm` 호출
5. Worker가 로그인 uid와 요청 uid 일치 확인
6. Worker가 courseId/productId 기준 실제 결제금액을 재검증
7. Worker가 Toss 승인 API를 Secret Key로 서버 측 호출
8. 승인 성공 시 Firestore `payments`, `enrollments`, 기존 호환용 `purchases` 저장
9. `expiresAt = purchasedAt + 90일` 저장
10. 결제 완료 페이지에서 즉시 수강 가능 안내 표시

## 5. Firestore 저장 구조

- `payments/{orderId}`: 결제 승인 원장
- `enrollments/{userId_courseId}`: 수강권 및 90일 만료 정보
- `purchases/{orderId}`: 기존 수강실/수료증 호환용 구매 정보
- `paymentKeys/{paymentKey}`: paymentKey 중복 승인 방지 마커
- `refundPolicies/{courseId}`: 심사용 환불정책 설정
- `paymentLogs/{orderId_timestamp}`: 승인 또는 DB 저장 실패 재처리 로그

## 6. 운영 전 결제 점검표

- Toss 상점관리자: 결제위젯 variant `DEFAULT`에 신용카드, 휴대폰결제, 카카오페이 노출 설정
- 결제사 계약/심사: 휴대폰결제는 다날 계약 및 승인 확인
- 결제사 계약/심사: 카카오페이 계약 및 승인 확인
- Cloudflare Pages: `NEXT_PUBLIC_PAYMENT_CLIENT_KEY` 운영 키 설정
- Cloudflare Worker: `PAYMENT_SECRET_KEY` 운영 Secret Key 설정
- Cloudflare Worker: Firebase 서비스 계정 secrets 설정
- Cloudflare Worker: `ADMIN_API_KEY` 설정 후 `/admin/payments` 내부 확인
- 상품 금액: `59,000원`
- 수강기간: `90일`
- 환불표: `실제 결제금액 × 미수강 강의 수 / 전체 강의 수`

## 7. 테스트

세부 테스트 항목은 `docs/PAYMENT_TEST_CHECKLIST.md`를 확인합니다.
