window.RESET_EDU_AUTH = {
    supabaseUrl: 'YOUR_SUPABASE_URL',
    supabasePublishableKey: 'YOUR_SUPABASE_PUBLISHABLE_KEY',
    authRedirectTo: window.location.origin + window.location.pathname,
    // Legacy fallback: supabaseAnonKey can still be used if needed.
    storageKey: 'reset-edu-auth',
    kakaoScopes: 'openid profile_nickname profile_image account_email',
    naverEnabled: false,
    naverNotice: 'Supabase Auth 호스티드 프로젝트는 네이버를 기본 provider로 직접 지원하지 않습니다. 네이버까지 필요하면 Auth0, WorkOS 같은 외부 브로커 또는 별도 서버 연동이 필요합니다.'
};
