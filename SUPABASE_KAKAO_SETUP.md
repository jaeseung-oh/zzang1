# Supabase Kakao Setup

이 프로젝트는 카카오 로그인 코드가 이미 들어가 있습니다. 지금 필요한 작업은 대부분 콘솔 설정입니다.

- 로그인 버튼: [login.html](./login.html)
- 회원가입 버튼: [signup.html](./signup.html)
- 실제 카카오 OAuth 호출: [auth.js](./auth.js)
- 현재 인증 설정값: [auth-config.js](./auth-config.js)

현재 프로젝트 기준으로 이미 들어 있는 값:

- Supabase URL: `https://ghufoabtkjbizszdzies.supabase.co`
- Supabase Callback URL: `https://ghufoabtkjbizszdzies.supabase.co/auth/v1/callback`
- Redirect 복귀 방식: 현재 페이지로 복귀

## 1. 먼저 이해할 구조

흐름은 아래 순서입니다.

1. 사용자가 사이트에서 `카카오로 로그인` 버튼을 누릅니다.
2. 사이트가 Supabase에 카카오 로그인을 요청합니다.
3. Supabase가 카카오 로그인 창으로 보냅니다.
4. 카카오 로그인이 끝나면 Supabase가 다시 우리 사이트로 돌려보냅니다.
5. [auth.js](./auth.js)가 `code` 값을 세션으로 교환해서 로그인 상태를 만듭니다.

즉, 지금 해야 하는 핵심은 `Supabase`와 `Kakao Developers` 양쪽에 서로의 주소를 정확히 넣는 것입니다.

## 2. 이 프로젝트에서 이미 끝난 작업

아래는 이미 구현돼 있으니 건드리지 않아도 됩니다.

- `auth-config.js`에 Supabase URL, publishable key가 입력되어 있음
- `login.html`에 카카오 로그인 버튼이 있음
- `signup.html`에 카카오 회원가입 버튼이 있음
- `auth.js`에서 `signInWithOAuth({ provider: 'kakao' })` 호출
- 로그인 후 `exchangeCodeForSession()` 처리
- 세션 유지와 로그아웃 처리

## 3. Supabase에서 해야 할 일

### 3-1. Kakao Provider 켜기

Supabase에 로그인한 뒤 이 순서로 이동합니다.

1. 프로젝트 선택
2. 왼쪽 메뉴 `Authentication`
3. 그 아래 `Providers`
4. 목록에서 `Kakao` 클릭

여기서 아래 항목을 입력합니다.

- `Enabled`: `ON`
- `Client ID`: Kakao `REST API Key`
- `Client Secret`: Kakao `Client Secret code`
- `Allow users without email`: 이메일 동의를 못 받을 때만 `ON`

마지막에 `Save`를 누릅니다.

### 3-2. Supabase에 넣을 값 정리

Supabase의 Kakao 설정 화면에 입력할 값은 아래입니다.

- `Client ID`에는 카카오의 `REST API Key`
- `Client Secret`에는 카카오의 `Client Secret code`

주의:

- `Client Secret code`는 사이트 코드에 넣는 값이 아닙니다.
- [auth-config.js](./auth-config.js)에 넣지 말고 Supabase 콘솔에만 넣습니다.

### 3-3. Redirect URL 허용 목록 넣기

다시 Supabase에서 이 메뉴로 갑니다.

1. 왼쪽 메뉴 `Authentication`
2. `URL Configuration`

여기서 확인할 칸:

- `Site URL`
- `Redirect URLs`

입력 예시:

```text
Site URL
https://YOUR_DOMAIN
```

```text
Redirect URLs
https://YOUR_DOMAIN/login.html
https://YOUR_DOMAIN/signup.html
http://localhost:3000/login.html
http://localhost:3000/signup.html
```

이 프로젝트는 [auth-config.js](./auth-config.js)에서 아래처럼 현재 페이지 주소로 돌아오게 되어 있습니다.

```js
authRedirectTo: window.location.origin + window.location.pathname
```

그래서 `login.html`과 `signup.html` 주소 둘 다 허용 목록에 넣어야 합니다.

## 4. Kakao Developers에서 해야 할 일

### 4-1. 앱 선택 또는 새로 만들기

카카오디벨로퍼스에 로그인한 뒤:

1. `내 애플리케이션`
2. 사용할 앱 클릭

앱이 없으면 새로 만듭니다.

1. `내 애플리케이션`
2. `애플리케이션 추가하기`
3. 앱 이름 입력
4. 회사명 또는 서비스명 입력
5. 저장

### 4-2. REST API Key 찾기

앱 안에서 이 경로로 이동합니다.

1. 왼쪽 메뉴 `앱 설정`
2. `앱 키`

이 화면에서 `REST API 키`를 찾습니다.

이 값을 복사해서 Supabase의 `Client ID` 칸에 넣습니다.

### 4-3. Client Secret code 찾기

초보자가 가장 자주 헷갈리는 부분입니다. 같은 카카오 앱 안에서 아래 순서로 이동합니다.

1. 왼쪽 메뉴 `앱 설정`
2. `앱 키`
3. `REST API 키`가 보이는 화면 아래쪽에서 `Client Secret` 영역 찾기
4. `생성` 또는 `Generate` 클릭
5. 생성된 `Code` 복사
6. `활성화` 또는 `Activation`을 `ON`
7. `저장`

이 값이 Supabase에 넣는 `Kakao Login Client Secret code`입니다.

### 4-4. 카카오 로그인 켜기

왼쪽 메뉴에서:

1. `제품 설정`
2. `카카오 로그인`

여기서 `활성화 설정` 또는 `State`를 `ON`으로 바꿉니다.

이게 꺼져 있으면 로그인 시도 자체가 실패합니다.

### 4-5. Redirect URI 등록

카카오 앱에서 아래 경로로 이동합니다.

1. 왼쪽 메뉴 `앱 설정`
2. `앱 키`
3. `Redirect URI` 설정 영역 찾기

여기에 아래 주소를 등록합니다.

```text
https://ghufoabtkjbizszdzies.supabase.co/auth/v1/callback
```

로컬 테스트도 할 예정이면 이것도 추가합니다.

```text
http://localhost:54321/auth/v1/callback
```

주의:

- 여기에는 `내 사이트 주소`가 아니라 `Supabase callback 주소`를 넣습니다.
- 이 값을 틀리게 넣으면 로그인 후 되돌아오지 못합니다.

### 4-6. OpenID Connect 켜기

카카오 앱에서:

1. 왼쪽 메뉴 `제품 설정`
2. `카카오 로그인`
3. `OpenID Connect`

여기서 `활성화`를 `ON`으로 바꿉니다.

이 프로젝트는 `openid` scope를 사용하므로 이 설정이 필요합니다.

### 4-7. 동의항목 설정

카카오 앱에서:

1. 왼쪽 메뉴 `제품 설정`
2. `카카오 로그인`
3. `동의항목`

여기서 아래 항목을 확인합니다.

- `닉네임` (`profile_nickname`)
- `프로필 사진` (`profile_image`)
- `카카오계정(이메일)` (`account_email`)
- `openid`

현재 코드 기준 요청 scope:

```text
openid profile_nickname profile_image account_email
```

주의:

- `account_email`은 앱 상태나 심사 상태에 따라 제한될 수 있습니다.
- 이메일 동의를 못 받는다면 Supabase에서 `Allow users without email`을 켜는 방법이 있습니다.

## 5. 현재 auth-config.js 상태

이미 아래 값이 들어가 있습니다.

```js
window.RESET_EDU_AUTH = {
  supabaseUrl: 'https://ghufoabtkjbizszdzies.supabase.co',
  supabasePublishableKey: 'sb_publishable_LJW8MAdC9dTcmoO0dHqFNQ_qDqS5NdO',
  authRedirectTo: window.location.origin + window.location.pathname,
  storageKey: 'reset-edu-auth',
  kakaoScopes: 'openid profile_nickname profile_image account_email'
};
```

즉, 지금 코드 파일에서 추가로 넣어야 할 값은 거의 없습니다.

## 6. 실제 테스트 순서

모든 설정을 저장한 뒤 이 순서로 테스트합니다.

1. 사이트의 `login.html` 접속
2. `카카오로 로그인` 버튼 클릭
3. 카카오 로그인 화면으로 이동하는지 확인
4. 로그인 또는 동의 완료
5. 다시 `login.html`로 돌아오는지 확인
6. 로그인 카드가 회원 상태로 바뀌는지 확인

회원가입도 같은 방식으로 `signup.html`에서 테스트할 수 있습니다.

## 7. 가장 자주 나는 실수

### 7-1. Client Secret을 코드에 넣는 실수

하지 말아야 할 것:

- `auth-config.js`에 Client Secret 입력
- HTML/JS 파일에 Client Secret 노출

정답:

- Client Secret은 Supabase 콘솔의 `Authentication > Providers > Kakao > Client Secret` 칸에만 입력

### 7-2. Redirect URI를 내 사이트 주소로 넣는 실수

카카오 콘솔에는 아래 주소를 넣어야 합니다.

```text
https://ghufoabtkjbizszdzies.supabase.co/auth/v1/callback
```

`https://내도메인.com/login.html` 같은 주소는 카카오가 아니라 Supabase의 `Redirect URLs`에 넣는 값입니다.

### 7-3. OpenID Connect를 안 켜는 실수

이 프로젝트는 `openid` scope를 사용하므로 Kakao Developers에서 `OpenID Connect`를 켜야 합니다.

## 8. 네이버 관련

현재 이 프로젝트는 Supabase 호스티드 Auth 기준으로 카카오까지 구현돼 있습니다.
네이버는 Supabase 기본 provider가 아니라서 아래 중 하나가 추가로 필요합니다.

- Auth0 같은 외부 브로커
- WorkOS 같은 외부 브로커
- 네이버 OAuth를 중계하는 별도 백엔드

## 9. 공식 문서

- Supabase Kakao Auth: https://supabase.com/docs/guides/auth/social-login/auth-kakao
- Supabase Redirect URLs: https://supabase.com/docs/guides/auth/redirect-urls
- Kakao Login prerequisites: https://developers.kakao.com/docs/latest/ko/kakaologin/prerequisite
- Kakao consent items: https://developers.kakao.com/docs/latest/ko/kakaologin/utilize
