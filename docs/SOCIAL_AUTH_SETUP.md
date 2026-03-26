# Social Auth Setup

이 프로젝트의 소셜 로그인은 Cloudflare Worker가 직접 처리합니다.
현재 카카오와 네이버를 모두 지원합니다.

## Worker 환경 변수

필수 공통 값:

```text
APP_BASE_URL=https://YOUR_APP_DOMAIN
SESSION_SECRET=replace_with_a_long_random_string
```

카카오:

```text
KAKAO_REST_API_KEY=YOUR_KAKAO_REST_API_KEY
KAKAO_CLIENT_SECRET=YOUR_KAKAO_CLIENT_SECRET
KAKAO_REDIRECT_URI=https://YOUR_WORKER_DOMAIN/api/auth/kakao/callback
```

네이버:

```text
NAVER_CLIENT_ID=YOUR_NAVER_CLIENT_ID
NAVER_CLIENT_SECRET=YOUR_NAVER_CLIENT_SECRET
NAVER_REDIRECT_URI=https://YOUR_WORKER_DOMAIN/api/auth/naver/callback
```

프로필 저장을 쓸 경우:

```text
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
SUPABASE_PROFILE_TABLE=member_profiles
```

## 카카오 Developers 설정

- `카카오 로그인 > 활성화 설정`: ON
- `카카오 로그인 > Redirect URI`:
  - `https://YOUR_WORKER_DOMAIN/api/auth/kakao/callback`
- `카카오 로그인 > Logout Redirect URI`:
  - `https://YOUR_WORKER_DOMAIN/api/logout/kakao/callback`

권장 동의 항목:

- `profile_nickname`
- `profile_image`

## 네이버 Developers 설정

애플리케이션에 아래 Callback URL을 등록합니다.

```text
https://YOUR_WORKER_DOMAIN/api/auth/naver/callback
```

네이버는 카카오처럼 서비스 외부 계정 로그아웃 리다이렉트를 별도로 제공하지 않으므로,
현재 구현은 서비스 세션 로그아웃 중심으로 처리합니다.

## DB 마이그레이션

`supabase-member-profiles.sql`을 다시 실행해야 합니다.
이제 사용자 식별은 `provider + provider_user_id` 기준으로 저장됩니다.

## 프론트 설정

정적 페이지는 `auth-config.js`의 Worker 주소를 실제 배포 주소로 유지해야 합니다.

```js
window.RESET_EDU_AUTH = {
    authApiBaseUrl: 'https://YOUR_WORKER_DOMAIN',
    authRedirectTo: window.location.origin + window.location.pathname,
    naverEnabled: true
};
```
