# Kakao Direct OAuth Setup

이 프로젝트는 더 이상 Supabase Kakao provider를 사용하지 않습니다.
이제 카카오 로그인은 Cloudflare Worker에서 직접 처리하고, 로그인 직후 Supabase DB에 회원 프로필을 저장합니다.

## 1. Kakao Developers 설정

필수 설정:

- `카카오 로그인 > 활성화 설정`: ON
- `카카오 로그인 > Redirect URI`: Worker 콜백 주소 등록
- `카카오 로그인 > Logout Redirect URI`: Worker 로그아웃 콜백 주소 등록
- `카카오 로그인 > OpenID Connect`: 현재 필수 아님

등록해야 하는 주소:

```text
https://reset-edu-kakao-auth.cfv47.workers.dev/api/auth/kakao/callback
https://reset-edu-kakao-auth.cfv47.workers.dev/api/logout/kakao/callback
```

동의항목:

- `profile_nickname`: 사용
- `profile_image`: 사용
- `account_email`: 현재 미사용
- `openid`: 현재 미사용

참고:

- 로그인 재인증은 Worker에서 `prompt=login`으로 요청합니다.
- 로그아웃 시 카카오 계정 브라우저 세션까지 끊으려면 Kakao Developers에 `Logout Redirect URI`가 등록되어 있어야 합니다.

## 2. Cloudflare Worker 환경 변수

로컬 개발은 `.dev.vars`를 만들고 아래 값을 입력합니다.

```text
KAKAO_REST_API_KEY=YOUR_KAKAO_REST_API_KEY
KAKAO_CLIENT_SECRET=YOUR_KAKAO_CLIENT_SECRET
KAKAO_REDIRECT_URI=http://127.0.0.1:8787/api/auth/kakao/callback
APP_BASE_URL=http://127.0.0.1:5500
SESSION_SECRET=replace_with_a_long_random_string
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
SUPABASE_PROFILE_TABLE=member_profiles
```

배포 시에는 비밀값을 코드 파일에 넣지 말고 Worker secrets 또는 1회용 환경 변수로만 사용합니다.

권장:

```bash
npx wrangler secret put KAKAO_REST_API_KEY
npx wrangler secret put KAKAO_CLIENT_SECRET
npx wrangler secret put SESSION_SECRET
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
```

일반 변수 예시:

- `APP_BASE_URL`
- `KAKAO_REDIRECT_URI`
- `SUPABASE_URL`
- `SUPABASE_PROFILE_TABLE`

## 3. Supabase 테이블 만들기

Supabase SQL Editor에서 [supabase-member-profiles.sql](./supabase-member-profiles.sql) 내용을 실행합니다.

생성/관리되는 주요 필드:

- `kakao_user_id`
- `nickname`
- `profile_image_url`
- `thumbnail_image_url`
- `raw_user_json`
- `signup_completed_at`
- `signup_count`
- `login_count`
- `last_auth_mode`
- `last_login_at`

저장 방식:

- 카카오 고유 ID 기준 upsert
- 회원가입과 로그인 흐름을 함께 추적
- 마지막 인증 방식과 누적 로그인 횟수 저장

## 4. 현재 동작 방식

1. 사용자가 `login.html` 또는 `signup.html`에서 카카오 버튼 클릭
2. Worker가 카카오 인증 시작
3. `signup` 모드면 재인증을 강제 요청
4. 로그인 성공 후 Worker가 카카오 사용자 정보 조회
5. Worker가 Supabase `member_profiles`에 upsert
6. Worker가 브라우저 세션 쿠키에 회원 추적 정보를 저장
7. 프론트는 `/api/me`로 현재 회원 상태 조회

## 5. 프론트 설정

[auth-config.js](./auth-config.js)에서 아래 값을 실제 Worker 주소로 유지합니다.

```js
window.RESET_EDU_AUTH = {
    authApiBaseUrl: 'https://reset-edu-kakao-auth.cfv47.workers.dev',
    authRedirectTo: window.location.origin + window.location.pathname,
    naverEnabled: false
};
```

실제 서비스 주소:

```text
https://zzang1.pages.dev
```

## 6. 배포 순서

1. Supabase SQL Editor에서 `supabase-member-profiles.sql` 실행
2. Worker secret 등록 확인
3. `wrangler deploy`
4. `login.html`과 `signup.html`에서 로그인 테스트
5. Supabase `member_profiles` 테이블에 행과 추적 필드가 반영되는지 확인

배포 예시:

```bash
CLOUDFLARE_API_TOKEN='YOUR_TOKEN' npx wrangler deploy
```

주의:

- API 토큰은 채팅, 코드 파일, 커밋에 남기지 않습니다.
- 노출된 토큰은 즉시 폐기 후 재발급합니다.

## 7. 테스트 체크리스트

로그인 확인:

1. `signup.html` 접속
2. `카카오로 회원가입` 클릭
3. 로그인 성공 후 회원 카드에 최근 인증, 누적 로그인, 마지막 접속 표시 확인
4. Supabase에서 `signup_count`, `login_count`, `last_auth_mode` 값 확인

로그아웃 확인:

1. `로그아웃` 클릭
2. 카카오 로그아웃 화면으로 이동하는지 확인
3. 카카오 화면에서 `서비스와 카카오계정 모두 로그아웃` 선택
4. 다시 `signup.html`에서 회원가입 클릭
5. 카카오 인증을 다시 거치는지 확인

## 8. 현재 Worker 엔드포인트

- `GET /api/auth/kakao/start`: 카카오 로그인 시작
- `GET /api/auth/kakao/callback`: 카카오 콜백 처리 및 Supabase upsert
- `GET /api/me`: 현재 로그인 사용자 조회
- `GET /api/logout`: 카카오 로그아웃 화면 또는 일반 로그아웃 시작
- `GET /api/logout/kakao/callback`: 카카오 로그아웃 후 서비스 복귀 처리
- `POST /api/logout`: 서비스 세션만 종료
