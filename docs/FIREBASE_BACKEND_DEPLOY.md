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

현재 `functions/src/index.ts`에는 테스트용 Toss 시크릿 키가 직접 들어 있습니다.
운영 전에는 Firebase Secret 또는 환경 변수로 분리해야 합니다.

OpenAI 키는 예시:

```bash
firebase functions:secrets:set OPENAI_API_KEY
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

Cloudflare Pages에 아래 값을 넣어야 결제 성공 페이지가 Firebase Function을 호출할 수 있습니다.

```text
NEXT_PUBLIC_TOSS_CONFIRM_URL=https://asia-northeast3-jaeseung-try-2-34973152-e44aa.cloudfunctions.net/confirmPayment
```

## 6. Firestore / Storage Rules 배포

```bash
firebase deploy --only firestore:rules,storage
```

## 7. 테스트 흐름

1. Toss 결제 성공 후 `/payment/success?paymentKey=...&orderId=...&amount=...` 로 이동
2. 프론트가 `confirmPayment` 호출
3. Firebase Function이 Toss 승인 API 호출
4. Firestore `purchases/{orderId}` 저장
5. 승인 완료 화면과 영수증 링크 표시
