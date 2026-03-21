import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const config = window.RESET_EDU_AUTH || {};
const supabaseUrl = config.supabaseUrl || '';
const supabasePublishableKey = config.supabasePublishableKey || config.supabaseAnonKey || '';
const hasSupabaseConfig = Boolean(supabaseUrl && supabasePublishableKey);
const authMode = document.body?.dataset.authMode === 'signup' ? 'signup' : 'login';
const redirectTo = config.authRedirectTo || window.location.href;

const modeCopy = {
    signup: {
        idleTitle: '회원가입이 필요합니다',
        idleMeta: '카카오 계정으로 회원가입을 시작할 수 있습니다. 네이버는 추가 연동 계층이 필요합니다.',
        readyMessage: '카카오 계정으로 회원가입을 시작할 수 있습니다.',
        disabledMessage: 'auth-config.js에 Supabase URL과 publishable key를 입력하면 회원가입 기능이 활성화됩니다.',
        kakaoLabel: '카카오로 회원가입',
        naverLabel: '네이버 연동 준비 중',
        pendingMessage: '카카오 회원가입 화면으로 이동하는 중입니다.'
    },
    login: {
        idleTitle: '로그인이 필요합니다',
        idleMeta: '카카오 계정으로 로그인할 수 있습니다. 네이버는 추가 연동 계층이 필요합니다.',
        readyMessage: '카카오 계정으로 로그인할 수 있습니다.',
        disabledMessage: 'auth-config.js에 Supabase URL과 publishable key를 입력하면 로그인 기능이 활성화됩니다.',
        kakaoLabel: '카카오로 로그인',
        naverLabel: '네이버 연동 준비 중',
        pendingMessage: '카카오 로그인 화면으로 이동하는 중입니다.'
    }
}[authMode];

const authState = document.getElementById('auth-state');
const authMessage = document.getElementById('auth-message');
const userName = document.getElementById('user-name');
const userMeta = document.getElementById('user-meta');
const authControls = document.getElementById('auth-controls');
const logoutButton = document.getElementById('logout-button');
const kakaoButton = document.getElementById('kakao-login-button');
const naverButton = document.getElementById('naver-login-button');
const memberPanel = document.getElementById('member-panel');
const memberGreeting = document.getElementById('member-greeting');

if (kakaoButton) {
    kakaoButton.textContent = modeCopy.kakaoLabel;
}
if (naverButton) {
    naverButton.textContent = modeCopy.naverLabel;
}

const setMessage = (message, isError = false) => {
    if (!authMessage) {
        return;
    }

    authMessage.textContent = message;
    authMessage.dataset.tone = isError ? 'error' : 'normal';
};

const getUserDisplayName = (user) => {
    if (!user) {
        return '회원 로그인 완료';
    }

    return user.user_metadata?.full_name || user.user_metadata?.name || user.user_metadata?.nickname || user.email || '회원 로그인 완료';
};

const renderSignedOut = () => {
    if (authState) {
        authState.dataset.loggedIn = 'false';
    }
    if (userName) {
        userName.textContent = modeCopy.idleTitle;
    }
    if (userMeta) {
        userMeta.textContent = modeCopy.idleMeta;
    }
    if (authControls) {
        authControls.hidden = false;
    }
    if (logoutButton) {
        logoutButton.hidden = true;
    }
    if (memberPanel) {
        memberPanel.hidden = true;
    }
};

const renderSignedIn = (user) => {
    const displayName = getUserDisplayName(user);

    if (authState) {
        authState.dataset.loggedIn = 'true';
    }
    if (userName) {
        userName.textContent = displayName;
    }
    if (userMeta) {
        userMeta.textContent = user?.email || '이메일 정보 없음';
    }
    if (authControls) {
        authControls.hidden = true;
    }
    if (logoutButton) {
        logoutButton.hidden = false;
    }
    if (memberPanel) {
        memberPanel.hidden = false;
    }
    if (memberGreeting) {
        memberGreeting.textContent = displayName + '님, 내 강의실과 수강 현황을 확인하세요.';
    }
};

const getUrlError = () => {
    const params = new URLSearchParams(window.location.search);
    return params.get('error_description') || params.get('error');
};

const getAuthCode = () => {
    const params = new URLSearchParams(window.location.search);
    return params.get('code');
};

const clearAuthParams = () => {
    const url = new URL(window.location.href);
    ['code', 'error', 'error_code', 'error_description', 'state'].forEach((key) => {
        url.searchParams.delete(key);
    });
    window.history.replaceState({}, document.title, url.toString());
};

const handleAuthError = (error) => {
    console.error(error);
    const message = error?.message || '로그인 처리 중 문제가 발생했습니다. Supabase 설정과 OAuth Redirect URL을 확인해 주세요.';
    setMessage(message, true);
};

const disableButton = (button, title) => {
    if (!button) {
        return;
    }

    button.disabled = true;
    if (title) {
        button.title = title;
    }
};

const init = async () => {
    const urlError = getUrlError();
    if (urlError) {
        renderSignedOut();
        setMessage(decodeURIComponent(urlError), true);
        clearAuthParams();
        return;
    }

    if (!hasSupabaseConfig) {
        renderSignedOut();
        setMessage(modeCopy.disabledMessage);
        disableButton(kakaoButton);
        disableButton(naverButton, config.naverNotice || 'Supabase Auth 호스티드 프로젝트는 네이버를 기본 provider로 직접 지원하지 않습니다.');
        return;
    }

    const supabase = createClient(supabaseUrl, supabasePublishableKey, {
        auth: {
            flowType: 'pkce',
            detectSessionInUrl: false,
            persistSession: true,
            autoRefreshToken: true,
            storageKey: config.storageKey || 'reset-edu-auth'
        }
    });

    const authCode = getAuthCode();
    if (authCode) {
        const { error } = await supabase.auth.exchangeCodeForSession(authCode);
        if (error) {
            throw error;
        }
        clearAuthParams();
    }

    supabase.auth.onAuthStateChange((event, session) => {
        if (session?.user) {
            renderSignedIn(session.user);
            if (event === 'SIGNED_OUT') {
                setMessage('로그아웃되었습니다.');
            } else {
                setMessage('Supabase 로그인 상태가 유지되고 있습니다.');
            }
            clearAuthParams();
            return;
        }

        renderSignedOut();
        if (event === 'SIGNED_OUT') {
            setMessage('로그아웃되었습니다.');
            return;
        }
        setMessage(modeCopy.readyMessage);
    });

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
        handleAuthError(sessionError);
    } else if (sessionData.session?.user) {
        renderSignedIn(sessionData.session.user);
        setMessage('Supabase 로그인 상태가 유지되고 있습니다.');
        clearAuthParams();
    } else {
        renderSignedOut();
        setMessage(modeCopy.readyMessage);
    }

    if (kakaoButton) {
        kakaoButton.addEventListener('click', async () => {
            try {
                setMessage(modeCopy.pendingMessage);
                const { error } = await supabase.auth.signInWithOAuth({
                    provider: 'kakao',
                    options: {
                        redirectTo,
                        scopes: config.kakaoScopes || 'openid profile_nickname profile_image account_email'
                    }
                });
                if (error) {
                    throw error;
                }
            } catch (error) {
                handleAuthError(error);
            }
        });
    }

    if (naverButton) {
        disableButton(
            naverButton,
            config.naverNotice || 'Supabase Auth 호스티드 프로젝트는 네이버를 기본 provider로 직접 지원하지 않습니다.'
        );
    }

    if (logoutButton) {
        logoutButton.addEventListener('click', async () => {
            try {
                const { error } = await supabase.auth.signOut();
                if (error) {
                    throw error;
                }
            } catch (error) {
                handleAuthError(error);
            }
        });
    }
};

init().catch(handleAuthError);
