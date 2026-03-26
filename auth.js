const config = window.RESET_EDU_AUTH || {};
const authApiBaseUrl = (config.authApiBaseUrl || '').replace(/\/$/, '');
const hasAuthApiConfig = Boolean(authApiBaseUrl && /^https?:\/\//.test(authApiBaseUrl));
const authMode = document.body?.dataset.authMode === 'signup' ? 'signup' : 'login';
const currentUrl = window.location.href;

const providers = [
    {
        id: 'kakao',
        label: '카카오',
        buttonId: 'kakao-login-button',
        defaultTitle: authMode === 'signup' ? '카카오로 회원가입' : '카카오로 로그인',
        pendingMessage: authMode === 'signup' ? '카카오 회원가입 화면으로 이동하는 중입니다.' : '카카오 로그인 화면으로 이동하는 중입니다.',
        buttonClassName: 'social-button kakao-button'
    },
    {
        id: 'naver',
        label: '네이버',
        buttonId: 'naver-login-button',
        defaultTitle: authMode === 'signup' ? '네이버로 회원가입' : '네이버로 로그인',
        pendingMessage: authMode === 'signup' ? '네이버 회원가입 화면으로 이동하는 중입니다.' : '네이버 로그인 화면으로 이동하는 중입니다.',
        buttonClassName: 'social-button naver-button'
    }
];

const modeCopy = {
    signup: {
        idleTitle: '회원가입이 필요합니다',
        idleMeta: '카카오 또는 네이버 계정으로 회원가입을 시작할 수 있습니다. 승인 후 바로 내 강의실과 수강 화면으로 이어집니다.',
        readyMessage: '카카오 또는 네이버 계정으로 회원가입을 시작할 수 있습니다.',
        disabledMessage: 'auth-config.js에 Cloudflare Worker URL을 입력하면 카카오·네이버 회원가입이 활성화됩니다.'
    },
    login: {
        idleTitle: '로그인이 필요합니다',
        idleMeta: '카카오 또는 네이버 계정으로 로그인할 수 있습니다. 승인 후 바로 내 강의실과 수강 화면으로 이어집니다.',
        readyMessage: '카카오 또는 네이버 계정으로 로그인할 수 있습니다.',
        disabledMessage: 'auth-config.js에 Cloudflare Worker URL을 입력하면 카카오·네이버 로그인이 활성화됩니다.'
    }
}[authMode];

const authState = document.getElementById('auth-state');
const authMessage = document.getElementById('auth-message');
const userName = document.getElementById('user-name');
const userMeta = document.getElementById('user-meta');
const authControls = document.getElementById('auth-controls');
const logoutButton = document.getElementById('logout-button');
const memberPanel = document.getElementById('member-panel');
const memberGreeting = document.getElementById('member-greeting');
const providerButtons = Object.fromEntries(
    providers.map((provider) => [provider.id, document.getElementById(provider.buttonId)])
);

providers.forEach((provider) => {
    const button = providerButtons[provider.id];
    if (button) {
        button.textContent = provider.defaultTitle;
    }
});

const getProviderLabel = (providerId) => {
    const provider = providers.find((item) => item.id === providerId);
    return provider?.label || '소셜';
};

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
    if (user.providerLabel || user.provider) {
        parts.push((user.providerLabel || getProviderLabel(user.provider)) + ' 계정 연결');
    }
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

    return parts.join(' · ') || '소셜 프로필 연동 완료';
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
        logoutButton.dataset.provider = '';
    }
    if (memberPanel) {
        memberPanel.hidden = true;
    }
};

const renderSignedIn = (user) => {
    const displayName = getUserDisplayName(user);
    const providerLabel = user?.providerLabel || getProviderLabel(user?.provider);

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
        logoutButton.dataset.provider = user?.provider || 'kakao';
    }
    if (memberPanel) {
        memberPanel.hidden = false;
    }
    if (memberGreeting) {
        memberGreeting.textContent = displayName + '님, ' + providerLabel + ' 계정으로 내 강의실과 수강 현황을 확인하세요.';
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

const getUrlParams = () => new URLSearchParams(window.location.search);

const clearAuthParams = () => {
    const url = new URL(window.location.href);
    ['auth_error', 'login', 'mode', 'logged_out', 'provider'].forEach((key) => {
        url.searchParams.delete(key);
    });
    window.history.replaceState({}, document.title, url.toString());
};

const handleAuthError = (error) => {
    console.error(error);
    const message = error?.message || '소셜 로그인 처리 중 문제가 발생했습니다. Worker URL과 Redirect URI 설정을 확인해 주세요.';
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

const startProviderAuth = (providerId) => {
    const provider = providers.find((item) => item.id === providerId);
    if (!provider) {
        return;
    }

    setMessage(provider.pendingMessage);
    window.location.href = getApiUrl('/api/auth/' + providerId + '/start', {
        next: currentUrl,
        mode: authMode,
        prompt: providerId === 'kakao' && authMode === 'signup' ? 'login' : ''
    });
};

const getLogoutMessage = (providerId) => {
    if (providerId === 'kakao') {
        return '카카오 로그아웃 화면으로 이동하는 중입니다. 카카오 계정까지 로그아웃하려면 해당 화면에서 함께 로그아웃을 선택해 주세요.';
    }

    return '네이버 연동 세션을 정리하는 중입니다.';
};

const init = async () => {
    const params = getUrlParams();
    const urlMessage = params.get('auth_error');
    const loggedOut = params.get('logged_out') === '1';
    const providerFromUrl = params.get('provider');
    const providerLabel = getProviderLabel(providerFromUrl);

    if (urlMessage) {
        renderSignedOut();
        setMessage(decodeURIComponent(urlMessage), true);
        clearAuthParams();
        return;
    }

    if (loggedOut) {
        renderSignedOut();
        setMessage(providerFromUrl ? providerLabel + ' 로그아웃이 완료되었습니다. 다시 진행하려면 인증을 새로 시작해 주세요.' : '로그아웃되었습니다. 다시 진행하려면 인증을 새로 시작해 주세요.');
        clearAuthParams();
    }

    if (!hasAuthApiConfig) {
        renderSignedOut();
        setMessage(modeCopy.disabledMessage);
        providers.forEach((provider) => disableButton(providerButtons[provider.id], 'Cloudflare Worker URL이 설정되지 않았습니다.'));
        return;
    }

    if (config.naverEnabled === false && providerButtons.naver) {
        disableButton(providerButtons.naver, config.naverNotice || '네이버 로그인이 비활성화되어 있습니다.');
    }

    const user = await fetchCurrentUser();
    if (user) {
        renderSignedIn(user);
        setMessage((user.providerLabel || getProviderLabel(user.provider)) + ' 로그인 상태가 유지되고 있습니다.');
    } else {
        renderSignedOut();
        setMessage(loggedOut ? '로그아웃되었습니다. 다시 진행하려면 인증을 새로 시작해 주세요.' : modeCopy.readyMessage);
    }

    providers.forEach((provider) => {
        const button = providerButtons[provider.id];
        if (!button || button.disabled) {
            return;
        }

        button.addEventListener('click', () => {
            startProviderAuth(provider.id);
        });
    });

    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            const providerId = logoutButton.dataset.provider || 'kakao';
            setMessage(getLogoutMessage(providerId));
            window.location.href = getApiUrl('/api/logout', {
                next: currentUrl,
                provider: providerId
            });
        });
    }
};

init().catch(handleAuthError);
