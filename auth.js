const config = window.RESET_EDU_AUTH || {};
const authApiBaseUrl = (config.authApiBaseUrl || '').replace(/\/$/, '');
const hasAuthApiConfig = Boolean(authApiBaseUrl && /^https?:\/\//.test(authApiBaseUrl));
const authMode = document.body?.dataset.authMode === 'signup' ? 'signup' : 'login';
const currentUrl = window.location.href;

const modeCopy = {
    signup: {
        idleTitle: '회원가입이 필요합니다',
        idleMeta: '카카오 계정으로 회원가입을 시작할 수 있습니다. 이메일 없이 닉네임과 프로필 기반으로 바로 진입합니다.',
        readyMessage: '카카오 계정으로 회원가입을 시작할 수 있습니다.',
        disabledMessage: 'auth-config.js에 Cloudflare Worker URL을 입력하면 카카오 회원가입이 활성화됩니다.',
        kakaoLabel: '카카오로 회원가입',
        naverLabel: '네이버 연동 준비 중',
        pendingMessage: '카카오 회원가입 화면으로 이동하는 중입니다.'
    },
    login: {
        idleTitle: '로그인이 필요합니다',
        idleMeta: '카카오 계정으로 로그인할 수 있습니다. 이메일 없이 닉네임과 프로필 기반으로 바로 진입합니다.',
        readyMessage: '카카오 계정으로 로그인할 수 있습니다.',
        disabledMessage: 'auth-config.js에 Cloudflare Worker URL을 입력하면 카카오 로그인이 활성화됩니다.',
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

    return user.nickname || user.name || '회원 로그인 완료';
};

const formatUserMeta = (user) => {
    if (!user) {
        return modeCopy.idleMeta;
    }

    const parts = [];
    if (user.lastAuthMode === 'signup') {
        parts.push('최근 인증: 회원가입');
    } else if (user.lastAuthMode === 'login') {
        parts.push('최근 인증: 로그인');
    }
    if (typeof user.loginCount === 'number' && user.loginCount > 0) {
        parts.push('누적 로그인 ' + user.loginCount + '회');
    }
    if (user.lastLoginAt) {
        const date = new Date(user.lastLoginAt);
        if (!Number.isNaN(date.getTime())) {
            parts.push('마지막 접속 ' + date.toLocaleString('ko-KR'));
        }
    }

    return parts.join(' · ') || '카카오 프로필 연동 완료';
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
        userMeta.textContent = formatUserMeta(user);
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

const getApiUrl = (path, params) => {
    const url = new URL(path, authApiBaseUrl + '/');
    if (params) {
        Object.entries(params).forEach(([key, value]) => {
            if (value) {
                url.searchParams.set(key, value);
            }
        });
    }
    return url.toString();
};

const getUrlMessage = () => {
    const params = new URLSearchParams(window.location.search);
    return params.get('auth_error');
};

const getUrlFlag = (name) => {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
};

const clearAuthParams = () => {
    const url = new URL(window.location.href);
    ['auth_error', 'login', 'mode', 'logged_out'].forEach((key) => {
        url.searchParams.delete(key);
    });
    window.history.replaceState({}, document.title, url.toString());
};

const handleAuthError = (error) => {
    console.error(error);
    const message = error?.message || '카카오 로그인 처리 중 문제가 발생했습니다. Worker URL과 Kakao Redirect URI를 확인해 주세요.';
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

const fetchCurrentUser = async () => {
    const response = await fetch(getApiUrl('/api/me'), {
        method: 'GET',
        credentials: 'include'
    });

    const payload = await response.json().catch(() => ({ user: null }));
    if (!response.ok) {
        throw new Error(payload?.message || '현재 로그인 상태를 확인하지 못했습니다.');
    }

    return payload.user || null;
};

const init = async () => {
    const urlMessage = getUrlMessage();
    const loggedOut = getUrlFlag('logged_out') === '1';
    if (urlMessage) {
        renderSignedOut();
        setMessage(decodeURIComponent(urlMessage), true);
        clearAuthParams();
        return;
    }

    if (loggedOut) {
        renderSignedOut();
        setMessage('로그아웃되었습니다. 다시 진행하려면 카카오 계정 인증을 새로 해주세요.');
        clearAuthParams();
    }

    if (!hasAuthApiConfig) {
        renderSignedOut();
        setMessage(modeCopy.disabledMessage);
        disableButton(kakaoButton, 'Cloudflare Worker URL이 설정되지 않았습니다.');
        disableButton(naverButton, config.naverNotice || '네이버 로그인은 아직 연결되지 않았습니다.');
        return;
    }

    if (naverButton) {
        disableButton(naverButton, config.naverNotice || '네이버 로그인은 아직 연결되지 않았습니다.');
    }

    const user = await fetchCurrentUser();
    if (user) {
        renderSignedIn(user);
        setMessage('카카오 로그인 상태가 유지되고 있습니다.');
    } else {
        renderSignedOut();
        setMessage(loggedOut ? '로그아웃되었습니다. 다시 진행하려면 카카오 인증을 새로 시작해 주세요.' : modeCopy.readyMessage);
    }

    if (kakaoButton) {
        kakaoButton.addEventListener('click', () => {
            setMessage(modeCopy.pendingMessage);
            window.location.href = getApiUrl('/api/auth/kakao/start', {
                next: currentUrl,
                mode: authMode,
                prompt: authMode === 'signup' ? 'login' : ''
            });
        });
    }

    if (logoutButton) {
        logoutButton.addEventListener('click', async () => {
            try {
                setMessage('카카오 로그아웃 화면으로 이동하는 중입니다. 카카오 계정까지 로그아웃하려면 해당 화면에서 함께 로그아웃을 선택해 주세요.');
                window.location.href = getApiUrl('/api/logout', {
                    next: currentUrl,
                    provider: 'kakao'
                });
            } catch (error) {
                handleAuthError(error);
            }
        });
    }
};

init().catch(handleAuthError);
