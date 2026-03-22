# Cloudflare Pages Deploy

현재 프론트엔드는 Next.js 정적 export 방식으로 배포하도록 맞췄습니다.

## Cloudflare Pages 설정값

- Framework preset: `Next.js`
- Build command: `npm run build`
- Build output directory: `out`
- Root directory: `/`

## 필수 환경 변수

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

## 주의

- `app/ai-draft`는 정적 페이지로 배포되며, 실제 초안 생성 호출은 Firebase Functions에 연결됩니다.
- Cloudflare Pages에 위 `NEXT_PUBLIC_*` 값이 없으면 브라우저에서 AI 도우미 호출 시 오류가 납니다.
- 프론트 배포와 Firebase Functions 배포는 별도입니다.
