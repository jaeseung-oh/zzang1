# Supabase Kakao Setup

## 1. auth-config.js 입력

[auth-config.js](./auth-config.js)에 아래 값을 넣습니다.

- supabaseUrl: Supabase 프로젝트 URL
- supabasePublishableKey: Supabase publishable key
- authRedirectTo: 기본값 그대로 사용 가능

예시:

```js
window.RESET_EDU_AUTH = {
  supabaseUrl: 'https://YOUR_PROJECT_REF.supabase.co',
  supabasePublishableKey: 'YOUR_SUPABASE_PUBLISHABLE_KEY',
  authRedirectTo: window.location.origin + window.location.pathname,
  storageKey: 'reset-edu-auth',
  kakaoScopes: 'openid profile_nickname profile_image account_email'
};
```

## 2. Supabase에서 Kakao 활성화

Supabase Dashboard > Authentication > Providers > Kakao

입력값:

- Kakao Enabled: ON
- Client ID: Kakao REST API Key
- Client Secret: Kakao Login Client Secret code
- Allow users without email: Kakao에서 account_email 동의를 안 받을 경우만 ON

## 3. Kakao Developers 설정

Kakao Developers에서 앱을 생성한 뒤 아래를 설정합니다.

- REST API Key 확인
- Kakao Login 활성화: ON
- OpenID Connect 활성화: ON
- Redirect URI 등록: https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback

동의 항목:

- openid
- profile_nickname
- profile_image
- account_email

참고:

- account_email은 Kakao 비즈 앱 전환이 필요할 수 있습니다.
- 로컬 개발 시 Redirect URI는 http://localhost:54321/auth/v1/callback 도 추가해야 합니다.

## 4. Supabase Redirect URL 허용 목록

Supabase Dashboard > Authentication > URL Configuration 에서 실제 사이트 URL을 허용합니다.

예시:

- https://YOUR_DOMAIN/login.html
- https://YOUR_DOMAIN/signup.html
- http://localhost:3000/login.html
- http://localhost:3000/signup.html

## 5. 현재 코드 동작 방식

- [login.html](./login.html): 카카오 로그인 버튼 제공
- [signup.html](./signup.html): 카카오 회원가입 버튼 제공
- [auth.js](./auth.js): signInWithOAuth('kakao') 호출
- OAuth 리다이렉트 후 code 파라미터를 exchangeCodeForSession()으로 세션 교환
- 세션 유지 및 로그아웃 지원

## 6. 네이버 관련

현재 이 프로젝트는 Supabase 호스티드 Auth 기준으로 카카오까지 구현돼 있습니다.
네이버는 Supabase 기본 provider가 아니라서 아래 중 하나가 추가로 필요합니다.

- Auth0 같은 외부 브로커
- WorkOS 같은 외부 브로커
- 네이버 OAuth를 중계하는 별도 백엔드
