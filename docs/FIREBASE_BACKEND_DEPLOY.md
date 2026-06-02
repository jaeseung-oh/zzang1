# Firebase Backend Deploy

이 프로젝트는 프론트엔드를 Cloudflare Pages에 두고, Firebase는 Functions/Firestore/Storage 백엔드로 사용합니다.

## 1. 프로젝트 ID 연결

`.firebaserc`의 기본값을 실제 Firebase 프로젝트 ID로 바꾸세요.

```json
{
  "projects": {
    "default": "jaeseung-try-2-34973152-e44aa"
  }
}
```

## 2. Firebase 로그인

```bash
firebase login
firebase use --add
```

`firebase use --add`에서 실제 프로젝트를 선택하고 `default`로 연결하면 됩니다.

## 3. Functions 환경 변수

Toss 결제 승인에는 `TOSS_SECRET_KEY`가 필요합니다. 결제사 심사 완료 후 발급받은 운영 시크릿 키를 Firebase Functions 환경변수 또는 Secret으로 등록하세요.

```bash
firebase functions:secrets:set OPENAI_API_KEY
firebase functions:secrets:set TOSS_SECRET_KEY
```

## 4. Functions 배포

```bash
firebase deploy --only functions
```

배포 후 `confirmPayment` URL 예시:

```text
https://asia-northeast3-jaeseung-try-2-34973152-e44aa.cloudfunctions.net/confirmPayment
```

## 5. Cloudflare Pages 환경 변수

Cloudflare Pages에 아래 값을 넣어야 결제 성공 페이지가 Firebase Function을 호출할 수 있습니다. 결제사 심사 중에는 테스트 클라이언트 키를 넣어 위젯 렌더링을 확인하고, 심사 완료 후 운영 클라이언트 키로 교체하면 됩니다.

```text
NEXT_PUBLIC_APP_ORIGIN=https://resetedu.kr
NEXT_PUBLIC_TOSS_WIDGET_CLIENT_KEY=토스_결제위젯_클라이언트키
NEXT_PUBLIC_TOSS_CONFIRM_URL=https://asia-northeast3-jaeseung-try-2-34973152-e44aa.cloudfunctions.net/confirmPayment
NEXT_PUBLIC_TOSS_PAYMENT_METHOD_VARIANT_KEY=DEFAULT
NEXT_PUBLIC_TOSS_AGREEMENT_VARIANT_KEY=DEFAULT
```

## 6. Firestore / Storage Rules 배포

```bash
firebase deploy --only firestore:rules,storage
```

## 7. 테스트 흐름

1. Toss 결제 성공 후 `/payment/success?paymentKey=...&orderId=...&amount=...&courseId=...` 로 이동
2. 프론트가 `confirmPayment` 호출
3. Firebase Function이 Toss 승인 API 호출
4. Firestore `purchases/{orderId}` 저장
5. 승인 완료 화면과 영수증 링크 표시

## 8. 운영 전 결제 점검표

- Cloudflare Pages: `NEXT_PUBLIC_APP_ORIGIN`을 `https://resetedu.kr`로 설정
- Cloudflare Pages: `NEXT_PUBLIC_TOSS_WIDGET_CLIENT_KEY`를 토스 운영 클라이언트 키로 설정
- Firebase Functions: `TOSS_SECRET_KEY`를 토스 운영 시크릿 키로 설정
- Toss 상점관리자: 결제위젯 variant `DEFAULT`에 카드, 계좌이체, 가상계좌, 간편결제 노출 여부 설정
- Toss 상점관리자: 성공 URL `https://resetedu.kr/payment/success`, 실패 URL `https://resetedu.kr/payment/fail` 도메인 허용
- 상품 금액: 프론트와 Functions 모두 `55,000원` 기준인지 확인
- 수강 유효기간: 결제 저장 시 `accessValidMonths: 3` 및 `expiresAt` 생성 확인
