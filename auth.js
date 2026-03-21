import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
    getAuth,
    GoogleAuthProvider,
    OAuthProvider,
    onAuthStateChanged,
    signInWithPopup,
    signOut
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';

const config = window.RESET_EDU_AUTH || {};
const firebaseConfig = config.firebaseConfig || {};
const hasFirebaseConfig = Boolean(
    firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.appId
);

const authMode = document.body?.dataset.authMode === 'signup' ? 'signup' : 'login';
const modeCopy = {
    signup: {
        idleTitle: '회원가입이 필요합니다',
        idleMeta: '구글 또는 네이버 계정으로 회원가입을 진행할 수 있습니다.',
        readyMessage: '구글 또는 네이버 계정으로 회원가입을 시작할 수 있습니다.',
        disabledMessage: 'auth-config.js에 Firebase 설정값을 입력하면 회원가입 기능이 활성화됩니다.',
        googleLabel: '구글로 회원가입',
        naverLabel: '네이버로 회원가입'
    },
    login: {
        idleTitle: '로그인이 필요합니다',
        idleMeta: '구글 또는 네이버 계정으로 로그인할 수 있습니다.',
        readyMessage: '구글 또는 네이버 계정으로 로그인할 수 있습니다.',
        disabledMessage: 'auth-config.js에 Firebase 설정값을 입력하면 로그인 기능이 활성화됩니다.',
        googleLabel: '구글로 로그인',
        naverLabel: '네이버로 로그인'
    }
}[authMode];

const authState = document.getElementById('auth-state');
const authMessage = document.getElementById('auth-message');
const userName = document.getElementById('user-name');
const userMeta = document.getElementById('user-meta');
const authControls = document.getElementById('auth-controls');
const logoutButton = document.getElementById('logout-button');
const googleButton = document.getElementById('google-login-button');
const naverButton = document.getElementById('naver-login-button');
const memberPanel = document.getElementById('member-panel');
const memberGreeting = document.getElementById('member-greeting');

if (googleButton) {
    googleButton.textContent = modeCopy.googleLabel;
}
if (naverButton) {
    naverButton.textContent = modeCopy.naverLabel;
}

const setMessage = (message, isError) => {
    if (!authMessage) {
        return;
    }

    authMessage.textContent = message;
    authMessage.dataset.tone = isError ? 'error' : 'normal';
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
    if (authState) {
        authState.dataset.loggedIn = 'true';
    }
    if (userName) {
        userName.textContent = user.displayName || '회원 로그인 완료';
    }
    if (userMeta) {
        userMeta.textContent = user.email || '이메일 정보 없음';
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
        memberGreeting.textContent = (user.displayName || '회원') + '님, 내 강의실과 수강 현황을 확인하세요.';
    }
};

const handleAuthError = (error) => {
    console.error(error);
    setMessage('로그인 처리 중 문제가 발생했습니다. 설정값과 인증 도메인을 확인해 주세요.', true);
};

if (!hasFirebaseConfig) {
    renderSignedOut();
    setMessage(modeCopy.disabledMessage, false);
    if (googleButton) {
        googleButton.disabled = true;
    }
    if (naverButton) {
        naverButton.disabled = true;
    }
} else {
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);

    onAuthStateChanged(auth, (user) => {
        if (user) {
            renderSignedIn(user);
            setMessage('로그인 상태가 유지되고 있습니다.', false);
            return;
        }

        renderSignedOut();
        setMessage(modeCopy.readyMessage, false);
    });

    if (googleButton && config.googleEnabled !== false) {
        googleButton.addEventListener('click', async () => {
            try {
                setMessage(authMode === 'signup' ? '구글 회원가입 창을 여는 중입니다.' : '구글 로그인 창을 여는 중입니다.', false);
                const provider = new GoogleAuthProvider();
                provider.setCustomParameters({ prompt: 'select_account' });
                await signInWithPopup(auth, provider);
            } catch (error) {
                handleAuthError(error);
            }
        });
    }

    if (naverButton) {
        if (config.naverEnabled && config.naverProviderId) {
            naverButton.addEventListener('click', async () => {
                try {
                    setMessage(authMode === 'signup' ? '네이버 회원가입 창을 여는 중입니다.' : '네이버 로그인 창을 여는 중입니다.', false);
                    const provider = new OAuthProvider(config.naverProviderId);
                    await signInWithPopup(auth, provider);
                } catch (error) {
                    handleAuthError(error);
                }
            });
        } else {
            naverButton.disabled = true;
            naverButton.title = 'Firebase Identity Platform OIDC 설정 후 사용할 수 있습니다.';
        }
    }

    if (logoutButton) {
        logoutButton.addEventListener('click', async () => {
            try {
                await signOut(auth);
                setMessage('로그아웃되었습니다.', false);
            } catch (error) {
                handleAuthError(error);
            }
        });
    }
}
