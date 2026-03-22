# Kakao Direct OAuth Setup

이 프로젝트는 더 이상 Supabase Kakao provider를 사용하지 않습니다.
이제 카카오 로그인은 Cloudflare Worker에서 직접 처리합니다.

## 1. 카카오 Developers 설정

필수 설정:

- `카카오 로그인 > 사용 설정`: ON
- `카카오 로그인 > OpenID Connect`: OFF 가능
- `앱 설정 > 앱 키 > REST API 키 > Redirect URI`

Redirect URI는 Worker 콜백 주소로 등록해야 합니다.

```text
https://reset-edu-kakao-auth.cfv47.workers.dev/api/auth/kakao/callback
```

동의항목:

- `profile_nickname`: 선택 동의
- `profile_image`: 선택 동의
- `account_email`: 사용하지 않음
- `openid`: 사용하지 않음

## 2. Cloudflare Worker 환경 변수

로컬 개발은 `.dev.vars`를 만들고 아래 값을 입력합니다.

```text
KAKAO_REST_API_KEY=YOUR_KAKAO_REST_API_KEY
KAKAO_CLIENT_SECRET=YOUR_KAKAO_CLIENT_SECRET
KAKAO_REDIRECT_URI=http://127.0.0.1:8787/api/auth/kakao/callback
APP_BASE_URL=http://127.0.0.1:5500
SESSION_SECRET=replace_with_a_long_random_string
```

배포 시에는 Wrangler secrets 또는 환경 변수로 넣습니다.

## 3. 프론트 설정

`auth-config.js`에서 아래 값을 실제 Worker 주소로 바꿉니다.

```js
window.RESET_EDU_AUTH = {
    authApiBaseUrl: 'https://reset-edu-kakao-auth.cfv47.workers.dev'
};
```

GitHub Pages를 쓰는 경우 `APP_BASE_URL`은 실제 GitHub Pages 주소와 같아야 합니다.

예:

```text
https://jaeseung-oh.github.io/zzang1
```

## 4. 배포 순서

1. `wrangler login`
2. `.dev.vars` 생성
3. `wrangler deploy`
4. 카카오 Redirect URI를 배포된 Worker 콜백 주소로 수정
5. `auth-config.js`의 `authApiBaseUrl`을 배포된 Worker 주소로 수정
6. GitHub Pages 반영 후 `/login.html`에서 테스트

## 5. 현재 Worker 엔드포인트

- `GET /api/auth/kakao/start`: 카카오 로그인 시작
- `GET /api/auth/kakao/callback`: 카카오 콜백 처리
- `GET /api/me`: 현재 로그인 사용자 조회
- `POST /api/logout`: 로그아웃
