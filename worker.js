export default {
    async fetch(request, env) {
        return handleRequest(request, env);
    }
};

const COURSE_STREAM_UIDS = new Set([
    '22193ede6a22e4b27b2dc1d3ecce214c',
    'b002bb63a6c9c854a267e95a29ab648f',
    '6aaf94b5c70b938de49809e8d4e50a74',
    '7c452891a700328cdb8f56cb39260970',
    'afa89d104a50e779ee12112f1ec59655',
    'c3ee448bc45d30d329b76a89e2d1a547',
    'f581475c91de7f8574391ec5daebc008',
    '0a451904c6baea91ab32155f1df3e748',
    'd9d7d67167f1874a7b93a964746fb1a8',
    '23341942e913deae11baabedcd24d95b',
    'a2b66d1b575d82d361f7680ec1e7e48b',
    '40db2b4735841194439c22e90d9665be',
    'fa6e84899afa4f5f1314b6c145c27feb',
    'd01b607c43e0c6232706656082d044b8'
]);

const PRODUCTION_FIREBASE_PROJECT_ID = 'jaeseung-try-2-34973152-e44aa';
const PROTECTED_FIRESTORE_COLLECTIONS = new Set([
    'users',
    'orders',
    'payments',
    'purchases',
    'enrollments',
    'courseProgress',
    'certificates',
    'adminLogs',
    'documentOutputLogs',
    'adminAuditLogs',
    'adminManualEnrollmentGrants',
    'paymentLogs'
]);
const ALLOWED_ENROLLMENT_SOURCE_TYPES = new Set(['PAYMENT', 'MANUAL', 'MIGRATION', 'PROMOTION', 'ADMIN_TEST', 'EXTENSION', 'TRUSTED_PAYMENT_RECORD', 'PAID_RECORD', 'PORTONE', 'PORTONE_KCP', 'KCP', 'NHN_KCP', 'ADMIN', 'ADMIN_GRANTED', 'MANUAL_GRANT', 'ADMIN_MANUAL', 'FREE']);

function getConfiguredCourseStreamUids(env) {
    return new Set([
        ...COURSE_STREAM_UIDS,
        env.STREAM_UID_VIOLENCE_PREVENTION,
        env.STREAM_UID_GAMBLING_RELAPSE_PREVENTION,
        env.STREAM_UID_SEXUAL_OFFENSE_PREVENTION,
        env.STREAM_UID_DRUG_REHAB_PREVENTION,
        env.STREAM_UID_DRUG_ADDICTION_RELAPSE_PREVENTION,
        env.STREAM_UID_DIGITAL_CRIME_PREVENTION,
        env.STREAM_UID_FRAUD_PREVENTION,
        env.STREAM_UID_UNLICENSED_DRIVING_PREVENTION,
        env.STREAM_UID_HANGOVER_DRIVING_PREVENTION,
        env.STREAM_UID_RECKLESS_RETALIATORY_DRIVING_PREVENTION,
        env.STREAM_UID_DEFAMATION_INSULT_PREVENTION,
        env.STREAM_UID_LEGAL_COMPLIANCE_AWARENESS,
        env.STREAM_UID_VOICE_PHISHING_PREVENTION,
        env.STREAM_UID_DIGITAL_SEXUAL_CRIME_PREVENTION,
        env.STREAM_UID_PROSTITUTION_PREVENTION
    ].filter(Boolean));
}

function isCbtStreamUid(uid) {
    return uid === '7c452891a700328cdb8f56cb39260970' || uid === 'afa89d104a50e779ee12112f1ec59655';
}

function isAdvancedCourseId(courseId) {
    return courseId === 'dui-cbt-advanced' || String(courseId || '').endsWith('-advanced') || courseId === 'drug-addiction-premium';
}

function isStreamUidAllowedForCourse(uid, courseId, enrollment = null) {
    if (!isCbtStreamUid(uid)) return true;
    if (isAdvancedCourseId(courseId)) return true;
    const productId = String(enrollment?.productId || enrollment?.paymentProductId || '').trim();
    const planId = String(enrollment?.planId || '').trim();
    const product = APPLICATION_PRODUCTS[productId] || null;
    const enrollmentCourseProduct = getCourseProduct(resolveCanonicalCourseId(enrollment || {}) || enrollment?.courseId) || null;
    return Boolean(product?.includesCbtCourse || enrollmentCourseProduct?.includesCbtCourse || productId.endsWith('-advanced') || productId === 'drug-addiction-premium' || planId === 'advanced' || planId === 'premium');
}

const PROVIDERS = {
    kakao: {
        id: 'kakao',
        label: '카카오',
        authorizeUrl: 'https://kauth.kakao.com/oauth/authorize',
        tokenUrl: 'https://kauth.kakao.com/oauth/token',
        userUrl: 'https://kapi.kakao.com/v2/user/me',
        startPath: '/api/auth/kakao/start',
        callbackPath: '/api/auth/kakao/callback',
        logoutCallbackPath: '/api/logout/kakao/callback',
        globalLogoutUrl: 'https://kauth.kakao.com/oauth/logout'
    },
    naver: {
        id: 'naver',
        label: '네이버',
        authorizeUrl: 'https://nid.naver.com/oauth2.0/authorize',
        tokenUrl: 'https://nid.naver.com/oauth2.0/token',
        userUrl: 'https://openapi.naver.com/v1/nid/me',
        startPath: '/api/auth/naver/start',
        callbackPath: '/api/auth/naver/callback',
        logoutCallbackPath: '/api/logout/naver/callback',
        globalLogoutUrl: null
    }
};

async function handleRequest(request, env) {
    const url = new URL(request.url);
    const corsHeaders = buildCorsHeaders(request, env);

    if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (isLocalDevelopmentHost(url.hostname) && url.pathname.startsWith('/api/admin/') && getFirestoreProjectId(env) === PRODUCTION_FIREBASE_PROJECT_ID && env.ALLOW_PROD_FIRESTORE_READS_IN_DEV !== 'true') {
        return json({ ok: false, message: 'Local Worker admin routes are pointing at production Firestore. Use a dev project/emulator or set ALLOW_PROD_FIRESTORE_READS_IN_DEV=true intentionally.', code: 'PROD_FIRESTORE_READS_BLOCKED_IN_DEV' }, 503, corsHeaders);
    }

    try {
        if (url.pathname === PROVIDERS.kakao.startPath && request.method === 'GET') {
            return startOAuth(request, env, 'kakao');
        }

        if (url.pathname === PROVIDERS.kakao.callbackPath && request.method === 'GET') {
            return handleOAuthCallback(request, env, 'kakao');
        }

        if (url.pathname === PROVIDERS.naver.startPath && request.method === 'GET') {
            return startOAuth(request, env, 'naver');
        }

        if (url.pathname === PROVIDERS.naver.callbackPath && request.method === 'GET') {
            return handleOAuthCallback(request, env, 'naver');
        }

        if (url.pathname === '/api/me' && request.method === 'GET') {
            return handleCurrentUser(request, env, corsHeaders);
        }

        if (url.pathname === '/api/ledger/member-event' && request.method === 'POST') {
            return handleSupabaseLedgerMemberEvent(request, env, corsHeaders);
        }

        if (url.pathname === '/api/ledger/progress' && request.method === 'POST') {
            return handleSupabaseLedgerProgressEvent(request, env, corsHeaders);
        }

        if (url.pathname === '/api/enrollments/me' && request.method === 'GET') {
            return await handleCurrentUserEnrollments(request, env, corsHeaders);
        }

        if (url.pathname === PROVIDERS.kakao.logoutCallbackPath && request.method === 'GET') {
            return handleProviderLogoutCallback(request, env);
        }

        if (url.pathname === PROVIDERS.naver.logoutCallbackPath && request.method === 'GET') {
            return handleProviderLogoutCallback(request, env);
        }

        if (url.pathname === '/api/logout' && (request.method === 'POST' || request.method === 'GET')) {
            return handleLogout(request, env, corsHeaders);
        }

        if (url.pathname === '/api/stream/direct-upload' && request.method === 'POST') {
            return handleStreamDirectUpload(request, env, corsHeaders);
        }

        if (url.pathname === '/api/stream/token' && request.method === 'GET') {
            return await handleStreamToken(request, env, corsHeaders);
        }

        if (url.pathname === '/api/payments/portone-order' && request.method === 'POST') {
            return await handlePortOneOrderCreate(request, env, corsHeaders);
        }

        if (url.pathname === '/api/payments/confirm' && request.method === 'POST') {
            return handlePaymentConfirm(request, env, corsHeaders);
        }

        if (url.pathname === '/api/payments/portone-webhook' && request.method === 'POST') {
            return handlePortOneWebhookSafely(request, env, corsHeaders);
        }

        if (url.pathname === '/api/certificates/issue' && request.method === 'POST') {
            return await handleCertificateIssue(request, env, corsHeaders);
        }

        if (url.pathname === '/api/document-output-log' && request.method === 'POST') {
            return await handleDocumentOutputLog(request, env, corsHeaders);
        }

        if (url.pathname === '/api/admin/member-dataset' && request.method === 'GET') {
            return handleAdminMemberDataset(request, env, corsHeaders);
        }

        if (url.pathname === '/api/admin/members' && request.method === 'GET') {
            return handleAdminMembers(request, env, corsHeaders);
        }

        if (url.pathname === '/api/admin/member-detail' && request.method === 'GET') {
            return handleAdminMemberDetail(request, env, corsHeaders);
        }

        if (url.pathname === '/api/admin/members/sync' && request.method === 'POST') {
            return handleAdminMembersSync(request, env, corsHeaders);
        }

        if (url.pathname === '/api/admin/supabase/members' && request.method === 'GET') {
            return handleAdminSupabaseMembers(request, env, corsHeaders);
        }

        if (url.pathname === '/api/admin/supabase/member-detail' && request.method === 'GET') {
            return handleAdminSupabaseMemberDetail(request, env, corsHeaders);
        }

        if (url.pathname === '/api/admin/supabase/migration/inspect' && request.method === 'POST') {
            return handleAdminSupabaseMigrationInspect(request, env, corsHeaders);
        }

        if (url.pathname === '/api/admin/supabase/migration/run' && request.method === 'POST') {
            return handleAdminSupabaseMigrationRun(request, env, corsHeaders);
        }

        if (url.pathname === '/api/admin/payments' && request.method === 'GET') {
            return handleAdminPayments(request, env, corsHeaders);
        }

        if (url.pathname === '/api/admin/payments/resync' && request.method === 'POST') {
            return handleAdminPaymentResync(request, env, corsHeaders);
        }

        if (url.pathname === '/api/admin/enrollments/grant' && request.method === 'POST') {
            return handleAdminEnrollmentGrant(request, env, corsHeaders);
        }

        if (url.pathname === '/api/admin/enrollments/update' && request.method === 'POST') {
            return handleAdminEnrollmentUpdate(request, env, corsHeaders);
        }

        if (url.pathname === '/api/admin/certificates/issue' && request.method === 'POST') {
            return handleAdminCertificateIssue(request, env, corsHeaders);
        }

        if (url.pathname === '/api/admin/certificates/update-date' && request.method === 'POST') {
            return handleAdminCertificateDateUpdate(request, env, corsHeaders);
        }

        if (url.pathname === '/api/admin/integrity' && request.method === 'GET') {
            return handleAdminIntegrityCheck(request, env, corsHeaders);
        }

        if (url.pathname === '/api/admin/integrity/repair' && request.method === 'POST') {
            return handleAdminIntegrityRepair(request, env, corsHeaders);
        }

        if (url.pathname === '/api/admin/integrity/repair-all' && request.method === 'POST') {
            return handleAdminIntegrityRepairAll(request, env, corsHeaders);
        }

        if (url.pathname === '/api/admin/data-health' && request.method === 'GET') {
            return handleAdminDataHealth(request, env, corsHeaders);
        }

        return json({ error: 'not_found' }, 404, corsHeaders);
    } catch (error) {
        console.error(error);
        return json(
            {
                error: 'internal_error',
                message: error instanceof Error ? error.message : 'Unknown error'
            },
            500,
            corsHeaders
        );
    }
}

function getAllowedOrigins(env) {
    const values = [env.APP_BASE_URL, env.APP_EXTRA_ORIGINS]
        .filter(Boolean)
        .flatMap((value) => String(value).split(','))
        .map((value) => value.trim())
        .filter(Boolean);

    const origins = new Set();
    values.forEach((value) => {
        try {
            origins.add(new URL(value).origin);
        } catch {
            // Ignore malformed origin values.
        }
    });

    return origins;
}

function buildCorsHeaders(request, env) {
    const headers = new Headers();
    const origin = request.headers.get('Origin');
    const allowedOrigins = getAllowedOrigins(env);

    if (origin && allowedOrigins.has(origin)) {
        headers.set('Access-Control-Allow-Origin', origin);
        headers.set('Access-Control-Allow-Credentials', 'true');
        headers.set('Vary', 'Origin');
    }

    headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cache-Control, Pragma, x-admin-key');
    headers.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    return headers;
}

function json(payload, status = 200, baseHeaders = new Headers()) {
    const headers = new Headers(baseHeaders);
    headers.set('Content-Type', 'application/json; charset=utf-8');
    headers.set('Cache-Control', 'private, no-store');
    return new Response(JSON.stringify(payload), { status, headers });
}

function redirect(location, extraHeaders = {}) {
    const headers = new Headers(extraHeaders);
    headers.set('Location', location);
    return new Response(null, { status: 302, headers });
}

function parseCookies(request) {
    const cookieHeader = request.headers.get('Cookie') || '';
    return cookieHeader
        .split(';')
        .map((part) => part.trim())
        .filter(Boolean)
        .reduce((acc, item) => {
            const index = item.indexOf('=');
            if (index === -1) {
                return acc;
            }
            const key = item.slice(0, index);
            const value = item.slice(index + 1);
            acc[key] = decodeURIComponent(value);
            return acc;
        }, {});
}

function getCookie(request, name) {
    return parseCookies(request)[name] || null;
}

function makeCookie(name, value, options = {}) {
    const parts = [`${name}=${encodeURIComponent(value)}`];
    if (options.maxAge !== undefined) {
        parts.push(`Max-Age=${options.maxAge}`);
    }
    parts.push(`Path=${options.path || '/'}`);
    if (options.httpOnly !== false) {
        parts.push('HttpOnly');
    }
    if (options.sameSite) {
        parts.push(`SameSite=${options.sameSite}`);
    }
    if (options.secure !== false) {
        parts.push('Secure');
    }
    return parts.join('; ');
}

function appendSetCookies(headers, cookies) {
    const values = Array.isArray(cookies) ? cookies : [cookies];
    values.forEach((cookie) => headers.append('Set-Cookie', cookie));
}

function toBase64Url(input) {
    let binary = '';
    input.forEach((byte) => {
        binary += String.fromCharCode(byte);
    });
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(input) {
    const base64 = input.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (input.length % 4)) % 4);
    const binary = atob(base64);
    const output = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
        output[i] = binary.charCodeAt(i);
    }
    return output;
}

async function importHmacKey(secret) {
    return crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign', 'verify']
    );
}

async function signPayload(payload, secret) {
    const key = await importHmacKey(secret);
    const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
    return toBase64Url(new Uint8Array(signature));
}

async function makeSessionValue(session, secret) {
    const encodedPayload = toBase64Url(new TextEncoder().encode(JSON.stringify(session)));
    const signature = await signPayload(encodedPayload, secret);
    return `${encodedPayload}.${signature}`;
}

async function verifySessionValue(value, secret) {
    if (!value) {
        return null;
    }
    const [payload, signature] = value.split('.');
    if (!payload || !signature) {
        return null;
    }

    const expectedSignature = await signPayload(payload, secret);
    if (expectedSignature !== signature) {
        return null;
    }

    try {
        const decoded = new TextDecoder().decode(fromBase64Url(payload));
        return JSON.parse(decoded);
    } catch {
        return null;
    }
}

function getProviderConfig(provider) {
    const config = PROVIDERS[provider];
    if (!config) {
        throw new Error(`Unsupported auth provider: ${provider}`);
    }
    return config;
}

function getOAuthCookieName(provider, field) {
    return `${provider}_oauth_${field}`;
}

function clearOAuthCookies(provider) {
    return ['state', 'next', 'mode'].map((field) => makeCookie(getOAuthCookieName(provider, field), '', { maxAge: 0, sameSite: 'Lax' }));
}

function readOAuthContext(request, provider) {
    return {
        state: getCookie(request, getOAuthCookieName(provider, 'state')),
        next: getCookie(request, getOAuthCookieName(provider, 'next')),
        mode: getCookie(request, getOAuthCookieName(provider, 'mode'))
    };
}

async function startOAuth(request, env, provider) {
    assertBaseEnv(env);
    assertProviderEnv(provider, env);

    const providerConfig = getProviderConfig(provider);
    const url = new URL(request.url);
    const next = sanitizeNextUrl(url.searchParams.get('next'), env.APP_BASE_URL);
    const mode = url.searchParams.get('mode') === 'signup' ? 'signup' : 'login';
    const state = crypto.randomUUID();
    const forcePrompt = url.searchParams.get('prompt') === 'login' || mode === 'signup';

    const authorizeUrl = new URL(providerConfig.authorizeUrl);

    if (provider === 'kakao') {
        authorizeUrl.searchParams.set('client_id', env.KAKAO_REST_API_KEY);
        authorizeUrl.searchParams.set('redirect_uri', env.KAKAO_REDIRECT_URI);
        authorizeUrl.searchParams.set('response_type', 'code');
        authorizeUrl.searchParams.set('scope', 'profile_nickname,profile_image');
        authorizeUrl.searchParams.set('state', state);
        if (forcePrompt) {
            authorizeUrl.searchParams.set('prompt', 'login');
        }
    } else {
        authorizeUrl.searchParams.set('response_type', 'code');
        authorizeUrl.searchParams.set('client_id', env.NAVER_CLIENT_ID);
        authorizeUrl.searchParams.set('redirect_uri', env.NAVER_REDIRECT_URI);
        authorizeUrl.searchParams.set('state', state);
    }

    const headers = new Headers();
    appendSetCookies(headers, [
        makeCookie(getOAuthCookieName(provider, 'state'), state, { maxAge: 600, sameSite: 'Lax' }),
        makeCookie(getOAuthCookieName(provider, 'next'), next, { maxAge: 600, sameSite: 'Lax' }),
        makeCookie(getOAuthCookieName(provider, 'mode'), mode, { maxAge: 600, sameSite: 'Lax' })
    ]);

    return redirect(authorizeUrl.toString(), headers);
}

async function handleOAuthCallback(request, env, provider) {
    assertBaseEnv(env);
    assertProviderEnv(provider, env);

    const providerConfig = getProviderConfig(provider);
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const oauthError = url.searchParams.get('error');
    const oauthErrorDescription = url.searchParams.get('error_description');
    const oauthContext = readOAuthContext(request, provider);
    const next = sanitizeNextUrl(oauthContext.next, env.APP_BASE_URL);
    const mode = oauthContext.mode === 'signup' ? 'signup' : 'login';
    const clearCookies = clearOAuthCookies(provider);

    if (oauthError) {
        const errorUrl = withParams(next, { auth_error: oauthErrorDescription || oauthError, mode, provider });
        const headers = new Headers();
        appendSetCookies(headers, clearCookies);
        return redirect(errorUrl, headers);
    }

    if (!code) {
        const errorUrl = withParams(next, { auth_error: 'missing_code', mode, provider });
        const headers = new Headers();
        appendSetCookies(headers, clearCookies);
        return redirect(errorUrl, headers);
    }

    if (!state || !oauthContext.state || state !== oauthContext.state) {
        const errorUrl = withParams(next, { auth_error: 'invalid_state', mode, provider });
        const headers = new Headers();
        appendSetCookies(headers, clearCookies);
        return redirect(errorUrl, headers);
    }

    const token = await exchangeCodeForToken(provider, code, state, env);
    const providerUser = await fetchProviderUser(provider, token.access_token);
    const memberProfile = await persistMemberProfile(providerUser, provider, mode, env);
    const sessionPayload = buildSessionPayload(providerUser, providerConfig.label, memberProfile);
    const sessionValue = await makeSessionValue(sessionPayload, env.SESSION_SECRET);

    const headers = new Headers();
    appendSetCookies(headers, [
        ...clearCookies,
        makeCookie('app_session', sessionValue, { maxAge: 60 * 60 * 24 * 30, sameSite: 'None' })
    ]);

    return redirect(withParams(next, { login: 'success', mode, provider }), headers);
}

function normalizeProviderUser(provider, rawUser) {
    if (provider === 'kakao') {
        return {
            provider,
            providerUserId: String(rawUser.id),
            nickname: rawUser.properties?.nickname || rawUser.kakao_account?.profile?.nickname || '카카오 사용자',
            name: rawUser.kakao_account?.name || rawUser.properties?.nickname || null,
            profileImage: rawUser.properties?.profile_image || rawUser.kakao_account?.profile?.profile_image_url || '',
            thumbnailImage: rawUser.properties?.thumbnail_image || rawUser.kakao_account?.profile?.thumbnail_image_url || '',
            email: rawUser.kakao_account?.email || null,
            rawUser
        };
    }

    const profile = rawUser.response || {};
    return {
        provider,
        providerUserId: String(profile.id || ''),
        nickname: profile.nickname || profile.name || '네이버 사용자',
        name: profile.name || profile.nickname || null,
        profileImage: profile.profile_image || '',
        thumbnailImage: profile.profile_image || '',
        email: profile.email || null,
        rawUser
    };
}

function buildSessionPayload(user, providerLabel, memberProfile) {
    return {
        sub: `${user.provider}:${user.providerUserId}`,
        provider: user.provider,
        providerLabel,
        providerUserId: user.providerUserId,
        nickname: user.nickname || null,
        name: user.name || null,
        email: user.email || null,
        profileImage: user.profileImage || '',
        thumbnailImage: user.thumbnailImage || '',
        memberProfileId: memberProfile?.id || null,
        profileSaved: Boolean(memberProfile),
        signupCompletedAt: memberProfile?.signup_completed_at || null,
        signupCount: memberProfile?.signup_count || 0,
        loginCount: memberProfile?.login_count || 0,
        lastAuthMode: memberProfile?.last_auth_mode || null,
        lastLoginAt: memberProfile?.last_login_at || new Date().toISOString(),
        iat: Date.now()
    };
}

async function exchangeCodeForToken(provider, code, state, env) {
    if (provider === 'kakao') {
        const body = new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: env.KAKAO_REST_API_KEY,
            redirect_uri: env.KAKAO_REDIRECT_URI,
            code
        });

        if (env.KAKAO_CLIENT_SECRET) {
            body.set('client_secret', env.KAKAO_CLIENT_SECRET);
        }

        const response = await fetch(PROVIDERS.kakao.tokenUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8'
            },
            body: body.toString()
        });

        const text = await response.text();
        if (!response.ok) {
            throw new Error(`Kakao token exchange failed: ${response.status} ${text}`);
        }

        return JSON.parse(text);
    }

    const tokenUrl = new URL(PROVIDERS.naver.tokenUrl);
    tokenUrl.searchParams.set('grant_type', 'authorization_code');
    tokenUrl.searchParams.set('client_id', env.NAVER_CLIENT_ID);
    tokenUrl.searchParams.set('client_secret', env.NAVER_CLIENT_SECRET);
    tokenUrl.searchParams.set('code', code);
    tokenUrl.searchParams.set('state', state);

    const response = await fetch(tokenUrl.toString(), {
        method: 'GET'
    });

    const text = await response.text();
    if (!response.ok) {
        throw new Error(`Naver token exchange failed: ${response.status} ${text}`);
    }

    return JSON.parse(text);
}

async function fetchProviderUser(provider, accessToken) {
    const response = await fetch(getProviderConfig(provider).userUrl, {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${accessToken}`
        }
    });

    const text = await response.text();
    if (!response.ok) {
        throw new Error(`${getProviderConfig(provider).label} user request failed: ${response.status} ${text}`);
    }

    const rawUser = JSON.parse(text);
    if (provider === 'naver' && rawUser.resultcode && rawUser.resultcode !== '00') {
        throw new Error(`Naver user request failed: ${rawUser.message || rawUser.resultcode}`);
    }

    const user = normalizeProviderUser(provider, rawUser);
    if (!user.providerUserId) {
        throw new Error(`${getProviderConfig(provider).label} 사용자 ID를 확인하지 못했습니다.`);
    }

    return user;
}

async function persistMemberProfile(user, provider, mode, env) {
    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
        return null;
    }

    const table = env.SUPABASE_PROFILE_TABLE || 'member_profiles';
    const now = new Date().toISOString();
    const currentProfile = await fetchMemberProfile(provider, user.providerUserId, table, env);
    const payload = {
        provider,
        provider_user_id: user.providerUserId,
        kakao_user_id: provider === 'kakao' ? user.providerUserId : `naver:${user.providerUserId}`,
        nickname: user.nickname || null,
        profile_image_url: user.profileImage || null,
        thumbnail_image_url: user.thumbnailImage || null,
        raw_user_json: user.rawUser,
        signup_completed_at: currentProfile?.signup_completed_at || (mode === 'signup' ? now : null),
        signup_count: Number(currentProfile?.signup_count || 0) + (mode === 'signup' ? 1 : 0),
        login_count: Number(currentProfile?.login_count || 0) + 1,
        last_auth_mode: mode,
        last_login_at: now,
        updated_at: now
    };

    const response = await fetch(`${env.SUPABASE_URL}/rest/v1/${table}?on_conflict=provider,provider_user_id`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            apikey: env.SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
            Prefer: 'resolution=merge-duplicates,return=representation'
        },
        body: JSON.stringify(payload)
    });

    const text = await response.text();
    if (!response.ok) {
        throw new Error(`Supabase profile upsert failed: ${response.status} ${text}`);
    }

    const rows = text ? JSON.parse(text) : [];
    return Array.isArray(rows) ? rows[0] || null : rows;
}

async function fetchMemberProfile(provider, providerUserId, table, env) {
    const url = new URL(env.SUPABASE_URL + '/rest/v1/' + table);
    url.searchParams.set('select', 'id,signup_completed_at,signup_count,login_count,last_auth_mode');
    url.searchParams.set('provider', 'eq.' + provider);
    url.searchParams.set('provider_user_id', 'eq.' + providerUserId);
    url.searchParams.set('limit', '1');

    const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
            apikey: env.SUPABASE_SERVICE_ROLE_KEY,
            Authorization: 'Bearer ' + env.SUPABASE_SERVICE_ROLE_KEY
        }
    });

    const text = await response.text();
    if (!response.ok) {
        throw new Error('Supabase profile lookup failed: ' + response.status + ' ' + text);
    }

    const rows = text ? JSON.parse(text) : [];
    return Array.isArray(rows) ? rows[0] || null : null;
}


function hasSupabaseLedgerConfig(env) {
    return Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);
}

function getSupabaseUrl(env, path) {
    return String(env.SUPABASE_URL || '').replace(/\/$/, '') + '/rest/v1/' + path.replace(/^\//, '');
}

function getSupabaseHeaders(env, prefer = '') {
    const headers = {
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: 'Bearer ' + env.SUPABASE_SERVICE_ROLE_KEY,
        'Content-Type': 'application/json'
    };
    if (prefer) headers.Prefer = prefer;
    return headers;
}

function getSupabaseMissingSchemaColumn(text) {
    try {
        const parsed = JSON.parse(text || '{}');
        if (parsed?.code !== 'PGRST204') return '';
        const match = String(parsed.message || '').match(/'([^']+)' column/);
        return match ? match[1] : '';
    } catch {
        return '';
    }
}

async function supabaseLedgerRequest(env, path, options = {}) {
    if (!hasSupabaseLedgerConfig(env)) {
        const error = new Error('Supabase ledger is not configured. SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
        error.code = 'SUPABASE_LEDGER_NOT_CONFIGURED';
        throw error;
    }
    const response = await fetch(getSupabaseUrl(env, path), {
        method: options.method || 'GET',
        headers: getSupabaseHeaders(env, options.prefer || ''),
        body: options.body === undefined ? undefined : JSON.stringify(options.body)
    });
    const text = await response.text();
    if (!response.ok) {
        if (response.status === 400 && text.includes('42P10') && path.includes('on_conflict=') && !options.conflictRetry) {
            const retryUrl = new URL(getSupabaseUrl(env, path));
            retryUrl.searchParams.delete('on_conflict');
            const base = String(env.SUPABASE_URL || '').replace(/\/$/, '') + '/rest/v1/';
            const retryPath = retryUrl.toString().replace(base, '');
            const retryPrefer = String(options.prefer || '').split(',').filter((part) => !part.includes('resolution=')).join(',');
            console.warn('[supabase-ledger:on-conflict-missing-retry]', { path, retryPath });
            return supabaseLedgerRequest(env, retryPath, { ...options, prefer: retryPrefer || 'return=minimal', conflictRetry: true });
        }
        const missingColumn = getSupabaseMissingSchemaColumn(text);
        if (missingColumn && options.body && Number(options.schemaRetry || 0) < 20) {
            const body = Array.isArray(options.body) ? options.body.map((row) => ({ ...row })) : { ...options.body };
            const removed = Array.isArray(body) ? body.some((row) => {
                if (row && Object.prototype.hasOwnProperty.call(row, missingColumn)) { delete row[missingColumn]; return true; }
                return false;
            }) : Object.prototype.hasOwnProperty.call(body, missingColumn);
            if (!Array.isArray(body) && removed) delete body[missingColumn];
            if (removed) {
                console.warn('[supabase-ledger:schema-column-missing-retry]', { path, missingColumn });
                return supabaseLedgerRequest(env, path, { ...options, body, schemaRetry: Number(options.schemaRetry || 0) + 1 });
            }
        }
        const error = new Error('Supabase ledger request failed: ' + response.status + ' ' + text);
        error.status = response.status;
        throw error;
    }
    return text ? JSON.parse(text) : null;
}

async function safeSupabaseLedger(label, callback) {
    try {
        return await callback();
    } catch (error) {
        console.error('[supabase-ledger:' + label + ':failed]', { message: error instanceof Error ? error.message : String(error), status: error?.status || null, code: error?.code || null });
        return null;
    }
}

function normalizePhoneNumberValue(value) {
    const raw = String(value || '').trim();
    const digits = raw.replace(/\D/g, '');
    if (digits.length === 11 && digits.startsWith('010')) return digits.slice(0, 3) + '-' + digits.slice(3, 7) + '-' + digits.slice(7);
    if (digits.length === 10 && digits.startsWith('02')) return digits.slice(0, 2) + '-' + digits.slice(2, 6) + '-' + digits.slice(6);
    if (digits.length === 10) return digits.slice(0, 3) + '-' + digits.slice(3, 6) + '-' + digits.slice(6);
    return raw;
}

function normalizeBirthDateValue(value) {
    const raw = String(value || '').trim();
    const digits = raw.replace(/\D/g, '');
    if (/^\d{8}$/.test(digits)) return digits.slice(0, 4) + '-' + digits.slice(4, 6) + '-' + digits.slice(6, 8);
    return raw;
}

function isValidBirthDateValue(value) {
    const normalized = normalizeBirthDateValue(value);
    const matched = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!matched) return false;
    const year = Number(matched[1]);
    const month = Number(matched[2]);
    const day = Number(matched[3]);
    const candidate = new Date(year, month - 1, day);
    return Number.isFinite(candidate.getTime()) && candidate.getFullYear() === year && candidate.getMonth() === month - 1 && candidate.getDate() === day;
}

function normalizeLedgerTimestamp(value) {
    if (!value) return null;
    if (typeof value === 'string') {
        const time = Date.parse(value);
        return Number.isFinite(time) ? new Date(time).toISOString() : null;
    }
    if (typeof value === 'object' && typeof value.seconds === 'number') return new Date(value.seconds * 1000).toISOString();
    const time = new Date(value).getTime();
    return Number.isFinite(time) ? new Date(time).toISOString() : null;
}

function getLedgerCourseName(row) {
    return row?.courseName || row?.course_name || row?.courseTitle || row?.course_title || row?.productTitle || row?.product_title || row?.orderName || row?.order_name || row?.rawResponse?.orderName || row?.rawResponse?.order_name || row?.courseId || row?.course_id || null;
}

async function supabaseLedgerInsertActivity(env, input) {
    if (!input?.firebase_uid || !input?.event_type) return null;
    const payload = {
        firebase_uid: input.firebase_uid,
        event_type: input.event_type,
        course_id: input.course_id || null,
        course_name: input.course_name || null,
        order_id: input.order_id || null,
        description: input.description || null,
        metadata: input.metadata || null,
        event_at: normalizeLedgerTimestamp(input.event_at) || new Date().toISOString()
    };
    if (input.event_key) payload.event_key = String(input.event_key);
    const path = input.event_key ? 'activity_logs?on_conflict=event_key' : 'activity_logs';
    try {
        return await supabaseLedgerRequest(env, path, {
            method: 'POST',
            prefer: input.event_key ? 'resolution=ignore-duplicates,return=minimal' : 'return=minimal',
            body: payload
        });
    } catch (error) {
        if (input.event_key && String(error?.message || '').includes('event_key')) {
            delete payload.event_key;
            return supabaseLedgerRequest(env, 'activity_logs', { method: 'POST', prefer: 'return=minimal', body: payload });
        }
        throw error;
    }
}

async function supabaseLedgerGetMember(env, firebaseUid) {
    const url = 'members?select=*&firebase_uid=eq.' + encodeURIComponent(firebaseUid) + '&limit=1';
    const rows = await supabaseLedgerRequest(env, url);
    return Array.isArray(rows) ? rows[0] || null : null;
}

async function supabaseLedgerUpsertMember(env, input, options = {}) {
    if (!input?.firebase_uid) return null;
    const nowIso = new Date().toISOString();
    const payload = {
        firebase_uid: input.firebase_uid,
        updated_at: nowIso
    };
    if (input.email !== undefined && String(input.email || '').trim()) payload.email = input.email;
    if (input.login_id !== undefined && String(input.login_id || '').trim()) payload.login_id = input.login_id;
    if (input.loginId !== undefined && String(input.loginId || '').trim()) payload.login_id = input.loginId;
    if (input.name !== undefined && String(input.name || '').trim()) payload.name = input.name;
    if (input.phone !== undefined && String(input.phone || '').trim()) payload.phone = normalizePhoneNumberValue(input.phone);
    if (input.birth_date !== undefined && String(input.birth_date || '').trim()) payload.birth_date = input.birth_date;
    if (input.joined_at !== undefined) payload.joined_at = normalizeLedgerTimestamp(input.joined_at) || null;
    if (input.last_login_at !== undefined) payload.last_login_at = normalizeLedgerTimestamp(input.last_login_at) || null;
    if (input.last_seen_at !== undefined) payload.last_seen_at = normalizeLedgerTimestamp(input.last_seen_at) || null;
    if (input.member_status !== undefined) payload.member_status = input.member_status || 'active';
    if (input.total_paid_amount !== undefined) payload.total_paid_amount = Number(input.total_paid_amount || 0);
    if (input.total_payment_count !== undefined) payload.total_payment_count = Number(input.total_payment_count || 0);
    if (input.last_payment_at !== undefined) payload.last_payment_at = normalizeLedgerTimestamp(input.last_payment_at);
    if (input.last_course_id !== undefined) payload.last_course_id = input.last_course_id || null;
    if (input.last_course_name !== undefined) payload.last_course_name = input.last_course_name || null;
    if (input.last_enrollment_status !== undefined) payload.last_enrollment_status = input.last_enrollment_status || null;
    if (input.last_enrollment_course_id !== undefined) payload.last_enrollment_course_id = input.last_enrollment_course_id || null;
    if (input.last_enrollment_course_name !== undefined) payload.last_enrollment_course_name = input.last_enrollment_course_name || null;
    if (input.last_completion_status !== undefined) payload.last_completion_status = input.last_completion_status || null;
    if (input.last_completion_course_id !== undefined) payload.last_completion_course_id = input.last_completion_course_id || null;
    if (input.last_completion_course_name !== undefined) payload.last_completion_course_name = input.last_completion_course_name || null;
    if (input.last_completion_date !== undefined) payload.last_completion_date = normalizeLedgerTimestamp(input.last_completion_date);
    if (input.total_completion_count !== undefined) payload.total_completion_count = Number(input.total_completion_count || 0);
    if (input.total_document_count !== undefined) payload.total_document_count = Number(input.total_document_count || 0);
    if (input.last_document_at !== undefined) payload.last_document_at = normalizeLedgerTimestamp(input.last_document_at);
    const existingMember = await supabaseLedgerGetMember(env, input.firebase_uid).catch(() => null);
    if (!existingMember?.id && payload.joined_at === undefined) payload.joined_at = nowIso;
    let member;
    if (existingMember?.id) {
        const rows = await supabaseLedgerRequest(env, 'members?id=eq.' + encodeURIComponent(existingMember.id), { method: 'PATCH', prefer: 'return=representation', body: payload });
        member = Array.isArray(rows) ? rows[0] || existingMember : existingMember;
    } else {
        const rows = await supabaseLedgerRequest(env, 'members', { method: 'POST', prefer: 'return=representation', body: payload });
        member = Array.isArray(rows) ? rows[0] || null : rows;
    }
    if (options.eventType) {
        await supabaseLedgerInsertActivity(env, {
            firebase_uid: input.firebase_uid,
            event_type: options.eventType,
            description: options.description || null,
            metadata: options.metadata || null,
            event_at: options.eventAt || input.last_login_at || input.joined_at || nowIso,
            event_key: options.event_key || options.eventKey || null
        });
    }
    return member;
}

async function repairFirestoreUserProfileFromMemberEvent(env, firebaseUser, body = {}) {
    const eventType = ['member_joined', 'member_login', 'profile_updated', 'admin_modified'].includes(String(body.eventType || '')) ? String(body.eventType) : 'member_login';
    const uid = String(firebaseUser?.uid || '').trim();
    if (!uid) return null;
    const nowIso = new Date().toISOString();
    const email = String(body.email || body.loginId || body.login_id || firebaseUser.email || '').trim().toLowerCase();
    const name = String(body.name || firebaseUser.name || '').trim();
    const birthDate = normalizeBirthDateValue(body.birthDate || body.birth_date || body.dateOfBirth || body.date_of_birth || '');
    const phoneNumber = normalizePhoneNumberValue(body.phone || body.phoneNumber || body.phone_number || body.mobile || body.tel || body.telephone || '');
    const provider = String(body.provider || '').trim() || null;
    const payload = {
        uid,
        userId: uid,
        updatedAt: nowIso,
        adminSyncSource: 'member_event',
        adminSyncedAt: nowIso
    };
    if (email) {
        payload.email = email;
        payload.loginId = email;
    }
    if (name) {
        payload.realName = name;
        payload.fullName = name;
        payload.name = name;
    }
    if (isValidBirthDateValue(birthDate)) {
        payload.dateOfBirth = birthDate;
        payload.birthDate = birthDate;
        payload.certificateIdentity = { realName: name || null, dateOfBirth: birthDate, lockSource: 'signup', lockedAt: nowIso };
    }
    if (phoneNumber) {
        payload.phoneNumber = phoneNumber;
        payload.phone = phoneNumber;
    }
    if (provider) payload.provider = provider;
    if (eventType === 'member_login') payload.lastLoginAt = nowIso;
    const existing = await firestoreGetDataOrNull(env, 'users', uid).catch((error) => {
        console.warn('[member-event:firestore-profile-read-failed]', { uid: maskLogIdentifier(uid), message: error instanceof Error ? error.message : String(error) });
        return null;
    });
    if (existing?.certificateIdentity?.dateOfBirth && payload.certificateIdentity) delete payload.certificateIdentity;
    if (!existing) {
        const hasRequiredProfileInput = Boolean(name && isValidBirthDateValue(birthDate));
        if (!hasRequiredProfileInput && eventType !== 'member_joined' && eventType !== 'profile_updated') return null;
        payload.createdAt = eventType === 'member_joined' ? (body.joinedAt || nowIso) : nowIso;
        payload.joinedAt = eventType === 'member_joined' ? (body.joinedAt || nowIso) : nowIso;
        payload.crmJoinedAt = eventType === 'member_joined' ? (body.joinedAt || nowIso) : nowIso;
        if (payload.lastLoginAt === undefined) payload.lastLoginAt = nowIso;
    } else if (eventType === 'member_joined') {
        if (!existing.createdAt) payload.createdAt = body.joinedAt || nowIso;
        if (!existing.joinedAt) payload.joinedAt = body.joinedAt || nowIso;
        if (!existing.crmJoinedAt) payload.crmJoinedAt = body.joinedAt || nowIso;
    }
    return firestorePatch(env, firestoreDocumentPath(env, 'users', uid), payload);
}

async function supabaseLedgerRecordMemberEvent(env, firebaseUser, body = {}) {
    const eventType = ['member_joined', 'member_login', 'profile_updated', 'admin_modified'].includes(String(body.eventType || '')) ? String(body.eventType) : 'member_login';
    const nowIso = new Date().toISOString();
    return supabaseLedgerUpsertMember(env, {
        firebase_uid: firebaseUser.uid,
        email: firebaseUser.email || body.email || null,
        login_id: body.loginId || body.login_id || firebaseUser.email || body.email || null,
        name: body.name || firebaseUser.name || null,
        phone: normalizePhoneNumberValue(body.phone || body.phoneNumber || body.phone_number || body.mobile || '') || null,
        birth_date: isValidBirthDateValue(body.birthDate || body.birth_date || body.dateOfBirth || body.date_of_birth || '') ? normalizeBirthDateValue(body.birthDate || body.birth_date || body.dateOfBirth || body.date_of_birth || '') : null,
        joined_at: eventType === 'member_joined' ? (body.joinedAt || nowIso) : undefined,
        last_login_at: eventType === 'member_login' ? nowIso : undefined,
        last_seen_at: eventType === 'member_login' ? nowIso : undefined,
        member_status: 'active'
    }, {
        eventType,
        description: body.description || (eventType === 'member_joined' ? 'Firebase 회원가입' : eventType === 'member_login' ? 'Firebase 로그인' : eventType === 'profile_updated' ? '회원 정보 수정' : '관리자 수정'),
        metadata: { source: 'firebase_auth', provider: body.provider || null },
        event_key: eventType === 'member_joined' ? 'member_joined:' + firebaseUser.uid : undefined
    });
}

async function supabaseLedgerRecordPayment(env, paymentRecord, options = {}) {
    const uid = paymentRecord.uid || paymentRecord.userId || paymentRecord.firebase_uid || paymentRecord.firebaseUid || paymentRecord.user_id;
    const orderId = paymentRecord.orderId || paymentRecord.order_id || paymentRecord.paymentId || paymentRecord.payment_id;
    if (!uid || !orderId) return null;
    const existingRows = await supabaseLedgerRequest(env, 'payments?select=*&order_id=eq.' + encodeURIComponent(orderId) + '&limit=1');
    const existing = Array.isArray(existingRows) ? existingRows[0] || null : null;
    const payload = {
        firebase_uid: uid,
        order_id: orderId,
        payment_id: paymentRecord.paymentId || paymentRecord.payment_id || paymentRecord.paymentKey || paymentRecord.payment_key || null,
        login_id: paymentRecord.loginId || paymentRecord.login_id || paymentRecord.email || paymentRecord.userEmail || paymentRecord.user_email || paymentRecord.customerEmail || paymentRecord.customer_email || paymentRecord.buyerEmail || paymentRecord.buyer_email || null,
        email: paymentRecord.email || paymentRecord.userEmail || paymentRecord.user_email || paymentRecord.customerEmail || paymentRecord.customer_email || paymentRecord.buyerEmail || paymentRecord.buyer_email || null,
        member_name: paymentRecord.userName || paymentRecord.user_name || paymentRecord.memberName || paymentRecord.member_name || paymentRecord.customerName || paymentRecord.customer_name || paymentRecord.buyerName || paymentRecord.buyer_name || paymentRecord.certificateName || paymentRecord.certificate_name || null,
        course_id: paymentRecord.canonicalCourseId || paymentRecord.courseId || null,
        course_name: getLedgerCourseName(paymentRecord),
        amount: Number(paymentRecord.amount || paymentRecord.paidAmount || 0),
        product_type: paymentRecord.productType || paymentRecord.product_type || paymentRecord.productId || paymentRecord.product_id || null,
        course_category: paymentRecord.courseCategory || paymentRecord.course_category || paymentRecord.categoryId || paymentRecord.category_id || paymentRecord.courseLevel || null,
        list_price: paymentRecord.listPrice == null ? null : Number(paymentRecord.listPrice || 0),
        discount_amount: paymentRecord.discountAmount == null ? null : Number(paymentRecord.discountAmount || 0),
        coupon_used: Boolean(paymentRecord.couponUsed || paymentRecord.couponId || paymentRecord.couponCode),
        payment_method: paymentRecord.paymentMethod || paymentRecord.method || paymentRecord.payMethod || null,
        payment_type: paymentRecord.paymentType || paymentRecord.methodType || paymentRecord.payMethodType || null,
        payment_status: paymentRecord.paymentStatus || paymentRecord.payment_status || paymentRecord.status || 'paid',
        paid_at: normalizeLedgerTimestamp(paymentRecord.paidAt || paymentRecord.paid_at || paymentRecord.approvedAt || paymentRecord.approved_at || paymentRecord.purchasedAt || paymentRecord.purchased_at || paymentRecord.createdAt || paymentRecord.created_at),
        refund_status: paymentRecord.refundStatus || (paymentRecord.refundedAt ? 'refunded' : 'none'),
        refunded_at: normalizeLedgerTimestamp(paymentRecord.refundedAt || paymentRecord.cancelledAt || paymentRecord.canceledAt),
        refund_amount: paymentRecord.refundAmount == null ? null : Number(paymentRecord.refundAmount || 0),
        pg_provider: paymentRecord.paymentProvider || paymentRecord.pgProvider || 'portone-kcp-v2'
    };
    let paymentRow = existing;
    if (existing && options.preserveExisting) {
        const safePatch = {};
        for (const [key, value] of Object.entries(payload)) {
            if (value !== undefined && value !== null && value !== '' && (existing[key] === undefined || existing[key] === null || existing[key] === '')) safePatch[key] = value;
        }
        if (Object.keys(safePatch).length) {
            const rows = await supabaseLedgerRequest(env, 'payments?id=eq.' + encodeURIComponent(existing.id), { method: 'PATCH', prefer: 'return=representation', body: safePatch });
            paymentRow = Array.isArray(rows) ? rows[0] || existing : existing;
        } else {
            paymentRow = existing;
        }
    } else if (existing) {
        const rows = await supabaseLedgerRequest(env, 'payments?order_id=eq.' + encodeURIComponent(orderId), { method: 'PATCH', prefer: 'return=representation', body: payload });
        paymentRow = Array.isArray(rows) ? rows[0] || existing : existing;
    } else {
        const rows = await supabaseLedgerRequest(env, 'payments', { method: 'POST', prefer: 'return=representation', body: payload });
        paymentRow = Array.isArray(rows) ? rows[0] || null : rows;
    }
    const member = await supabaseLedgerGetMember(env, uid).catch(() => null);
    const amountToAdd = existing ? 0 : Number(payload.amount || 0);
    await supabaseLedgerUpsertMember(env, {
        firebase_uid: uid,
        email: payload.email || null,
        login_id: payload.login_id || payload.email || null,
        name: payload.member_name || null,
        phone: paymentRecord.phoneNumber || paymentRecord.phone_number || paymentRecord.buyerPhone || paymentRecord.customerPhone || paymentRecord.rawResponse?.customer?.phoneNumber || paymentRecord.rawResponse?.customer?.phone || null,
        birth_date: paymentRecord.birthDate || paymentRecord.dateOfBirth || paymentRecord.date_of_birth || paymentRecord.certificateBirthDate || paymentRecord.certificate_birth_date || null,
        total_paid_amount: Number(member?.total_paid_amount || 0) + amountToAdd,
        total_payment_count: Number(member?.total_payment_count || 0) + (existing ? 0 : 1),
        last_payment_at: payload.paid_at,
        last_course_id: payload.course_id,
        last_course_name: payload.course_name,
        member_status: member?.member_status || 'active'
    });
    await supabaseLedgerInsertActivity(env, {
        firebase_uid: uid,
        event_type: String(payload.payment_status).toLowerCase().includes('fail') ? 'payment_failed' : 'payment_completed',
        course_id: payload.course_id,
        course_name: payload.course_name,
        order_id: orderId,
        description: `${payload.course_name || '과정'} ${payload.amount.toLocaleString('ko-KR')}원`,
        metadata: { payment_id: payload.payment_id, payment_method: payload.payment_method, payment_status: payload.payment_status, inserted: !existing, source_collection: paymentRecord.sourceCollection || null },
        event_at: payload.paid_at || new Date().toISOString(),
        event_key: (String(payload.payment_status).toLowerCase().includes('fail') ? 'payment_failed:' : 'payment_completed:') + orderId
    });
    return paymentRow;
}

async function supabaseLedgerFindPaymentByOrder(env, orderId) {
    if (!orderId) return null;
    const rows = await supabaseLedgerRequest(env, 'payments?select=id&order_id=eq.' + encodeURIComponent(orderId) + '&limit=1');
    return Array.isArray(rows) ? rows[0] || null : null;
}

async function supabaseLedgerUpsertEnrollment(env, enrollment) {
    const uid = enrollment.uid || enrollment.userId;
    const courseId = enrollment.courseId || enrollment.canonicalCourseId;
    if (!uid || !courseId) return null;
    const orderId = enrollment.orderId || enrollment.paymentId || null;
    const payment = await supabaseLedgerFindPaymentByOrder(env, orderId).catch(() => null);
    const existingPath = 'enrollments?select=id,completion_date,certificate_first_issued_at,certificate_issue_count&firebase_uid=eq.' + encodeURIComponent(uid) + '&course_id=eq.' + encodeURIComponent(courseId) + (orderId ? '&order_id=eq.' + encodeURIComponent(orderId) : '') + '&limit=1';
    const existingRows = await supabaseLedgerRequest(env, existingPath);
    const existing = Array.isArray(existingRows) ? existingRows[0] || null : null;
    const isCompleted = Boolean(enrollment.completionStatus === 'completed' || enrollment.completedAt || enrollment.completionDate || Number(enrollment.progress || 0) >= 100 || Number(enrollment.completedLessons || 0) >= Number(enrollment.totalLessons || 999999));
    const payload = {
        firebase_uid: uid,
        payment_record_id: payment?.id || null,
        order_id: orderId,
        course_id: courseId,
        course_name: getLedgerCourseName(enrollment),
        started_at: normalizeLedgerTimestamp(enrollment.startedAt || enrollment.startsAt || enrollment.accessStartsAt || enrollment.purchasedAt || enrollment.createdAt),
        expires_at: normalizeLedgerTimestamp(enrollment.expiresAt || enrollment.accessEndsAt),
        last_studied_at: normalizeLedgerTimestamp(enrollment.lastStudiedAt || enrollment.lastLearnedAt || enrollment.updatedAt),
        progress: Number(enrollment.progress ?? enrollment.progressRate ?? 0),
        enrollment_status: enrollment.enrollmentStatus || enrollment.accessStatus || enrollment.status || null,
        completion_status: isCompleted ? 'completed' : (Number(enrollment.progress || 0) > 0 ? 'in_progress' : 'not_started'),
        completion_date: existing?.completion_date || normalizeLedgerTimestamp(enrollment.completionDate || enrollment.completedAt),
        first_completed_at: existing?.completion_date || normalizeLedgerTimestamp(enrollment.firstCompletedAt || enrollment.completionDate || enrollment.completedAt),
        quiz_completed: enrollment.quizCompleted === undefined ? null : Boolean(enrollment.quizCompleted),
        assignment_completed: enrollment.assignmentCompleted === undefined ? null : Boolean(enrollment.assignmentCompleted),
        pre_assessment_completed: enrollment.preAssessmentCompleted === undefined ? null : Boolean(enrollment.preAssessmentCompleted),
        post_assessment_completed: enrollment.postAssessmentCompleted === undefined ? null : Boolean(enrollment.postAssessmentCompleted),
        certificate_issued: Boolean(enrollment.certificateIssued || existing?.certificate_first_issued_at),
        certificate_first_issued_at: existing?.certificate_first_issued_at || normalizeLedgerTimestamp(enrollment.certificateFirstIssuedAt || enrollment.certificateIssuedAt || enrollment.issuedAt),
        last_certificate_issued_at: normalizeLedgerTimestamp(enrollment.lastCertificateIssuedAt || enrollment.certificateIssuedAt || enrollment.issuedAt),
        certificate_issue_count: Number(existing?.certificate_issue_count || (enrollment.certificateIssued ? 1 : 0)),
        updated_at: new Date().toISOString()
    };
    let result;
    if (existing) {
        const rows = await supabaseLedgerRequest(env, 'enrollments?id=eq.' + encodeURIComponent(existing.id), { method: 'PATCH', prefer: 'return=representation', body: payload });
        result = Array.isArray(rows) ? rows[0] || existing : existing;
    } else {
        const rows = await supabaseLedgerRequest(env, 'enrollments', { method: 'POST', prefer: 'return=representation', body: payload });
        result = Array.isArray(rows) ? rows[0] || null : rows;
        await supabaseLedgerInsertActivity(env, { firebase_uid: uid, event_type: 'course_started', course_id: courseId, course_name: payload.course_name, order_id: orderId, description: payload.course_name || courseId, event_at: payload.started_at || new Date().toISOString(), event_key: 'course_started:' + uid + ':' + courseId + ':' + (orderId || 'no-order') });
    }
    const memberPatch = { firebase_uid: uid, last_enrollment_status: payload.enrollment_status, last_enrollment_course_id: courseId, last_enrollment_course_name: payload.course_name, last_completion_status: payload.completion_status, last_completion_date: payload.completion_date, last_course_id: courseId, last_course_name: payload.course_name };
    if (payload.completion_status === 'completed') {
        memberPatch.last_completion_course_id = courseId;
        memberPatch.last_completion_course_name = payload.course_name;
    }
    await supabaseLedgerUpsertMember(env, memberPatch);
    if (payload.completion_status === 'completed' && payload.completion_date && !existing?.completion_date) {
        await supabaseLedgerInsertActivity(env, { firebase_uid: uid, event_type: 'course_completed', course_id: courseId, course_name: payload.course_name, order_id: orderId, description: payload.course_name || courseId, event_at: payload.completion_date, event_key: 'course_completed:' + uid + ':' + courseId + ':' + (orderId || 'no-order') });
    }
    return result;
}

async function supabaseLedgerRecordCertificateIssue(env, input) {
    const uid = input.uid || input.userId;
    const courseId = input.courseId;
    if (!uid || !courseId) return null;
    const rows = await supabaseLedgerRequest(env, 'enrollments?select=id,certificate_first_issued_at,certificate_issue_count&firebase_uid=eq.' + encodeURIComponent(uid) + '&course_id=eq.' + encodeURIComponent(courseId) + '&limit=1');
    const enrollment = Array.isArray(rows) ? rows[0] || null : null;
    const issuedAt = normalizeLedgerTimestamp(input.issuedAt || input.certificateIssuedAt) || new Date().toISOString();
    const firstIssuedAt = enrollment?.certificate_first_issued_at || issuedAt;
    const previousCount = Number(enrollment?.certificate_issue_count || 0);
    const nextCount = Math.max(1, previousCount + 1);
    if (enrollment?.id) {
        await supabaseLedgerRequest(env, 'enrollments?id=eq.' + encodeURIComponent(enrollment.id), {
            method: 'PATCH',
            prefer: 'return=minimal',
            body: { certificate_issued: true, certificate_first_issued_at: firstIssuedAt, last_certificate_issued_at: issuedAt, certificate_issue_count: nextCount, updated_at: new Date().toISOString() }
        });
    }
    await supabaseLedgerRecordDocument(env, { uid, courseId, courseName: input.courseName || null, orderId: input.orderId || null, documentType: 'certificate', documentName: input.courseName ? input.courseName + ' 수료증' : '수료증', documentAction: previousCount > 0 || enrollment?.certificate_first_issued_at ? 'reissued' : 'generated', certificateId: input.certificateId || null, certificateNo: input.certificateNo || null, firstIssuedAt, eventAt: issuedAt, issueCount: nextCount, source: 'certificate_issue' });
    await supabaseLedgerInsertActivity(env, {
        firebase_uid: uid,
        event_type: previousCount > 0 || enrollment?.certificate_first_issued_at ? 'certificate_reissued' : 'certificate_first_issued',
        course_id: courseId,
        course_name: input.courseName || null,
        order_id: input.orderId || null,
        description: input.certificateNo || input.certificateId || null,
        metadata: { certificate_id: input.certificateId || null, certificate_no: input.certificateNo || null, issue_count: nextCount },
        event_at: issuedAt,
        event_key: (previousCount > 0 || enrollment?.certificate_first_issued_at ? 'certificate_reissued:' : 'certificate_first_issued:') + uid + ':' + courseId + ':' + (input.certificateId || input.certificateNo || issuedAt)
    });
    return { firstIssuedAt, issuedAt, issueCount: nextCount };
}

async function supabaseLedgerRecordDocument(env, input) {
    const uid = input.uid || input.userId || input.firebase_uid;
    if (!uid) return null;
    const nowIso = new Date().toISOString();
    const action = String(input.documentAction || input.action || 'generated').trim() || 'generated';
    const documentType = String(input.documentType || input.documentKind || 'document').trim() || 'document';
    const documentName = input.documentName || input.documentTitle || input.materialTitle || input.certificateNo || documentType;
    const eventAt = normalizeLedgerTimestamp(input.eventAt || input.generatedAt || input.issuedAt || input.createdAt) || nowIso;
    const eventKey = input.eventKey || [uid, input.courseId || 'no-course', input.orderId || input.paymentId || 'no-order', documentType, action, input.documentKey || input.certificateId || input.materialId || eventAt].join(':');
    const existingRows = await supabaseLedgerRequest(env, 'documents?select=id,first_issued_at,issue_count,print_count,download_count&event_key=eq.' + encodeURIComponent(eventKey) + '&limit=1').catch(() => []);
    const existing = Array.isArray(existingRows) ? existingRows[0] || null : null;
    if (existing) return existing;
    const isDownload = ['pdf', 'download', 'downloaded'].includes(action);
    const isPrint = ['print', 'printed', 'print_requested'].includes(action);
    const normalizedAction = action === 'pdf' ? 'downloaded' : action === 'print' ? 'print_requested' : action;
    const payload = {
        firebase_uid: uid,
        course_id: input.courseId || null,
        course_name: input.courseName || input.courseTitle || null,
        order_id: input.orderId || input.paymentId || null,
        document_type: documentType,
        document_name: documentName || null,
        document_action: normalizedAction,
        generated_at: ['generated', 'reissued'].includes(normalizedAction) ? eventAt : null,
        first_issued_at: normalizeLedgerTimestamp(input.firstIssuedAt || input.firstDocumentOutputAt || input.certificateFirstIssuedAt) || eventAt,
        printed_at: isPrint ? eventAt : null,
        downloaded_at: isDownload ? eventAt : null,
        issue_count: Number(input.issueCount || (['generated', 'reissued'].includes(normalizedAction) ? 1 : 0)),
        print_count: Number(input.printCount || (isPrint ? 1 : 0)),
        download_count: Number(input.downloadCount || (isDownload ? 1 : 0)),
        document_status: input.documentStatus || input.status || 'recorded',
        template_version: input.templateVersion || null,
        metadata: input.metadata || null,
        event_key: eventKey,
        created_at: eventAt,
        updated_at: nowIso
    };
    const rows = await supabaseLedgerRequest(env, 'documents?on_conflict=event_key', { method: 'POST', prefer: 'resolution=ignore-duplicates,return=representation', body: payload });
    const documentRow = Array.isArray(rows) ? rows[0] || null : rows;
    const member = await supabaseLedgerGetMember(env, uid).catch(() => null);
    await supabaseLedgerUpsertMember(env, {
        firebase_uid: uid,
        total_document_count: Number(member?.total_document_count || 0) + 1,
        last_document_at: eventAt
    });
    const eventTypeByAction = {
        generated: 'document_generated',
        previewed: 'document_previewed',
        downloaded: 'document_downloaded',
        print_requested: 'document_print_requested',
        reissued: 'document_reissued'
    };
    await supabaseLedgerInsertActivity(env, {
        firebase_uid: uid,
        event_type: eventTypeByAction[normalizedAction] || 'document_generated',
        course_id: input.courseId || null,
        course_name: input.courseName || input.courseTitle || null,
        order_id: input.orderId || input.paymentId || null,
        document_type: documentType,
        document_name: documentName || null,
        description: documentName || documentType,
        metadata: { ...(input.metadata || {}), document_action: normalizedAction, source: input.source || null },
        event_at: eventAt,
        event_key: 'activity:' + eventKey
    });
    return documentRow;
}

async function handleSupabaseLedgerMemberEvent(request, env, corsHeaders) {
    const authHeader = request.headers.get('Authorization') || '';
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!idToken) return json({ ok: false, message: '로그인이 필요합니다.', code: 'AUTH_REQUIRED' }, 401, corsHeaders);
    const firebaseUser = await verifyFirebaseIdToken(idToken, env);
    const body = await request.json().catch(() => ({}));
    let firestoreProfile = null;
    try {
        firestoreProfile = await repairFirestoreUserProfileFromMemberEvent(env, firebaseUser, body);
    } catch (error) {
        console.error('[member-event:firestore-profile-repair-failed]', { uid: maskLogIdentifier(firebaseUser.uid), message: error instanceof Error ? error.message : String(error) });
        return json({ ok: false, message: error instanceof Error ? error.message : 'Firestore 회원정보 저장에 실패했습니다.', code: 'FIRESTORE_PROFILE_WRITE_FAILED' }, 500, corsHeaders);
    }
    if (!firestoreProfile && ['member_joined', 'profile_updated'].includes(String(body.eventType || ''))) {
        return json({ ok: false, message: 'Firestore 회원정보가 저장되지 않았습니다.', code: 'FIRESTORE_PROFILE_NOT_WRITTEN' }, 500, corsHeaders);
    }
    try {
        const member = await supabaseLedgerRecordMemberEvent(env, firebaseUser, body);
        return json({ ok: true, member, firestoreProfileUpdated: Boolean(firestoreProfile) }, 200, corsHeaders);
    } catch (error) {
        console.error('[supabase-ledger:member-event:failed]', { uid: maskLogIdentifier(firebaseUser.uid), message: error instanceof Error ? error.message : String(error) });
        return json({ ok: false, message: 'Supabase 원장 기록에 실패했습니다.', code: 'SUPABASE_LEDGER_FAILED', firestoreProfileUpdated: Boolean(firestoreProfile) }, 500, corsHeaders);
    }
}


async function handleSupabaseLedgerProgressEvent(request, env, corsHeaders) {
    const authHeader = request.headers.get('Authorization') || '';
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!idToken) return json({ ok: false, message: '로그인이 필요합니다.', code: 'AUTH_REQUIRED' }, 401, corsHeaders);
    const firebaseUser = await verifyFirebaseIdToken(idToken, env);
    const body = await request.json().catch(() => ({}));
    const courseId = String(body.courseId || '').trim();
    if (!courseId) return json({ ok: false, message: 'courseId가 필요합니다.', code: 'COURSE_ID_REQUIRED' }, 400, corsHeaders);
    try {
        const progress = Math.max(0, Math.min(100, Number(body.progress || body.completionRate || 0)));
        const completed = Boolean(body.isCompleted || progress >= 100);
        await supabaseLedgerUpsertEnrollment(env, {
            uid: firebaseUser.uid,
            userId: firebaseUser.uid,
            courseId,
            courseName: body.courseName || courseId,
            progress,
            completedAt: completed ? (body.completedAt || new Date().toISOString()) : null,
            completionStatus: completed ? 'completed' : progress > 0 ? 'in_progress' : 'not_started',
            enrollmentStatus: body.enrollmentStatus || 'active',
            accessStatus: body.enrollmentStatus || 'active'
        });
        await supabaseLedgerInsertActivity(env, { firebase_uid: firebaseUser.uid, event_type: completed ? 'course_completed' : 'course_progress_updated', course_id: courseId, course_name: body.courseName || courseId, description: String(progress) + '%', metadata: { progress, completed }, event_at: completed ? (body.completedAt || new Date().toISOString()) : new Date().toISOString() });
        return json({ ok: true }, 200, corsHeaders);
    } catch (error) {
        console.error('[supabase-ledger:progress:failed]', { uid: maskLogIdentifier(firebaseUser.uid), courseId, message: error instanceof Error ? error.message : String(error) });
        return json({ ok: false, message: 'Supabase 진도 원장 기록에 실패했습니다.', code: 'SUPABASE_LEDGER_PROGRESS_FAILED' }, 500, corsHeaders);
    }
}

async function handleCurrentUser(request, env, corsHeaders) {
    assertBaseEnv(env);
    const sessionValue = getCookie(request, 'app_session');
    const session = await verifySessionValue(sessionValue, env.SESSION_SECRET);
    return json({ user: session }, 200, corsHeaders);
}

function getAdminEmailsFromEnvValue(env) {
    return String(env.ADMIN_EMAILS || 'cfv47@naver.com').split(',').map((email) => email.trim().toLowerCase()).filter(Boolean);
}

function isWorkerAdminUser(user, env) {
    return Boolean(user?.email && getAdminEmailsFromEnvValue(env).includes(String(user.email).toLowerCase()));
}

function maskLogIdentifier(value) {
    const text = String(value || '');
    if (!text) return '';
    if (text.length <= 8) return text.slice(0, 2) + '***';
    return text.slice(0, 4) + '***' + text.slice(-4);
}

function logEnrollmentWorkerEvent(event, details = {}) {
    console.info('[enrollments:worker]', {
        event,
        ...details
    });
}

function normalizeEnrollmentStatus(value) {
    return String(value || '').trim().toLowerCase();
}

function normalizeEnrollmentSourceType(enrollment = {}) {
    const raw = String(enrollment.sourceType || enrollment.grantType || enrollment.issueType || enrollment.source || '').trim().toUpperCase();
    if (['MANUAL_GRANT', 'ADMIN_MANUAL', 'ADMIN', 'ADMIN_GRANTED'].includes(raw)) return 'MANUAL';
    if (['PAYMENT_AUTO_RECOVERY', 'TRUSTED_PAYMENT_RECORD', 'PAID_RECORD', 'PORTONE', 'PORTONE_KCP', 'KCP', 'NHN_KCP'].includes(raw)) return 'MIGRATION';
    if (raw === 'FREE') return 'PROMOTION';
    if (raw) return raw;
    if (enrollment.adminGranted === true || enrollment.paymentStatus == null && enrollment.paymentId == null && enrollment.orderId == null) return 'MANUAL';
    const paymentStatus = normalizeEnrollmentStatus(enrollment.paymentStatus || enrollment.paymentState || enrollment.status);
    if (['paid', 'done', 'completed', 'approved', 'success'].includes(paymentStatus) || enrollment.paymentId || enrollment.orderId) return 'PAYMENT';
    return '';
}

function isAllowedEnrollmentSourceType(enrollment) {
    return ALLOWED_ENROLLMENT_SOURCE_TYPES.has(normalizeEnrollmentSourceType(enrollment));
}

function getEnrollmentRecordTime(value) {
    if (!value) return null;
    const time = value instanceof Date ? value.getTime() : new Date(value).getTime();
    return Number.isFinite(time) ? time : null;
}

function getEnrollmentAccessDecision(enrollment, uid, courseId) {
    if (!enrollment) return { allowed: false, reason: 'NO_ENROLLMENT' };
    const ownerId = enrollment.userId || enrollment.uid || '';
    if (uid && ownerId && ownerId !== uid) return { allowed: false, reason: 'USER_MISMATCH' };
    const enrollmentCourseId = resolveCanonicalCourseId({
        canonicalCourseId: enrollment.canonicalCourseId,
        courseId: enrollment.courseId,
        productId: enrollment.productId,
        paymentProductId: enrollment.paymentProductId,
        lectureId: enrollment.lectureId,
        slug: enrollment.slug,
        categoryId: enrollment.categoryId,
        productTitle: enrollment.productTitle,
        courseTitle: enrollment.courseTitle,
        orderName: enrollment.orderName
    }) || enrollment.canonicalCourseId || enrollment.courseId || '';
    if (courseId && enrollmentCourseId && enrollmentCourseId !== courseId) return { allowed: false, reason: 'COURSE_MISMATCH' };
    if (enrollment.deletedAt || enrollment.isDeleted === true || enrollment.deleted === true) return { allowed: false, reason: 'DELETED_ENROLLMENT' };
    if (!isAllowedEnrollmentSourceType(enrollment)) return { allowed: false, reason: 'UNSUPPORTED_SOURCE_TYPE' };

    const paymentStatus = normalizeEnrollmentStatus(enrollment.paymentStatus || enrollment.paymentState);
    const paidLike = ['paid', 'done', 'completed', 'approved', 'success'].includes(paymentStatus);
    const activeFlag = enrollment.isActive === true || enrollment.active === true || enrollment.enabled === true || enrollment.accessGranted === true;
    const accessStatus = normalizeEnrollmentStatus(enrollment.enrollmentStatus || enrollment.accessStatus || enrollment.status || (activeFlag || paidLike ? 'active' : ''));
    const blockedStatuses = ['cancelled', 'canceled', 'refunded', 'failed', 'pending', 'awaiting_deposit', 'ready', 'revoked', 'deleted'];
    if (blockedStatuses.includes(paymentStatus) || blockedStatuses.includes(accessStatus)) return { allowed: false, reason: 'INACTIVE_ENROLLMENT' };
    if (accessStatus === 'expired') return { allowed: false, reason: 'EXPIRED' };
    if (enrollment.isActive === false || enrollment.active === false || enrollment.enabled === false || accessStatus === 'inactive' || accessStatus === 'disabled') return { allowed: false, reason: 'INACTIVE_ENROLLMENT' };
    if (!accessStatus) return { allowed: false, reason: 'INACTIVE_ENROLLMENT' };
    if (!['active', 'paid', 'done', 'completed', 'approved', 'success', 'enrolled', 'granted', 'valid', 'available'].includes(accessStatus)) return { allowed: false, reason: 'INACTIVE_ENROLLMENT' };

    const startsAt = getEnrollmentRecordTime(enrollment.startsAt || enrollment.accessStartsAt || enrollment.startAt || enrollment.purchasedAt || enrollment.grantedAt || enrollment.createdAt);
    if (startsAt && startsAt > Date.now()) return { allowed: false, reason: 'NOT_STARTED' };
    const expiresAt = getEnrollmentRecordTime(enrollment.expiresAt || enrollment.accessEndsAt || enrollment.endsAt || enrollment.endAt);
    if (expiresAt && expiresAt < Date.now()) return { allowed: false, reason: 'EXPIRED' };

    return { allowed: true, reason: 'OK' };
}

function isFirestoreEnrollmentActiveRecord(enrollment) {
    return getEnrollmentAccessDecision(enrollment).allowed;
}

function isExplicitlyBlockedEnrollmentRecord(enrollment) {
    if (!enrollment) return false;
    return ['DELETED_ENROLLMENT', 'INACTIVE_ENROLLMENT', 'EXPIRED'].includes(getEnrollmentAccessDecision(enrollment).reason);
}

function logEnrollmentAccessDecision(requestPath, uid, courseId, enrollment, decision) {
    logEnrollmentWorkerEvent('enrollment_access_decision', {
        userId: maskLogIdentifier(uid),
        courseId,
        enrollmentId: enrollment?.enrollmentId || enrollment?.id || null,
        sourceType: enrollment?.sourceType || enrollment?.grantType || enrollment?.issueType || (enrollment?.adminGranted ? 'MANUAL' : 'PAYMENT'),
        status: enrollment?.enrollmentStatus || enrollment?.accessStatus || enrollment?.status || null,
        isActive: enrollment?.isActive !== undefined ? Boolean(enrollment.isActive) : null,
        startsAt: enrollment?.startsAt || enrollment?.accessStartsAt || null,
        expiresAt: enrollment?.expiresAt || enrollment?.accessEndsAt || null,
        accessAllowed: Boolean(decision?.allowed),
        accessDeniedReason: decision?.allowed ? null : decision?.reason || 'NO_ENROLLMENT',
        requestPath,
        checkedAt: new Date().toISOString()
    });
}

function resolveApplicationProductIdFromRecord(source = {}, fallbackProductId = 'basic') {
    if (source.productId && APPLICATION_PRODUCTS[source.productId]) return source.productId;
    const byCourse = Object.values(APPLICATION_PRODUCTS).find((product) => product.courseId === source.courseId);
    if (byCourse) return byCourse.productId;
    const sourceAmount = Number(source.amount || source.totalAmount || 0);
    if (source.productId === 'dui-cbt-advanced' || source.courseId === CBT_COURSE_PRODUCT.courseId || sourceAmount >= APPLICATION_PRODUCTS['dui-cbt-advanced'].amount) {
        return 'dui-cbt-advanced';
    }
    if (source.productId === 'dui-documents' || sourceAmount >= APPLICATION_PRODUCTS['dui-cbt-basic'].amount) {
        return source.productId === 'dui-documents' ? 'dui-documents' : 'dui-cbt-basic';
    }
    return source.productId || fallbackProductId;
}

async function repairCanonicalWorkerEnrollment(env, uid, courseId, source, canonicalPath) {
    const nowIso = new Date().toISOString();
    const sourceProductId = resolveApplicationProductIdFromRecord(source);
    const repaired = {
        enrollmentId: uid + '_' + courseId,
        userId: uid,
        uid,
        courseId,
        courseTitle: source.courseTitle || APPLICATION_PRODUCTS[sourceProductId]?.courseTitle || getCourseProduct(courseId)?.courseTitle || DUI_COURSE_PRODUCT.courseTitle,
        categoryId: source.categoryId || 'dui',
        productId: sourceProductId,
        productTitle: source.productTitle || APPLICATION_PRODUCTS[sourceProductId]?.title || APPLICATION_PRODUCTS.basic.title,
        amount: Number(source.amount) || APPLICATION_PRODUCTS[sourceProductId]?.amount || APPLICATION_PRODUCTS.basic.amount,
        paymentId: source.paymentId || source.paymentKey || null,
        orderId: source.orderId || source.id || null,
        purchasedAt: source.purchasedAt || source.approvedAt || source.orderedAt || source.createdAt || nowIso,
        expiresAt: source.expiresAt || null,
        sourceType: ['PAYMENT', 'MANUAL', 'MIGRATION', 'PROMOTION', 'ADMIN_TEST', 'EXTENSION'].includes(normalizeEnrollmentSourceType(source)) ? normalizeEnrollmentSourceType(source) : (source.adminGranted ? 'MANUAL' : 'PAYMENT'),
        paymentStatus: source.adminGranted || normalizeEnrollmentSourceType(source) === 'MANUAL' ? null : (source.paymentStatus || source.status || 'paid'),
        status: 'active',
        isActive: true,
        startsAt: source.startsAt || source.accessStartsAt || source.purchasedAt || source.approvedAt || source.createdAt || nowIso,
        accessStatus: source.accessStatus || source.enrollmentStatus || 'active',
        progress: Number(source.progress) || 0,
        completedLessons: Number(source.completedLessons) || 0,
        totalLessons: Number(source.totalLessons) || APPLICATION_PRODUCTS[sourceProductId]?.totalLessons || getCourseProduct(courseId)?.totalLessons || DUI_COURSE_PRODUCT.totalLessons,
        certificateIssued: Boolean(source.certificateIssued),
        certificateIssuedAt: source.certificateIssuedAt || null,
        certificateId: source.certificateId || null,
        certificateNo: source.certificateNo || null,
        recoveredFrom: source.recordSource || 'trusted_payment_record',
        recoveredAt: nowIso,
        createdAt: source.createdAt || nowIso,
        updatedAt: nowIso
    };
    const saved = await grantCourseAccess(env, { ...repaired, canonicalCourseId: courseId, source: repaired.sourceType === 'MANUAL' ? 'manual' : repaired.recoveredFrom === 'trusted_payment_record' ? 'migration' : 'payment' });
    logEnrollmentWorkerEvent('enrollment_canonical_repaired', { uid: maskLogIdentifier(uid), courseId, source: repaired.recoveredFrom });
    return { ...source, ...saved, id: repaired.enrollmentId, documentPath: canonicalPath, recordSource: 'root_repaired' };
}

async function getPaymentLikeRecordsForEntitlement(env, uid, email = "") {
    const collections = ["purchases", "payments", "orders"];
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const runQueries = async (specs) => {
        const results = await Promise.all(specs.map(({ collectionName, field, value, lookupType }) =>
            firestoreQuery(env, collectionName, [{ field, value }]).catch((error) => {
                logEnrollmentWorkerEvent("entitlement_payment_query_failed", { collectionName, field, lookupType, uid: maskLogIdentifier(uid), email: normalizedEmail ? maskLogIdentifier(normalizedEmail) : null, message: error instanceof Error ? error.message : String(error) });
                return [];
            })
        ));
        return results.flat();
    };
    const dedupe = (rows) => {
        const byPath = new Map();
        rows.forEach((row) => {
            const rowUid = String(row.uid || row.userId || row.firebaseUid || row.customerUid || row.buyerUid || "").trim();
            const rowEmail = String(row.email || row.userEmail || row.customerEmail || row.buyerEmail || "").trim().toLowerCase();
            if (rowUid === uid || (normalizedEmail && rowEmail === normalizedEmail)) byPath.set(row.documentPath || row.id, row);
        });
        return Array.from(byPath.values());
    };
    const uidSpecs = collections.flatMap((collectionName) => ["userId", "uid"].map((field) => ({ collectionName, field, value: uid, lookupType: "uid" })));
    const uidRows = dedupe(await runQueries(uidSpecs));
    if (uidRows.length > 0 || !normalizedEmail) return uidRows;
    const emailSpecs = collections.flatMap((collectionName) => ["userEmail", "email"].map((field) => ({ collectionName, field, value: normalizedEmail, lookupType: "email" })));
    return dedupe(await runQueries(emailSpecs));
}

function isValidCompletedPaymentForEntitlement(row, canonicalCourseId) {
    if (!row) return false;
    return isCourseEntitlementEquivalent(row, canonicalCourseId) && isRestorablePaidOperationalRecord(row);
}

async function getValidCompletedPaymentsForCourse(env, uid, canonicalCourseId, email = '') {
    const rows = await getPaymentLikeRecordsForEntitlement(env, uid, email);
    return rows
        .filter((row) => isValidCompletedPaymentForEntitlement(row, canonicalCourseId))
        .sort((a, b) => new Date(b.approvedAt || b.purchasedAt || b.paidAt || b.createdAt || 0).getTime() - new Date(a.approvedAt || a.purchasedAt || a.paidAt || a.createdAt || 0).getTime());
}

function isManualLikeEnrollment(enrollment) {
    return normalizeEnrollmentSourceType(enrollment || {}) === 'MANUAL' || enrollment?.adminGranted === true;
}

function getManualEnrollmentCompatibilityPatch(admin, note, nowIso) {
    return {
        sourceType: 'MANUAL',
        grantType: 'MANUAL',
        issueType: 'MANUAL',
        manualGrant: true,
        grantReason: 'ADMIN_MANUAL',
        adminGranted: true,
        adminGrantReason: note || '관리자 수동 수강권 지급',
        grantedBy: admin?.email || admin?.uid || null,
        grantedByAdminId: admin?.uid || null,
        updatedAt: nowIso
    };
}

async function mirrorManualEnrollmentToUser(env, uid, courseId, enrollment) {
    if (!uid || !courseId || !isManualLikeEnrollment(enrollment)) return null;
    return firestorePatch(env, firestoreDocumentPath(env, 'users/' + uid + '/enrollments', courseId), {
        ...enrollment,
        id: courseId,
        enrollmentId: enrollment.enrollmentId || uid + '_' + courseId,
        uid: enrollment.uid || uid,
        userId: enrollment.userId || uid,
        courseId,
        canonicalCourseId: enrollment.canonicalCourseId || courseId
    });
}

function isSafeFirestoreDocumentId(value) {
    return Boolean(value && !String(value).includes('/'));
}

async function patchExistingNestedEnrollment(env, uid, courseId, patch) {
    if (!uid || !courseId) return false;
    const nestedPath = firestoreDocumentPath(env, 'users/' + uid + '/enrollments', courseId);
    const nestedRaw = await firestoreGet(env, nestedPath).catch((error) => error.status === 404 ? null : Promise.reject(error));
    if (!nestedRaw) return false;
    await firestorePatch(env, nestedPath, { ...patch, uid, userId: uid, courseId, canonicalCourseId: courseId, enrollmentId: patch.enrollmentId || uid + '_' + courseId });
    return true;
}

function getAllowedByForEnrollment(enrollment) {
    const sourceType = normalizeEnrollmentSourceType(enrollment || {});
    if (sourceType === 'MANUAL') return 'manual';
    return 'enrollment';
}

function getRuntimeEntitlementCache() {
    if (!globalThis.__reseteduEntitlementCache) globalThis.__reseteduEntitlementCache = new Map();
    return globalThis.__reseteduEntitlementCache;
}

function getEntitlementCacheKey(uid, courseId) {
    return [String(uid || '').trim(), resolveCanonicalCourseId({ courseId }) || String(courseId || '').trim()].join(':');
}

function isCachedEntitlementActive(record, uid, courseId) {
    if (!record) return false;
    const recordUid = String(record.uid || record.userId || '').trim();
    if (recordUid !== uid) return false;
    if (!isCourseEntitlementEquivalent(record, courseId)) return false;
    if (!isRestorablePaidOperationalRecord(record) && !isFirestoreEnrollmentActiveRecord(record)) return false;
    const expiresAtTime = parseTime(record.expiresAt || record.accessEndsAt);
    return expiresAtTime === null || expiresAtTime > Date.now();
}

async function saveRecentPaymentEntitlement(env, entitlement) {
    const uid = String(entitlement?.uid || entitlement?.userId || '').trim();
    const courseId = resolveCanonicalCourseId(entitlement || {}) || entitlement?.canonicalCourseId || entitlement?.courseId || '';
    if (!uid || !courseId) return null;
    const record = {
        ...entitlement,
        uid,
        userId: uid,
        courseId,
        canonicalCourseId: courseId,
        paymentStatus: entitlement.paymentStatus || 'paid',
        status: entitlement.status || 'active',
        accessStatus: entitlement.accessStatus || 'active',
        enrollmentStatus: entitlement.enrollmentStatus || 'active',
        cachedAt: new Date().toISOString(),
        sourceType: entitlement.sourceType || 'TRUSTED_PAYMENT_RECORD'
    };
    const key = getEntitlementCacheKey(uid, courseId);
    getRuntimeEntitlementCache().set(key, record);
    if (typeof caches !== 'undefined' && caches?.default) {
        const cacheUrl = 'https://resetedu.internal/entitlements/' + encodeURIComponent(uid) + '/' + encodeURIComponent(courseId);
        await caches.default.put(new Request(cacheUrl), new Response(JSON.stringify(record), {
            headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=172800' }
        })).catch((error) => console.warn('[entitlement-cache:put-failed]', { uid: maskLogIdentifier(uid), courseId, message: error instanceof Error ? error.message : String(error) }));
    }
    return record;
}

async function getRecentPaymentEntitlement(env, uid, courseId) {
    const canonicalCourseId = resolveCanonicalCourseId({ courseId }) || courseId;
    const key = getEntitlementCacheKey(uid, canonicalCourseId);
    const memoryRecord = getRuntimeEntitlementCache().get(key);
    if (isCachedEntitlementActive(memoryRecord, uid, canonicalCourseId)) return memoryRecord;
    if (typeof caches !== 'undefined' && caches?.default) {
        const cacheUrl = 'https://resetedu.internal/entitlements/' + encodeURIComponent(uid) + '/' + encodeURIComponent(canonicalCourseId);
        const cached = await caches.default.match(new Request(cacheUrl)).catch(() => null);
        if (cached) {
            const record = await cached.json().catch(() => null);
            if (isCachedEntitlementActive(record, uid, canonicalCourseId)) {
                getRuntimeEntitlementCache().set(key, record);
                return record;
            }
        }
    }
    return null;
}

async function getCanonicalWorkerEnrollmentRecord(env, uid, courseId) {
    const canonicalCourseId = resolveCanonicalCourseId({ courseId }) || courseId;
    const enrollmentId = uid + '_' + canonicalCourseId;
    const canonicalPath = firestoreDocumentPath(env, 'enrollments', enrollmentId);
    const raw = await firestoreGet(env, canonicalPath).catch((error) => {
        if (error.status === 404) return null;
        return Promise.reject(error);
    });
    return raw ? { id: enrollmentId, documentPath: canonicalPath, ...fromFirestoreFields(raw.fields || {}), recordSource: 'canonical_root' } : null;
}

async function checkCourseEntitlement(env, { uid, email, canonicalCourseId, requestedCourseId, requestedFeature }) {
    const normalizedCourseId = resolveCanonicalCourseId({ courseId: canonicalCourseId || requestedCourseId }) || canonicalCourseId || requestedCourseId;
    const firebaseProjectId = getFirestoreProjectId(env);
    const enrollmentId = uid && normalizedCourseId ? uid + '_' + normalizedCourseId : null;
    const baseLog = {
        authUid: uid || null,
        authEmail: email || null,
        requestedFeature,
        requestedCourseId: requestedCourseId || normalizedCourseId,
        canonicalCourseId: normalizedCourseId,
        firebaseProjectId,
        enrollmentCollection: 'enrollments',
        enrollmentDocumentId: enrollmentId,
        now: new Date().toISOString()
    };

    const enrollment = await getCanonicalWorkerEnrollmentRecord(env, uid, normalizedCourseId);
    let finalEnrollment = enrollment;
    let enrollmentDecision = getEnrollmentAccessDecision(enrollment, uid, normalizedCourseId);
    let allowed = enrollmentDecision.allowed;
    let allowedBy = allowed ? getAllowedByForEnrollment(enrollment) : null;
    let denialReason = allowed ? null : (enrollment ? enrollmentDecision.reason : 'NO_ACCESS');

    if (!allowed) {
        const cachedEntitlement = await getRecentPaymentEntitlement(env, uid, normalizedCourseId).catch(() => null);
        if (isCachedEntitlementActive(cachedEntitlement, uid, normalizedCourseId)) {
            finalEnrollment = cachedEntitlement;
            enrollmentDecision = getEnrollmentAccessDecision(cachedEntitlement, uid, normalizedCourseId);
            allowed = true;
            allowedBy = 'recent_payment_cache';
            denialReason = null;
        }
    }

    const matchedEnrollment = finalEnrollment || enrollment;
    logEnrollmentWorkerEvent('check_course_entitlement', {
        ...baseLog,
        paymentQueryCount: 0,
        validPaymentCount: 0,
        enrollmentQueryCount: 1,
        validEnrollmentCount: enrollmentDecision.allowed ? 1 : 0,
        manualGrantCount: normalizeEnrollmentSourceType(matchedEnrollment || {}) === 'MANUAL' ? 1 : 0,
        matchedPaymentIds: [],
        matchedEnrollmentIds: matchedEnrollment ? [matchedEnrollment.id || matchedEnrollment.enrollmentId || enrollmentId].filter(Boolean) : [],
        matchedEnrollments: matchedEnrollment ? [{
            id: matchedEnrollment.id || matchedEnrollment.enrollmentId || enrollmentId,
            uid: matchedEnrollment.uid || null,
            userId: matchedEnrollment.userId || null,
            email: matchedEnrollment.userEmail || matchedEnrollment.email || null,
            courseId: matchedEnrollment.courseId || null,
            canonicalCourseId: matchedEnrollment.canonicalCourseId || matchedEnrollment.courseId || null,
            status: matchedEnrollment.status || null,
            accessStatus: matchedEnrollment.accessStatus || matchedEnrollment.enrollmentStatus || null,
            source: matchedEnrollment.source || matchedEnrollment.sourceType || normalizeEnrollmentSourceType(matchedEnrollment) || null,
            startsAt: matchedEnrollment.startsAt || matchedEnrollment.accessStartsAt || null,
            expiresAt: matchedEnrollment.expiresAt || matchedEnrollment.accessEndsAt || null
        }] : [],
        allowed,
        allowedBy,
        denialReason
    });

    return { allowed, allowedBy, deniedReason: denialReason, enrollment: matchedEnrollment, canonicalCourseId: normalizedCourseId, validPayments: [] };
}

async function getWorkerCourseAccessDecision(env, user, courseId, requestPath = 'unknown') {
    const requestedCourseId = String(courseId || '').trim();
    const canonicalCourseId = resolveCanonicalCourseId({ courseId: requestedCourseId }) || requestedCourseId;
    if (isWorkerAdminUser(user, env)) {
        const decision = { allowed: true, reason: 'ADMIN_BYPASS' };
        logEnrollmentAccessDecision(requestPath, user?.uid || '', canonicalCourseId, null, decision);
        logEnrollmentWorkerEvent('check_course_entitlement', { authUid: user?.uid || null, authEmail: user?.email || null, requestedFeature: requestPath, requestedCourseId, canonicalCourseId, firebaseProjectId: getFirestoreProjectId(env), paymentQueryCount: 0, validPaymentCount: 0, enrollmentQueryCount: 0, validEnrollmentCount: 0, manualGrantCount: 0, matchedPaymentIds: [], matchedEnrollmentIds: [], allowed: true, allowedBy: 'admin', denialReason: null });
        return { allowed: true, enrollment: null, adminBypass: true, deniedReason: null, canonicalCourseId, allowedBy: 'admin' };
    }
    const entitlement = await checkCourseEntitlement(env, {
        uid: user.uid,
        email: user.email || null,
        requestedCourseId,
        canonicalCourseId,
        requestedFeature: requestPath === '/api/stream/token' ? 'video_play' : requestPath
    });
    const decision = { allowed: entitlement.allowed, reason: entitlement.deniedReason || 'OK' };
    logEnrollmentAccessDecision(requestPath, user.uid, canonicalCourseId, entitlement.enrollment, decision);
    return { allowed: entitlement.allowed, enrollment: entitlement.enrollment, adminBypass: false, deniedReason: entitlement.deniedReason, canonicalCourseId, allowedBy: entitlement.allowedBy };
}

async function userHasWorkerCourseAccess(env, user, courseId) {
    const decision = await getWorkerCourseAccessDecision(env, user, courseId);
    return decision.allowed;
}

async function getWorkerEnrollmentRecord(env, uid, courseId, email = '') {
    const canonicalCourseId = resolveCanonicalCourseId({ courseId }) || courseId;
    const enrollmentId = uid + '_' + canonicalCourseId;
    const canonicalPath = firestoreDocumentPath(env, 'enrollments', enrollmentId);
    const byId = await firestoreGet(env, canonicalPath).catch((error) => error.status === 404 ? null : Promise.reject(error));
    const canonical = byId ? { id: enrollmentId, documentPath: canonicalPath, ...fromFirestoreFields(byId.fields || {}), recordSource: 'root' } : null;
    logEnrollmentWorkerEvent('enrollment_root_checked', { uid: maskLogIdentifier(uid), courseId: canonicalCourseId, exists: Boolean(canonical), active: isFirestoreEnrollmentActiveRecord(canonical) });
    if (isFirestoreEnrollmentActiveRecord(canonical)) return canonical;

    const nestedPath = firestoreDocumentPath(env, 'users/' + uid + '/enrollments', canonicalCourseId);
    const nested = await firestoreGet(env, nestedPath).catch((error) => error.status === 404 ? null : Promise.reject(error));
    const nestedRecord = nested ? { id: canonicalCourseId, documentPath: nestedPath, ...fromFirestoreFields(nested.fields || {}), recordSource: 'nested' } : null;
    logEnrollmentWorkerEvent('enrollment_nested_checked', { uid: maskLogIdentifier(uid), courseId: canonicalCourseId, exists: Boolean(nestedRecord), active: isFirestoreEnrollmentActiveRecord(nestedRecord) });
    if (isFirestoreEnrollmentActiveRecord(nestedRecord)) {
        return repairCanonicalWorkerEnrollment(env, uid, canonicalCourseId, nestedRecord, canonicalPath).catch((error) => {
            logEnrollmentWorkerEvent('enrollment_canonical_repair_failed', { uid: maskLogIdentifier(uid), courseId, source: 'nested', message: error instanceof Error ? error.message : String(error) });
            return nestedRecord;
        });
    }
    const explicitlyBlockedEnrollment = isExplicitlyBlockedEnrollmentRecord(canonical)
        ? canonical
        : (isExplicitlyBlockedEnrollmentRecord(nestedRecord) ? nestedRecord : null);
    if (explicitlyBlockedEnrollment) return explicitlyBlockedEnrollment;

    // Historical purchases may use a payment/order ID as the document ID.
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const [byUserId, byUid, byUserEmail, byEmail] = await Promise.all([
        firestoreQuery(env, 'enrollments', [{ field: 'userId', value: uid }]).catch(() => []),
        firestoreQuery(env, 'enrollments', [{ field: 'uid', value: uid }]).catch(() => []),
        normalizedEmail ? firestoreQuery(env, 'enrollments', [{ field: 'userEmail', value: normalizedEmail }]).catch(() => []) : [],
        normalizedEmail ? firestoreQuery(env, 'enrollments', [{ field: 'email', value: normalizedEmail }]).catch(() => []) : []
    ]);
    const matchesCourse = (row) => isCourseEntitlementEquivalent(row, canonicalCourseId);
    const matchesCurrentIdentity = (row) => {
        const rowUid = String(row?.uid || row?.userId || '').trim();
        const rowEmail = String(row?.userEmail || row?.email || '').trim().toLowerCase();
        return rowUid === uid || (normalizedEmail && rowEmail === normalizedEmail);
    };
    const candidates = [canonical, nestedRecord, ...byUserId, ...byUid, ...byUserEmail, ...byEmail].filter((row) => row && matchesCourse(row) && matchesCurrentIdentity(row));
    const activeEnrollment = candidates.find(isFirestoreEnrollmentActiveRecord);
    if (activeEnrollment) {
        return repairCanonicalWorkerEnrollment(env, uid, canonicalCourseId, activeEnrollment, canonicalPath).catch((error) => {
            logEnrollmentWorkerEvent('enrollment_canonical_repair_failed', { uid: maskLogIdentifier(uid), courseId, source: activeEnrollment.recordSource || 'historical_enrollment', message: error instanceof Error ? error.message : String(error) });
            return activeEnrollment;
        });
    }

    // Recover access from trusted, server-written purchase/payment records when
    // an enrollment document was removed or reset.
    const paymentRows = await getPaymentLikeRecordsForEntitlement(env, uid, normalizedEmail);
    const paidRecords = paymentRows
        .filter(matchesCourse)
        .filter(isRestorablePaidOperationalRecord)
        .map((row) => {
            const purchasedAt = row.purchasedAt || row.approvedAt || row.orderedAt || row.createdAt || null;
            const purchasedTime = purchasedAt ? new Date(purchasedAt).getTime() : NaN;
            const expiresAt = row.expiresAt || (Number.isFinite(purchasedTime)
                ? new Date(purchasedTime + (getCourseProduct(canonicalCourseId)?.durationDays || DUI_COURSE_PRODUCT.durationDays) * 24 * 60 * 60 * 1000).toISOString()
                : null);
            return {
                ...row,
                userId: row.userId || row.uid || uid,
                uid: row.uid || row.userId || uid,
                courseId: canonicalCourseId,
                paymentStatus: row.paymentStatus || row.status,
                accessStatus: row.accessStatus || row.enrollmentStatus || 'active',
                purchasedAt,
                expiresAt
            };
        });
    const recovered = paidRecords.find(isFirestoreEnrollmentActiveRecord);
    if (!recovered) return candidates[0] || explicitlyBlockedEnrollment || null;
    return repairCanonicalWorkerEnrollment(env, uid, canonicalCourseId, { ...recovered, recordSource: recovered.recordSource || 'trusted_payment_record' }, canonicalPath).catch((error) => {
        logEnrollmentWorkerEvent('enrollment_canonical_repair_failed', { uid: maskLogIdentifier(uid), courseId, source: recovered.recordSource || 'trusted_payment_record', message: error instanceof Error ? error.message : String(error) });
        return recovered;
    });
}

async function getActiveAdvancedEquivalentEnrollment(env, uid, email = '') {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const matchesIdentity = (row) => {
        const rowUid = String(row?.uid || row?.userId || row?.firebaseUid || row?.customerUid || row?.buyerUid || '').trim();
        const rowEmail = String(row?.userEmail || row?.email || row?.customerEmail || row?.buyerEmail || '').trim().toLowerCase();
        return rowUid === uid || (normalizedEmail && rowEmail === normalizedEmail);
    };
    const isAdvancedEquivalent = (row) => {
        const productId = String(row?.productId || row?.paymentProductId || '').trim();
        const courseId = resolveCanonicalCourseId(row) || row?.canonicalCourseId || row?.courseId || '';
        const product = APPLICATION_PRODUCTS[productId] || null;
        const courseProduct = getCourseProduct(courseId) || null;
        const planId = String(row?.planId || product?.planId || '').trim();
        return Boolean(product?.includesCbtCourse || courseProduct?.includesCbtCourse || productId.endsWith('-advanced') || productId.endsWith('-premium') || productId.endsWith('-counseling') || planId === 'advanced' || planId === 'premium' || planId === 'counseling');
    };
    const [byUserId, byUid, byUserEmail, byEmail] = await Promise.all([
        firestoreQuery(env, 'enrollments', [{ field: 'userId', value: uid }]).catch(() => []),
        firestoreQuery(env, 'enrollments', [{ field: 'uid', value: uid }]).catch(() => []),
        normalizedEmail ? firestoreQuery(env, 'enrollments', [{ field: 'userEmail', value: normalizedEmail }]).catch(() => []) : [],
        normalizedEmail ? firestoreQuery(env, 'enrollments', [{ field: 'email', value: normalizedEmail }]).catch(() => []) : []
    ]);
    const enrollment = [...byUserId, ...byUid, ...byUserEmail, ...byEmail]
        .filter((row) => row && matchesIdentity(row) && isAdvancedEquivalent(row))
        .find(isFirestoreEnrollmentActiveRecord);
    if (enrollment) return enrollment;
    return null;
}

async function getWorkerEnrollmentRecordByProduct(env, uid, productId, email = '') {
    const normalizedProductId = String(productId || '').trim();
    const product = APPLICATION_PRODUCTS[normalizedProductId] || getCourseProduct(normalizedProductId);
    if (!normalizedProductId || !product) return null;
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const matchesIdentity = (row) => {
        const rowUid = String(row?.uid || row?.userId || row?.firebaseUid || row?.customerUid || row?.buyerUid || '').trim();
        const rowEmail = String(row?.userEmail || row?.email || row?.customerEmail || row?.buyerEmail || '').trim().toLowerCase();
        return rowUid === uid || (normalizedEmail && rowEmail === normalizedEmail);
    };
    const matchesProduct = (row) => String(row?.productId || row?.paymentProductId || '').trim() === normalizedProductId;
    const [byUserId, byUid, byUserEmail, byEmail] = await Promise.all([
        firestoreQuery(env, 'enrollments', [{ field: 'userId', value: uid }]).catch(() => []),
        firestoreQuery(env, 'enrollments', [{ field: 'uid', value: uid }]).catch(() => []),
        normalizedEmail ? firestoreQuery(env, 'enrollments', [{ field: 'userEmail', value: normalizedEmail }]).catch(() => []) : [],
        normalizedEmail ? firestoreQuery(env, 'enrollments', [{ field: 'email', value: normalizedEmail }]).catch(() => []) : []
    ]);
    const enrollment = [ ...byUserId, ...byUid, ...byUserEmail, ...byEmail ]
        .filter((row) => row && matchesIdentity(row) && matchesProduct(row))
        .find(isFirestoreEnrollmentActiveRecord);
    if (enrollment) return enrollment;

    return null;
}

async function enrichWorkerEnrollmentEntitlement(env, uid, courseId, enrollment) {
    try {
        const [purchasesByUserId, purchasesByUid, paymentsByUserId, paymentsByUid] = await Promise.all([
            firestoreQuery(env, "purchases", [{ field: "userId", value: uid }]),
            firestoreQuery(env, "purchases", [{ field: "uid", value: uid }]),
            firestoreQuery(env, "payments", [{ field: "userId", value: uid }]),
            firestoreQuery(env, "payments", [{ field: "uid", value: uid }])
        ]);
        const records = [...purchasesByUserId, ...purchasesByUid, ...paymentsByUserId, ...paymentsByUid]
            .filter((row) => {
                const rowCourseId = resolveCanonicalCourseId(row) || row.courseId;
                const rowUid = row.uid || row.userId;
                return rowUid === uid && rowCourseId === courseId && isRestorablePaidOperationalRecord(row);
            })
            .sort((a, b) => {
                const time = (row) => new Date(row.approvedAt || row.purchasedAt || row.orderedAt || row.createdAt || 0).getTime() || 0;
                return time(b) - time(a);
            });
        const exact = records.find((row) =>
            (enrollment.orderId && (row.orderId === enrollment.orderId || row.id === enrollment.orderId))
            || (enrollment.paymentId && (row.paymentId === enrollment.paymentId || row.paymentKey === enrollment.paymentId))
        );
        const entitlement = exact || records[0];
        if (!entitlement) return enrollment;

        const amount = Number(entitlement.amount ?? enrollment.amount);
        const resolvedProductId = resolveApplicationProductIdFromRecord({ ...enrollment, ...entitlement, amount }, enrollment.productId || "basic");
        const product = APPLICATION_PRODUCTS[resolvedProductId] || APPLICATION_PRODUCTS.basic;
        return {
            ...enrollment,
            categoryId: entitlement.categoryId || enrollment.categoryId || product.categoryId || "dui",
            productId: resolvedProductId,
            productTitle: entitlement.productTitle || enrollment.productTitle || product.title,
            courseTitle: enrollment.courseTitle || product.courseTitle,
            totalLessons: Number(enrollment.totalLessons) || product.totalLessons,
            amount: Number.isFinite(amount) && amount > 0 ? amount : enrollment.amount
        };
    } catch (error) {
        logEnrollmentWorkerEvent("enrollment_entitlement_lookup_failed", {
            uid: maskLogIdentifier(uid),
            courseId,
            message: error instanceof Error ? error.message : String(error)
        });
        return enrollment;
    }
}
function buildEnrollmentApiRecord(enrollment, progress) {
    const product = APPLICATION_PRODUCTS[enrollment.productId] || APPLICATION_PRODUCTS.basic;
    const completedLessons = Number(progress?.completedModuleCount ?? enrollment.completedLessons ?? 0);
    const totalLessons = Number(progress?.totalModuleCount ?? enrollment.totalLessons ?? DUI_COURSE_PRODUCT.totalLessons);
    const progressRate = Number(progress?.completionRate ?? enrollment.progress ?? (totalLessons > 0 ? Math.floor((completedLessons / totalLessons) * 100) : 0));
    const enrollmentId = enrollment.id || enrollment.enrollmentId || ((enrollment.uid || enrollment.userId) + '_' + enrollment.courseId);
    return {
        id: enrollmentId,
        enrollmentId,
        userId: enrollment.userId || enrollment.uid,
        uid: enrollment.uid || enrollment.userId,
        courseId: product.productId && isDrugAddictionCanonicalCourse(enrollment.courseId) ? product.productId : enrollment.courseId,
        canonicalCourseId: enrollment.canonicalCourseId || enrollment.courseId,
        planId: enrollment.planId || product.planId || null,
        courseTitle: enrollment.courseTitle || product.courseTitle || DUI_COURSE_PRODUCT.courseTitle,
        categoryId: enrollment.categoryId || product.categoryId,
        productId: enrollment.productId || product.productId,
        productTitle: enrollment.productTitle || product.title,
        paymentId: enrollment.paymentId || null,
        orderId: enrollment.orderId || null,
        amount: typeof enrollment.amount === 'number' ? enrollment.amount : product.amount,
        paymentStatus: enrollment.paymentStatus || '',
        sourceType: enrollment.sourceType || enrollment.grantType || enrollment.issueType || (enrollment.adminGranted ? 'MANUAL' : 'PAYMENT'),
        isActive: enrollment.isActive !== false,
        status: enrollment.status || enrollment.enrollmentStatus || enrollment.accessStatus || '',
        enrollmentStatus: enrollment.enrollmentStatus || enrollment.accessStatus || enrollment.status || '',
        accessStatus: enrollment.accessStatus || enrollment.enrollmentStatus || enrollment.status || '',
        purchasedAt: enrollment.purchasedAt || enrollment.approvedAt || enrollment.grantedAt || null,
        startsAt: enrollment.startsAt || enrollment.accessStartsAt || null,
        expiresAt: enrollment.expiresAt || enrollment.accessEndsAt || null,
        progress: Math.max(0, Math.min(100, Number.isFinite(progressRate) ? progressRate : 0)),
        completedLessons: Number.isFinite(completedLessons) ? completedLessons : 0,
        totalLessons: Number.isFinite(totalLessons) ? totalLessons : product.totalLessons,
        certificateIssued: Boolean(enrollment.certificateIssued),
        certificateId: enrollment.certificateId || null,
        certificateNo: enrollment.certificateNo || null,
    };
}

async function hasOperationalCourseEntitlement(env, firebaseUser, courseId) {
    const uid = firebaseUser.uid;
    const normalizedEmail = String(firebaseUser.email || '').trim().toLowerCase();
    const matchesCourse = (row) => isCourseEntitlementEquivalent(row, courseId);
    const [enrollments, paymentRows] = await Promise.all([
        getWorkerDirectEnrollmentRecordsForUser(env, uid).catch(() => []),
        getPaymentLikeRecordsForEntitlement(env, uid, normalizedEmail).catch(() => [])
    ]);
    const enrollment = enrollments
        .map((row) => ({ ...row, courseId: resolveCanonicalCourseId(row) || row.courseId, canonicalCourseId: resolveCanonicalCourseId(row) || row.canonicalCourseId || row.courseId }))
        .find((row) => matchesCourse(row) && getEnrollmentAccessDecision(row, row.uid || row.userId || uid, courseId).allowed);
    if (enrollment) {
        if ((enrollment.uid || enrollment.userId) !== uid) {
            await repairCanonicalWorkerEnrollment(env, uid, courseId, enrollment, firestoreDocumentPath(env, 'enrollments', uid + '_' + courseId)).catch(() => null);
        }
        return { allowed: true, allowedBy: 'enrollment', enrollment };
    }
    const payment = paymentRows.find((row) => matchesCourse(row) && isRestorablePaidOperationalRecord(row));
    if (!payment) return { allowed: false, deniedReason: 'NO_ACCESS' };
    const saved = await grantCourseAccess(env, {
        ...payment,
        uid,
        userId: uid,
        userEmail: firebaseUser.email || payment.userEmail || payment.email || payment.customerEmail || payment.buyerEmail || null,
        canonicalCourseId: courseId,
        courseId,
        source: 'migration',
        paymentId: payment.paymentId || payment.paymentKey || payment.id || null,
        orderId: payment.orderId || payment.id || payment.paymentId || null,
        recoveredFrom: payment.recordSource || 'stream_paid_record_scan'
    }).catch(() => null);
    return { allowed: true, allowedBy: saved ? 'payment_auto_recovery' : 'payment', enrollment: saved || null };
}

function getKnownEnrollmentCourseIds() {
    return Object.keys(COURSE_PRODUCTS_BY_ID).filter(Boolean);
}

async function getWorkerNestedEnrollmentRecordsForUser(env, uid) {
    const projectId = getFirestoreProjectId(env);
    const token = await getGoogleAccessToken(env);
    const response = await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${encodeURIComponent(uid)}/enrollments?pageSize=100`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    if (response.status === 404) return [];
    if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new Error(`Firestore nested enrollment LIST failed: ${response.status} ${body}`);
    }
    const data = await response.json().catch(() => ({}));
    return (data.documents || []).map((document) => {
        const id = String(document.name || '').split('/').pop();
        const fields = fromFirestoreFields(document.fields || {});
        return {
            id,
            documentPath: String(document.name || ''),
            ...fields,
            courseId: fields.courseId || fields.canonicalCourseId || id,
            canonicalCourseId: fields.canonicalCourseId || fields.courseId || id,
            recordSource: 'nested_collection_list'
        };
    });
}

async function getWorkerDirectEnrollmentRecordsForUser(env, uid) {
    const rows = await Promise.all([
        getWorkerNestedEnrollmentRecordsForUser(env, uid).catch(() => []),
        firestoreQuery(env, 'enrollments', [{ field: 'userId', value: uid }]).catch(() => []),
        firestoreQuery(env, 'enrollments', [{ field: 'uid', value: uid }]).catch(() => [])
    ]);
    const byPath = new Map();
    rows.flat().forEach((row) => byPath.set(row.documentPath || row.id || [row.uid || row.userId, row.courseId, row.productId].join('_'), row));
    return Array.from(byPath.values());
}

async function getWorkerAllActiveEnrollmentRecords(env, firebaseUser) {
    const uid = firebaseUser.uid;
    const normalizedEmail = String(firebaseUser.email || '').trim().toLowerCase();
    const byCourseId = new Map();
    const addEnrollment = (enrollment) => {
        if (!enrollment) return;
        const courseId = resolveCanonicalCourseId(enrollment) || enrollment.canonicalCourseId || enrollment.courseId;
        if (!courseId || !getCourseProduct(courseId)) return;
        const normalized = { ...enrollment, uid: enrollment.uid || enrollment.userId || uid, userId: enrollment.userId || enrollment.uid || uid, courseId, canonicalCourseId: courseId };
        if (!getEnrollmentAccessDecision(normalized, uid, courseId).allowed) return;
        const existing = byCourseId.get(courseId);
        const existingTime = existing ? new Date(existing.purchasedAt || existing.approvedAt || existing.createdAt || 0).getTime() : 0;
        const nextTime = new Date(normalized.purchasedAt || normalized.approvedAt || normalized.createdAt || 0).getTime();
        if (!existing || nextTime >= existingTime) byCourseId.set(courseId, normalized);
    };

    const directRows = await getWorkerDirectEnrollmentRecordsForUser(env, uid).catch((error) => {
        logEnrollmentWorkerEvent('all_enrollments_direct_lookup_failed', { uid: maskLogIdentifier(uid), message: error instanceof Error ? error.message : String(error) });
        return [];
    });
    directRows.forEach(addEnrollment);

    const paymentRows = await getPaymentLikeRecordsForEntitlement(env, uid, normalizedEmail).catch((error) => {
        logEnrollmentWorkerEvent('all_enrollments_payment_lookup_failed', { uid: maskLogIdentifier(uid), message: error instanceof Error ? error.message : String(error) });
        return [];
    });
    for (const payment of paymentRows) {
        if (!isRestorablePaidOperationalRecord(payment)) continue;
        const courseId = resolveCanonicalCourseId(payment) || payment.canonicalCourseId || payment.courseId;
        if (!courseId || !getCourseProduct(courseId) || byCourseId.has(courseId)) continue;
        const recovered = await grantCourseAccess(env, {
            ...payment,
            uid,
            userId: uid,
            userEmail: firebaseUser.email || payment.userEmail || payment.email || payment.customerEmail || payment.buyerEmail || null,
            canonicalCourseId: courseId,
            courseId,
            source: 'migration',
            paymentId: payment.paymentId || payment.paymentKey || payment.id || null,
            orderId: payment.orderId || payment.id || payment.paymentId || null,
            recoveredFrom: payment.recordSource || 'scope_all_paid_record_scan'
        }).catch((error) => {
            logEnrollmentWorkerEvent('all_enrollments_payment_recovery_failed', { uid: maskLogIdentifier(uid), courseId, message: error instanceof Error ? error.message : String(error) });
            return null;
        });
        addEnrollment(recovered || { ...payment, uid, userId: uid, courseId, canonicalCourseId: courseId, accessStatus: payment.accessStatus || 'active', enrollmentStatus: payment.enrollmentStatus || 'active', status: payment.status || 'active' });
    }

    return Array.from(byCourseId.values()).map((enrollment) => buildEnrollmentApiRecord(enrollment, null));
}
async function handleCurrentUserEnrollments(request, env, corsHeaders) {
    const url = new URL(request.url);
    const requestedCourseId = (url.searchParams.get('courseId') || '').trim();
    const courseId = resolveCanonicalCourseId({ courseId: requestedCourseId }) || requestedCourseId;
    const scope = url.searchParams.get('scope') === 'all' ? 'all' : 'course';
    const lookupMode = url.searchParams.get('lookup') === 'direct' ? 'direct' : 'entitlement';
    const authHeader = request.headers.get('Authorization') || '';
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    logEnrollmentWorkerEvent('enrollments_me_received', { method: request.method, requestedCourseId, courseId, scope });
    logEnrollmentWorkerEvent('auth_header_present', { present: Boolean(idToken), schemeValid: authHeader.startsWith('Bearer ') });
    if (!idToken) {
        logEnrollmentWorkerEvent('enrollments_me_completed', { status: 401, code: 'AUTH_REQUIRED', courseId });
        return json({ message: '로그인이 필요합니다.', code: 'AUTH_REQUIRED' }, 401, corsHeaders);
    }

    let firebaseUser;
    try {
        firebaseUser = await verifyFirebaseIdToken(idToken, env);
    } catch (error) {
        logEnrollmentWorkerEvent('enrollments_me_completed', { status: 401, code: 'AUTH_TOKEN_INVALID', courseId });
        return json({ message: 'Firebase 로그인 토큰이 만료되었거나 올바르지 않습니다.', code: 'AUTH_TOKEN_INVALID' }, 401, corsHeaders);
    }
    const maskedUid = maskLogIdentifier(firebaseUser.uid);
    logEnrollmentWorkerEvent('firebase_token_verified', { uid: maskedUid, courseId });

    if (scope === 'all') {
        try {
            const enrollments = await getWorkerAllActiveEnrollmentRecords(env, firebaseUser);
            logEnrollmentWorkerEvent('enrollments_me_completed', { status: 200, code: enrollments.length ? 'ACTIVE_ENROLLMENTS' : 'NO_ACTIVE_ENROLLMENT', uid: maskedUid, scope, count: enrollments.length });
            return json({ enrollments, scope, access: enrollments.length > 0 }, 200, corsHeaders);
        } catch (error) {
            const status = isFirestoreQuotaError(error) ? 429 : 500;
            const code = status === 429 ? 'RESOURCE_EXHAUSTED' : 'ENROLLMENT_LOOKUP_FAILED';
            logEnrollmentWorkerEvent('enrollments_me_completed', { status, code, uid: maskedUid, scope });
            return json({ message: status === 429 ? '현재 이용정보 확인 요청이 많아 수강권 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.' : '수강권 서버 조회 중 오류가 발생했습니다.', code }, status, corsHeaders);
        }
    }

    if (!getCourseProduct(courseId)) {
        logEnrollmentWorkerEvent('enrollments_me_completed', { status: 400, code: 'INVALID_COURSE', uid: maskedUid, courseId });
        return json({ message: '지원하지 않는 교육과정입니다.', code: 'INVALID_COURSE' }, 400, corsHeaders);
    }

    if (lookupMode === 'direct') {
        let directEnrollment;
        try {
            directEnrollment = await getCanonicalWorkerEnrollmentRecord(env, firebaseUser.uid, courseId);
        } catch (error) {
            logEnrollmentWorkerEvent('enrollment_direct_checkout_lookup_failed', { uid: maskedUid, courseId, firestoreStatus: typeof error?.status === 'number' ? error.status : undefined, message: error instanceof Error ? error.message : String(error) });
            if (isFirestoreQuotaError(error)) return json({ message: '현재 이용정보 확인 요청이 많아 수강권 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.', code: 'RESOURCE_EXHAUSTED' }, 429, corsHeaders);
            return json({ message: '수강권 서버 조회 중 오류가 발생했습니다.', code: 'ENROLLMENT_LOOKUP_FAILED' }, 500, corsHeaders);
        }
        if (!directEnrollment || !isFirestoreEnrollmentActiveRecord(directEnrollment)) {
            logEnrollmentWorkerEvent('enrollments_me_completed', { status: 200, code: 'NO_ACTIVE_ENROLLMENT', uid: maskedUid, courseId, lookupMode, count: 0 });
            return json({ enrollments: [], courseId, access: false }, 200, corsHeaders);
        }
        const apiEnrollment = buildEnrollmentApiRecord({ ...directEnrollment, uid: firebaseUser.uid, userId: firebaseUser.uid, courseId }, null);
        logEnrollmentWorkerEvent('enrollments_me_completed', { status: 200, code: 'ACTIVE_ENROLLMENT', uid: maskedUid, courseId, lookupMode, count: 1 });
        return json({ enrollments: [apiEnrollment], courseId, access: true }, 200, corsHeaders);
    }

    let enrollment;
    try {
        const accessDecision = await getWorkerCourseAccessDecision(env, firebaseUser, courseId);
        enrollment = accessDecision.enrollment;
    } catch (error) {
        const errorLike = error || {};
        const status = isFirestoreQuotaError(error) ? 429 : 500;
        const code = status === 429 ? 'RESOURCE_EXHAUSTED' : 'ENROLLMENT_LOOKUP_FAILED';
        logEnrollmentWorkerEvent('enrollment_access_result', {
            uid: maskedUid,
            courseId,
            allowed: false,
            reason: 'lookup_failed',
            firestoreStatus: typeof errorLike.status === 'number' ? errorLike.status : undefined
        });
        logEnrollmentWorkerEvent('enrollments_me_completed', { status, code, uid: maskedUid, courseId });
        return json({ message: status === 429 ? '현재 이용정보 확인 요청이 많아 수강권 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.' : '수강권 서버 조회 중 오류가 발생했습니다.', code }, status, corsHeaders);
    }

    if (!enrollment || !isFirestoreEnrollmentActiveRecord(enrollment)) {
        logEnrollmentWorkerEvent('enrollment_access_result', {
            uid: maskedUid,
            courseId,
            allowed: false,
            source: enrollment?.recordSource || 'none',
            paymentStatus: String(enrollment?.paymentStatus || enrollment?.status || '').toLowerCase(),
            accessStatus: String(enrollment?.enrollmentStatus || enrollment?.accessStatus || '').toLowerCase(),
            hasExpiresAt: Boolean(enrollment?.expiresAt)
        });
        logEnrollmentWorkerEvent('enrollments_me_completed', { status: 200, code: 'NO_ACTIVE_ENROLLMENT', uid: maskedUid, courseId, count: 0 });
        return json({ enrollments: [], courseId, access: false }, 200, corsHeaders);
    }

    logEnrollmentWorkerEvent('enrollment_access_result', {
        uid: maskedUid,
        courseId,
        allowed: true,
        source: enrollment.recordSource || 'unknown',
        paymentStatus: String(enrollment.paymentStatus || enrollment.status || '').toLowerCase(),
        accessStatus: String(enrollment.enrollmentStatus || enrollment.accessStatus || '').toLowerCase(),
        hasExpiresAt: Boolean(enrollment.expiresAt)
    });
    const apiEnrollment = buildEnrollmentApiRecord(enrollment, null);
    logEnrollmentWorkerEvent('enrollments_me_completed', { status: 200, code: 'ACTIVE_ENROLLMENT', uid: maskedUid, courseId, count: 1 });
    return json({ enrollments: [apiEnrollment], courseId, access: true }, 200, corsHeaders);
}

async function getPortOneStreamEntitlement(env, paymentId, firebaseUser, courseId) {
    const normalizedPaymentId = String(paymentId || '').trim();
    if (!normalizedPaymentId) return null;
    const approved = await getPortOnePayment(env, normalizedPaymentId);
    if (approved.status !== 'PAID') return null;
    const customData = parsePortOneCustomData(approved.customData);
    const uid = String(firebaseUser?.uid || "").trim();
    const approvedUid = String(customData.uid || customData.userId || approved.customer?.id || approved.customer?.customerId || '').trim();
    if (!uid || approvedUid !== uid) return null;
    const productId = String(customData.productId || '').trim();
    const approvedCourseId = String(customData.courseId || '').trim();
    const categoryId = String(customData.categoryId || '').trim();
    const product = getApplicationProductForPayment(productId);
    const canonicalCourseId = product?.canonicalCourseId || resolveCanonicalCourseId({ courseId: approvedCourseId, productId, categoryId }) || approvedCourseId;
    if (!isCourseEntitlementEquivalent({ courseId: canonicalCourseId, canonicalCourseId, productId, categoryId, planId: product?.planId }, courseId)) return null;
    const amount = Number(approved.amount?.total);
    if (product && Number.isFinite(amount) && amount !== product.amount) return null;
    const approvedAt = getPortOnePaidAt(approved);
    const purchasedAt = new Date(approvedAt);
    const durationDays = getCourseProduct(resolveCanonicalCourseId({ courseId }) || courseId)?.durationDays || DUI_COURSE_PRODUCT.durationDays;
    const expiresAt = new Date(purchasedAt.getTime() + durationDays * 24 * 60 * 60 * 1000).toISOString();
    return {
        enrollmentId: uid + "_" + (resolveCanonicalCourseId({ courseId }) || courseId),
        uid, userId: uid,
        courseId: resolveCanonicalCourseId({ courseId }) || courseId,
        canonicalCourseId: resolveCanonicalCourseId({ courseId }) || courseId,
        categoryId, productId, planId: product?.planId || null,
        productTitle: product?.title || null, courseTitle: product?.courseTitle || getCourseProduct(courseId)?.courseTitle || null,
        paymentId: normalizedPaymentId, orderId: normalizedPaymentId,
        paymentStatus: 'paid', status: 'active', accessStatus: 'active', enrollmentStatus: 'active', isActive: true,
        purchasedAt: purchasedAt.toISOString(), startsAt: purchasedAt.toISOString(), expiresAt, accessEndsAt: expiresAt,
        sourceType: 'TRUSTED_PAYMENT_RECORD', recordSource: 'portone_direct_stream_check'
    };
}
async function handleStreamToken(request, env, corsHeaders) {
    assertBaseEnv(env);
    assertStreamEnv(env);

    const requestOrigin = request.headers.get('Origin') || '';
    const requestReferer = request.headers.get('Referer') || '';
    const allowedOrigins = getAllowedOrigins(env);
    const allowedByOrigin = requestOrigin && allowedOrigins.has(requestOrigin);
    const allowedByReferer = Array.from(allowedOrigins).some((origin) => requestReferer.startsWith(origin + '/'));

    if (!allowedByOrigin && !allowedByReferer) {
        return json({ error: 'forbidden_origin', message: '허용되지 않은 출처입니다.' }, 403, corsHeaders);
    }

    const authHeader = request.headers.get('Authorization') || '';
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!idToken) {
        return json({ error: 'auth_required', message: '로그인이 필요한 서비스입니다.' }, 401, corsHeaders);
    }

    let firebaseUser;
    try {
        firebaseUser = await verifyFirebaseIdToken(idToken, env);
    } catch {
        return json({ error: 'auth_token_invalid', message: 'Firebase 로그인 토큰이 만료되었거나 올바르지 않습니다.' }, 401, corsHeaders);
    }
    const url = new URL(request.url);
    const uid = (url.searchParams.get('uid') || '').trim();
    const requestedCourseId = (url.searchParams.get('courseId') || '').trim();
    const courseId = resolveCanonicalCourseId({ courseId: requestedCourseId }) || requestedCourseId;

    if (!courseId) {
        return json({ error: 'missing_course_id', message: '해당 수강권에 연결된 교육과정 정보를 확인할 수 없습니다.' }, 400, corsHeaders);
    }

    if (!getConfiguredCourseStreamUids(env).has(uid)) {
        return json({ error: 'invalid_stream_uid', message: '지원하지 않는 강의 영상입니다.' }, 400, corsHeaders);
    }
    if (!getCourseProduct(courseId)) {
        logEnrollmentWorkerEvent('check_course_access', { authUid: firebaseUser.uid, authEmail: firebaseUser.email || null, requestedCourseId, canonicalCourseId: courseId, firebaseProjectId: getFirestoreProjectId(env), allowed: false, denialReason: 'INVALID_COURSE' });
        return json({ error: 'invalid_course', message: '지원하지 않는 교육과정입니다.' }, 400, corsHeaders);
    }

    const streamAccessDecision = isWorkerAdminUser(firebaseUser, env)
        ? { allowed: true, enrollment: null, allowedBy: 'admin' }
        : await getWorkerCourseAccessDecision(env, firebaseUser, courseId).catch((error) => {
            logEnrollmentWorkerEvent('stream_enrollment_lookup_failed', {
                authUid: maskLogIdentifier(firebaseUser.uid),
                authEmail: firebaseUser.email || null,
                courseId,
                message: error instanceof Error ? error.message : String(error)
            });
            return { allowed: false, enrollment: null, allowedBy: null };
        });
    let streamEnrollment = streamAccessDecision.enrollment;
    let streamAccessAllowed = isWorkerAdminUser(firebaseUser, env) || Boolean(streamAccessDecision.allowed);
    const directPaymentId = url.searchParams.get('paymentId') || url.searchParams.get('orderId') || '';
    if (!streamAccessAllowed && directPaymentId) {
        const directEntitlement = await getPortOneStreamEntitlement(env, directPaymentId, firebaseUser, courseId).catch((error) => {
            logEnrollmentWorkerEvent('stream_portone_direct_check_failed', { authUid: maskLogIdentifier(firebaseUser.uid), courseId, paymentId: directPaymentId ? encodeFirestoreDocId(directPaymentId).slice(0, 18) : null, message: error instanceof Error ? error.message : String(error) });
            return null;
        });
        if (isFirestoreEnrollmentActiveRecord(directEntitlement)) {
            streamEnrollment = await saveRecentPaymentEntitlement(env, directEntitlement).catch(() => directEntitlement);
            streamAccessAllowed = true;
        }
    }
    if (streamAccessAllowed && !isWorkerAdminUser(firebaseUser, env) && !isStreamUidAllowedForCourse(uid, requestedCourseId || courseId, streamEnrollment)) {
        logEnrollmentWorkerEvent('check_course_access', { authUid: maskLogIdentifier(firebaseUser.uid), authEmail: firebaseUser.email || null, requestedCourseId, canonicalCourseId: courseId, streamUid: uid, allowed: false, denialReason: 'STREAM_NOT_INCLUDED_IN_PRODUCT', productId: streamEnrollment?.productId || null });
        return json({ error: 'stream_not_included', code: 'STREAM_NOT_INCLUDED_IN_PRODUCT', message: '선택한 수강권에 포함되지 않은 심화이수과정 영상입니다.' }, 403, corsHeaders);
    }
    if (!streamAccessAllowed) {
        logEnrollmentWorkerEvent('stream_access_denied', {
            authUid: maskLogIdentifier(firebaseUser.uid),
            authEmail: firebaseUser.email || null,
            courseId,
            enrollmentId: streamEnrollment?.enrollmentId || streamEnrollment?.id || null,
            denialReason: streamEnrollment ? getEnrollmentAccessDecision(streamEnrollment, firebaseUser.uid, courseId).reason : 'NO_ENROLLMENT'
        });
        return json({ error: 'enrollment_required', code: 'NO_ACTIVE_ENROLLMENT', message: '유효한 수강권이 없어 강의 영상을 이용할 수 없습니다.' }, 403, corsHeaders);
    }
    logEnrollmentWorkerEvent('stream_access_allowed', {
        authUid: maskLogIdentifier(firebaseUser.uid),
        authEmail: firebaseUser.email || null,
        courseId,
        allowedBy: isWorkerAdminUser(firebaseUser, env) ? 'admin' : (streamAccessDecision.allowedBy || streamEnrollment?.recordSource || 'enrollment'),
        enrollmentId: streamEnrollment?.enrollmentId || streamEnrollment?.id || null
    });

    let response;
    try {
        response = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_STREAM_ACCOUNT_ID}/stream/${uid}/token`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${env.CLOUDFLARE_STREAM_API_TOKEN}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({})
            }
        );
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logEnrollmentWorkerEvent("stream_token_request_failed", {
            authUid: maskLogIdentifier(firebaseUser.uid),
            courseId,
            streamUid: uid,
            message
        });
        return json({ videoUrl: `https://iframe.videodelivery.net/${uid}`, expiresInSeconds: 900, fallback: "unsigned_stream_iframe" }, 200, corsHeaders);
    }

    const data = await response.json().catch(() => null);
    const token = data?.result?.token;

    if (!response.ok || !data?.success || !token) {
        const message =
            data?.errors?.[0]?.message ||
            data?.messages?.[0]?.message ||
            `Cloudflare Stream token failed: ${response.status}`;
        logEnrollmentWorkerEvent('stream_token_failed', {
            authUid: maskLogIdentifier(firebaseUser.uid),
            courseId,
            streamUid: uid,
            status: response.status,
            message
        });
        if (response.status >= 500 || String(message || '').toLowerCase().includes('internal')) {
            return json({ videoUrl: `https://iframe.videodelivery.net/${uid}`, expiresInSeconds: 900, fallback: 'unsigned_stream_iframe' }, 200, corsHeaders);
        }
        return json({ error: 'stream_token_failed', message }, response.status || 500, corsHeaders);
    }

    return json(
        {
            token,
            videoUrl: `https://iframe.videodelivery.net/${token}`,
            expiresInSeconds: 3600
        },
        200,
        corsHeaders
    );
}

async function handleStreamDirectUpload(request, env, corsHeaders) {
    assertBaseEnv(env);
    assertStreamEnv(env);

    const session = await requireAppSession(request, env);
    const payload = await request.json().catch(() => null);
    const requestedDuration = Number(payload?.maxDurationSeconds);
    const maxDurationSeconds = Number.isFinite(requestedDuration)
        ? Math.min(Math.max(Math.round(requestedDuration), 1), 36000)
        : 3600;
    const fileName = typeof payload?.fileName === 'string' ? payload.fileName.trim().slice(0, 128) : '';
    const creatorId = typeof session.memberProfileId === 'string' && session.memberProfileId
        ? session.memberProfileId
        : String(session.sub || 'unknown');

    const appOrigin = new URL(env.APP_BASE_URL).hostname;
    const allowedOrigins = Array.isArray(payload?.allowedOrigins) && payload.allowedOrigins.length > 0
        ? payload.allowedOrigins.filter((origin) => typeof origin === 'string' && origin.trim())
        : [appOrigin];

    const response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_STREAM_ACCOUNT_ID}/stream/direct_upload`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${env.CLOUDFLARE_STREAM_API_TOKEN}`
            },
            body: JSON.stringify({
                maxDurationSeconds,
                allowedOrigins,
                creator: creatorId,
                requireSignedURLs: Boolean(payload?.requireSignedURLs),
                meta: {
                    name: fileName || `stream-upload-${Date.now()}`
                }
            })
        }
    );

    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.success || !data?.result?.uploadURL || !data?.result?.uid) {
        const message =
            data?.errors?.[0]?.message ||
            data?.messages?.[0]?.message ||
            `Cloudflare Stream direct upload failed: ${response.status}`;
        return json({ error: 'stream_upload_init_failed', message }, response.status || 500, corsHeaders);
    }

    return json(
        {
            uid: data.result.uid,
            uploadURL: data.result.uploadURL,
            requireSignedURLs: Boolean(payload?.requireSignedURLs),
            maxDurationSeconds,
            maxUploadBytes: 200 * 1024 * 1024
        },
        200,
        corsHeaders
    );
}

async function requireAppSession(request, env) {
    const sessionValue = getCookie(request, 'app_session');
    const session = await verifySessionValue(sessionValue, env.SESSION_SECRET);
    if (!session?.sub) {
        throw new Error('로그인이 필요합니다.');
    }
    return session;
}

async function handleLogout(request, env, corsHeaders) {
    assertBaseEnv(env);

    if (request.method === 'GET') {
        const url = new URL(request.url);
        const next = sanitizeNextUrl(url.searchParams.get('next'), env.APP_BASE_URL);
        const provider = url.searchParams.get('provider') === 'naver' ? 'naver' : 'kakao';

        if (provider === 'kakao' && env.KAKAO_REST_API_KEY && env.KAKAO_REDIRECT_URI) {
            const callbackUrl = new URL('/api/logout/kakao/callback', env.KAKAO_REDIRECT_URI);
            callbackUrl.searchParams.set('next', next);

            const logoutUrl = new URL(PROVIDERS.kakao.globalLogoutUrl);
            logoutUrl.searchParams.set('client_id', env.KAKAO_REST_API_KEY);
            logoutUrl.searchParams.set('logout_redirect_uri', callbackUrl.toString());
            return redirect(logoutUrl.toString());
        }

        const headers = new Headers();
        appendSetCookies(headers, makeCookie('app_session', '', { maxAge: 0, sameSite: 'None' }));
        return redirect(withParams(next, { logged_out: '1', provider }), headers);
    }

    const headers = new Headers(corsHeaders);
    appendSetCookies(headers, makeCookie('app_session', '', { maxAge: 0, sameSite: 'None' }));
    return json({ ok: true }, 200, headers);
}

async function handleProviderLogoutCallback(request, env) {
    assertBaseEnv(env);

    const next = sanitizeNextUrl(new URL(request.url).searchParams.get('next'), env.APP_BASE_URL);
    const headers = new Headers();
    appendSetCookies(headers, makeCookie('app_session', '', { maxAge: 0, sameSite: 'None' }));
    return redirect(withParams(next, { logged_out: '1' }), headers);
}

function sanitizeNextUrl(next, appBaseUrl) {
    try {
        const fallback = new URL('/login.html', appBaseUrl).toString();
        if (!next) {
            return fallback;
        }
        const candidate = new URL(next, appBaseUrl);
        const appBase = new URL(appBaseUrl);
        if (candidate.origin !== appBase.origin) {
            return fallback;
        }
        return candidate.toString();
    } catch {
        return new URL('/login.html', appBaseUrl).toString();
    }
}

function withParams(baseUrl, values) {
    const url = new URL(baseUrl);
    Object.entries(values).forEach(([key, value]) => {
        if (value) {
            url.searchParams.set(key, value);
        }
    });
    return url.toString();
}

function assertBaseEnv(env) {
    const required = ['APP_BASE_URL', 'SESSION_SECRET'];
    const missing = required.filter((key) => !env[key]);
    if (missing.length > 0) {
        throw new Error(`Missing worker environment variables: ${missing.join(', ')}`);
    }
}

function assertProviderEnv(provider, env) {
    const requiredByProvider = {
        kakao: ['KAKAO_REST_API_KEY', 'KAKAO_REDIRECT_URI'],
        naver: ['NAVER_CLIENT_ID', 'NAVER_CLIENT_SECRET', 'NAVER_REDIRECT_URI']
    };

    const missing = requiredByProvider[provider].filter((key) => !env[key]);
    if (missing.length > 0) {
        throw new Error(`Missing ${provider} worker environment variables: ${missing.join(', ')}`);
    }
}

function assertStreamEnv(env) {
    const required = ['CLOUDFLARE_STREAM_ACCOUNT_ID', 'CLOUDFLARE_STREAM_API_TOKEN'];
    const missing = required.filter((key) => !env[key]);
    if (missing.length > 0) {
        throw new Error(`Missing Cloudflare Stream environment variables: ${missing.join(', ')}`);
    }
}

const DUI_COURSE_PRODUCT = {
    courseId: 'dui-prevention-basic',
    courseTitle: '음주운전 재범방지교육',
    price: 49000,
    currency: 'KRW',
    durationDays: 90,
    totalLessons: 3,
    pricePerLesson: 16333,
    description: '음주운전의 위험성과 법적 책임, 재범 예방을 위한 온라인 재범방지교육 과정',
    certificateAvailable: true
};

const CBT_COURSE_PRODUCT = {
    courseId: 'dui-cbt-advanced',
    courseTitle: '인지행동기반 재발방지교육 심화이수과정',
    price: 99000,
    currency: 'KRW',
    durationDays: 90,
    totalLessons: 5,
    pricePerLesson: 19800,
    description: '인지행동기반 재발방지 교육 심화이수과정',
    certificateAvailable: true
};

const NEW_PREVENTION_COURSE_PRODUCTS = {
    'violence-basic': { courseId: 'violence-basic', courseTitle: '폭력범죄 재범방지교육 기본 수료과정', certificateTitle: '폭력범죄 재범방지교육', price: 49000, currency: 'KRW', durationDays: 90, totalLessons: 1, pricePerLesson: 49000, description: '폭력범죄 재범방지교육 기본 수료과정', certificateAvailable: true },
    'violence-advanced': { courseId: 'violence-advanced', courseTitle: '폭력범죄 재범방지교육 심화이수과정', certificateTitle: '폭력범죄 재범방지교육', price: 99000, currency: 'KRW', durationDays: 90, totalLessons: 3, pricePerLesson: 33000, description: '폭력범죄 재범방지교육 심화이수과정', certificateAvailable: true, includesCbtCourse: true },
    'gambling-basic': { courseId: 'gambling-basic', courseTitle: '도박중독 재발방지교육 기본 수료과정', certificateTitle: '도박중독 재발방지교육', price: 49000, currency: 'KRW', durationDays: 90, totalLessons: 1, pricePerLesson: 49000, description: '도박중독 재발방지교육 기본 수료과정', certificateAvailable: true },
    'gambling-advanced': { courseId: 'gambling-advanced', courseTitle: '도박중독 재발방지교육 심화이수과정', certificateTitle: '도박중독 재발방지교육', price: 99000, currency: 'KRW', durationDays: 90, totalLessons: 3, pricePerLesson: 33000, description: '도박중독 재발방지교육 심화이수과정', certificateAvailable: true, includesCbtCourse: true },
    'sexual-offense-basic': { courseId: 'sexual-offense-basic', courseTitle: '성범죄 재범방지교육 기본 수료과정', certificateTitle: '성범죄 재범방지교육', price: 49000, currency: 'KRW', durationDays: 90, totalLessons: 1, pricePerLesson: 49000, description: '성범죄 재범방지교육 기본 수료과정', certificateAvailable: true },
    'sexual-offense-advanced': { courseId: 'sexual-offense-advanced', courseTitle: '성범죄 재범방지교육 심화이수과정', certificateTitle: '성범죄 재범방지교육', price: 99000, currency: 'KRW', durationDays: 90, totalLessons: 3, pricePerLesson: 33000, description: '성범죄 재범방지교육 심화이수과정', certificateAvailable: true, includesCbtCourse: true },
    'prostitution-basic': { courseId: 'prostitution-basic', courseTitle: '성매매 재범방지교육 기본 수료과정', certificateTitle: '성매매 재범방지교육', price: 49000, currency: 'KRW', durationDays: 90, totalLessons: 1, pricePerLesson: 49000, description: '성매매 재범방지교육 기본 수료과정', certificateAvailable: true },
    'prostitution-advanced': { courseId: 'prostitution-advanced', courseTitle: '성매매 재범방지교육 심화이수과정', certificateTitle: '성매매 재범방지교육', price: 99000, currency: 'KRW', durationDays: 90, totalLessons: 3, pricePerLesson: 33000, description: '성매매 재범방지교육 심화이수과정', certificateAvailable: true, includesCbtCourse: true },
    'drug-basic': { courseId: 'drug-basic', courseTitle: '마약류중독 재범방지교육 기본 수료과정', certificateTitle: '마약류중독 재범방지교육', price: 49000, currency: 'KRW', durationDays: 90, totalLessons: 1, pricePerLesson: 49000, description: '마약류중독 재범방지교육 기본 수료과정', certificateAvailable: true },
    'drug-advanced': { courseId: 'drug-advanced', courseTitle: '마약류중독 재범방지교육 심화이수과정', certificateTitle: '마약류중독 재범방지교육', price: 99000, currency: 'KRW', durationDays: 90, totalLessons: 3, pricePerLesson: 33000, description: '마약류중독 재범방지교육 심화이수과정', certificateAvailable: true, includesCbtCourse: true },
    'drug-addiction-relapse-prevention': { courseId: 'drug-addiction-relapse-prevention', courseTitle: '마약중독 재범방지교육', certificateTitle: '마약중독 재범방지교육', price: 49000, currency: 'KRW', durationDays: 90, totalLessons: 1, pricePerLesson: 49000, description: '마약중독 재범방지교육', certificateAvailable: true },
    'digital-crime-basic': { courseId: 'digital-crime-basic', courseTitle: '디지털범죄 재범방지교육 기본 수료과정', certificateTitle: '디지털범죄 재범방지교육', price: 49000, currency: 'KRW', durationDays: 90, totalLessons: 1, pricePerLesson: 49000, description: '디지털범죄 재범방지교육 기본 수료과정', certificateAvailable: true },
    'digital-crime-advanced': { courseId: 'digital-crime-advanced', courseTitle: '디지털범죄 재범방지교육 심화이수과정', certificateTitle: '디지털범죄 재범방지교육', price: 99000, currency: 'KRW', durationDays: 90, totalLessons: 3, pricePerLesson: 33000, description: '디지털범죄 재범방지교육 심화이수과정', certificateAvailable: true, includesCbtCourse: true },
    'fraud-basic': { courseId: 'fraud-basic', courseTitle: '사기 재범방지교육 기본 수료과정', certificateTitle: '사기 재범방지교육', price: 49000, currency: 'KRW', durationDays: 90, totalLessons: 1, pricePerLesson: 49000, description: '사기 재범방지교육 기본 수료과정', certificateAvailable: true },
    'fraud-advanced': { courseId: 'fraud-advanced', courseTitle: '사기 재범방지교육 심화이수과정', certificateTitle: '사기 재범방지교육', price: 99000, currency: 'KRW', durationDays: 90, totalLessons: 3, pricePerLesson: 33000, description: '사기 재범방지교육 심화이수과정', certificateAvailable: true, includesCbtCourse: true },
    'unlicensed-driving-basic': { courseId: 'unlicensed-driving-basic', courseTitle: '무면허운전 재범방지교육 기본 수료과정', certificateTitle: '무면허운전 재범방지교육', price: 49000, currency: 'KRW', durationDays: 90, totalLessons: 1, pricePerLesson: 49000, description: '무면허운전 재범방지교육 기본 수료과정', certificateAvailable: true },
    'unlicensed-driving-advanced': { courseId: 'unlicensed-driving-advanced', courseTitle: '무면허운전 재범방지교육 심화이수과정', certificateTitle: '무면허운전 재범방지교육', price: 99000, currency: 'KRW', durationDays: 90, totalLessons: 3, pricePerLesson: 33000, description: '무면허운전 재범방지교육 심화이수과정', certificateAvailable: true, includesCbtCourse: true },
    'hangover-driving-basic': { courseId: 'hangover-driving-basic', courseTitle: '숙취운전 재발방지교육 기본 수료과정', certificateTitle: '숙취운전 재발방지교육', price: 49000, currency: 'KRW', durationDays: 90, totalLessons: 1, pricePerLesson: 49000, description: '숙취운전 재발방지교육 기본 수료과정', certificateAvailable: true },
    'hangover-driving-advanced': { courseId: 'hangover-driving-advanced', courseTitle: '숙취운전 재발방지교육 심화이수과정', certificateTitle: '숙취운전 재발방지교육', price: 99000, currency: 'KRW', durationDays: 90, totalLessons: 3, pricePerLesson: 33000, description: '숙취운전 재발방지교육 심화이수과정', certificateAvailable: true, includesCbtCourse: true },
    'reckless-retaliatory-driving-basic': { courseId: 'reckless-retaliatory-driving-basic', courseTitle: '난폭·보복운전 재범방지교육 기본 수료과정', certificateTitle: '난폭·보복운전 재범방지교육', price: 49000, currency: 'KRW', durationDays: 90, totalLessons: 1, pricePerLesson: 49000, description: '난폭·보복운전 재범방지교육 기본 수료과정', certificateAvailable: true },
    'reckless-retaliatory-driving-advanced': { courseId: 'reckless-retaliatory-driving-advanced', courseTitle: '난폭·보복운전 재범방지교육 심화이수과정', certificateTitle: '난폭·보복운전 재범방지교육', price: 99000, currency: 'KRW', durationDays: 90, totalLessons: 3, pricePerLesson: 33000, description: '난폭·보복운전 재범방지교육 심화이수과정', certificateAvailable: true, includesCbtCourse: true },
    'defamation-insult-basic': { courseId: 'defamation-insult-basic', courseTitle: '악플·모욕·명예훼손 재범방지교육 기본 수료과정', certificateTitle: '악플·모욕·명예훼손 재범방지교육', price: 49000, currency: 'KRW', durationDays: 90, totalLessons: 1, pricePerLesson: 49000, description: '악플·모욕·명예훼손 재범방지교육 기본 수료과정', certificateAvailable: true },
    'defamation-insult-advanced': { courseId: 'defamation-insult-advanced', courseTitle: '악플·모욕·명예훼손 재범방지교육 심화이수과정', certificateTitle: '악플·모욕·명예훼손 재범방지교육', price: 99000, currency: 'KRW', durationDays: 90, totalLessons: 3, pricePerLesson: 33000, description: '악플·모욕·명예훼손 재범방지교육 심화이수과정', certificateAvailable: true, includesCbtCourse: true },
    'voice-phishing-basic': { courseId: 'voice-phishing-basic', courseTitle: '보이스피싱 재범방지교육 기본 수료과정', certificateTitle: '보이스피싱 재범방지교육', price: 49000, currency: 'KRW', durationDays: 90, totalLessons: 1, pricePerLesson: 49000, description: '보이스피싱 재범방지교육 기본 수료과정', certificateAvailable: true },
    'voice-phishing-advanced': { courseId: 'voice-phishing-advanced', courseTitle: '보이스피싱 재범방지교육 심화이수과정', certificateTitle: '보이스피싱 재범방지교육', price: 99000, currency: 'KRW', durationDays: 90, totalLessons: 3, pricePerLesson: 33000, description: '보이스피싱 재범방지교육 심화이수과정', certificateAvailable: true, includesCbtCourse: true },
    'digital-sexual-crime-basic': { courseId: 'digital-sexual-crime-basic', courseTitle: '디지털성범죄 재범방지교육 기본 수료과정', certificateTitle: '디지털성범죄 재범방지교육', price: 49000, currency: 'KRW', durationDays: 90, totalLessons: 1, pricePerLesson: 49000, description: '디지털성범죄 재범방지교육 기본 수료과정', certificateAvailable: true },
    'digital-sexual-crime-advanced': { courseId: 'digital-sexual-crime-advanced', courseTitle: '디지털성범죄 재범방지교육 심화이수과정', certificateTitle: '디지털성범죄 재범방지교육', price: 99000, currency: 'KRW', durationDays: 90, totalLessons: 3, pricePerLesson: 33000, description: '디지털성범죄 재범방지교육 심화이수과정', certificateAvailable: true, includesCbtCourse: true },
    'legal-compliance-awareness-basic': { courseId: 'legal-compliance-awareness-basic', courseTitle: '준법의식 교육 기본 수료과정', certificateTitle: '준법의식 교육', price: 49000, currency: 'KRW', durationDays: 90, totalLessons: 1, pricePerLesson: 49000, description: '준법의식 교육 기본 수료과정', certificateAvailable: true },
    'legal-compliance-awareness-advanced': { courseId: 'legal-compliance-awareness-advanced', courseTitle: '준법의식 교육 심화이수과정', certificateTitle: '준법의식 교육', price: 99000, currency: 'KRW', durationDays: 90, totalLessons: 3, pricePerLesson: 33000, description: '준법의식 교육 심화이수과정', certificateAvailable: true, includesCbtCourse: true }
};

const COURSE_PRODUCTS_BY_ID = {
    [DUI_COURSE_PRODUCT.courseId]: DUI_COURSE_PRODUCT,
    [CBT_COURSE_PRODUCT.courseId]: CBT_COURSE_PRODUCT,
    ...NEW_PREVENTION_COURSE_PRODUCTS
};

function getCourseProduct(courseId) {
    return COURSE_PRODUCTS_BY_ID[courseId] || null;
}

const COURSE_ID_ALIASES = {
    dui: DUI_COURSE_PRODUCT.courseId,
    basic: DUI_COURSE_PRODUCT.courseId,
    'dui-documents': DUI_COURSE_PRODUCT.courseId,
    'dui-prevention': DUI_COURSE_PRODUCT.courseId,
    'dui-prevention-basic': DUI_COURSE_PRODUCT.courseId,
    'rapid-sentencing-prep': DUI_COURSE_PRODUCT.courseId,
    '음주운전 재범방지교육': DUI_COURSE_PRODUCT.courseId,
    cbt: CBT_COURSE_PRODUCT.courseId,
    advanced: CBT_COURSE_PRODUCT.courseId,
    'dui-cbt': CBT_COURSE_PRODUCT.courseId,
    'dui-cbt-advanced': CBT_COURSE_PRODUCT.courseId,
    'dui-cbt-counseling': CBT_COURSE_PRODUCT.courseId,
    '인지행동기반 재발방지교육 심화과정': CBT_COURSE_PRODUCT.courseId,
    '인지행동기반 재발방지교육 심화이수과정': CBT_COURSE_PRODUCT.courseId,
    'violence-prevention': 'violence-basic',
    violence: 'violence-basic',
    '폭력범죄 재범방지교육 기본 수료과정': 'violence-basic',
    '폭력범죄 재범방지교육 심화이수과정': 'violence-advanced',
    'gambling-relapse-prevention': 'gambling-basic',
    gambling: 'gambling-basic',
    '도박중독 재발방지교육 기본 수료과정': 'gambling-basic',
    '도박중독 재발방지교육 심화이수과정': 'gambling-advanced',
    'sexual-offense-prevention': 'sexual-offense-basic',
    'sexual-offense': 'sexual-offense-basic',
    sexual: 'sexual-offense-basic',
    '성범죄 재범방지교육 기본 수료과정': 'sexual-offense-basic',
    '성범죄 재범방지교육 심화이수과정': 'sexual-offense-advanced',
    'prostitution-prevention': 'prostitution-basic',
    prostitution: 'prostitution-basic',
    'prostitution-basic': 'prostitution-basic',
    'prostitution-advanced': 'prostitution-advanced',
    'prostitution-advanced-counseling': 'prostitution-advanced',
    '성매매 재범방지교육': 'prostitution-basic',
    '성매매 재범방지교육 기본과정': 'prostitution-basic',
    '성매매 재범방지교육 기본 수료과정': 'prostitution-basic',
    '성매매 재범방지교육 심화과정': 'prostitution-advanced',
    '성매매 재범방지교육 심화이수과정': 'prostitution-advanced',
    'drug-rehab-prevention': 'drug-addiction-relapse-prevention',
    drug: 'drug-addiction-relapse-prevention',
    '마약류중독 재범방지교육 기본 수료과정': 'drug-basic',
    '마약류중독 재범방지교육 심화이수과정': 'drug-advanced',
    'drug-addiction-relapse-prevention': 'drug-addiction-relapse-prevention',
    'drug-addiction-basic': 'drug-addiction-relapse-prevention',
    'drug-addiction-premium': 'drug-addiction-relapse-prevention',
    '마약중독 재범방지교육': 'drug-addiction-relapse-prevention',
    '마약중독 재범방지교육 기본과정': 'drug-addiction-relapse-prevention',
    '마약중독 재범방지교육 기본 수료과정': 'drug-addiction-relapse-prevention',
    '마약중독 재범방지교육 심화과정': 'drug-addiction-relapse-prevention',
    '마약중독 재범방지교육 심화이수과정': 'drug-addiction-relapse-prevention',
    'digital-crime': 'digital-crime-basic',
    'digital-crime-basic': 'digital-crime-basic',
    'digital-crime-advanced': 'digital-crime-advanced',
    '디지털범죄 재범방지교육': 'digital-crime-basic',
    '디지털범죄 재범방지교육 기본과정': 'digital-crime-basic',
    '디지털범죄 재범방지교육 기본 수료과정': 'digital-crime-basic',
    '디지털범죄 재범방지교육 심화과정': 'digital-crime-advanced',
    '디지털범죄 재범방지교육 심화이수과정': 'digital-crime-advanced',
    'fraud-prevention': 'fraud-basic',
    fraud: 'fraud-basic',
    'fraud-basic': 'fraud-basic',
    'fraud-advanced': 'fraud-advanced',
    '사기 재범방지교육': 'fraud-basic',
    '사기 재범방지교육 기본과정': 'fraud-basic',
    '사기 재범방지교육 기본 수료과정': 'fraud-basic',
    '사기 재범방지교육 심화과정': 'fraud-advanced',
    '사기 재범방지교육 심화이수과정': 'fraud-advanced',
    'unlicensed-driving-prevention': 'unlicensed-driving-basic',
    'unlicensed-driving-basic': 'unlicensed-driving-basic',
    'unlicensed-driving-advanced': 'unlicensed-driving-advanced',
    '무면허운전 재범방지교육': 'unlicensed-driving-basic',
    '무면허운전 재범방지교육 기본과정': 'unlicensed-driving-basic',
    '무면허운전 재범방지교육 기본 수료과정': 'unlicensed-driving-basic',
    '무면허운전 재범방지교육 심화과정': 'unlicensed-driving-advanced',
    '무면허운전 재범방지교육 심화이수과정': 'unlicensed-driving-advanced',
    'hangover-driving-prevention': 'hangover-driving-basic',
    'hangover-driving-basic': 'hangover-driving-basic',
    'hangover-driving-advanced': 'hangover-driving-advanced',
    '숙취운전 재발방지교육': 'hangover-driving-basic',
    '숙취운전 재발방지교육 기본과정': 'hangover-driving-basic',
    '숙취운전 재발방지교육 기본 수료과정': 'hangover-driving-basic',
    '숙취운전 재발방지교육 심화과정': 'hangover-driving-advanced',
    '숙취운전 재발방지교육 심화이수과정': 'hangover-driving-advanced',
    'reckless-retaliatory-driving-prevention': 'reckless-retaliatory-driving-basic',
    'reckless-retaliatory-driving-basic': 'reckless-retaliatory-driving-basic',
    'reckless-retaliatory-driving-advanced': 'reckless-retaliatory-driving-advanced',
    '난폭·보복운전 재범방지교육': 'reckless-retaliatory-driving-basic',
    '난폭·보복운전 재범방지교육 기본과정': 'reckless-retaliatory-driving-basic',
    '난폭·보복운전 재범방지교육 기본 수료과정': 'reckless-retaliatory-driving-basic',
    '난폭·보복운전 재범방지교육 심화과정': 'reckless-retaliatory-driving-advanced',
    '난폭·보복운전 재범방지교육 심화이수과정': 'reckless-retaliatory-driving-advanced',
    'defamation-insult-prevention': 'defamation-insult-basic',
    'defamation-insult-basic': 'defamation-insult-basic',
    'defamation-insult-advanced': 'defamation-insult-advanced',
    '악플·모욕·명예훼손 재범방지교육': 'defamation-insult-basic',
    '악플·모욕·명예훼손 재범방지교육 기본과정': 'defamation-insult-basic',
    '악플·모욕·명예훼손 재범방지교육 기본 수료과정': 'defamation-insult-basic',
    '악플·모욕·명예훼손 재범방지교육 심화과정': 'defamation-insult-advanced',
    '악플·모욕·명예훼손 재범방지교육 심화이수과정': 'defamation-insult-advanced',
    '모욕·명예훼손 재범방지교육': 'defamation-insult-basic',
    '모욕·명예훼손 재범방지교육 기본과정': 'defamation-insult-basic',
    '모욕·명예훼손 재범방지교육 기본 수료과정': 'defamation-insult-basic',
    '모욕·명예훼손 재범방지교육 심화과정': 'defamation-insult-advanced',
    '모욕·명예훼손 재범방지교육 심화이수과정': 'defamation-insult-advanced',
    '악플 재범방지교육': 'defamation-insult-basic',
    'voice-phishing-prevention': 'voice-phishing-basic',
    'voice-phishing': 'voice-phishing-basic',
    'voice-phishing-basic': 'voice-phishing-basic',
    'voice-phishing-advanced': 'voice-phishing-advanced',
    'voice-phishing-advanced-counseling': 'voice-phishing-advanced',
    '보이스피싱 재범방지교육': 'voice-phishing-basic',
    '보이스피싱 재범방지교육 기본과정': 'voice-phishing-basic',
    '보이스피싱 재범방지교육 기본 수료과정': 'voice-phishing-basic',
    '보이스피싱 재범방지교육 심화과정': 'voice-phishing-advanced',
    '보이스피싱 재범방지교육 심화이수과정': 'voice-phishing-advanced',
    'digital-sexual-crime-prevention': 'digital-sexual-crime-basic',
    'digital-sexual-crime': 'digital-sexual-crime-basic',
    'digital-sexual-crime-basic': 'digital-sexual-crime-basic',
    'digital-sexual-crime-advanced': 'digital-sexual-crime-advanced',
    'digital-sexual-crime-advanced-counseling': 'digital-sexual-crime-advanced',
    '디지털성범죄 재범방지교육': 'digital-sexual-crime-basic',
    '디지털성범죄 재범방지교육 기본과정': 'digital-sexual-crime-basic',
    '디지털성범죄 재범방지교육 기본 수료과정': 'digital-sexual-crime-basic',
    '디지털성범죄 재범방지교육 심화과정': 'digital-sexual-crime-advanced',
    '디지털성범죄 재범방지교육 심화이수과정': 'digital-sexual-crime-advanced',
    'legal-compliance-awareness': 'legal-compliance-awareness-basic',
    'legal-compliance-awareness-basic': 'legal-compliance-awareness-basic',
    'legal-compliance-awareness-advanced': 'legal-compliance-awareness-advanced',
    '준법의식 교육': 'legal-compliance-awareness-basic',
    '준법의식 교육 기본과정': 'legal-compliance-awareness-basic',
    '준법의식 교육 기본 수료과정': 'legal-compliance-awareness-basic',
    '준법의식 교육 심화과정': 'legal-compliance-awareness-advanced',
    '준법의식 교육 심화이수과정': 'legal-compliance-awareness-advanced',
    '인지행동기반 재발방지교육 충실 준비과정': 'dui-cbt-advanced',
    '인지행동기반 재발방지교육 충실준비과정': 'dui-cbt-advanced',
    '폭력범죄 재범방지교육 충실 준비과정': 'violence-advanced',
    '폭력범죄 재범방지교육 충실준비과정': 'violence-advanced',
    '도박중독 재발방지교육 충실 준비과정': 'gambling-advanced',
    '도박중독 재발방지교육 충실준비과정': 'gambling-advanced',
    '성범죄 재범방지교육 충실 준비과정': 'sexual-offense-advanced',
    '성범죄 재범방지교육 충실준비과정': 'sexual-offense-advanced',
    '성매매 재범방지교육 충실 준비과정': 'prostitution-advanced',
    '성매매 재범방지교육 충실준비과정': 'prostitution-advanced',
    '마약류중독 재범방지교육 충실 준비과정': 'drug-advanced',
    '마약류중독 재범방지교육 충실준비과정': 'drug-advanced',
    '마약중독 재범방지교육 충실 준비과정': 'drug-addiction-relapse-prevention',
    '마약중독 재범방지교육 충실준비과정': 'drug-addiction-relapse-prevention',
    '디지털범죄 재범방지교육 충실 준비과정': 'digital-crime-advanced',
    '디지털범죄 재범방지교육 충실준비과정': 'digital-crime-advanced',
    '사기 재범방지교육 충실 준비과정': 'fraud-advanced',
    '사기 재범방지교육 충실준비과정': 'fraud-advanced',
    '무면허운전 재범방지교육 충실 준비과정': 'unlicensed-driving-advanced',
    '무면허운전 재범방지교육 충실준비과정': 'unlicensed-driving-advanced',
    '숙취운전 재발방지교육 충실 준비과정': 'hangover-driving-advanced',
    '숙취운전 재발방지교육 충실준비과정': 'hangover-driving-advanced',
    '난폭·보복운전 재범방지교육 충실 준비과정': 'reckless-retaliatory-driving-advanced',
    '난폭·보복운전 재범방지교육 충실준비과정': 'reckless-retaliatory-driving-advanced',
    '악플·모욕·명예훼손 재범방지교육 충실 준비과정': 'defamation-insult-advanced',
    '악플·모욕·명예훼손 재범방지교육 충실준비과정': 'defamation-insult-advanced',
    '모욕·명예훼손 재범방지교육 충실 준비과정': 'defamation-insult-advanced',
    '모욕·명예훼손 재범방지교육 충실준비과정': 'defamation-insult-advanced',
    '보이스피싱 재범방지교육 충실 준비과정': 'voice-phishing-advanced',
    '보이스피싱 재범방지교육 충실준비과정': 'voice-phishing-advanced',
    '디지털성범죄 재범방지교육 충실 준비과정': 'digital-sexual-crime-advanced',
    '디지털성범죄 재범방지교육 충실준비과정': 'digital-sexual-crime-advanced',
    '준법의식 교육 충실 준비과정': 'legal-compliance-awareness-advanced',
    '준법의식 교육 충실준비과정': 'legal-compliance-awareness-advanced',
};

function resolveCanonicalCourseId(input = {}) {
    const candidates = [
        input.canonicalCourseId,
        input.courseId,
        input.productId,
        input.paymentProductId,
        input.lectureId,
        input.slug,
        input.categoryId,
        input.productTitle,
        input.courseTitle,
        input.orderName
    ].map((value) => String(value || '').trim()).filter(Boolean);
    for (const candidate of candidates) {
        if (getCourseProduct(candidate)) return candidate;
        if (APPLICATION_PRODUCTS[candidate]?.canonicalCourseId) return APPLICATION_PRODUCTS[candidate].canonicalCourseId;
        if (APPLICATION_PRODUCTS[candidate]?.courseId) return APPLICATION_PRODUCTS[candidate].courseId;
        if (COURSE_ID_ALIASES[candidate]) return COURSE_ID_ALIASES[candidate];
        const lowered = candidate.toLowerCase();
        if (COURSE_ID_ALIASES[lowered]) return COURSE_ID_ALIASES[lowered];
    }
    return '';
}

function isCancelledOrRefundedOperationalRecord(row = {}) {
    const status = String(row.paymentStatus || row.status || row.orderStatus || row.cancelStatus || '').toLowerCase();
    if (['cancelled', 'canceled', 'refunded', 'failed', 'pending', 'awaiting_deposit', 'cancelled_paid', 'cancelled_partial'].includes(status)) return true;
    const portoneStatus = String(row.rawResponse?.status || row.status || '').toUpperCase();
    if (['CANCELLED', 'FAILED', 'PENDING', 'READY'].includes(portoneStatus)) return true;
    const amountTotal = Number(row.rawResponse?.amount?.total ?? row.amount ?? 0);
    const amountCancel = Number(row.rawResponse?.amount?.cancel ?? row.cancelAmount ?? row.refundAmount ?? 0);
    return amountTotal > 0 && amountCancel >= amountTotal;
}

function isRestorablePaidOperationalRecord(row = {}) {
    if (isCancelledOrRefundedOperationalRecord(row)) return false;
    const status = String(row.paymentStatus || row.status || row.orderStatus || row.rawResponse?.status || '').toLowerCase();
    return ['paid', 'done', 'completed', 'approved', 'success'].includes(status) || String(row.rawResponse?.status || '').toUpperCase() === 'PAID';
}

function isPaidLikePaymentRecord(row = {}) {
    const status = String(row.paymentStatus || row.status || row.orderStatus || row.rawResponse?.status || '').toLowerCase();
    return ['paid', 'done', 'completed', 'approved', 'success'].includes(status) || String(row.rawResponse?.status || '').toUpperCase() === 'PAID' || Boolean(row.approvedAt || row.paidAt || row.receiptUrl);
}

function paymentRecordMatchesOrder(record = {}, { uid, courseId, categoryId, productId, amount }) {
    const recordUid = String(record.uid || record.userId || '').trim();
    const recordCourseId = String(record.courseId || '').trim();
    const recordCategoryId = String(record.categoryId || '').trim();
    const recordProductId = String(record.productId || '').trim();
    const recordAmount = Number(record.amount ?? record.requestedAmount);
    if (recordUid && recordUid !== uid) return false;
    if (recordCourseId && recordCourseId !== courseId) return false;
    if (recordCategoryId && recordCategoryId !== categoryId) return false;
    if (recordProductId && recordProductId !== productId) return false;
    if (Number.isFinite(recordAmount) && recordAmount !== amount) return false;
    return true;
}

function getEnrollmentDuplicateDebug({ currentUid, currentEmail, requestedProductId, requestedCourseId, canonicalCourseId, enrollmentId, enrollment, reason, blocked }) {
    return {
        currentUid: currentUid || null,
        currentEmail: currentEmail || null,
        requestedProductId: requestedProductId || null,
        requestedCourseId: requestedCourseId || null,
        canonicalCourseId: canonicalCourseId || null,
        matchedEnrollmentId: enrollmentId || null,
        matchedEnrollmentUid: enrollment?.uid || enrollment?.userId || null,
        matchedEnrollmentCourseId: enrollment?.canonicalCourseId || enrollment?.courseId || null,
        matchedEnrollmentStatus: enrollment?.status || enrollment?.accessStatus || enrollment?.enrollmentStatus || null,
        matchedEnrollmentExpiresAt: enrollment?.expiresAt || enrollment?.accessEndsAt || null,
        reason,
        blocked: Boolean(blocked)
    };
}

function isDrugAddictionCanonicalCourse(courseId) {
    return courseId === 'drug-addiction-relapse-prevention';
}

function isDrugAddictionPremiumProduct(productId) {
    return productId === 'drug-addiction-premium' || productId === 'drug-addiction-premium-counseling';
}

function isCounselingProduct(productId) {
    return String(productId || '').endsWith('-counseling');
}

function isCourseEntitlementEquivalent(row = {}, canonicalCourseId = '') {
    const requestedCourseId = resolveCanonicalCourseId({ courseId: canonicalCourseId }) || canonicalCourseId;
    const resolvedCourseId = resolveCanonicalCourseId(row) || row?.canonicalCourseId || row?.courseId || '';
    if (requestedCourseId && resolvedCourseId === requestedCourseId) return true;

    const productId = String(row?.productId || row?.paymentProductId || '').trim();
    const product = APPLICATION_PRODUCTS[productId] || null;
    const productCourseId = resolveCanonicalCourseId({
        canonicalCourseId: product?.canonicalCourseId,
        courseId: product?.courseId,
        productId
    }) || product?.courseId || '';
    if (requestedCourseId && productCourseId === requestedCourseId) return true;

    const planId = String(row?.planId || product?.planId || '').trim();
    const categoryId = String(row?.categoryId || product?.categoryId || '').trim();
    const title = String(row?.productTitle || row?.courseTitle || row?.orderName || product?.title || '').trim();
    if (requestedCourseId === DUI_COURSE_PRODUCT.courseId) {
        return Boolean(
            product?.includesCbtCourse
            || productId === 'dui-cbt-counseling'
            || productId === 'dui-cbt-advanced'
            || productCourseId === CBT_COURSE_PRODUCT.courseId
            || (categoryId === 'dui' && (planId === 'advanced' || planId === 'counseling'))
            || title.includes('심화과정')
            || title.includes('심화이수과정') || title.includes('충실준비과정') || title.includes('충실 준비과정')
            || title.includes('심리상담 종합과정')
        );
    }

    if (requestedCourseId === CBT_COURSE_PRODUCT.courseId) {
        return Boolean(
            product?.includesCbtCourse
            || productId === 'dui-cbt-counseling'
            || productId === 'dui-cbt-advanced'
            || (categoryId === 'dui' && (planId === 'advanced' || planId === 'counseling'))
            || title.includes('심화과정')
            || title.includes('심화이수과정') || title.includes('충실준비과정') || title.includes('충실 준비과정')
            || title.includes('심리상담 종합과정')
        );
    }

    return false;
}

function getActiveDuplicateEnrollmentDecision(enrollment, currentUid, canonicalCourseId, requestedProductId = '') {
    if (!enrollment) return { blocked: false, reason: 'NO_MATCHED_ENROLLMENT' };
    const enrollmentUid = String(enrollment.uid || enrollment.userId || '').trim();
    if (!enrollmentUid) return { blocked: false, reason: 'MATCHED_ENROLLMENT_UID_MISSING' };
    if (enrollmentUid !== currentUid) return { blocked: false, reason: 'UID_MISMATCH' };

    const enrollmentCourseId = resolveCanonicalCourseId({ canonicalCourseId: enrollment.canonicalCourseId, courseId: enrollment.courseId, productId: enrollment.productId });
    if (!enrollmentCourseId) return { blocked: false, reason: 'MATCHED_ENROLLMENT_COURSE_MISSING' };
    if (enrollmentCourseId !== canonicalCourseId) return { blocked: false, reason: 'COURSE_ID_MISMATCH' };

    const status = String(enrollment.status || '').trim().toLowerCase();
    const accessStatus = String(enrollment.accessStatus || enrollment.enrollmentStatus || '').trim().toLowerCase();
    if (status !== 'active' || accessStatus !== 'active') return { blocked: false, reason: 'NOT_EXPLICITLY_ACTIVE' };
    if (enrollment.isActive === false) return { blocked: false, reason: 'IS_ACTIVE_FALSE' };

    const paymentStatus = String(enrollment.paymentStatus || '').trim().toLowerCase();
    const blockedPaymentStatuses = ['cancelled', 'canceled', 'refunded', 'failed', 'pending', 'awaiting_deposit'];
    if (blockedPaymentStatuses.includes(paymentStatus)) return { blocked: false, reason: 'PAYMENT_STATUS_NOT_BLOCKING_DUPLICATE' };

    const startsAt = getEnrollmentRecordTime(enrollment.startsAt || enrollment.accessStartsAt || enrollment.purchasedAt || enrollment.grantedAt || enrollment.createdAt);
    if (startsAt && startsAt > Date.now()) return { blocked: false, reason: 'NOT_STARTED' };
    const expiresAt = getEnrollmentRecordTime(enrollment.expiresAt || enrollment.accessEndsAt);
    if (!expiresAt) return { blocked: false, reason: 'EXPIRES_AT_MISSING' };
    if (expiresAt <= Date.now()) return { blocked: false, reason: 'EXPIRED' };

    if (isDrugAddictionCanonicalCourse(canonicalCourseId)) {
        const existingProductId = String(enrollment.productId || '').trim();
        if (existingProductId === requestedProductId) return { blocked: true, reason: 'SAME_UID_SAME_COURSE_SAME_PRODUCT_ACTIVE_NOT_EXPIRED' };
        if (isDrugAddictionPremiumProduct(existingProductId)) return { blocked: true, reason: 'PREMIUM_ALREADY_INCLUDES_BASIC' };
        if (isDrugAddictionPremiumProduct(requestedProductId)) return { blocked: false, reason: 'BASIC_TO_PREMIUM_INDEPENDENT_PURCHASE_ALLOWED' };
    }

    return { blocked: true, reason: 'SAME_UID_SAME_COURSE_ACTIVE_NOT_EXPIRED' };
}

async function checkActiveEnrollmentDuplicate(env, { uid, email, productId, requestedCourseId, canonicalCourseId }) {
    const enrollmentId = uid + '_' + canonicalCourseId;
    let duplicateReadSkipped = false;
    const raw = await firestoreGet(env, firestoreDocumentPath(env, 'enrollments', enrollmentId)).catch((error) => {
        if (error.status === 404) return null;
        if (isFirestoreQuotaError(error)) {
            duplicateReadSkipped = true;
            console.warn('[payment:duplicate-check-skipped]', { uid: maskLogIdentifier(uid), courseId: canonicalCourseId, status: error.status, message: error.message });
            return null;
        }
        return Promise.reject(error);
    });
    const enrollment = raw ? fromFirestoreFields(raw.fields || {}) : null;
    const decision = getActiveDuplicateEnrollmentDecision(enrollment, uid, canonicalCourseId, productId);
    const debug = getEnrollmentDuplicateDebug({
        currentUid: uid,
        currentEmail: email || null,
        requestedProductId: productId,
        requestedCourseId,
        canonicalCourseId,
        enrollmentId: raw ? enrollmentId : null,
        enrollment,
        reason: decision.reason,
        blocked: decision.blocked,
        duplicateReadSkipped
    });
    logEnrollmentWorkerEvent('payment_duplicate_enrollment_check', debug);
    return { ...decision, debug, enrollment, enrollmentId };
}

async function grantCourseAccess(env, input) {
    const uid = String(input.uid || input.userId || '').trim();
    const canonicalCourseId = resolveCanonicalCourseId({ ...input, courseId: input.canonicalCourseId || input.courseId });
    if (!uid) {
        const error = new Error('USER_NOT_FOUND');
        error.code = 'USER_NOT_FOUND';
        throw error;
    }
    if (!canonicalCourseId || !getCourseProduct(canonicalCourseId)) {
        const error = new Error('COURSE_NOT_FOUND');
        error.code = 'COURSE_NOT_FOUND';
        throw error;
    }

    const productId = input.productId && APPLICATION_PRODUCTS[input.productId]
        ? input.productId
        : resolveApplicationProductIdFromRecord({ ...input, courseId: canonicalCourseId });
    const product = APPLICATION_PRODUCTS[productId] || getCourseProduct(canonicalCourseId);
    const courseProduct = getCourseProduct(canonicalCourseId);
    const enrollmentId = uid + '_' + canonicalCourseId;
    const enrollmentPath = firestoreDocumentPath(env, 'enrollments', enrollmentId);
    const existingRaw = await firestoreGet(env, enrollmentPath).catch((error) => {
        if (error.status === 404) return null;
        if (isFirestoreQuotaError(error)) {
            console.warn('[course-access:existing-read-skipped]', { uid: maskLogIdentifier(uid), courseId: canonicalCourseId, status: error.status, message: error.message });
            return null;
        }
        return Promise.reject(error);
    });
    const existing = existingRaw ? fromFirestoreFields(existingRaw.fields || {}) : {};
    const nowIso = new Date().toISOString();
    const startsAt = input.startsAt || input.accessStartsAt || input.purchasedAt || input.approvedAt || input.grantedAt || nowIso;
    const expiresAt = input.expiresAt || input.accessEndsAt || new Date(new Date(startsAt).getTime() + (courseProduct.durationDays || DUI_COURSE_PRODUCT.durationDays) * 24 * 60 * 60 * 1000).toISOString();
    const source = String(input.source || input.sourceType || 'payment').toLowerCase();
    const sourceType = source === 'manual' ? 'MANUAL' : source === 'migration' ? 'MIGRATION' : 'PAYMENT';
    const isPaymentSource = sourceType === 'PAYMENT' || sourceType === 'MIGRATION';
    if (isPaymentSource) {
        const explicitPaymentStatus = normalizeEnrollmentStatus(input.paymentStatus || input.paymentState || input.orderStatus || input.rawResponse?.status);
        const paidLikeStatus = ['paid', 'done', 'completed', 'approved', 'success'].includes(explicitPaymentStatus) || String(input.rawResponse?.status || '').toUpperCase() === 'PAID';
        const blockedPaymentStatuses = ['pending', 'awaiting_deposit', 'ready', 'failed', 'fail', 'error', 'cancelled', 'canceled', 'refunded'];
        if (explicitPaymentStatus && !paidLikeStatus || blockedPaymentStatuses.includes(explicitPaymentStatus)) {
            const error = new Error('NON_PAID_PAYMENT_CANNOT_GRANT_ACCESS');
            error.code = 'NON_PAID_PAYMENT_CANNOT_GRANT_ACCESS';
            throw error;
        }
    }
    const record = {
        enrollmentId,
        uid,
        userId: uid,
        userEmail: input.userEmail || existing.userEmail || existing.email || null,
        canonicalCourseId,
        courseId: canonicalCourseId,
        categoryId: input.categoryId || product.categoryId || existing.categoryId || null,
        productId: product.productId || productId || existing.productId || null,
        planId: input.planId || product.planId || existing.planId || null,
        productTitle: input.productTitle || product.title || existing.productTitle || null,
        courseTitle: input.courseTitle || product.courseTitle || courseProduct.courseTitle,
        amount: input.amount ?? existing.amount ?? product.amount ?? null,
        paymentId: input.paymentId ?? existing.paymentId ?? null,
        orderId: input.orderId ?? existing.orderId ?? input.paymentId ?? null,
        paymentStatus: isPaymentSource ? (input.paymentStatus || 'paid') : null,
        source,
        sourceType,
        status: 'active',
        isActive: true,
        enrollmentStatus: 'active',
        accessStatus: 'active',
        startsAt,
        accessStartsAt: startsAt,
        purchasedAt: input.purchasedAt || existing.purchasedAt || startsAt,
        expiresAt,
        accessEndsAt: expiresAt,
        progress: existing.progress ?? 0,
        completedLessons: existing.completedLessons ?? 0,
        totalLessons: existing.totalLessons || product.totalLessons || courseProduct.totalLessons,
        certificateIssued: Boolean(existing.certificateIssued || input.certificateIssued),
        certificateIssuedAt: existing.certificateIssuedAt || input.certificateIssuedAt || null,
        certificateId: existing.certificateId || input.certificateId || null,
        certificateNo: existing.certificateNo || input.certificateNo || null,
        grantType: sourceType === 'MANUAL' ? (input.grantType || existing.grantType || 'MANUAL') : (existing.grantType || input.grantType || null),
        issueType: sourceType === 'MANUAL' ? (input.issueType || existing.issueType || 'MANUAL') : (existing.issueType || input.issueType || null),
        manualGrant: sourceType === 'MANUAL' || Boolean(existing.manualGrant),
        grantReason: sourceType === 'MANUAL' ? (input.grantReason || existing.grantReason || 'ADMIN_MANUAL') : (existing.grantReason || input.grantReason || null),
        adminGranted: sourceType === 'MANUAL' || Boolean(existing.adminGranted),
        grantedBy: input.grantedBy || existing.grantedBy || null,
        grantedByAdminId: input.grantedByAdminId || existing.grantedByAdminId || null,
        restoredByAdminId: input.restoredByAdminId || existing.restoredByAdminId || null,
        recoveredFrom: input.recoveredFrom || existing.recoveredFrom || (sourceType === 'MIGRATION' ? 'paid_record_migration' : null),
        createdAt: existing.createdAt || input.createdAt || nowIso,
        updatedAt: nowIso
    };
    const savedRaw = await firestorePatch(env, enrollmentPath, record);
    if (sourceType === 'MANUAL') {
        await mirrorManualEnrollmentToUser(env, uid, canonicalCourseId, record);
    }
    const saved = fromFirestoreFields(savedRaw.fields || {});
    const decision = getEnrollmentAccessDecision(saved, uid, canonicalCourseId);
    if (!decision.allowed) {
        const error = new Error('ACCESS_VERIFICATION_FAILED: ' + decision.reason);
        error.code = 'ACCESS_VERIFICATION_FAILED';
        throw error;
    }
    logEnrollmentWorkerEvent('course_access_granted', { uid: maskLogIdentifier(uid), courseId: canonicalCourseId, source: record.source, paymentId: record.paymentId || null });
    await safeSupabaseLedger('enrollment-upsert', () => supabaseLedgerUpsertEnrollment(env, record));
    return { ...saved, enrollmentId, id: enrollmentId, documentPath: enrollmentPath, accessDecision: decision };
}

const APPLICATION_PRODUCTS = {
    basic: {
        categoryId: 'dui',
        productId: 'basic',
        title: '기본형 수강권',
        amount: 49000,
        courseId: DUI_COURSE_PRODUCT.courseId,
        courseTitle: DUI_COURSE_PRODUCT.courseTitle,
        totalLessons: DUI_COURSE_PRODUCT.totalLessons
    },
    'dui-cbt-basic': {
        categoryId: 'dui',
        productId: 'dui-cbt-basic',
        planId: 'basic',
        title: '기본 수료과정',
        amount: 49000,
        courseId: DUI_COURSE_PRODUCT.courseId,
        courseTitle: DUI_COURSE_PRODUCT.courseTitle,
        totalLessons: DUI_COURSE_PRODUCT.totalLessons
    },
    'dui-documents': { categoryId: 'dui', productId: 'dui-documents', planId: 'basic', title: '기본 수료과정', amount: 49000, courseId: DUI_COURSE_PRODUCT.courseId, courseTitle: DUI_COURSE_PRODUCT.courseTitle, totalLessons: DUI_COURSE_PRODUCT.totalLessons },
    'dui-cbt-advanced': {
        categoryId: 'dui',
        productId: 'dui-cbt-advanced',
        planId: 'advanced',
        title: '심화이수과정',
        amount: 99000,
        courseId: CBT_COURSE_PRODUCT.courseId,
        courseTitle: CBT_COURSE_PRODUCT.courseTitle,
        totalLessons: CBT_COURSE_PRODUCT.totalLessons
    },
    'dui-cbt-counseling': { categoryId: 'dui', productId: 'dui-cbt-counseling', planId: 'counseling', title: '심리상담 종합과정', amount: 199000, courseId: 'dui-cbt-advanced', courseTitle: '음주운전 재범방지교육 - 심리상담 종합과정', totalLessons: CBT_COURSE_PRODUCT.totalLessons, includesCbtCourse: true, counselingContactRequired: true },
    'violence-advanced-counseling': { categoryId: 'violence-prevention', productId: 'violence-advanced-counseling', planId: 'counseling', title: '심리상담 종합과정', amount: 199000, courseId: 'violence-advanced', courseTitle: '폭력범죄 재범방지교육 - 심리상담 종합과정', totalLessons: 3, includesCbtCourse: true, counselingContactRequired: true },
    'gambling-advanced-counseling': { categoryId: 'gambling-relapse-prevention', productId: 'gambling-advanced-counseling', planId: 'counseling', title: '심리상담 종합과정', amount: 199000, courseId: 'gambling-advanced', courseTitle: '도박중독 재발방지교육 - 심리상담 종합과정', totalLessons: 3, includesCbtCourse: true, counselingContactRequired: true },
    'sexual-offense-advanced-counseling': { categoryId: 'sexual-offense-prevention', productId: 'sexual-offense-advanced-counseling', planId: 'counseling', title: '심리상담 종합과정', amount: 199000, courseId: 'sexual-offense-advanced', courseTitle: '성범죄 재범방지교육 - 심리상담 종합과정', totalLessons: 3, includesCbtCourse: true, counselingContactRequired: true },
    'prostitution-advanced-counseling': { categoryId: 'prostitution-prevention', productId: 'prostitution-advanced-counseling', planId: 'counseling', title: '심리상담 종합과정', amount: 199000, courseId: 'prostitution-advanced', courseTitle: '성매매 재범방지교육 - 심리상담 종합과정', totalLessons: 3, includesCbtCourse: true, counselingContactRequired: true },
    'drug-advanced-counseling': { categoryId: 'drug-rehab-prevention', productId: 'drug-advanced-counseling', planId: 'counseling', title: '심리상담 종합과정', amount: 199000, courseId: 'drug-advanced', courseTitle: '마약류중독 재범방지교육 - 심리상담 종합과정', totalLessons: 3, includesCbtCourse: true, counselingContactRequired: true },
    'drug-addiction-premium-counseling': { categoryId: 'drug-rehab-prevention', productId: 'drug-addiction-premium-counseling', planId: 'counseling', title: '심리상담 종합과정', amount: 199000, courseId: 'drug-addiction-premium', canonicalCourseId: 'drug-addiction-relapse-prevention', courseTitle: '마약중독 재범방지교육 - 심리상담 종합과정', totalLessons: 3, includesCbtCourse: true, counselingContactRequired: true },
    'digital-crime-advanced-counseling': { categoryId: 'digital-crime', productId: 'digital-crime-advanced-counseling', planId: 'counseling', title: '심리상담 종합과정', amount: 199000, courseId: 'digital-crime-advanced', courseTitle: '디지털범죄 재범방지교육 - 심리상담 종합과정', totalLessons: 3, includesCbtCourse: true, counselingContactRequired: true },
    'fraud-advanced-counseling': { categoryId: 'fraud-prevention', productId: 'fraud-advanced-counseling', planId: 'counseling', title: '심리상담 종합과정', amount: 199000, courseId: 'fraud-advanced', courseTitle: '사기 재범방지교육 - 심리상담 종합과정', totalLessons: 3, includesCbtCourse: true, counselingContactRequired: true },
    'unlicensed-driving-advanced-counseling': { categoryId: 'unlicensed-driving-prevention', productId: 'unlicensed-driving-advanced-counseling', planId: 'counseling', title: '심리상담 종합과정', amount: 199000, courseId: 'unlicensed-driving-advanced', courseTitle: '무면허운전 재범방지교육 - 심리상담 종합과정', totalLessons: 3, includesCbtCourse: true, counselingContactRequired: true },
    'hangover-driving-advanced-counseling': { categoryId: 'hangover-driving-prevention', productId: 'hangover-driving-advanced-counseling', planId: 'counseling', title: '심리상담 종합과정', amount: 199000, courseId: 'hangover-driving-advanced', courseTitle: '숙취운전 재발방지교육 - 심리상담 종합과정', totalLessons: 3, includesCbtCourse: true, counselingContactRequired: true },
    'reckless-retaliatory-driving-advanced-counseling': { categoryId: 'reckless-retaliatory-driving-prevention', productId: 'reckless-retaliatory-driving-advanced-counseling', planId: 'counseling', title: '심리상담 종합과정', amount: 199000, courseId: 'reckless-retaliatory-driving-advanced', courseTitle: '난폭·보복운전 재범방지교육 - 심리상담 종합과정', totalLessons: 3, includesCbtCourse: true, counselingContactRequired: true },
    'defamation-insult-advanced-counseling': { categoryId: 'defamation-insult-prevention', productId: 'defamation-insult-advanced-counseling', planId: 'counseling', title: '심리상담 종합과정', amount: 199000, courseId: 'defamation-insult-advanced', courseTitle: '악플·모욕·명예훼손 재범방지교육 - 심리상담 종합과정', totalLessons: 3, includesCbtCourse: true, counselingContactRequired: true },
    'voice-phishing-advanced-counseling': { categoryId: 'voice-phishing-prevention', productId: 'voice-phishing-advanced-counseling', planId: 'counseling', title: '심리상담 종합과정', amount: 199000, courseId: 'voice-phishing-advanced', courseTitle: '보이스피싱 재범방지교육 - 심리상담 종합과정', totalLessons: 3, includesCbtCourse: true, counselingContactRequired: true },
    'digital-sexual-crime-advanced-counseling': { categoryId: 'digital-sexual-crime-prevention', productId: 'digital-sexual-crime-advanced-counseling', planId: 'counseling', title: '심리상담 종합과정', amount: 199000, courseId: 'digital-sexual-crime-advanced', courseTitle: '디지털성범죄 재범방지교육 - 심리상담 종합과정', totalLessons: 3, includesCbtCourse: true, counselingContactRequired: true },
    'legal-compliance-awareness-advanced-counseling': { categoryId: 'legal-compliance-awareness', productId: 'legal-compliance-awareness-advanced-counseling', planId: 'counseling', title: '심리상담 종합과정', amount: 199000, courseId: 'legal-compliance-awareness-advanced', courseTitle: '준법의식 교육 - 심리상담 종합과정', totalLessons: 3, includesCbtCourse: true, counselingContactRequired: true },
    'violence-basic': { categoryId: 'violence-prevention', productId: 'violence-basic', planId: 'basic', title: '폭력범죄 재범방지교육 기본 수료과정', amount: 49000, courseId: 'violence-basic', courseTitle: '폭력범죄 재범방지교육 기본 수료과정', totalLessons: 1 },
    'violence-advanced': { categoryId: 'violence-prevention', productId: 'violence-advanced', planId: 'advanced', title: '폭력범죄 재범방지교육 심화이수과정', amount: 99000, courseId: 'violence-advanced', courseTitle: '폭력범죄 재범방지교육 심화이수과정', totalLessons: 3, includesCbtCourse: true },
    'gambling-basic': { categoryId: 'gambling-relapse-prevention', productId: 'gambling-basic', planId: 'basic', title: '도박중독 재발방지교육 기본 수료과정', amount: 49000, courseId: 'gambling-basic', courseTitle: '도박중독 재발방지교육 기본 수료과정', totalLessons: 1 },
    'gambling-advanced': { categoryId: 'gambling-relapse-prevention', productId: 'gambling-advanced', planId: 'advanced', title: '도박중독 재발방지교육 심화이수과정', amount: 99000, courseId: 'gambling-advanced', courseTitle: '도박중독 재발방지교육 심화이수과정', totalLessons: 3, includesCbtCourse: true },
    'sexual-offense-basic': { categoryId: 'sexual-offense-prevention', productId: 'sexual-offense-basic', planId: 'basic', title: '성범죄 재범방지교육 기본 수료과정', amount: 49000, courseId: 'sexual-offense-basic', courseTitle: '성범죄 재범방지교육 기본 수료과정', totalLessons: 1 },
    'sexual-offense-advanced': { categoryId: 'sexual-offense-prevention', productId: 'sexual-offense-advanced', planId: 'advanced', title: '성범죄 재범방지교육 심화이수과정', amount: 99000, courseId: 'sexual-offense-advanced', courseTitle: '성범죄 재범방지교육 심화이수과정', totalLessons: 3, includesCbtCourse: true },
    'prostitution-basic': { categoryId: 'prostitution-prevention', productId: 'prostitution-basic', planId: 'basic', title: '성매매 재범방지교육 기본 수료과정', amount: 49000, courseId: 'prostitution-basic', courseTitle: '성매매 재범방지교육 기본 수료과정', totalLessons: 1 },
    'prostitution-advanced': { categoryId: 'prostitution-prevention', productId: 'prostitution-advanced', planId: 'advanced', title: '성매매 재범방지교육 심화이수과정', amount: 99000, courseId: 'prostitution-advanced', courseTitle: '성매매 재범방지교육 심화이수과정', totalLessons: 3, includesCbtCourse: true },
    'drug-basic': { categoryId: 'drug-rehab-prevention', productId: 'drug-basic', planId: 'basic', title: '마약류중독 재범방지교육 기본 수료과정', amount: 49000, courseId: 'drug-basic', courseTitle: '마약류중독 재범방지교육 기본 수료과정', totalLessons: 1 },
    'drug-advanced': { categoryId: 'drug-rehab-prevention', productId: 'drug-advanced', planId: 'advanced', title: '마약류중독 재범방지교육 심화이수과정', amount: 99000, courseId: 'drug-advanced', courseTitle: '마약류중독 재범방지교육 심화이수과정', totalLessons: 3, includesCbtCourse: true },
    'drug-addiction-basic': { categoryId: 'drug-rehab-prevention', productId: 'drug-addiction-basic', planId: 'basic', title: '마약중독 재범방지교육 기본 수료과정', amount: 49000, courseId: 'drug-addiction-basic', canonicalCourseId: 'drug-addiction-relapse-prevention', courseTitle: '마약중독 재범방지교육 기본 수료과정', totalLessons: 1 },
    'drug-addiction-premium': { categoryId: 'drug-rehab-prevention', productId: 'drug-addiction-premium', planId: 'premium', title: '마약중독 재범방지교육 심화이수과정', amount: 99000, courseId: 'drug-addiction-premium', canonicalCourseId: 'drug-addiction-relapse-prevention', courseTitle: '마약중독 재범방지교육 심화이수과정', totalLessons: 3, includesCbtCourse: true },
    'digital-crime-basic': { categoryId: 'digital-crime', productId: 'digital-crime-basic', planId: 'basic', title: '디지털범죄 재범방지교육 기본 수료과정', amount: 49000, courseId: 'digital-crime-basic', courseTitle: '디지털범죄 재범방지교육 기본 수료과정', totalLessons: 1 },
    'digital-crime-advanced': { categoryId: 'digital-crime', productId: 'digital-crime-advanced', planId: 'advanced', title: '디지털범죄 재범방지교육 심화이수과정', amount: 99000, courseId: 'digital-crime-advanced', courseTitle: '디지털범죄 재범방지교육 심화이수과정', totalLessons: 3, includesCbtCourse: true },
    'fraud-basic': { categoryId: 'fraud-prevention', productId: 'fraud-basic', planId: 'basic', title: '사기 재범방지교육 기본 수료과정', amount: 49000, courseId: 'fraud-basic', courseTitle: '사기 재범방지교육 기본 수료과정', totalLessons: 1 },
    'fraud-advanced': { categoryId: 'fraud-prevention', productId: 'fraud-advanced', planId: 'advanced', title: '사기 재범방지교육 심화이수과정', amount: 99000, courseId: 'fraud-advanced', courseTitle: '사기 재범방지교육 심화이수과정', totalLessons: 3, includesCbtCourse: true },
    'unlicensed-driving-basic': { categoryId: 'unlicensed-driving-prevention', productId: 'unlicensed-driving-basic', planId: 'basic', title: '무면허운전 재범방지교육 기본 수료과정', amount: 49000, courseId: 'unlicensed-driving-basic', courseTitle: '무면허운전 재범방지교육 기본 수료과정', totalLessons: 1 },
    'unlicensed-driving-advanced': { categoryId: 'unlicensed-driving-prevention', productId: 'unlicensed-driving-advanced', planId: 'advanced', title: '무면허운전 재범방지교육 심화이수과정', amount: 99000, courseId: 'unlicensed-driving-advanced', courseTitle: '무면허운전 재범방지교육 심화이수과정', totalLessons: 3, includesCbtCourse: true },
    'hangover-driving-basic': { categoryId: 'hangover-driving-prevention', productId: 'hangover-driving-basic', planId: 'basic', title: '숙취운전 재발방지교육 기본 수료과정', amount: 49000, courseId: 'hangover-driving-basic', courseTitle: '숙취운전 재발방지교육 기본 수료과정', totalLessons: 1 },
    'hangover-driving-advanced': { categoryId: 'hangover-driving-prevention', productId: 'hangover-driving-advanced', planId: 'advanced', title: '숙취운전 재발방지교육 심화이수과정', amount: 99000, courseId: 'hangover-driving-advanced', courseTitle: '숙취운전 재발방지교육 심화이수과정', totalLessons: 3, includesCbtCourse: true },
    'reckless-retaliatory-driving-basic': { categoryId: 'reckless-retaliatory-driving-prevention', productId: 'reckless-retaliatory-driving-basic', planId: 'basic', title: '난폭·보복운전 재범방지교육 기본 수료과정', amount: 49000, courseId: 'reckless-retaliatory-driving-basic', courseTitle: '난폭·보복운전 재범방지교육 기본 수료과정', totalLessons: 1 },
    'reckless-retaliatory-driving-advanced': { categoryId: 'reckless-retaliatory-driving-prevention', productId: 'reckless-retaliatory-driving-advanced', planId: 'advanced', title: '난폭·보복운전 재범방지교육 심화이수과정', amount: 99000, courseId: 'reckless-retaliatory-driving-advanced', courseTitle: '난폭·보복운전 재범방지교육 심화이수과정', totalLessons: 3, includesCbtCourse: true },
    'defamation-insult-basic': { categoryId: 'defamation-insult-prevention', productId: 'defamation-insult-basic', planId: 'basic', title: '악플·모욕·명예훼손 재범방지교육 기본 수료과정', amount: 49000, courseId: 'defamation-insult-basic', courseTitle: '악플·모욕·명예훼손 재범방지교육 기본 수료과정', totalLessons: 1 },
    'defamation-insult-advanced': { categoryId: 'defamation-insult-prevention', productId: 'defamation-insult-advanced', planId: 'advanced', title: '악플·모욕·명예훼손 재범방지교육 심화이수과정', amount: 99000, courseId: 'defamation-insult-advanced', courseTitle: '악플·모욕·명예훼손 재범방지교육 심화이수과정', totalLessons: 3, includesCbtCourse: true },
    'voice-phishing-basic': { categoryId: 'voice-phishing-prevention', productId: 'voice-phishing-basic', planId: 'basic', title: '보이스피싱 재범방지교육 기본 수료과정', amount: 49000, courseId: 'voice-phishing-basic', courseTitle: '보이스피싱 재범방지교육 기본 수료과정', totalLessons: 1 },
    'voice-phishing-advanced': { categoryId: 'voice-phishing-prevention', productId: 'voice-phishing-advanced', planId: 'advanced', title: '보이스피싱 재범방지교육 심화이수과정', amount: 99000, courseId: 'voice-phishing-advanced', courseTitle: '보이스피싱 재범방지교육 심화이수과정', totalLessons: 3, includesCbtCourse: true },
    'digital-sexual-crime-basic': { categoryId: 'digital-sexual-crime-prevention', productId: 'digital-sexual-crime-basic', planId: 'basic', title: '디지털성범죄 재범방지교육 기본 수료과정', amount: 49000, courseId: 'digital-sexual-crime-basic', courseTitle: '디지털성범죄 재범방지교육 기본 수료과정', totalLessons: 1 },
    'digital-sexual-crime-advanced': { categoryId: 'digital-sexual-crime-prevention', productId: 'digital-sexual-crime-advanced', planId: 'advanced', title: '디지털성범죄 재범방지교육 심화이수과정', amount: 99000, courseId: 'digital-sexual-crime-advanced', courseTitle: '디지털성범죄 재범방지교육 심화이수과정', totalLessons: 3, includesCbtCourse: true },
    'legal-compliance-awareness-basic': { categoryId: 'legal-compliance-awareness', productId: 'legal-compliance-awareness-basic', planId: 'basic', title: '준법의식 교육 기본 수료과정', amount: 49000, courseId: 'legal-compliance-awareness-basic', courseTitle: '준법의식 교육 기본 수료과정', totalLessons: 1 },
    'legal-compliance-awareness-advanced': { categoryId: 'legal-compliance-awareness', productId: 'legal-compliance-awareness-advanced', planId: 'advanced', title: '준법의식 교육 심화이수과정', amount: 99000, courseId: 'legal-compliance-awareness-advanced', courseTitle: '준법의식 교육 심화이수과정', totalLessons: 3, includesCbtCourse: true }
};


function parseTime(value) {
    if (!value) return null;
    const time = new Date(value).getTime();
    return Number.isFinite(time) ? time : null;
}

function inferWorkerCertificateDocumentType(certificateId, requestedDocumentType, storedDocumentType, courseId) {
    const id = String(certificateId || '');
    if (requestedDocumentType === 'cbt-completion' || storedDocumentType === 'cbt-completion' || id.includes('_cbt-completion') || id.endsWith('cbt-completion')) return 'cbt-completion';
    if (requestedDocumentType === 'cbt-detail' || storedDocumentType === 'cbt-detail' || id.includes('_cbt-detail') || id.endsWith('cbt-detail')) return 'cbt-detail';
    if (requestedDocumentType === 'attendance' || storedDocumentType === 'attendance') return 'attendance';
    if (courseId === CBT_COURSE_PRODUCT.courseId && storedDocumentType !== 'cbt-detail') return 'cbt-completion';
    return storedDocumentType || requestedDocumentType || 'completion';
}

function getWorkerCertificateCourseTitleForDocument(product, documentType, courseId) {
    if (documentType === 'cbt-completion' || courseId === CBT_COURSE_PRODUCT.courseId) return '인지행동기반 재발방지교육';
    return product.certificateTitle || product.courseTitle;
}

function compactDate(value) {
    const matched = typeof value === 'string' ? value.match(/^(\d{4})-(\d{2})-(\d{2})$/) : null;
    if (matched) return matched[1] + matched[2] + matched[3];
    const date = value ? new Date(value) : new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
}

function normalizeAdminDateOnly(value) {
    const text = String(value || '').trim();
    const matched = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!matched) return null;
    const year = Number(matched[1]);
    const month = Number(matched[2]);
    const day = Number(matched[3]);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
    return text;
}

function getTrustedCompletionAt(...records) {
    const fields = ['displayDate', 'originalCompletedAt', 'courseCompletedAt', 'completionTimestamp', 'completionDate', 'completedDate', 'completedAt'];
    for (const record of records) {
        if (!record) continue;
        const firstOutputTime = parseTime(record.firstDocumentOutputAt || record.documentFirstOutputAt);
        for (const field of fields) {
            const value = record[field];
            if (!value) continue;
            const valueTime = parseTime(value);
            if (field === 'completedAt' && firstOutputTime !== null && valueTime === firstOutputTime && record.originalCompletedAt) continue;
            if (field === 'completedAt' && firstOutputTime !== null && valueTime === firstOutputTime && !record.originalCompletedAt) continue;
            return value;
        }
    }
    return null;
}

async function getWorkerCourseProgressRecord(env, uid, courseId, alternateCourseId = '') {
    const ids = Array.from(new Set([uid + '_' + courseId, alternateCourseId ? uid + '_' + alternateCourseId : ''].filter(Boolean)));
    for (const id of ids) {
        const record = await firestoreGetData(env, 'courseProgress', id).catch((error) => error.status === 404 ? null : Promise.reject(error));
        if (record) return record;
    }
    return null;
}

function getCertificateCourseCode(courseId) {
    const normalized = String(courseId || '');
    if (normalized.includes('digital-crime')) return normalized.includes('advanced') ? 'DIG-A' : 'DIG-B';
    if (normalized.includes('violence')) return 'VIOLENCE';
    if (normalized.includes('gambling')) return 'GAMBLING';
    if (normalized.includes('sexual-offense')) return 'PREV';
    if (normalized.includes('drug')) return 'DRUG';
    return 'DUI';
}

async function makeCertificateNo(certificateId, issuedAt, courseId) {
    const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(certificateId));
    const numeric = Array.from(new Uint8Array(bytes.slice(0, 4))).reduce((acc, byte) => (acc * 256 + byte) % 100000, 0);
    return `RESET-${getCertificateCourseCode(courseId)}-${compactDate(issuedAt)}-${String(numeric).padStart(5, '0')}`;
}

async function firestoreGetData(env, collectionName, documentId) {
    const raw = await firestoreGet(env, firestoreDocumentPath(env, collectionName, documentId));
    return { id: documentId, ...fromFirestoreFields(raw.fields || {}) };
}

async function handleCertificateIssue(request, env, corsHeaders) {
    const authHeader = request.headers.get('Authorization') || '';
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!idToken) {
        return json({ message: '로그인 후 수료증을 발급받을 수 있습니다.', code: 'AUTH_REQUIRED' }, 401, corsHeaders);
    }

    const firebaseUser = await verifyFirebaseIdToken(idToken, env);
    const body = await request.json().catch(() => ({}));
    const courseId = body.courseId || DUI_COURSE_PRODUCT.courseId;
    const requestedDocumentType = String(body.documentType || "").trim();
    const canonicalCourseId = resolveCanonicalCourseId({ courseId: body.courseId || DUI_COURSE_PRODUCT.courseId, productId: body.productId }) || courseId;
    const requestedCourseProduct = getApplicationProductForPayment(String(body.courseId || ''));
    const enrollmentProduct = body.productId ? getApplicationProductForPayment(String(body.productId)) : requestedCourseProduct;
    const product = enrollmentProduct || getCourseProduct(canonicalCourseId);
    if (!product) {
        return json({ message: '지원하지 않는 교육과정입니다.', code: 'INVALID_COURSE' }, 400, corsHeaders);
    }

    const uid = firebaseUser.uid;
    const certificateId = requestedDocumentType && requestedDocumentType !== "completion" ? `${uid}_${courseId}_${requestedDocumentType}` : `${uid}_${courseId}`;
    let existingReadQuotaSkipped = false;
    const existing = await firestoreGetData(env, 'certificates', certificateId).catch((error) => {
        if (error.status === 404) return null;
        if (isFirestoreQuotaError(error)) {
            existingReadQuotaSkipped = true;
            console.warn('[certificate:existing-read-skipped]', { uid: maskLogIdentifier(uid), certificateId, status: error.status, message: error.message });
            return null;
        }
        return Promise.reject(error);
    });
    if (existing?.certificateNo || existing?.issueNumber) {
        const existingDocumentType = inferWorkerCertificateDocumentType(certificateId, requestedDocumentType, existing.documentType, courseId);
        let existingBirthDate = getWorkerRecordBirthDate(existing);
        if (!existingBirthDate) {
            const existingUser = await firestoreGetData(env, 'users', uid).catch((error) => error.status === 404 || isFirestoreQuotaError(error) ? null : Promise.reject(error));
            existingBirthDate = getWorkerRecordBirthDate(existingUser);
            if (!existingBirthDate) {
                const paidRecord = await getBirthDatePaymentRecordForIssuedCertificate(env, uid, canonicalCourseId, existingUser?.email || firebaseUser.email || '').catch(() => null);
                existingBirthDate = getWorkerRecordBirthDate(paidRecord);
            }
        }
        const displayCertificate = existingBirthDate ? { ...existing, birthDate: existing.birthDate || existingBirthDate, dateOfBirth: existing.dateOfBirth || existingBirthDate } : existing;
        await updateCertificateFlags(env, uid, courseId, existing.certificateNo || existing.issueNumber, certificateId, existing.issuedAt || existing.createdAt, existingDocumentType !== 'attendance').catch((error) => console.error(error));
        await safeSupabaseLedger('certificate-reissued', () => supabaseLedgerInsertActivity(env, { firebase_uid: uid, event_type: 'certificate_reissued', course_id: courseId, course_name: existing.courseTitle || null, description: existing.certificateNo || existing.issueNumber, metadata: { certificate_id: certificateId, document_type: existingDocumentType }, event_at: new Date().toISOString() }));
        return json({ certificateId, certificateNo: existing.certificateNo || existing.issueNumber, alreadyIssued: true, documentType: existingDocumentType, certificate: { ...displayCertificate, certificateId, documentType: existingDocumentType } }, 200, corsHeaders);
    }

    let enrollment = await getCanonicalWorkerEnrollmentRecord(env, uid, canonicalCourseId).catch((error) => {
        if (isFirestoreQuotaError(error)) {
            console.warn('[certificate:enrollment-read-skipped]', { uid: maskLogIdentifier(uid), courseId: canonicalCourseId, status: error.status, message: error.message });
            return null;
        }
        throw error;
    });
    if (!isFirestoreEnrollmentActiveRecord(enrollment)) {
        const cachedEntitlement = await getRecentPaymentEntitlement(env, uid, canonicalCourseId).catch(() => null);
        if (isCachedEntitlementActive(cachedEntitlement, uid, canonicalCourseId)) enrollment = cachedEntitlement;
    }

    const user = await firestoreGetData(env, 'users', uid).catch((error) => {
        if (error.status === 404) return null;
        if (isFirestoreQuotaError(error)) {
            console.warn('[certificate:user-read-skipped]', { uid: maskLogIdentifier(uid), status: error.status, message: error.message });
            return null;
        }
        return Promise.reject(error);
    });

    if (!isFirestoreEnrollmentActiveRecord(enrollment)) {
        return json({ message: '정상 결제된 교육과정이 확인되지 않습니다.', code: 'ENROLLMENT_NOT_ACTIVE' }, 400, corsHeaders);
    }

    const expiresAtTime = parseTime(enrollment.expiresAt);
    if (expiresAtTime !== null && expiresAtTime < Date.now()) {
        return json({ message: '수강기간이 만료되어 수료증을 발급받을 수 없습니다.', code: 'ACCESS_EXPIRED' }, 400, corsHeaders);
    }

    const completedLessons = product.totalLessons;
    const progressRate = 100;
    const isCompleted = true;

    const locked = user?.certificateIdentity || {};
    const userName = String(locked.realName || user?.realName || user?.fullName || user?.userName || enrollment.certificateName || enrollment.userName || firebaseUser.name || firebaseUser.email || '회원').trim();
    let rawBirthDate = String(locked.dateOfBirth || user?.dateOfBirth || user?.birthDate || enrollment.certificateBirthDate || enrollment.birthDate || enrollment.dateOfBirth || getWorkerRecordBirthDate(enrollment) || '').trim();
    if (!rawBirthDate) {
        const paidRecord = await getBirthDatePaymentRecordForIssuedCertificate(env, uid, canonicalCourseId, user?.email || firebaseUser.email || '').catch(() => null);
        rawBirthDate = getWorkerRecordBirthDate(paidRecord);
    }
    const birthDate = /^\d{4}-\d{2}-\d{2}$/.test(rawBirthDate) ? rawBirthDate : '';

    const issuedAt = existing?.issuedAt || existing?.certificateIssuedAt || enrollment.certificateIssuedAt || enrollment.issuedAt || new Date().toISOString();
    const documentType = requestedDocumentType === 'cbt-detail' ? 'cbt-detail' : requestedDocumentType === 'cbt-completion' ? 'cbt-completion' : courseId === CBT_COURSE_PRODUCT.courseId ? 'cbt-completion' : (isCompleted ? 'completion' : 'attendance');
    const completedAt = documentType === 'attendance' ? issuedAt : null;
    const certificateNo = existing?.certificateNo || existing?.issueNumber || enrollment.certificateNo || enrollment.issueNumber || await makeCertificateNo(certificateId, issuedAt, courseId);
    if (existingReadQuotaSkipped) console.warn('[certificate:issuing-without-existing-read]', { uid: maskLogIdentifier(uid), certificateId, reusedCertificateNo: Boolean(enrollment.certificateNo || enrollment.issueNumber) });
    const issuerName = '리셋에듀센터';
    const certificateRecord = {
        certificateId, certificateNo, issueNumber: certificateNo,
        userId: uid, uid, userName, birthDate, dateOfBirth: birthDate,
        email: user?.email || firebaseUser.email || '', phoneNumber: user?.phoneNumber || '',
        courseId, courseTitle: getWorkerCertificateCourseTitleForDocument(product, requestedDocumentType === 'cbt-detail' ? 'cbt-detail' : requestedDocumentType === 'cbt-completion' ? 'cbt-completion' : courseId === CBT_COURSE_PRODUCT.courseId ? 'cbt-completion' : (isCompleted ? 'completion' : 'attendance'), courseId),
        totalLessons: product.totalLessons, completedLessons,
        progress: progressRate, completedAt,
        purchasedAt: enrollment.purchasedAt || enrollment.approvedAt || enrollment.paidAt || null,
        expiresAt: enrollment.expiresAt || enrollment.accessEndsAt || null,
        issuedAt, certificateIssuedAt: issuedAt,
        issuerName,
        issuerBusinessNumber: env.CERTIFICATE_ISSUER_BUSINESS_NUMBER || '',
        issuerContact: env.CERTIFICATE_ISSUER_CONTACT || '',
        issuerEmail: env.CERTIFICATE_ISSUER_EMAIL || '',
        status: 'issued', documentType,
        createdAt: issuedAt, updatedAt: issuedAt
    };

    await firestorePatch(env, firestoreDocumentPath(env, 'certificates', certificateId), certificateRecord);
    await updateCertificateFlags(env, uid, courseId, certificateNo, certificateId, issuedAt, isCompleted);
    await safeSupabaseLedger('certificate-first-issued', () => supabaseLedgerRecordCertificateIssue(env, { uid, courseId, courseName: certificateRecord.courseTitle, certificateId, certificateNo, issuedAt, orderId: enrollment.orderId || enrollment.paymentId || null }));

    return json({ certificateId, certificateNo, alreadyIssued: false, documentType: certificateRecord.documentType, certificate: certificateRecord }, 200, corsHeaders);
}

async function handleDocumentOutputLog(request, env, corsHeaders) {
    const authHeader = request.headers.get('Authorization') || '';
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!idToken) {
        return json({ message: '로그인이 필요합니다.', code: 'AUTH_REQUIRED' }, 401, corsHeaders);
    }

    const firebaseUser = await verifyFirebaseIdToken(idToken, env);
    const body = await request.json().catch(() => ({}));
    const action = String(body.action || '').trim().toLowerCase();
    if (!['print', 'pdf'].includes(action)) {
        return json({ message: '지원하지 않는 출력 구분입니다.', code: 'INVALID_ACTION' }, 400, corsHeaders);
    }

    const documentKind = ['certificate', 'material'].includes(String(body.documentKind || '')) ? String(body.documentKind) : 'certificate';
    const uid = firebaseUser.uid;
    const nowIso = new Date().toISOString();
    const courseId = String(body.courseId || '').trim();
    const documentType = String(body.documentType || '').trim();
    const certificateId = String(body.certificateId || '').trim();
    const materialId = String(body.materialId || '').trim();
    const rawDocumentKey = String(body.documentKey || [documentKind, courseId, certificateId || materialId || documentType || 'document'].join(':')).trim();
    const documentKey = encodeFirestoreDocId(rawDocumentKey || documentKind + ':document');
    const logId = encodeFirestoreDocId(uid + '_' + documentKey);
    const logPath = firestoreDocumentPath(env, 'documentOutputLogs', logId);
    let previous = null;
    try {
        const rawPrevious = await firestoreGet(env, logPath);
        previous = fromFirestoreFields(rawPrevious.fields || {});
    } catch (error) {
        if (error?.status !== 404) throw error;
    }
    const firstIssuedAt = previous?.firstIssuedAt || previous?.firstDocumentOutputAt || previous?.createdAt || nowIso;
    const issueCount = Math.max(0, Number(previous?.issueCount || 0)) + 1;
    const record = {
        ...(previous || {}),
        logId,
        uid,
        userId: uid,
        email: firebaseUser.email || previous?.email || '',
        action,
        method: action,
        lastAction: action,
        outputMethod: action,
        issueState: 'issued',
        documentKind,
        documentKey,
        rawDocumentKey,
        courseId,
        documentType,
        documentTitle: String(body.documentTitle || body.materialTitle || previous?.documentTitle || ''),
        certificateId,
        certificateNo: String(body.certificateNo || previous?.certificateNo || ''),
        materialId,
        materialTitle: String(body.materialTitle || previous?.materialTitle || ''),
        sourcePath: String(body.sourcePath || ''),
        userAgent: request.headers.get('user-agent') || '',
        firstIssuedAt,
        firstDocumentOutputAt: previous?.firstDocumentOutputAt || firstIssuedAt,
        lastIssuedAt: nowIso,
        issueCount,
        createdAt: previous?.createdAt || firstIssuedAt,
        updatedAt: nowIso
    };

    await firestorePatch(env, logPath, record);

    let firstDocumentOutputAt = null;
    if (documentKind === 'certificate' && record.certificateId) {
        try {
            const certificatePath = firestoreDocumentPath(env, 'certificates', record.certificateId);
            const rawCertificate = await firestoreGet(env, certificatePath);
            const certificate = { id: record.certificateId, ...fromFirestoreFields(rawCertificate.fields || {}) };
            const ownerId = String(certificate.uid || certificate.userId || '').trim();
            const canLockCertificateOutputDate = ownerId === uid || isWorkerAdminUser(firebaseUser, env);
            if (canLockCertificateOutputDate) {
                firstDocumentOutputAt = certificate.firstDocumentOutputAt || certificate.documentFirstOutputAt || certificate.issuedAt || certificate.certificateIssuedAt || certificate.createdAt || nowIso;
                if (!certificate.firstDocumentOutputAt && !certificate.documentFirstOutputAt) {
                    const certificatePatch = { firstDocumentOutputAt, documentFirstOutputAt: firstDocumentOutputAt, updatedAt: nowIso };
                    try {
                        await firestorePatchIfUnchanged(env, certificatePath, certificatePatch, rawCertificate.updateTime);
                    } catch (error) {
                        if (error?.status !== 409) throw error;
                        const latestRaw = await firestoreGet(env, certificatePath);
                        const latest = fromFirestoreFields(latestRaw.fields || {});
                        firstDocumentOutputAt = latest.firstDocumentOutputAt || latest.documentFirstOutputAt || firstDocumentOutputAt;
                    }
                }
            }
        } catch (error) {
            console.error('[document-output-log:certificate-lock]', error);
        }
    }

    await safeSupabaseLedger('document-output', () => supabaseLedgerRecordDocument(env, {
        uid,
        courseId,
        documentType: documentType || documentKind,
        documentName: record.documentTitle || record.materialTitle || documentType || documentKind,
        documentAction: action === 'pdf' ? 'downloaded' : 'print_requested',
        documentKey: rawDocumentKey || documentKey,
        certificateId,
        certificateNo: record.certificateNo,
        materialId,
        firstIssuedAt: record.firstDocumentOutputAt || firstDocumentOutputAt || firstIssuedAt,
        eventAt: nowIso,
        issueCount,
        downloadCount: action === 'pdf' ? 1 : 0,
        printCount: action === 'print' ? 1 : 0,
        source: 'document_output_log',
        metadata: { log_id: logId, action, source_path: record.sourcePath }
    }));

    return json({ ok: true, logId, firstDocumentOutputAt }, 200, corsHeaders);
}

function certificateCourseMatchesPaidRecord(item, courseId) {
    const requestedCourseId = String(courseId || "").trim();
    const resolvedCourseId = resolveCanonicalCourseId(item) || item?.courseId || "";
    if (resolvedCourseId === requestedCourseId) return true;

    const productId = String(item?.productId || item?.paymentProductId || "").trim();
    const product = APPLICATION_PRODUCTS[productId] || null;
    const isAdvancedDuiPurchase = productId === "dui-cbt-advanced"
        || productId === "dui-cbt-counseling"
        || product?.courseId === CBT_COURSE_PRODUCT.courseId
        || product?.includesCbtCourse === true;
    if (isAdvancedDuiPurchase && (requestedCourseId === DUI_COURSE_PRODUCT.courseId || requestedCourseId === CBT_COURSE_PRODUCT.courseId)) return true;

    return false;
}

async function getPaidPurchaseForCertificate(env, uid, courseId, email = "") {
    const rows = await getPaymentLikeRecordsForEntitlement(env, uid, email);
    return rows
        .filter((item) => certificateCourseMatchesPaidRecord(item, courseId))
        .filter((item) => isRestorablePaidOperationalRecord(item))
        .sort((a, b) => new Date(b.approvedAt || b.purchasedAt || b.paidAt || b.createdAt || 0).getTime() - new Date(a.approvedAt || a.purchasedAt || a.paidAt || a.createdAt || 0).getTime())[0] || null;
}

async function getBirthDatePaymentRecordForIssuedCertificate(env, uid, courseId, email = "") {
    const rows = await getPaymentLikeRecordsForEntitlement(env, uid, email);
    return rows
        .filter((item) => certificateCourseMatchesPaidRecord(item, courseId))
        .filter((item) => getWorkerRecordBirthDate(item))
        .sort((a, b) => new Date(b.approvedAt || b.purchasedAt || b.paidAt || b.createdAt || 0).getTime() - new Date(a.approvedAt || a.purchasedAt || a.paidAt || a.createdAt || 0).getTime())[0] || null;
}

async function updateCertificateFlags(env, uid, courseId, certificateNo, certificateId, issuedAt, isCompletion = true) {
    const enrollment = await getCanonicalWorkerEnrollmentRecord(env, uid, courseId).catch(() => null);
    const enrollmentCourseId = enrollment ? (resolveCanonicalCourseId(enrollment) || enrollment.courseId || '') : '';
    const enrollmentOwnerId = enrollment ? String(enrollment.uid || enrollment.userId || '').trim() : '';
    const canPatchEnrollment = Boolean(enrollment?.documentPath && enrollmentOwnerId && enrollmentCourseId);
    if (canPatchEnrollment) {
        await firestorePatch(env, enrollment.documentPath, {
            certificateIssued: true,
            certificateIssuedAt: issuedAt,
            attendanceCertificateIssued: !isCompletion,
            attendanceCertificateIssuedAt: !isCompletion ? issuedAt : null,
            certificateId,
            certificateNo,
            updatedAt: new Date().toISOString()
        }).catch((error) => console.error(error));
    } else {
        logEnrollmentWorkerEvent('certificate_flag_enrollment_patch_skipped', {
            uid: maskLogIdentifier(uid),
            courseId,
            certificateId,
            reason: enrollment?.documentPath ? 'INCOMPLETE_ENROLLMENT_IDENTITY' : 'NO_ENROLLMENT_DOCUMENT'
        });
    }
}

async function handlePaymentConfirm(request, env, corsHeaders) {
    const authHeader = request.headers.get('Authorization') || '';
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!idToken) {
        return json({ message: '로그인이 필요합니다.', code: 'AUTH_REQUIRED' }, 401, corsHeaders);
    }

    const firebaseUser = await verifyFirebaseIdToken(idToken, env);
    const body = await request.json().catch(() => null);
    if (!body) {
        return json({ message: '요청 본문 형식이 올바르지 않습니다.', code: 'INVALID_BODY' }, 400, corsHeaders);
    }
    if (!body.paymentId) {
        return json({ message: 'NHN KCP 포트원 결제번호(paymentId)가 필요합니다.', code: 'PORTONE_PAYMENT_ID_REQUIRED' }, 400, corsHeaders);
    }
    return handlePortOnePaymentConfirm(body, firebaseUser, env, corsHeaders);
}

function getApplicationProductForPayment(productId) {
    return APPLICATION_PRODUCTS[productId] || null;
}

function normalizeOrderName(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
}

function getAllowedOrderNamesForProduct(product) {
    return new Set([
        product?.courseTitle,
        product?.title
    ].map(normalizeOrderName).filter(Boolean));
}

function isAllowedOrderNameForProduct(orderName, product) {
    const normalizedOrderName = normalizeOrderName(orderName);
    return normalizedOrderName && getAllowedOrderNamesForProduct(product).has(normalizedOrderName);
}


function getWorkerCustomDataBirthDate(source) {
    const rawCustomData = source?.customData || source?.rawResponse?.customData;
    const customData = parsePortOneCustomData(rawCustomData);
    return String(
        source?.certificateBirthDate || source?.certificate_birth_date ||
        source?.birthDate || source?.birth_date ||
        source?.dateOfBirth || source?.date_of_birth ||
        source?.buyerBirthDate || source?.userBirthDate ||
        customData.certificateBirthDate || customData.certificate_birth_date ||
        customData.birthDate || customData.birth_date ||
        customData.dateOfBirth || customData.date_of_birth || ''
    ).trim();
}

function getWorkerRecordBirthDate(...sources) {
    for (const source of sources) {
        const value = getWorkerCustomDataBirthDate(source);
        if (value) return value;
    }
    return '';
}

function inferApplicationProductFromPayment(payment, customData, requestedCanonicalCourseId) {
    const explicitProductId = String(customData.productId || customData.product_id || customData.paymentProductId || '').trim();
    if (explicitProductId && APPLICATION_PRODUCTS[explicitProductId]) return APPLICATION_PRODUCTS[explicitProductId];
    const amount = Number(payment.amount?.total ?? payment.amount?.paid ?? payment.totalAmount ?? payment.total_amount ?? payment.paidAmount ?? payment.paid_amount ?? customData.amount);
    const orderName = normalizeOrderName(payment.orderName || payment.order_name || payment.name || customData.orderName || customData.order_name || '');
    const candidates = Object.values(APPLICATION_PRODUCTS).filter((product) => {
        if (!isCourseEntitlementEquivalent({ courseId: product.courseId, canonicalCourseId: product.canonicalCourseId, productId: product.productId, categoryId: product.categoryId, planId: product.planId, productTitle: product.title, courseTitle: product.courseTitle }, requestedCanonicalCourseId)) return false;
        if (Number.isFinite(amount) && amount > 0 && product.amount !== amount) return false;
        return true;
    });
    if (orderName) {
        const byName = candidates.find((product) => getAllowedOrderNamesForProduct(product).has(orderName));
        if (byName) return byName;
    }
    if (candidates.length === 1) return candidates[0];
    if (requestedCanonicalCourseId === DUI_COURSE_PRODUCT.courseId || requestedCanonicalCourseId === CBT_COURSE_PRODUCT.courseId) {
        if (amount === APPLICATION_PRODUCTS['dui-cbt-counseling'].amount) return APPLICATION_PRODUCTS['dui-cbt-counseling'];
        if (amount === APPLICATION_PRODUCTS['dui-cbt-advanced'].amount) return APPLICATION_PRODUCTS['dui-cbt-advanced'];
        if (amount === APPLICATION_PRODUCTS['dui-cbt-basic'].amount) return APPLICATION_PRODUCTS['dui-cbt-basic'];
    }
    return null;
}

function parsePortOneCustomData(customData) {
    if (!customData) return {};
    if (typeof customData === 'object') return customData;
    if (typeof customData !== 'string') return {};
    try {
        return JSON.parse(customData);
    } catch {
        return {};
    }
}

function normalizePortOneCurrency(currency) {
    if (currency === 'CURRENCY_KRW') return 'KRW';
    return currency || '';
}

function getPortOnePaidAt(payment) {
    if (!payment) return new Date().toISOString();
    const paidHistory = Array.isArray(payment.history) ? payment.history.find((item) => item?.status === 'PAID') : null;
    return payment.paidAt || payment.approvedAt || payment.statusChangedAt || paidHistory?.changedAt || payment.requestedAt || new Date().toISOString();
}

function getPortOneReceiptUrl(payment) {
    return payment.receiptUrl || payment.receipt?.url || payment.cashReceipt?.url || null;
}

function normalizePortOnePaymentMethod(method) {
    const raw = typeof method === 'string' ? method : (method?.type || method?.method || method?.provider || '');
    const value = String(raw || '').trim();
    const upper = value.toUpperCase();
    if (value === 'PaymentMethodCard' || upper === 'CARD') return 'CARD';
    if (value === 'PaymentMethodTransfer' || upper === 'TRANSFER') return 'TRANSFER';
    if (value === 'PaymentMethodVirtualAccount' || upper === 'VIRTUAL_ACCOUNT') return 'VIRTUAL_ACCOUNT';
    if (value === 'PaymentMethodEasyPay' || upper === 'EASY_PAY') return 'EASY_PAY';
    return value || 'CARD';
}

function getPortOnePaymentMethod(payment) {
    return normalizePortOnePaymentMethod(payment?.method);
}

function getPortOneVirtualAccountInfo(payment) {
    const method = payment?.method || {};
    const virtualAccount = normalizePortOnePaymentMethod(method) === 'VIRTUAL_ACCOUNT' ? method : (payment?.virtualAccount || method?.virtualAccount || {});
    const bankValue = virtualAccount?.bank;
    const bank = typeof bankValue === 'object' && bankValue !== null ? (bankValue.name || bankValue.code || null) : (bankValue || virtualAccount?.bankName || null);
    const bankCode = typeof bankValue === 'object' && bankValue !== null ? (bankValue.code || null) : (bankValue || null);
    return {
        bank,
        bankCode,
        accountNumber: virtualAccount?.accountNumber || null,
        accountType: virtualAccount?.accountType || null,
        remitteeName: virtualAccount?.remitteeName || null,
        remitterName: virtualAccount?.remitterName || null,
        expiredAt: virtualAccount?.expiredAt || virtualAccount?.expiry?.dueDate || virtualAccount?.dueDate || null,
        issuedAt: virtualAccount?.issuedAt || payment?.statusChangedAt || payment?.updatedAt || null
    };
}

function normalizeRequestedPortOnePayMethod(value) {
    const normalized = String(value || '').trim();
    const upper = normalized.toUpperCase();
    if (normalized === 'card' || upper === 'CARD') return 'CARD';
    if (normalized === 'transfer' || upper === 'TRANSFER') return 'TRANSFER';
    if (normalized === 'virtualAccount' || normalized === 'virtual_account' || upper === 'VIRTUAL_ACCOUNT') return 'VIRTUAL_ACCOUNT';
    if (normalized === 'kakaopay' || upper === 'EASY_PAY') return 'EASY_PAY';
    return 'CARD';
}

function getPortOneTid(payment) {
    return payment?.txId || payment?.transactionId || payment?.pgTxId || payment?.pgTransactionId || payment?.id || null;
}

function getPortOneResponseCode(payment) {
    return payment?.pgCode || payment?.responseCode || payment?.code || payment?.failure?.code || payment?.cancel?.code || null;
}

function getPortOneResponseMessage(payment) {
    return payment?.pgMessage || payment?.responseMessage || payment?.message || payment?.failure?.message || payment?.cancel?.message || null;
}

function buildAdminUserPaymentSummary(paymentRecord, nowIso) {
    const certificateBirthDate = getWorkerRecordBirthDate(paymentRecord);
    return {
        paymentState: ['paid', 'done', 'completed', 'complete', 'success', 'approved'].includes(String(paymentRecord.paymentStatus || paymentRecord.status || '').toLowerCase()) || String(paymentRecord.rawResponse?.status || '').toUpperCase() === 'PAID' || paymentRecord.approvedAt || paymentRecord.paidAt ? '결제완료' : paymentRecord.paymentStatus || paymentRecord.status || '결제시도',
        paymentStatus: paymentRecord.paymentStatus || paymentRecord.status || null,
        paymentId: paymentRecord.paymentId || paymentRecord.paymentKey || null,
        orderId: paymentRecord.orderId || paymentRecord.paymentId || null,
        productId: paymentRecord.productId || null,
        courseId: paymentRecord.canonicalCourseId || paymentRecord.courseId || null,
        categoryId: paymentRecord.categoryId || null,
        productTitle: paymentRecord.productTitle || paymentRecord.courseTitle || paymentRecord.orderName || null,
        courseTitle: paymentRecord.courseTitle || paymentRecord.productTitle || paymentRecord.orderName || null,
        phoneNumber: paymentRecord.phoneNumber || paymentRecord.buyerPhone || paymentRecord.customerPhone || paymentRecord.rawResponse?.customer?.phoneNumber || paymentRecord.rawResponse?.customer?.phone || null,
        buyerPhone: paymentRecord.buyerPhone || paymentRecord.phoneNumber || paymentRecord.customerPhone || paymentRecord.rawResponse?.customer?.phoneNumber || paymentRecord.rawResponse?.customer?.phone || null,
        customerPhone: paymentRecord.customerPhone || paymentRecord.phoneNumber || paymentRecord.buyerPhone || paymentRecord.rawResponse?.customer?.phoneNumber || paymentRecord.rawResponse?.customer?.phone || null,
        certificateBirthDate: certificateBirthDate || null,
        birthDate: certificateBirthDate || null,
        dateOfBirth: certificateBirthDate || null,
        amount: paymentRecord.amount || 0,
        method: paymentRecord.method || paymentRecord.paymentMethod || null,
        paidAt: paymentRecord.approvedAt || paymentRecord.paidAt || null,
        lastPaymentAt: paymentRecord.approvedAt || paymentRecord.paidAt || paymentRecord.updatedAt || nowIso,
        source: 'payments',
        sourcePath: paymentRecord.orderId || paymentRecord.paymentId || null,
        updatedAt: nowIso
    };
}

function buildPaymentLogRecord({ type, paymentId, orderId, uid, courseId, productId, amount, approved, approvedAt, status, error }) {
    const nowIso = new Date().toISOString();
    return {
        type,
        user_id: uid || null,
        userId: uid || null,
        uid: uid || null,
        order_id: orderId || paymentId || null,
        orderId: orderId || paymentId || null,
        product_id: productId || null,
        productId: productId || null,
        requested_amount: amount ?? null,
        amount: amount ?? null,
        kcp_order_no: orderId || paymentId || null,
        kcp_tid: getPortOneTid(approved),
        payment_method: getPortOnePaymentMethod(approved),
        approval_status: status || approved?.status || null,
        kcp_response_code: getPortOneResponseCode(approved),
        kcp_response_message: error instanceof Error ? error.message : getPortOneResponseMessage(approved),
        error_stack: error instanceof Error ? error.stack || error.message : null,
        paymentId,
        courseId,
        approvedAt: approvedAt || getPortOnePaidAt(approved),
        rawResponse: approved || null,
        created_at: nowIso,
        createdAt: nowIso
    };
}

function createPortOnePaymentId(uid) {
    const safeUid = String(uid || 'member').replace(/[^a-zA-Z0-9]/g, '').slice(0, 8) || 'member';
    const random = crypto.randomUUID().replace(/-/g, '').slice(0, 8);
    return ('pay' + Date.now().toString(36) + safeUid + random).slice(0, 40);
}

async function handlePortOneOrderCreate(request, env, corsHeaders) {
    const authHeader = request.headers.get('Authorization') || '';
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!idToken) {
        return json({ message: '로그인이 필요합니다.', code: 'AUTH_REQUIRED' }, 401, corsHeaders);
    }

    const firebaseUser = await verifyFirebaseIdToken(idToken, env);
    const body = await request.json().catch(() => null);
    const uid = String(body?.uid || firebaseUser.uid || '').trim();
    const courseId = String(body?.courseId || '').trim();
    const categoryId = String(body?.categoryId || '').trim();
    const productId = String(body?.productId || '').trim();
    const product = getApplicationProductForPayment(productId);
    const amount = typeof body?.amount === 'number' ? body.amount : product?.amount;
    const paymentId = String(body?.paymentId || createPortOnePaymentId(uid)).trim();
    const requestedPaymentMethod = normalizeRequestedPortOnePayMethod(body?.paymentMethod || body?.frontendPaymentMethod || 'CARD');
    const requestedPaymentProvider = requestedPaymentMethod === 'EASY_PAY' ? 'portone-kakaopay-v2' : 'portone-kcp-v2';
    const frontendPaymentMethod = String(body?.frontendPaymentMethod || '').trim() || requestedPaymentMethod;
    const certificateBirthDate = getWorkerRecordBirthDate(body) || null;
    const phoneNumber = String(body?.phoneNumber || body?.buyerPhone || body?.customerPhone || body?.phone || '').trim() || null;

    if (uid !== firebaseUser.uid) {
        return json({ message: '로그인한 사용자와 주문 사용자 정보가 일치하지 않습니다.', code: 'USER_MISMATCH' }, 403, corsHeaders);
    }
    if (!paymentId || !product || courseId !== product.courseId || categoryId !== product.categoryId || amount !== product.amount) {
        return json({ message: '주문 생성 정보가 올바르지 않습니다.', code: 'INVALID_ORDER' }, 400, corsHeaders);
    }

    const canonicalCourseId = product.canonicalCourseId || resolveCanonicalCourseId({ courseId, productId, categoryId }) || courseId;
    const duplicate = await checkActiveEnrollmentDuplicate(env, {
        uid,
        email: firebaseUser.email,
        productId,
        requestedCourseId: courseId,
        canonicalCourseId
    });
    const duplicateCheckedAt = new Date().toISOString();
    await savePaymentLog(env, paymentId, {
        type: 'payment_duplicate_enrollment_check',
        orderId: paymentId,
        paymentId,
        uid,
        courseId,
        productId,
        ...duplicate.debug,
        createdAt: duplicateCheckedAt,
        created_at: duplicateCheckedAt
    }).catch((logError) => console.error(logError));
    if (duplicate.blocked) {
        return json({ message: '이미 결제 완료된 수강권이 있어 중복 결제를 진행할 수 없습니다.', code: 'ACTIVE_ENROLLMENT_EXISTS', debug: duplicate.debug }, 409, corsHeaders);
    }

    const existingPaymentDoc = await firestoreGet(env, firestoreDocumentPath(env, 'payments', paymentId)).catch((error) => {
        if (error.status === 404) return null;
        if (isFirestoreQuotaError(error)) {
            console.warn('[payment:order-existing-payment-read-skipped]', { paymentId, status: error.status, message: error.message });
            return null;
        }
        return Promise.reject(error);
    });
    if (existingPaymentDoc) {
        const existingPayment = fromFirestoreFields(existingPaymentDoc.fields || {});
        const existingStatus = String(existingPayment.paymentStatus || existingPayment.status || existingPayment.orderStatus || '').toLowerCase();
        const samePendingOrder = existingStatus === 'pending' && paymentRecordMatchesOrder(existingPayment, { uid, courseId, categoryId, productId, amount: product.amount });
        await savePaymentLog(env, paymentId, {
            type: samePendingOrder ? 'portone_order_reused_pending_blocked' : 'portone_order_duplicate_payment_id_blocked',
            orderId: paymentId,
            paymentId,
            uid,
            courseId,
            categoryId,
            productId,
            existing_status: existingPayment.paymentStatus || existingPayment.status || null,
            existing_uid: existingPayment.uid || existingPayment.userId || null,
            existing_course_id: existingPayment.courseId || null,
            existing_product_id: existingPayment.productId || null,
            existing_paid_like: isPaidLikePaymentRecord(existingPayment),
            created_at: new Date().toISOString(),
            createdAt: new Date().toISOString()
        }).catch((logError) => console.error(logError));
        return json({ message: '이미 사용된 결제번호입니다. 새로고침 후 다시 결제를 진행해 주세요.', code: 'DUPLICATE_PAYMENT_ID' }, 409, corsHeaders);
    }

    const paymentKeyDocId = encodeFirestoreDocId(paymentId);
    const existingPaymentKey = await firestoreGet(env, firestoreDocumentPath(env, 'paymentKeys', paymentKeyDocId)).catch((error) => {
        if (error.status === 404) return null;
        if (isFirestoreQuotaError(error)) {
            console.warn('[payment:order-existing-key-read-skipped]', { paymentId, status: error.status, message: error.message });
            return null;
        }
        return Promise.reject(error);
    });
    if (existingPaymentKey) {
        await savePaymentLog(env, paymentId, {
            type: 'portone_order_duplicate_payment_key_blocked',
            orderId: paymentId,
            paymentId,
            uid,
            courseId,
            categoryId,
            productId,
            created_at: new Date().toISOString(),
            createdAt: new Date().toISOString()
        }).catch((logError) => console.error(logError));
        return json({ message: '이미 승인 처리된 결제번호입니다. 새로고침 후 다시 결제를 진행해 주세요.', code: 'DUPLICATE_PAYMENT_ID' }, 409, corsHeaders);
    }

    const nowIso = new Date().toISOString();
    const orderRecord = {
        paymentId,
        orderId: paymentId,
        paymentKey: paymentId,
        userId: uid,
        uid,
        courseId,
        categoryId,
        productId,
        planId: product.planId || null,
        productTitle: product.title,
        courseTitle: product.courseTitle,
        orderName: product.courseTitle,
        certificateBirthDate: certificateBirthDate || null,
        birthDate: certificateBirthDate || null,
        dateOfBirth: certificateBirthDate || null,
        phoneNumber,
        buyerPhone: phoneNumber,
        customerPhone: phoneNumber,
        amount: product.amount,
        requestedAmount: product.amount,
        method: requestedPaymentMethod,
        paymentMethod: requestedPaymentMethod,
        frontendPaymentMethod,
        paymentProvider: requestedPaymentProvider,
        status: 'pending',
        paymentStatus: 'pending',
        frontendOrigin: request.headers.get('origin') || null,
        endpoint: '/api/payments/portone-order',
        createdAt: nowIso,
        updatedAt: nowIso
    };

    try {
        await firestorePatch(env, firestoreDocumentPath(env, 'payments', paymentId), orderRecord);
        await savePaymentLog(env, paymentId, {
            type: 'portone_order_created',
            paymentId,
            orderId: paymentId,
            user_id: uid,
            userId: uid,
            uid,
            product_id: productId,
            productId,
            requested_amount: product.amount,
            amount: product.amount,
            approval_status: 'pending',
            payment_method: requestedPaymentMethod,
            frontend_payment_method: frontendPaymentMethod,
            payment_provider: requestedPaymentProvider,
            endpoint: '/api/payments/portone-order',
            frontendOrigin: request.headers.get('origin') || null,
            created_at: nowIso,
            createdAt: nowIso
        }).catch((logError) => console.error('PortOne order created log failed', logError));
        await safeSupabaseLedger('payment-started', () => supabaseLedgerInsertActivity(env, { firebase_uid: uid, event_type: 'payment_started', course_id: courseId, course_name: product.courseTitle, order_id: paymentId, description: product.courseTitle + ' 결제 시작', metadata: { product_id: productId, amount: product.amount, payment_method: requestedPaymentMethod, payment_provider: requestedPaymentProvider }, event_at: nowIso, event_key: 'payment_started:' + paymentId }));
    } catch (error) {
        await savePaymentLog(env, paymentId, {
            type: 'portone_order_create_failed',
            paymentId,
            orderId: paymentId,
            user_id: uid,
            userId: uid,
            uid,
            product_id: productId,
            productId,
            requested_amount: product.amount,
            amount: product.amount,
            error_stack: error instanceof Error ? error.stack || error.message : String(error),
            created_at: new Date().toISOString(),
            createdAt: new Date().toISOString()
        }).catch((logError) => console.error(logError));
        return json({ message: '결제 주문 생성에 실패했습니다.', code: 'ORDER_CREATE_FAILED' }, 500, corsHeaders);
    }

    return json({ paymentId, orderId: paymentId, uid, courseId, categoryId, productId, amount: product.amount, status: 'pending' }, 200, corsHeaders);
}

function getWebhookPaymentId(payload) {
    return payload?.data?.paymentId || payload?.data?.payment_id || payload?.paymentId || payload?.payment_id || null;
}

function getWebhookEventType(payload) {
    return payload?.type || payload?.status || null;
}

function isPortOneTransactionEvent(payload) {
    const type = getWebhookEventType(payload);
    if (!type) return false;
    if (String(type).startsWith('Transaction.')) return true;
    return ['Ready', 'Paid', 'VirtualAccountIssued', 'PartialCancelled', 'Cancelled', 'Failed', 'PayPending', 'CancelPending'].includes(String(type));
}

function isPortOnePaidEvent(payload) {
    const type = getWebhookEventType(payload);
    return type === 'Transaction.Paid' || type === 'Paid';
}

function isPortOneVirtualAccountIssuedEvent(payload) {
    const type = getWebhookEventType(payload);
    return type === 'Transaction.VirtualAccountIssued' || type === 'VirtualAccountIssued';
}

function isLikelyPortOneConsoleTestPaymentId(paymentId) {
    const value = String(paymentId || '').toLowerCase();
    if (!value) return true;
    if (value.includes('test') || value.includes('example') || value.includes('dummy')) return true;
    if (value.startsWith('payment-')) return true;
    return !value.startsWith('pay');
}

function getWebhookStoreId(payload) {
    return payload?.data?.storeId || payload?.storeId || null;
}

function getErrorLogPayload(request, payload, paymentId, error, extra = {}) {
    return {
        path: new URL(request.url).pathname,
        webhookType: getWebhookEventType(payload),
        paymentId: paymentId || getWebhookPaymentId(payload) || null,
        errorName: error instanceof Error ? error.name : typeof error,
        errorMessage: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack || null : null,
        ...extra
    };
}

function logWebhookError(request, payload, paymentId, error, extra = {}) {
    console.error('PortOne webhook error', getErrorLogPayload(request, payload, paymentId, error, extra));
}

async function logWebhookStep(env, step, context = {}) {
    const record = {
        type: step,
        step,
        paymentId: context.paymentId || null,
        orderId: context.orderId || context.paymentId || null,
        userId: context.userId || context.uid || null,
        uid: context.uid || context.userId || null,
        webhookType: context.webhookType || null,
        created_at: new Date().toISOString(),
        createdAt: new Date().toISOString()
    };
    console.log('PortOne webhook step', record);
    await savePaymentLog(env, record.orderId || 'unknown_webhook', record).catch((error) => console.error('PortOne webhook step log failed', { step, message: error instanceof Error ? error.message : String(error) }));
}

function decodeWebhookSecret(secret) {
    const raw = String(secret || '');
    if (raw.startsWith('whsec_')) {
        return Uint8Array.from(atob(raw.slice(6)), (char) => char.charCodeAt(0));
    }
    return new TextEncoder().encode(raw);
}

function timingSafeEqual(a, b) {
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let index = 0; index < a.length; index += 1) diff |= a.charCodeAt(index) ^ b.charCodeAt(index);
    return diff === 0;
}

async function verifyPortOneWebhookSignature(request, rawBody, env) {
    const secret = env.PORTONE_WEBHOOK_SECRET;
    if (!secret) {
        const error = new Error('PORTONE_WEBHOOK_SECRET is not configured');
        error.status = 500;
        throw error;
    }

    const id = request.headers.get('webhook-id');
    const timestamp = request.headers.get('webhook-timestamp');
    const signature = request.headers.get('webhook-signature');
    if (!id || !timestamp || !signature) {
        const error = new Error('Missing Standard Webhooks signature headers');
        error.status = 401;
        throw error;
    }

    const key = await crypto.subtle.importKey('raw', decodeWebhookSecret(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const signedPayload = id + "." + timestamp + "." + rawBody;
    const signatureBytes = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signedPayload));
    const expected = btoa(String.fromCharCode(...new Uint8Array(signatureBytes)));
    const candidates = signature
        .split(/\s+/)
        .flatMap((part) => part.split(','))
        .map((candidate) => candidate.trim())
        .filter(Boolean)
        .map((candidate) => candidate.startsWith('v1=') ? candidate.slice(3) : candidate)
        .filter((candidate) => candidate !== 'v1');
    if (!candidates.some((candidate) => timingSafeEqual(candidate, expected))) {
        const error = new Error('Invalid PortOne webhook signature');
        error.status = 401;
        throw error;
    }
    return { verified: true };
}

async function getPendingPaymentRecord(env, paymentId) {
    if (!paymentId) return null;
    return firestoreGetData(env, 'payments', paymentId).catch((error) => {
        if (error.status === 404) return null;
        if (isFirestoreQuotaError(error)) {
            console.warn('[payment:pending-order-read-skipped]', { paymentId, status: error.status, message: error.message });
            return null;
        }
        return Promise.reject(error);
    });
}

async function handlePortOneWebhookSafely(request, env, corsHeaders) {
    try {
        return await handlePortOneWebhook(request, env, corsHeaders);
    } catch (error) {
        const nowIso = new Date().toISOString();
        console.error('PortOne webhook fatal error', { path: new URL(request.url).pathname, errorName: error instanceof Error ? error.name : typeof error, errorMessage: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack || null : null });
        await savePaymentLog(env, 'fatal_webhook_' + Date.now(), {
            type: 'portone_webhook_fatal_error',
            message: error instanceof Error ? error.message : String(error),
            error_stack: error instanceof Error ? error.stack || error.message : null,
            created_at: nowIso,
            createdAt: nowIso
        }).catch((logError) => console.error(logError));
        return json({
            ok: false,
            message: error instanceof Error ? error.message : '웹훅 처리 중 오류가 발생했습니다.',
            code: 'PORTONE_WEBHOOK_FATAL_ERROR'
        }, 500, corsHeaders);
    }
}

async function handlePortOneWebhook(request, env, corsHeaders) {
    const rawBody = await request.text();
    let payload;
    try {
        await verifyPortOneWebhookSignature(request, rawBody, env);
    } catch (error) {
        logWebhookError(request, {}, null, error, { phase: 'signature_verification' });
        return json({ ok: false, message: error instanceof Error ? error.message : '웹훅 서명 검증에 실패했습니다.', code: 'PORTONE_WEBHOOK_SIGNATURE_INVALID' }, error.status || 401, corsHeaders);
    }

    try {
        payload = rawBody ? JSON.parse(rawBody) : {};
    } catch (error) {
        logWebhookError(request, {}, null, error, { phase: 'json_parse' });
        return json({ ok: false, message: '웹훅 본문 형식이 올바르지 않습니다.', code: 'INVALID_WEBHOOK_BODY' }, 400, corsHeaders);
    }

    const paymentId = getWebhookPaymentId(payload);
    const webhookType = getWebhookEventType(payload);
    await logWebhookStep(env, 'webhook_received', { paymentId, orderId: paymentId, webhookType });
    await logWebhookStep(env, 'signature_verified', { paymentId, orderId: paymentId, webhookType });
    if (!isPortOneTransactionEvent(payload)) {
        await savePaymentLog(env, paymentId || 'unknown_webhook_' + Date.now(), {
            type: 'portone_webhook_ignored',
            reason: 'non_transaction_event',
            webhookType: getWebhookEventType(payload),
            paymentId,
            rawWebhook: payload,
            created_at: new Date().toISOString(),
            createdAt: new Date().toISOString()
        }).catch((logError) => console.error(logError));
        return json({ ok: true, ignored: true, reason: 'non_transaction_event' }, 200, corsHeaders);
    }

    if (!paymentId) {
        await savePaymentLog(env, 'unknown_webhook_' + Date.now(), {
            type: 'portone_webhook_ignored',
            reason: 'missing_payment_id',
            rawWebhook: payload,
            created_at: new Date().toISOString(),
            createdAt: new Date().toISOString()
        }).catch((logError) => console.error(logError));
        return json({ ok: true, ignored: true, reason: 'missing_payment_id' }, 200, corsHeaders);
    }

    await savePaymentLog(env, paymentId, {
        type: 'portone_webhook_received',
        paymentId,
        orderId: paymentId,
        webhookType: payload?.type || payload?.status || null,
        rawWebhook: payload,
        created_at: new Date().toISOString(),
        createdAt: new Date().toISOString()
    }).catch((logError) => console.error(logError));

    if (!isPortOnePaidEvent(payload) && !isPortOneVirtualAccountIssuedEvent(payload)) {
        await savePaymentLog(env, paymentId, buildPaymentLogRecord({ type: 'portone_webhook_non_payable_status_ignored', paymentId, orderId: paymentId, status: getWebhookEventType(payload) })).catch((logError) => console.error(logError));
        return json({ ok: true, ignored: true, status: getWebhookEventType(payload) }, 200, corsHeaders);
    }

    let approved;
    try {
        await logWebhookStep(env, 'payment_lookup_started', { paymentId, orderId: paymentId, webhookType });
        approved = await getPortOnePayment(env, paymentId);
        await logWebhookStep(env, 'payment_lookup_succeeded', { paymentId, orderId: paymentId, webhookType });
    } catch (error) {
        logWebhookError(request, payload, paymentId, error, { phase: 'portone_payment_lookup' });
        await savePaymentLog(env, paymentId, buildPaymentLogRecord({ type: 'portone_webhook_lookup_failed', paymentId, orderId: paymentId, status: 'lookup_failed', error })).catch((logError) => console.error(logError));
        if (isLikelyPortOneConsoleTestPaymentId(paymentId)) {
            await savePaymentLog(env, paymentId, { type: 'portone_webhook_console_test_ignored', paymentId, orderId: paymentId, webhookType, reason: error instanceof Error ? error.message : String(error), created_at: new Date().toISOString(), createdAt: new Date().toISOString() }).catch((logError) => console.error(logError));
            return json({ ok: true, ignored: true, reason: 'console_test_payment_not_found' }, 200, corsHeaders);
        }
        return json({ ok: false, message: error instanceof Error ? error.message : '포트원 결제 조회에 실패했습니다.', code: 'PORTONE_PAYMENT_LOOKUP_FAILED' }, 500, corsHeaders);
    }

    if (approved.status !== 'PAID' && approved.status !== 'VIRTUAL_ACCOUNT_ISSUED') {
        await savePaymentLog(env, paymentId, buildPaymentLogRecord({ type: 'portone_webhook_non_payable_status_ignored', paymentId, orderId: paymentId, approved, status: approved.status })).catch((logError) => console.error(logError));
        return json({ ok: true, ignored: true, status: approved.status }, 200, corsHeaders);
    }
    await logWebhookStep(env, 'payment_status_verified', { paymentId, orderId: paymentId, webhookType });

    const customData = parsePortOneCustomData(approved.customData);
    const pendingOrder = await getPendingPaymentRecord(env, paymentId);
    if (pendingOrder) await logWebhookStep(env, 'order_found', { paymentId, orderId: paymentId, userId: pendingOrder.uid || pendingOrder.userId, uid: pendingOrder.uid || pendingOrder.userId, webhookType });
    const uid = String(customData.uid || customData.userId || pendingOrder?.uid || pendingOrder?.userId || approved.customer?.id || approved.customer?.customerId || '').trim();
    const courseId = String(customData.courseId || pendingOrder?.courseId || '').trim();
    const categoryId = String(customData.categoryId || pendingOrder?.categoryId || '').trim();
    const productId = String(customData.productId || pendingOrder?.productId || '').trim();
    const amount = Number(approved.amount?.total);

    if (!uid) {
        const error = new Error('포트원 결제와 pending 주문에서 사용자 uid를 찾지 못했습니다.');
        logWebhookError(request, payload, paymentId, error, { phase: 'identity_resolution' });
        await savePaymentLog(env, paymentId, buildPaymentLogRecord({ type: 'portone_webhook_missing_uid', paymentId, orderId: paymentId, courseId, productId, amount, approved, status: 'paid_missing_uid', error })).catch((logError) => console.error(logError));
        return json({ ok: false, message: error.message, code: 'WEBHOOK_UID_NOT_FOUND' }, 500, corsHeaders);
    }

    if (!courseId || !categoryId || !productId) {
        const error = new Error('포트원 결제에서 교육 상품 식별값을 찾지 못했습니다.');
        logWebhookError(request, payload, paymentId, error, { phase: 'product_resolution', courseId: courseId || null, categoryId: categoryId || null, productId: productId || null, hasCustomData: Boolean(approved.customData), hasPendingOrder: Boolean(pendingOrder) });
        await savePaymentLog(env, paymentId, buildPaymentLogRecord({ type: 'portone_webhook_missing_product_identity', paymentId, orderId: paymentId, uid, courseId: courseId || null, productId: productId || null, amount, approved, status: 'paid_missing_product_identity', error })).catch((logError) => console.error(logError));
        return json({ ok: false, message: error.message, code: 'WEBHOOK_PRODUCT_IDENTITY_NOT_FOUND' }, 500, corsHeaders);
    }

    const confirmResponse = await handlePortOnePaymentConfirm({
        paymentId,
        uid,
        courseId,
        categoryId,
        productId,
        amount: Number.isFinite(amount) ? amount : undefined,
        legalDisclaimerAccepted: true,
        finalReviewResponsibilityAccepted: true,
        source: 'portone_webhook'
    }, { uid }, env, corsHeaders);
    const confirmPayload = await confirmResponse.clone().json().catch(() => ({}));

    if (!confirmResponse.ok) {
        const error = new Error(confirmPayload?.message || '웹훅 결제 반영에 실패했습니다.');
        logWebhookError(request, payload, paymentId, error, { phase: 'payment_confirm', confirmStatus: confirmResponse.status, confirmPayload });
        return json({ ok: false, paymentId, confirmStatus: confirmResponse.status, confirmPayload }, confirmResponse.status, corsHeaders);
    }

    await logWebhookStep(env, 'webhook_completed', { paymentId, orderId: paymentId, userId: uid, uid, webhookType });
    return json({ ok: true, paymentId, confirmStatus: confirmResponse.status, confirmPayload }, 200, corsHeaders);
}

async function getPortOnePayment(env, paymentId) {
    const apiSecret = env.PORTONE_API_SECRET || env.V2_API_SECRET;
    if (!apiSecret) throw new Error('PORTONE_API_SECRET 또는 V2_API_SECRET이 설정되지 않았습니다.');
    const response = await fetch('https://api.portone.io/payments/' + encodeURIComponent(paymentId), {
        headers: { Authorization: 'PortOne ' + apiSecret }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || data.error?.message || '포트원 결제내역 조회에 실패했습니다.');
    return data;
}

async function listRecentPortOnePaidPaymentsForUser(env, firebaseUser) {
    const apiSecret = env.PORTONE_API_SECRET || env.V2_API_SECRET;
    if (!apiSecret) throw new Error('PORTONE_API_SECRET 또는 V2_API_SECRET이 설정되지 않았습니다.');
    const uid = String(firebaseUser?.uid || '').trim();
    const email = String(firebaseUser?.email || '').trim();
    if (!uid && !email) return [];
    const until = new Date().toISOString();
    const from = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const searches = [];
    if (uid) searches.push({ textSearch: [{ field: 'ALL', value: uid }], matchedBy: 'uid_text_search' });
    if (email) searches.push({ textSearch: [{ field: 'CUSTOMER_EMAIL', value: email }], matchedBy: 'customer_email_search' });
    if (email) searches.push({ textSearch: [{ field: 'ALL', value: email }], matchedBy: 'email_text_search' });
    searches.push({ textSearch: null, matchedBy: 'recent_paid_scan' });
    const byId = new Map();
    for (const search of searches) {
        const requestBody = {
            page: { number: 0, size: 100 },
            filter: {
                storeId: env.PORTONE_STORE_ID || env.NEXT_PUBLIC_PORTONE_STORE_ID,
                status: ['PAID'],
                from,
                until,
                sortBy: 'STATUS_CHANGED_AT',
                sortOrder: 'DESC'
            }
        };
        if (search.textSearch) requestBody.filter.textSearch = search.textSearch;
        const url = new URL('https://api.portone.io/payments');
        url.searchParams.set('requestBody', JSON.stringify(requestBody));
        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: { Authorization: 'PortOne ' + apiSecret }
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message || data.error?.message || '포트원 결제 다건 조회에 실패했습니다.');
        const items = Array.isArray(data.items) ? data.items : [];
        for (const item of items) {
            const id = String(item.id || item.paymentId || item.transactionId || '').trim();
            if (id) byId.set(id, { ...item, __reseteduMatchedBy: search.matchedBy });
        }
    }
    return Array.from(byId.values());
}

function buildEnrollmentFromPortOnePayment(payment, firebaseUser, requestedCourseId) {
    if (!payment || payment.status !== 'PAID') return null;
    const uid = String(firebaseUser?.uid || '').trim();
    const email = String(firebaseUser?.email || '').trim().toLowerCase();
    const customData = parsePortOneCustomData(payment.customData);
    const paymentUid = String(customData.uid || customData.userId || customData.firebaseUid || customData.customerUid || payment.customer?.id || payment.customer?.customerId || payment.customer?.customer_id || payment.customerId || payment.customer_id || '').trim();
    const paymentEmail = String(payment.customer?.email || payment.customerEmail || payment.customer_email || customData.email || customData.userEmail || customData.customerEmail || '').trim().toLowerCase();
    const matchedBy = String(payment.__reseteduMatchedBy || '').trim();
    const matchedByCurrentUserSearch = matchedBy === 'uid_text_search' || matchedBy === 'customer_email_search' || matchedBy === 'email_text_search' || matchedBy === 'client_recent_payment';
    if (!uid || (paymentUid !== uid && (!email || paymentEmail !== email) && !matchedByCurrentUserSearch)) return null;
    let productId = String(customData.productId || customData.product_id || customData.paymentProductId || '').trim();
    const courseId = String(customData.courseId || customData.course_id || '').trim();
    const categoryId = String(customData.categoryId || customData.category_id || '').trim();
    const requestedCanonicalCourseId = resolveCanonicalCourseId({ courseId: requestedCourseId }) || requestedCourseId;
    let product = getApplicationProductForPayment(productId) || inferApplicationProductFromPayment(payment, customData, requestedCanonicalCourseId);
    if (product && !productId) productId = product.productId;
    const canonicalCourseId = product?.canonicalCourseId || resolveCanonicalCourseId({ courseId, productId, categoryId }) || product?.courseId || courseId || requestedCanonicalCourseId;
    if (!isCourseEntitlementEquivalent({ courseId: canonicalCourseId, canonicalCourseId, productId, categoryId: categoryId || product?.categoryId, planId: product?.planId, productTitle: product?.title, courseTitle: product?.courseTitle }, requestedCanonicalCourseId)) return null;
    const amount = Number(payment.amount?.total ?? payment.amount?.paid ?? payment.totalAmount ?? payment.total_amount ?? payment.paidAmount ?? payment.paid_amount ?? customData.amount);
    if (product && Number.isFinite(amount) && amount > 0 && amount !== product.amount) return null;
    const paidAt = getPortOnePaidAt(payment);
    const purchasedAt = new Date(paidAt);
    const durationDays = getCourseProduct(requestedCanonicalCourseId)?.durationDays || DUI_COURSE_PRODUCT.durationDays;
    const expiresAt = new Date(purchasedAt.getTime() + durationDays * 24 * 60 * 60 * 1000).toISOString();
    const paymentId = String(payment.id || payment.paymentId || '').trim();
    return {
        enrollmentId: uid + '_' + requestedCanonicalCourseId,
        uid, userId: uid,
        userEmail: email || null,
        courseId: requestedCanonicalCourseId,
        canonicalCourseId: requestedCanonicalCourseId,
        categoryId, productId, planId: product?.planId || null,
        productTitle: product?.title || null,
        courseTitle: product?.courseTitle || getCourseProduct(requestedCanonicalCourseId)?.courseTitle || null,
        certificateName: customData.certificateName || customData.certificate_name || customData.userName || customData.user_name || payment.customer?.fullName || payment.customer?.name || null,
        certificateBirthDate: getWorkerRecordBirthDate({ customData }, payment) || null,
        amount: product?.amount || amount || null,
        paymentId,
        orderId: paymentId,
        paymentStatus: 'paid', status: 'active', accessStatus: 'active', enrollmentStatus: 'active', isActive: true,
        purchasedAt: purchasedAt.toISOString(), startsAt: purchasedAt.toISOString(), accessStartsAt: purchasedAt.toISOString(), expiresAt, accessEndsAt: expiresAt,
        sourceType: 'TRUSTED_PAYMENT_RECORD', recordSource: 'portone_recent_paid_lookup', rawResponse: payment
    };
}

async function findRecentPortOneEntitlementForUser(env, firebaseUser, courseId) {
    const payments = await listRecentPortOnePaidPaymentsForUser(env, firebaseUser);
    for (const payment of payments) {
        const summaryEnrollment = buildEnrollmentFromPortOnePayment(payment, firebaseUser, courseId);
        if (isFirestoreEnrollmentActiveRecord(summaryEnrollment)) return summaryEnrollment;
        const paymentId = String(payment.id || payment.paymentId || '').trim();
        if (!paymentId) continue;
        const detail = await getPortOnePayment(env, paymentId).catch((error) => {
            logEnrollmentWorkerEvent('portone_recent_payment_detail_failed', { paymentId: encodeFirestoreDocId(paymentId).slice(0, 18), courseId, message: error instanceof Error ? error.message : String(error) });
            return null;
        });
        const detailEnrollment = buildEnrollmentFromPortOnePayment(detail ? { ...detail, __reseteduMatchedBy: payment.__reseteduMatchedBy } : null, firebaseUser, courseId);
        if (isFirestoreEnrollmentActiveRecord(detailEnrollment)) return detailEnrollment;
    }
    return null;
}

async function verifyPortOneEntitlementWrite(env, { paymentId, orderId, uid, enrollmentId, courseId }) {
    const [payment, enrollment, purchase] = await Promise.all([
        firestoreGetData(env, 'payments', orderId).catch(() => null),
        firestoreGetData(env, 'enrollments', enrollmentId).catch(() => null),
        firestoreGetData(env, 'purchases', orderId).catch(() => null)
    ]);
    const decision = getEnrollmentAccessDecision(enrollment, uid, courseId);
    const ok = Boolean(payment && purchase && decision.allowed);
    await savePaymentLog(env, orderId, {
        type: ok ? 'portone_entitlement_write_verified' : 'portone_entitlement_write_incomplete',
        paymentId,
        orderId,
        uid,
        courseId,
        enrollmentId,
        paymentSaved: Boolean(payment),
        purchaseSaved: Boolean(purchase),
        enrollmentSaved: Boolean(enrollment),
        enrollmentAllowed: Boolean(decision.allowed),
        denialReason: decision.allowed ? null : decision.reason || 'UNKNOWN',
        created_at: new Date().toISOString(),
        createdAt: new Date().toISOString()
    }).catch((logError) => console.error(logError));
    if (!ok) {
        const error = new Error('ENTITLEMENT_WRITE_VERIFICATION_FAILED: ' + (decision.reason || 'MISSING_PAYMENT_PURCHASE_OR_ENROLLMENT'));
        error.code = 'ENTITLEMENT_WRITE_VERIFICATION_FAILED';
        throw error;
    }
}

async function handlePortOnePaymentConfirm(body, firebaseUser, env, corsHeaders) {
    const paymentId = String(body?.paymentId || '').trim();
    const pendingOrder = await getPendingPaymentRecord(env, paymentId);
    const uid = String(pendingOrder?.uid || pendingOrder?.userId || body?.uid || '').trim();
    const courseId = String(pendingOrder?.courseId || body?.courseId || '').trim();
    const productId = String(pendingOrder?.productId || body?.productId || '').trim();
    const categoryId = String(pendingOrder?.categoryId || body?.categoryId || '').trim();
    const amount = typeof pendingOrder?.amount === 'number' ? pendingOrder.amount : (typeof body?.amount === 'number' ? body.amount : undefined);
    const phoneNumber = String(body?.phoneNumber || body?.buyerPhone || body?.customerPhone || pendingOrder?.phoneNumber || pendingOrder?.buyerPhone || pendingOrder?.customerPhone || '').trim() || null;
    const product = getApplicationProductForPayment(productId);
    if (!paymentId || !uid || !courseId || !productId || !categoryId) {
        return json({ message: 'paymentId, uid, courseId, productId, categoryId가 모두 필요합니다.', code: 'MISSING_FIELDS' }, 400, corsHeaders);
    }
    if (uid !== firebaseUser.uid) {
        return json({ message: '로그인한 사용자와 결제 사용자 정보가 일치하지 않습니다.', code: 'USER_MISMATCH' }, 403, corsHeaders);
    }
    if (!product || courseId !== product.courseId || categoryId !== product.categoryId) {
        return json({ message: '지원하지 않는 교육 상품입니다.', code: 'INVALID_PRODUCT' }, 400, corsHeaders);
    }

    if (!product) {
        return json({ message: '결제 상품 정보가 올바르지 않습니다.', code: 'INVALID_PRODUCT' }, 400, corsHeaders);
    }
    if (typeof amount === 'number' && amount !== product.amount) {
        return json({ message: '요청 금액이 상품 금액과 일치하지 않습니다.', code: 'PAYMENT_AMOUNT_MISMATCH' }, 400, corsHeaders);
    }

    const canonicalCourseId = product.canonicalCourseId || resolveCanonicalCourseId({ courseId, productId, categoryId }) || courseId;
    const orderId = paymentId;
    const orderDocPath = firestoreDocumentPath(env, 'payments', orderId);
    let existingPaidSameUser = false;
    const enrollmentId = uid + '_' + canonicalCourseId;
    const existingOrder = await firestoreGet(env, orderDocPath).catch((error) => {
        if (error.status === 404) return null;
        if (isFirestoreQuotaError(error)) {
            console.warn('[payment:portone-confirm-existing-order-read-skipped]', { paymentId, status: error.status, message: error.message });
            return null;
        }
        return Promise.reject(error);
    });
    if (existingOrder) {
        const existing = fromFirestoreFields(existingOrder.fields || {});
        const existingUid = existing.uid || existing.userId;
        if (existingUid && existingUid !== uid) {
            return json({ message: '이미 다른 사용자로 처리된 결제번호입니다.', code: 'DUPLICATE_PAYMENT_ID' }, 409, corsHeaders);
        }
        if (existing.paymentStatus === 'paid') {
            existingPaidSameUser = true;
            const existingEnrollment = await firestoreGet(env, firestoreDocumentPath(env, 'enrollments', enrollmentId)).catch((error) => {
                if (error.status === 404) return null;
                if (isFirestoreQuotaError(error)) {
                    console.warn('[payment:portone-idempotent-enrollment-read-skipped]', { paymentId, enrollmentId, status: error.status, message: error.message });
                    return null;
                }
                return Promise.reject(error);
            });
            const enrollment = existingEnrollment ? fromFirestoreFields(existingEnrollment.fields || {}) : null;
            const idempotentDecision = getActiveDuplicateEnrollmentDecision(enrollment, uid, canonicalCourseId, productId);
            if (idempotentDecision.blocked) {
                await savePaymentLog(env, orderId, buildPaymentLogRecord({ type: 'portone_confirm_idempotent', paymentId, orderId, uid, courseId, productId, amount: product.amount, approved: existing, status: 'paid' })).catch((logError) => console.error(logError));
                return json({
                    savedPurchaseId: existing.orderId || orderId,
                    paymentId: existing.paymentId || paymentId,
                    orderId: existing.orderId || orderId,
                    enrollmentId,
                    courseId,
                    courseTitle: existing.courseTitle || product.courseTitle,
                    totalAmount: Number(existing.amount || product.amount),
                    expiresAt: enrollment.expiresAt || existing.expiresAt || null,
                    accessStatus: 'active',
                    receipt: existing.receiptUrl ? { url: existing.receiptUrl } : undefined
                }, 200, corsHeaders);
            }
        }
    }

    const paymentKeyDocId = encodeFirestoreDocId(paymentId);
    const paymentKeyPath = firestoreDocumentPath(env, 'paymentKeys', paymentKeyDocId);
    const existingPaymentKey = await firestoreGet(env, paymentKeyPath).catch((error) => {
        if (error.status === 404) return null;
        if (isFirestoreQuotaError(error)) {
            console.warn('[payment:portone-confirm-existing-key-read-skipped]', { paymentId, status: error.status, message: error.message });
            return null;
        }
        return Promise.reject(error);
    });
    if (existingPaymentKey && !existingPaidSameUser) {
        return json({ message: '이미 승인 처리된 paymentId입니다.', code: 'DUPLICATE_PAYMENT_ID' }, 409, corsHeaders);
    }

    const duplicate = await checkActiveEnrollmentDuplicate(env, {
        uid,
        email: firebaseUser.email,
        productId,
        requestedCourseId: courseId,
        canonicalCourseId
    });
    const duplicateCheckedAt = new Date().toISOString();
    await savePaymentLog(env, orderId, {
        type: 'payment_duplicate_enrollment_check',
        orderId,
        paymentId,
        uid,
        courseId,
        productId,
        ...duplicate.debug,
        createdAt: duplicateCheckedAt,
        created_at: duplicateCheckedAt
    }).catch((logError) => console.error(logError));
    if (duplicate.blocked) {
        return json({ message: '이미 활성화된 수강권이 있어 중복 결제를 제한합니다.', code: 'ACTIVE_ENROLLMENT_EXISTS', debug: duplicate.debug }, 409, corsHeaders);
    }

    let approved;
    let customData = {};
    try {
        approved = await getPortOnePayment(env, paymentId);
        customData = parsePortOneCustomData(approved.customData);
        const channelType = approved.channel?.type;
        const expectedChannelType = env.PORTONE_EXPECTED_CHANNEL_TYPE || 'LIVE';
        const storeId = approved.storeId || approved.store?.id;
        const configuredStoreId = env.PORTONE_STORE_ID || env.NEXT_PUBLIC_PORTONE_STORE_ID;
        const paidAmount = Number(approved.amount?.total);
        const currency = normalizePortOneCurrency(approved.currency);

        if (expectedChannelType && channelType && channelType !== expectedChannelType) throw new Error('포트원 채널이 실연동 채널이 아닙니다.');
        if (configuredStoreId && storeId && storeId !== configuredStoreId) throw new Error('포트원 상점 ID가 일치하지 않습니다.');
        if (!isAllowedOrderNameForProduct(approved.orderName, product)) throw new Error('주문명이 현재 상품과 일치하지 않습니다.');
        if (paidAmount !== product.amount) throw new Error('결제 승인 금액이 상품 금액과 일치하지 않습니다.');
        if (currency !== DUI_COURSE_PRODUCT.currency) throw new Error('결제 통화가 올바르지 않습니다.');
        if (customData.courseId && customData.courseId !== courseId) throw new Error('결제 상품 정보가 일치하지 않습니다.');
        if (customData.productId && customData.productId !== productId) throw new Error('결제 상품 옵션이 일치하지 않습니다.');
        if (customData.categoryId && customData.categoryId !== categoryId) throw new Error('결제 카테고리가 일치하지 않습니다.');

        if (approved.status === 'VIRTUAL_ACCOUNT_ISSUED') {
            const method = getPortOnePaymentMethod(approved);
            if (method !== 'VIRTUAL_ACCOUNT') throw new Error('가상계좌 결제수단 정보가 올바르지 않습니다.');
            const nowIso = new Date().toISOString();
            const virtualAccount = getPortOneVirtualAccountInfo(approved);
            const awaitingRecord = {
                paymentId, orderId, paymentKey: paymentId, userId: uid, uid, courseId, canonicalCourseId,
                categoryId, productId, planId: product.planId || null, productTitle: product.title,
                courseTitle: product.courseTitle, orderName: product.courseTitle, amount: product.amount,
                phoneNumber, buyerPhone: phoneNumber, customerPhone: phoneNumber,
                method, paymentMethod: method, status: 'awaiting_deposit', paymentStatus: 'awaiting_deposit',
                paymentProvider: 'portone-kcp-v2', virtualAccount, virtualAccountIssuedAt: virtualAccount.issuedAt || approved.statusChangedAt || nowIso,
                virtualAccountExpiredAt: virtualAccount.expiredAt || null, kcpTid: getPortOneTid(approved),
                kcpResponseCode: getPortOneResponseCode(approved), kcpResponseMessage: getPortOneResponseMessage(approved),
                issuedAt: virtualAccount.issuedAt || approved.statusChangedAt || nowIso, createdAt: pendingOrder?.createdAt || nowIso, updatedAt: nowIso, rawResponse: approved
            };
            await firestorePatch(env, orderDocPath, awaitingRecord);
            await savePaymentLog(env, orderId, buildPaymentLogRecord({ type: 'portone_virtual_account_issued', paymentId, orderId, uid, courseId, productId, amount: product.amount, approved, approvedAt: virtualAccount.issuedAt || approved.statusChangedAt || nowIso, status: 'awaiting_deposit' })).catch((logError) => console.error(logError));
            return json({
                savedPurchaseId: null, paymentId, orderId, courseId, courseTitle: product.courseTitle, productId, productTitle: product.title,
                method, status: 'awaiting_deposit', paymentStatus: 'awaiting_deposit', accessStatus: 'awaiting_deposit',
                totalAmount: product.amount, virtualAccount
            }, 200, corsHeaders);
        }

        if (approved.status !== 'PAID') throw new Error('결제가 완료된 상태가 아닙니다.');
    } catch (error) {
        await savePaymentLog(env, orderId, buildPaymentLogRecord({ type: 'portone_confirm_failed', paymentId, orderId, uid, courseId, productId, amount: product.amount, approved, status: 'failed', error })).catch((logError) => console.error(logError));
        await safeSupabaseLedger('payment-failed', () => supabaseLedgerInsertActivity(env, { firebase_uid: uid, event_type: 'payment_failed', course_id: courseId, course_name: product.courseTitle, order_id: orderId, description: error instanceof Error ? error.message : '결제 실패', metadata: { payment_id: paymentId, product_id: productId } }));
        return json({ message: error instanceof Error ? error.message : '포트원 결제 검증 중 오류가 발생했습니다.', code: 'PAYMENT_CONFIRM_FAILED' }, 400, corsHeaders);
    }

    const approvedAt = getPortOnePaidAt(approved);
    const purchasedAt = new Date(approvedAt);
    const expiresAt = new Date(purchasedAt.getTime() + (getCourseProduct(canonicalCourseId)?.durationDays || DUI_COURSE_PRODUCT.durationDays) * 24 * 60 * 60 * 1000).toISOString();
    const nowIso = new Date().toISOString();
    const receiptUrl = getPortOneReceiptUrl(approved);
    const method = getPortOnePaymentMethod(approved);
    const certificateBirthDate = getWorkerRecordBirthDate({ customData }, approved, pendingOrder);

    const paymentRecord = {
        paymentId, orderId, paymentKey: paymentId, userId: uid, uid, courseId, canonicalCourseId,
        categoryId, productId, planId: product.planId || null, productTitle: product.title,
        courseTitle: product.courseTitle,
        orderName: product.courseTitle,
        amount: product.amount,
        certificateBirthDate: certificateBirthDate || null,
        birthDate: certificateBirthDate || null,
        dateOfBirth: certificateBirthDate || null,
        phoneNumber,
        buyerPhone: phoneNumber,
        customerPhone: phoneNumber,
        method,
        status: 'paid', paymentStatus: 'paid', paymentProvider: 'portone-kcp-v2',
        receiptUrl,
        kcpTid: getPortOneTid(approved),
        kcpResponseCode: getPortOneResponseCode(approved),
        kcpResponseMessage: getPortOneResponseMessage(approved),
        approvedAt, createdAt: nowIso, updatedAt: nowIso, rawResponse: approved
    };
    const enrollmentRecord = {
        enrollmentId, userId: uid, uid, courseId: canonicalCourseId, canonicalCourseId,
        categoryId, productId, planId: product.planId || null, productTitle: product.title, amount: product.amount,
        phoneNumber,
        buyerPhone: phoneNumber,
        customerPhone: phoneNumber,
        courseTitle: product.courseTitle,
        certificateBirthDate: certificateBirthDate || null,
        birthDate: certificateBirthDate || null,
        dateOfBirth: certificateBirthDate || null,
        paymentId, orderId,
        purchasedAt: purchasedAt.toISOString(), startsAt: purchasedAt.toISOString(), accessStartsAt: purchasedAt.toISOString(), expiresAt, accessEndsAt: expiresAt,
        sourceType: 'PAYMENT', status: 'active', isActive: true, enrollmentStatus: 'active',
        paymentStatus: 'paid', accessStatus: 'active', progress: 0,
        completedLessons: 0, totalLessons: product.totalLessons,
        certificateIssued: false, certificateIssuedAt: null,
        createdAt: nowIso, updatedAt: nowIso
    };
    await saveRecentPaymentEntitlement(env, enrollmentRecord).catch((error) => console.warn('[entitlement-cache:payment-confirm-put-failed]', { uid: maskLogIdentifier(uid), courseId: canonicalCourseId, paymentId, message: error instanceof Error ? error.message : String(error) }));
    const purchaseRecord = {
        uid, userId: uid, courseId, canonicalCourseId, courseTitle: product.courseTitle,
        categoryId, productId, planId: product.planId || null, productTitle: product.title,
        orderId, paymentKey: paymentId, paymentStatus: 'paid', accessStatus: 'active',
        paymentProvider: 'portone-kcp-v2', amount: product.amount,
        phoneNumber,
        buyerPhone: phoneNumber,
        customerPhone: phoneNumber,
        certificateBirthDate: certificateBirthDate || null,
        birthDate: certificateBirthDate || null,
        dateOfBirth: certificateBirthDate || null,
        method, receiptUrl,
        kcpTid: getPortOneTid(approved),
        kcpResponseCode: getPortOneResponseCode(approved),
        kcpResponseMessage: getPortOneResponseMessage(approved),
        orderedAt: approvedAt, approvedAt, purchasedAt: purchasedAt.toISOString(), expiresAt,
        accessValidDays: getCourseProduct(canonicalCourseId)?.durationDays || DUI_COURSE_PRODUCT.durationDays, accessValidMonths: 3,
        totalLessons: product.totalLessons, completedLessons: 0,
        certificateIssued: false,
        legalDisclaimerAccepted: Boolean(body.legalDisclaimerAccepted),
        finalReviewResponsibilityAccepted: Boolean(body.finalReviewResponsibilityAccepted),
        rawResponse: approved, updatedAt: nowIso, createdAt: nowIso
    };

    try {
        await firestorePatch(env, orderDocPath, paymentRecord);
        if (body.source === 'portone_webhook') await logWebhookStep(env, 'payment_record_saved', { paymentId, orderId, userId: uid, uid, webhookType: 'Transaction.Paid' });
        await grantCourseAccess(env, { ...enrollmentRecord, canonicalCourseId, source: 'payment', paymentId, orderId, planId: product.planId || null });
        if (body.source === 'portone_webhook') await logWebhookStep(env, 'enrollment_created', { paymentId, orderId, userId: uid, uid, webhookType: 'Transaction.Paid' });
        await firestorePatch(env, firestoreDocumentPath(env, 'purchases', orderId), purchaseRecord);
        await firestorePatch(env, firestoreDocumentPath(env, 'users', uid), {
            loginId: firebaseUser.email || null,
            adminPaymentSummary: buildAdminUserPaymentSummary(paymentRecord, nowIso),
            adminPaymentSummaryUpdatedAt: nowIso,
            uid,
            email: firebaseUser.email || null,
            hasPayment: true,
            lastPaymentDate: approvedAt,
            lastPaymentAmount: product.amount,
            lastCourseId: canonicalCourseId,
            lastCourseName: product.courseTitle,
            enrollmentStatus: 'active',
            refundStatus: 'none',
            memberStatus: '정상',
            updatedAt: nowIso
        });
        await firestorePatch(env, paymentKeyPath, { paymentKey: paymentId, paymentId, orderId, userId: uid, courseId, canonicalCourseId, productId, planId: product.planId || null, createdAt: nowIso });
        await firestorePatch(env, firestoreDocumentPath(env, 'refundPolicies', canonicalCourseId), buildRefundPolicyRecord(nowIso, getCourseProduct(canonicalCourseId)));
        await safeSupabaseLedger('payment-completed', () => supabaseLedgerRecordPayment(env, paymentRecord));
        await safeSupabaseLedger('payment-enrollment-upsert', () => supabaseLedgerUpsertEnrollment(env, enrollmentRecord));
        await savePaymentLog(env, orderId, buildPaymentLogRecord({ type: existingPaidSameUser ? 'portone_resync_completed' : 'portone_confirm_completed', paymentId, orderId, uid, courseId, productId, amount: product.amount, approved, approvedAt, status: 'paid' })).catch((logError) => console.error(logError));
    } catch (error) {
        console.error('[payment:portone-firestore-save-failed]', { paymentId, orderId, uid: maskLogIdentifier(uid), courseId, productId, message: error instanceof Error ? error.message : String(error) });
        await savePaymentLog(env, orderId, buildPaymentLogRecord({ type: 'firestore_save_failed', paymentId, orderId, uid, courseId, productId, amount: product.amount, approved, approvedAt, status: 'paid_save_failed', error })).catch((logError) => console.error(logError));
        return json({ message: '결제는 확인되었지만 수강권 저장에 실패했습니다. 운영자 재처리가 필요합니다.', code: 'ENROLLMENT_SAVE_FAILED', paymentId, orderId }, 500, corsHeaders);
    }

    return json({
        savedPurchaseId: orderId,
        paymentId,
        orderId,
        enrollmentId,
        courseId,
        courseTitle: product.courseTitle,
        productId,
        productTitle: product.title,
        totalAmount: product.amount,
        expiresAt,
        accessStatus: 'active',
        receipt: receiptUrl ? { url: receiptUrl } : undefined
    }, 200, corsHeaders);
}

function buildRefundPolicyRecord(nowIso, product = DUI_COURSE_PRODUCT) {
    return {
        courseId: product.courseId,
        courseTitle: product.courseTitle,
        totalAmount: product.price || product.amount || DUI_COURSE_PRODUCT.price,
        totalLessons: product.totalLessons || DUI_COURSE_PRODUCT.totalLessons,
        pricePerLesson: product.pricePerLesson || Math.ceil((product.price || product.amount || DUI_COURSE_PRODUCT.price) / Math.max(1, product.totalLessons || DUI_COURSE_PRODUCT.totalLessons)),
        durationDays: product.durationDays || DUI_COURSE_PRODUCT.durationDays,
        refundRules: [
            '결제 후 강의를 전혀 수강하지 않은 경우 전액 환불',
            '일부 강의를 수강한 경우 미수강 강의 수에 해당하는 금액 환불',
            '전체 강의를 수강 완료한 경우 환불 불가',
            '수강기간 90일이 경과한 경우 환불 불가',
            '수료증이 발급된 경우 환불 불가'
        ],
        createdAt: nowIso,
        updatedAt: nowIso
    };
}

async function savePaymentLog(env, orderId, data) {
    return firestorePatch(env, firestoreDocumentPath(env, 'paymentLogs', `${orderId}_${Date.now()}`), data);
}

function encodeFirestoreDocId(value) {
    return String(value).replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 120);
}

function getFirestoreProjectId(env) {
    return env.FIREBASE_PROJECT_ID || env.GOOGLE_CLOUD_PROJECT || PRODUCTION_FIREBASE_PROJECT_ID;
}

function getRuntimeEnvironment(env) {
    return String(env.APP_ENV || env.ENVIRONMENT || env.NODE_ENV || 'production').toLowerCase();
}

function isLocalDevelopmentHost(hostname) {
    return ['localhost', '127.0.0.1', '0.0.0.0', '::1'].includes(String(hostname || '').toLowerCase());
}

function assertProductionFirestoreProject(env, operation, collectionName = '') {
    const projectId = getFirestoreProjectId(env);
    const expectedProjectId = env.EXPECTED_FIREBASE_PROJECT_ID || PRODUCTION_FIREBASE_PROJECT_ID;
    const runtimeEnvironment = getRuntimeEnvironment(env);
    if (runtimeEnvironment === 'production' && projectId !== expectedProjectId) {
        const error = new Error('Production Firestore project mismatch. Refusing ' + operation + ' on ' + projectId + '.');
        error.status = 500;
        error.code = 'FIREBASE_PROJECT_MISMATCH';
        throw error;
    }
    if (PROTECTED_FIRESTORE_COLLECTIONS.has(collectionName) && env.ALLOW_PRODUCTION_DATA_WRITES === 'false') {
        const error = new Error('Production Firestore writes are disabled by ALLOW_PRODUCTION_DATA_WRITES=false.');
        error.status = 503;
        error.code = 'PRODUCTION_WRITES_DISABLED';
        throw error;
    }
}

function assertFirestoreReadAllowed(env, operation) {
    const projectId = getFirestoreProjectId(env);
    const runtimeEnvironment = getRuntimeEnvironment(env);
    if (runtimeEnvironment !== 'production' && projectId === PRODUCTION_FIREBASE_PROJECT_ID && env.ALLOW_PROD_FIRESTORE_READS_IN_DEV !== 'true') {
        const error = new Error('Development Worker is pointing at production Firestore. Refusing ' + operation + ' read.');
        error.status = 503;
        error.code = 'PROD_FIRESTORE_READS_BLOCKED_IN_DEV';
        throw error;
    }
}

function getFirestoreCollectionFromDocumentPath(documentPath) {
    const marker = '/documents/';
    const index = String(documentPath || '').indexOf(marker);
    if (index === -1) return '';
    return String(documentPath).slice(index + marker.length).split('/')[0] || '';
}

function firestoreDocumentPath(env, collectionName, documentId) {
    const projectId = getFirestoreProjectId(env);
    return `projects/${projectId}/databases/(default)/documents/${collectionName}/${documentId}`;
}

async function firestoreGet(env, documentPath) {
    assertFirestoreReadAllowed(env, 'GET');
    const token = await getGoogleAccessToken(env);
    const response = await fetchWithFirestoreRetry(() => fetch(`https://firestore.googleapis.com/v1/${documentPath}`, { headers: { Authorization: `Bearer ${token}` } }), 'GET', documentPath);
    if (!response.ok) {
        const body = await response.text().catch(() => '');
        const error = new Error(`Firestore GET failed: ${response.status}${body ? ' ' + body : ''}`);
        error.status = response.status;
        throw error;
    }
    return response.json();
}

async function firestorePatch(env, documentPath, data) {
    assertProductionFirestoreProject(env, 'PATCH', getFirestoreCollectionFromDocumentPath(documentPath));
    const token = await getGoogleAccessToken(env);
    const request = () => fetch(`https://firestore.googleapis.com/v1/${documentPath}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: toFirestoreFields(data) })
    });
    const response = await fetchWithFirestoreRetry(request, 'PATCH', documentPath);
    if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new Error(`Firestore PATCH failed: ${response.status} ${body}`);
    }
    return response.json();
}

async function firestorePatchIfUnchanged(env, documentPath, data, updateTime) {
    assertProductionFirestoreProject(env, 'PATCH', getFirestoreCollectionFromDocumentPath(documentPath));
    const token = await getGoogleAccessToken(env);
    const url = new URL(`https://firestore.googleapis.com/v1/${documentPath}`);
    if (updateTime) url.searchParams.set('currentDocument.updateTime', updateTime);
    const request = () => fetch(url.toString(), {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: toFirestoreFields(data) })
    });
    const response = await fetchWithFirestoreRetry(request, 'PATCH', documentPath);
    if (!response.ok) {
        const body = await response.text().catch(() => '');
        const error = new Error(`Firestore PATCH failed: ${response.status} ${body}`);
        error.status = response.status;
        throw error;
    }
    return response.json();
}

function isFirestoreQuotaError(error) {
    return error?.status === 429 || String(error?.message || '').includes('RESOURCE_EXHAUSTED') || String(error?.message || '').includes('Quota exceeded');
}

function isRetryableFirestoreStatus(status) {
    return status === 500 || status === 502 || status === 503 || status === 504;
}

function getRetryAfterMs(response) {
    const retryAfter = response.headers.get('retry-after');
    if (!retryAfter) return 0;
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
    const retryAt = Date.parse(retryAfter);
    return Number.isFinite(retryAt) ? Math.max(0, retryAt - Date.now()) : 0;
}

function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithFirestoreRetry(fetcher, operation, target) {
    const maxAttempts = 4;
    let lastResponse = null;
    let lastError = null;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        try {
            const response = await fetcher();
            if (!isRetryableFirestoreStatus(response.status) || attempt === maxAttempts) return response;
            lastResponse = response;
            const retryAfterMs = getRetryAfterMs(response);
            const backoffMs = retryAfterMs || 180 * (2 ** (attempt - 1)) + Math.floor(Math.random() * 120);
            console.warn('[firestore:retry]', { operation, target, status: response.status, attempt, retryInMs: backoffMs });
            await delay(backoffMs);
        } catch (error) {
            lastError = error;
            if (attempt === maxAttempts) throw error;
            const backoffMs = 180 * (2 ** (attempt - 1)) + Math.floor(Math.random() * 120);
            console.warn('[firestore:retry]', { operation, target, message: error instanceof Error ? error.message : String(error), attempt, retryInMs: backoffMs });
            await delay(backoffMs);
        }
    }
    if (lastResponse) return lastResponse;
    throw lastError || new Error(`Firestore ${operation} failed before receiving a response`);
}
function toFirestoreFields(data) {
    return Object.fromEntries(Object.entries(data).map(([key, value]) => [key, toFirestoreValue(value)]));
}

function toFirestoreValue(value) {
    if (value === null || value === undefined) return { nullValue: null };
    if (typeof value === 'string') {
        if (/^\d{4}-\d{2}-\d{2}T/.test(value)) return { timestampValue: value };
        return { stringValue: value };
    }
    if (typeof value === 'number') return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
    if (typeof value === 'boolean') return { booleanValue: value };
    if (Array.isArray(value)) return { arrayValue: { values: value.map(toFirestoreValue) } };
    if (typeof value === 'object') return { mapValue: { fields: toFirestoreFields(value) } };
    return { stringValue: String(value) };
}

async function verifyFirebaseIdToken(idToken, env) {
    const apiKey = env.FIREBASE_WEB_API_KEY || env.FIREBASE_API_KEY || env.NEXT_PUBLIC_FIREBASE_API_KEY;
    if (!apiKey) throw new Error('FIREBASE_WEB_API_KEY가 필요합니다.');
    const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken })
    });
    const data = await response.json().catch(() => ({}));
    const user = data.users?.[0];
    if (!response.ok || !user?.localId) {
        throw new Error(data.error?.message || 'Firebase ID 토큰 검증에 실패했습니다.');
    }
    return { uid: user.localId, email: user.email || null, name: user.displayName || null };
}
function normalizeFirebasePrivateKey(value) {
    let key = String(value || "").trim();
    const first = key.charCodeAt(0);
    const last = key.charCodeAt(key.length - 1);
    if ((first === 34 && last === 34) || (first === 39 && last === 39)) key = key.slice(1, -1);
    try {
        if (key.startsWith("{")) key = JSON.parse(key).private_key || key;
        else if (key.charCodeAt(0) === 34) key = JSON.parse(key);
    } catch {
        // Keep original value when it is not JSON-encoded.
    }
    key = String(key || "").replace(/\\n/g, "\n").replace(/\n/g, "\n").replace(/\r/g, "").trim();
    const begin = "-----BEGIN PRIVATE KEY-----";
    const end = "-----END PRIVATE KEY-----";
    const beginIndex = key.indexOf(begin);
    const endIndex = key.indexOf(end);
    if (beginIndex >= 0 && endIndex > beginIndex) key = key.slice(beginIndex, endIndex + end.length);
    return key.trim();
}

async function getGoogleAccessToken(env, scope = 'https://www.googleapis.com/auth/datastore') {
    const clientEmail = env.FIREBASE_CLIENT_EMAIL || env.GOOGLE_CLIENT_EMAIL;
    const privateKey = normalizeFirebasePrivateKey(env.FIREBASE_PRIVATE_KEY || env.GOOGLE_PRIVATE_KEY || '');
    if (!clientEmail || !privateKey) throw new Error('FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY 서비스 계정 비밀값이 필요합니다.');
    const now = Math.floor(Date.now() / 1000);
    const header = { alg: 'RS256', typ: 'JWT' };
    const claim = { iss: clientEmail, scope, aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 };
    const unsigned = `${toBase64Url(new TextEncoder().encode(JSON.stringify(header)))}.${toBase64Url(new TextEncoder().encode(JSON.stringify(claim)))}`;
    const key = await importPrivateKeyFromPem(privateKey);
    const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(unsigned));
    const assertion = `${unsigned}.${toBase64Url(new Uint8Array(signature))}`;
    const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.access_token) throw new Error(data.error_description || 'Google access token 발급에 실패했습니다.');
    return data.access_token;
}

async function importPrivateKeyFromPem(pem) {
    const body = normalizeFirebasePrivateKey(pem).replace('-----BEGIN PRIVATE KEY-----', '').replace('-----END PRIVATE KEY-----', '').replace(/\s/g, '');
    if (!/^[A-Za-z0-9+/=]+$/.test(body)) throw new Error('FIREBASE_PRIVATE_KEY PEM 형식이 올바르지 않습니다.');
    const binary = Uint8Array.from(atob(body), (char) => char.charCodeAt(0));
    return crypto.subtle.importKey('pkcs8', binary, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
}



function getAdminEmailsFromEnv(env) {
    return String(env.ADMIN_EMAILS || 'cfv47@naver.com').split(',').map((email) => email.trim().toLowerCase()).filter(Boolean);
}

async function requireFirebaseAdmin(request, env) {
    const authHeader = request.headers.get("Authorization") || "";
    const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!idToken) throw new Error("로그인이 필요합니다.");
    const user = await verifyFirebaseIdToken(idToken, env);
    const adminEmails = getAdminEmailsFromEnv(env);
    const emailAllowed = adminEmails.includes(String(user.email || "").toLowerCase());
    const profile = await firestoreGetData(env, "users", user.uid).catch((error) => error.status === 404 ? null : Promise.reject(error));
    const role = String(profile?.role || profile?.adminRole || "").toLowerCase();
    const roleAllowed = ["admin", "superadmin", "operator", "viewer"].includes(role);
    if (!emailAllowed && !roleAllowed) {
        const error = new Error("관리자 권한이 없습니다.");
        error.status = 403;
        throw error;
    }
    return { ...user, role: role || (emailAllowed ? "superadmin" : "admin"), profile: profile || null };
}

function getRequestIp(request) {
    return request.headers.get("CF-Connecting-IP") || request.headers.get("X-Forwarded-For") || null;
}

async function saveAdminAuditLog(env, request, admin, action, targetType, targetId, beforeValue, afterValue, reason) {
    const nowIso = new Date().toISOString();
    const safeTargetId = encodeFirestoreDocId(targetId || action || String(Date.now()));
    const logId = encodeFirestoreDocId(action + "_" + safeTargetId + "_" + Date.now());
    const record = {
        action,
        targetType,
        targetId: targetId || null,
        beforeValue: beforeValue || null,
        afterValue: afterValue || null,
        reason: reason || null,
        adminId: admin?.uid || null,
        adminEmail: admin?.email || null,
        adminRole: admin?.role || null,
        ip: getRequestIp(request),
        createdAt: nowIso,
        processedAt: nowIso
    };
    await firestorePatch(env, firestoreDocumentPath(env, "adminLogs", logId), record);
    return record;
}
async function handleAdminPaymentResync(request, env, corsHeaders) {
    let admin;
    try {
        admin = await requireFirebaseAdmin(request, env);
    } catch (error) {
        return json({ message: error.message || '관리자 권한이 없습니다.', code: 'ADMIN_FORBIDDEN' }, error.status || 403, corsHeaders);
    }

    const body = await request.json().catch(() => null);
    if (!body?.paymentId || !body?.uid) {
        return json({ message: 'paymentId와 uid가 필요합니다.', code: 'MISSING_FIELDS' }, 400, corsHeaders);
    }

    const paymentId = String(body.paymentId).trim();
    const uid = String(body.uid).trim();
    const productId = String(body.productId || 'basic').trim();
    const product = getApplicationProductForPayment(productId);
    const amount = typeof body.amount === 'number' ? body.amount : product?.amount;
    if (!paymentId || !uid || !product) {
        return json({ message: '결제번호, 사용자 ID, 상품 정보가 올바르지 않습니다.', code: 'INVALID_REQUEST' }, 400, corsHeaders);
    }

    await savePaymentLog(env, paymentId, {
        type: 'admin_portone_resync_requested',
        paymentId,
        orderId: paymentId,
        user_id: uid,
        userId: uid,
        uid,
        product_id: productId,
        productId,
        requested_amount: amount,
        amount,
        requestedBy: admin.email || admin.uid,
        created_at: new Date().toISOString(),
        createdAt: new Date().toISOString()
    }).catch((logError) => console.error(logError));

    return handlePortOnePaymentConfirm({
        paymentId,
        uid,
        courseId: body.courseId || DUI_COURSE_PRODUCT.courseId,
        categoryId: body.categoryId || 'dui',
        productId,
        amount,
        legalDisclaimerAccepted: true,
        finalReviewResponsibilityAccepted: true,
        adminResync: true
    }, { uid, email: admin.email || null }, env, corsHeaders);
}

function getIncludedBaseProductForManualGrant(productId) {
    if (productId === 'dui-cbt-advanced' || productId === 'dui-cbt-counseling') return APPLICATION_PRODUCTS['dui-cbt-basic'];
    if (productId === 'drug-addiction-premium' || productId === 'drug-addiction-premium-counseling') return APPLICATION_PRODUCTS['drug-addiction-basic'];
    if (String(productId || '').endsWith('-advanced-counseling')) return APPLICATION_PRODUCTS[String(productId).replace(/-advanced-counseling$/, '-basic')] || null;
    if (String(productId || '').endsWith('-advanced')) return APPLICATION_PRODUCTS[String(productId).replace(/-advanced$/, '-basic')] || null;
    return null;
}

async function ensureManualIncludedBaseEnrollment(env, uid, sourceProduct, sourceOrderId, admin, note) {
    const baseProduct = getIncludedBaseProductForManualGrant(sourceProduct.productId);
    if (!baseProduct) return null;
    const enrollmentId = uid + '_' + baseProduct.courseId;
    const existingEnrollment = await firestoreGet(env, firestoreDocumentPath(env, 'enrollments', enrollmentId)).catch((error) => error.status === 404 ? null : Promise.reject(error));
    if (existingEnrollment) {
        const existing = fromFirestoreFields(existingEnrollment.fields || {});
        if (isFirestoreEnrollmentActiveRecord(existing)) return { ...existing, enrollmentId, alreadyActive: true };
    }
    const nowIso = new Date().toISOString();
    const startsAt = nowIso;
    const accessStatus = 'active';
    const expiresAt = new Date(Date.now() + (getCourseProduct(baseProduct.courseId)?.durationDays || DUI_COURSE_PRODUCT.durationDays) * 24 * 60 * 60 * 1000).toISOString();
    const record = {
        enrollmentId,
        userId: uid,
        uid,
        courseId: baseProduct.courseId,
        categoryId: baseProduct.categoryId,
        productId: baseProduct.productId,
        planId: baseProduct.planId || null,
        productTitle: baseProduct.title,
        courseTitle: baseProduct.courseTitle,
        paymentId: null,
        orderId: null,
        purchasedAt: startsAt,
        startsAt,
        accessStartsAt: startsAt,
        expiresAt,
        accessEndsAt: expiresAt,
        paymentStatus: null,
        sourceType: 'MANUAL',
        status: accessStatus,
        isActive: accessStatus === 'active',
        enrollmentStatus: accessStatus,
        accessStatus,
        progress: 0,
        completedLessons: 0,
        totalLessons: baseProduct.totalLessons,
        certificateIssued: false,
        certificateIssuedAt: null,
        adminGranted: true,
        includedWithProductId: sourceProduct.productId,
        includedWithEnrollmentId: sourceOrderId,
        includedWithOrderId: null,
        adminGrantReason: note || '심화이수과정 수동 지급에 포함된 기본 수료과정 수강권',
        grantedBy: admin.email || admin.uid,
        createdAt: nowIso,
        updatedAt: nowIso
    };
    await firestorePatch(env, firestoreDocumentPath(env, 'enrollments', enrollmentId), record);
    await mirrorManualEnrollmentToUser(env, uid, baseProduct.courseId, record);
    await savePaymentLog(env, record.enrollmentId, {
        type: 'admin_manual_included_base_enrollment_granted',
        paymentId: null,
        orderId: record.enrollmentId,
        userId: uid,
        uid,
        courseId: baseProduct.courseId,
        productId: baseProduct.productId,
        includedWithProductId: sourceProduct.productId,
        grantedBy: admin.email || admin.uid,
        note: note || null,
        createdAt: nowIso,
        created_at: nowIso
    }).catch((error) => console.error(error));
    return record;
}

async function handleAdminEnrollmentGrant(request, env, corsHeaders) {
    let admin;
    try {
        admin = await requireFirebaseAdmin(request, env);
    } catch (error) {
        return json({ message: error.message || '관리자 권한이 없습니다.', code: 'ADMIN_FORBIDDEN' }, error.status || 403, corsHeaders);
    }

    const body = await request.json().catch(() => null);
    const uid = String(body?.uid || '').trim();
    const productId = String(body?.productId || 'basic').trim();
    const requestedCourseId = String(body?.courseId || '').trim();
    const requestedCategoryId = String(body?.categoryId || '').trim();
    const requestedUserEmail = String(body?.userEmail || body?.email || body?.customerEmail || '').trim().toLowerCase();
    const note = String(body?.note || body?.adminMemo || '').trim();
    const grantType = 'MANUAL';
    const grantReason = note || '관리자 수동 수강권 지급';
    const requestedStartsAt = body?.startsAt ? new Date(String(body.startsAt)).toISOString() : null;
    const requestedExpiresAt = body?.expiresAt ? new Date(String(body.expiresAt)).toISOString() : null;
    const requestedActive = body?.active !== false;
    const product = getApplicationProductForPayment(productId);
    const amount = typeof body?.amount === 'number' ? body.amount : product?.amount;

    if (!uid || !product) {
        return json({ message: '사용자 ID 또는 수강권 상품 정보가 올바르지 않습니다.', code: 'INVALID_REQUEST' }, 400, corsHeaders);
    }
    if ((requestedCourseId && requestedCourseId !== product.courseId) || (requestedCategoryId && requestedCategoryId !== product.categoryId)) {
        return json({ message: '선택한 교육 종류와 상품 등급이 일치하지 않습니다. 다시 선택해 주세요.', code: 'PRODUCT_COURSE_MISMATCH' }, 400, corsHeaders);
    }

    const courseId = product.courseId;
    const categoryId = product.categoryId;
    const enrollmentId = uid + '_' + courseId;
    const existingEnrollment = await firestoreGet(env, firestoreDocumentPath(env, 'enrollments', enrollmentId)).catch((error) => error.status === 404 ? null : Promise.reject(error));
    if (existingEnrollment) {
        const existing = fromFirestoreFields(existingEnrollment.fields || {});
        const existingExpiresAt = existing.expiresAt ? new Date(existing.expiresAt).getTime() : 0;
        if (isFirestoreEnrollmentActiveRecord(existing)) {
            const duplicateResolution = String(body?.duplicateResolution || 'keep').trim();
            const existingIsManual = isManualLikeEnrollment(existing);
            if (duplicateResolution === 'extend') {
                const nowIso = new Date().toISOString();
                const extensionDays = Number(body?.extensionDays || getCourseProduct(courseId)?.durationDays || DUI_COURSE_PRODUCT.durationDays);
                const extensionBase = existingExpiresAt > Date.now() ? existingExpiresAt : Date.now();
                const expiresAt = new Date(extensionBase + Math.max(1, extensionDays) * 24 * 60 * 60 * 1000).toISOString();
                const patch = { expiresAt, accessEndsAt: expiresAt, updatedAt: nowIso, extendedAt: nowIso, extendedBy: admin.email || admin.uid, adminUpdateReason: note || '중복 수강권 부여 요청에 따른 기간 연장', ...(requestedUserEmail ? { userEmail: requestedUserEmail, email: requestedUserEmail } : {}), ...(existingIsManual ? getManualEnrollmentCompatibilityPatch(admin, note, nowIso) : {}) };
                await firestorePatch(env, firestoreDocumentPath(env, 'enrollments', enrollmentId), patch);
                if (existingIsManual) await mirrorManualEnrollmentToUser(env, uid, courseId, { ...existing, ...patch, uid, userId: uid, courseId, enrollmentId });
                await saveAdminAuditLog(env, request, admin, 'enrollment.extend', 'enrollments', enrollmentId, existing, patch, note || '중복 수강권 기간 연장');
                return json({ ok: true, message: '기존 수강권 기간을 연장했습니다.', enrollmentId, expiresAt, accessStatus: 'active' }, 200, corsHeaders);
            }
            if (existingIsManual || duplicateResolution === 'keep') {
                const nowIso = new Date().toISOString();
                const patch = { ...(existingIsManual ? getManualEnrollmentCompatibilityPatch(admin, note, nowIso) : { updatedAt: nowIso }), ...(requestedUserEmail ? { userEmail: requestedUserEmail, email: requestedUserEmail } : {}) };
                if (existingIsManual) {
                    await firestorePatch(env, firestoreDocumentPath(env, 'enrollments', enrollmentId), patch);
                    await mirrorManualEnrollmentToUser(env, uid, courseId, { ...existing, ...patch, uid, userId: uid, courseId, enrollmentId });
                }
                await saveAdminAuditLog(env, request, admin, 'enrollment.keep', 'enrollments', enrollmentId, existing, patch, note || '기존 활성 수강권 유지');
                return json({ ok: true, message: '이미 활성화된 수강권을 확인했고 표시 정보를 보정했습니다.', enrollmentId, courseId, productId, expiresAt: existing.expiresAt || null, accessStatus: 'active', alreadyActive: true }, 200, corsHeaders);
            }
            return json({ ok: false, message: '이미 활성화된 수강권이 있습니다. 기존 수강권 유지, 기간 연장, 교체 중 하나를 선택해 주세요.', code: 'ACTIVE_ENROLLMENT_EXISTS', enrollmentId, orderId: existing.orderId || existing.paymentId || null, expiresAt: existing.expiresAt || null, accessStatus: 'active', choices: ['keep', 'extend', 'replace'] }, 409, corsHeaders);
        }
    }

    const nowIso = new Date().toISOString();
    const startsAt = requestedStartsAt || nowIso;
    const expiresAt = requestedExpiresAt || new Date(new Date(startsAt).getTime() + (getCourseProduct(courseId)?.durationDays || DUI_COURSE_PRODUCT.durationDays) * 24 * 60 * 60 * 1000).toISOString();
    if (!Number.isFinite(new Date(startsAt).getTime()) || !Number.isFinite(new Date(expiresAt).getTime()) || new Date(expiresAt).getTime() <= new Date(startsAt).getTime()) {
        return json({ message: '수강 시작일 또는 종료일이 올바르지 않습니다.', code: 'INVALID_ACCESS_PERIOD' }, 400, corsHeaders);
    }
    const accessStatus = requestedActive ? 'active' : 'pending';
    const manualGrantId = 'manual_' + Date.now().toString(36) + '_' + enrollmentId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 32);

    const enrollmentRecord = {
        enrollmentId,
        userId: uid,
        uid,
        courseId,
        categoryId,
        productId,
        planId: product.planId || null,
        productTitle: product.title,
        courseTitle: product.courseTitle,
        paymentId: null,
        orderId: null,
        purchasedAt: startsAt,
        startsAt,
        accessStartsAt: startsAt,
        expiresAt,
        accessEndsAt: expiresAt,
        paymentStatus: null,
        sourceType: grantType,
        grantType,
        issueType: grantType,
        manualGrant: true,
        grantReason: 'ADMIN_MANUAL',
        status: accessStatus,
        isActive: accessStatus === 'active',
        enrollmentStatus: accessStatus,
        accessStatus,
        progress: 0,
        completedLessons: 0,
        totalLessons: product.totalLessons,
        certificateIssued: false,
        certificateIssuedAt: null,
        adminGranted: true,
        adminGrantReason: grantReason,
        adminMemo: note || '',
        grantedBy: admin.email || admin.uid,
        grantedByAdminId: admin.uid || '',
        grantedByAdminName: admin.name || admin.email || admin.uid,
        grantedAt: nowIso,
        createdAt: nowIso,
        updatedAt: nowIso
    };
    let savedEnrollment = null;
    let includedBaseEnrollment = null;
    const grantAuditRecord = {
        manualGrantId,
        enrollmentId,
        uid,
        userId: uid,
        userEmail: requestedUserEmail || null,
        email: requestedUserEmail || null,
        courseId,
        courseTitle: product.courseTitle,
        categoryId,
        productId,
        planId: product.planId || null,
        productTitle: product.title,
        sourceType: grantType,
        grantType,
        issueType: grantType,
        manualGrant: true,
        grantReason: 'ADMIN_MANUAL',
        status: accessStatus,
        isActive: accessStatus === 'active',
        startsAt,
        expiresAt,
        adminMemo: note || '',
        grantedBy: admin.email || admin.uid,
        grantedByAdminId: admin.uid || '',
        grantedByAdminName: admin.name || admin.email || admin.uid,
        grantedAt: nowIso,
        createdAt: nowIso,
        updatedAt: nowIso
    };

    try {
        savedEnrollment = await grantCourseAccess(env, { ...enrollmentRecord, canonicalCourseId: courseId, source: 'manual', grantedBy: admin.email || admin.uid, grantedByAdminId: admin.uid || '' });
        await firestorePatch(env, firestoreDocumentPath(env, 'adminManualEnrollmentGrants', manualGrantId), { ...grantAuditRecord, enrollmentId: savedEnrollment.enrollmentId || enrollmentId, courseId: savedEnrollment.courseId || courseId, canonicalCourseId: savedEnrollment.canonicalCourseId || savedEnrollment.courseId || courseId });
        await firestorePatch(env, firestoreDocumentPath(env, 'refundPolicies', savedEnrollment.courseId || courseId), buildRefundPolicyRecord(nowIso, getCourseProduct(savedEnrollment.courseId || courseId)));
        await savePaymentLog(env, manualGrantId, {
            type: 'admin_manual_enrollment_granted',
            paymentId: null,
            orderId: null,
            manualGrantId,
            user_id: uid,
            userId: uid,
            uid,
            product_id: productId,
            productId,
            requested_amount: amount ?? product.amount,
            amount: amount ?? product.amount,
            approval_status: accessStatus,
            payment_method: 'admin_manual',
            grantedBy: admin.email || admin.uid,
            note: note || null,
            created_at: nowIso,
            createdAt: nowIso
        });
        includedBaseEnrollment = await ensureManualIncludedBaseEnrollment(env, uid, product, savedEnrollment.enrollmentId || enrollmentId, admin, note);
        const verifiedCourseId = resolveCanonicalCourseId(savedEnrollment || {}) || savedEnrollment?.courseId || courseId;
        const accessDecision = getEnrollmentAccessDecision(savedEnrollment, uid, verifiedCourseId);
        if (!accessDecision.allowed) {
            throw new Error('수강권은 저장됐지만 강의 접근 검증에 실패했습니다: ' + accessDecision.reason);
        }
        await saveAdminAuditLog(env, request, admin, 'enrollment.grant', 'enrollments', savedEnrollment.enrollmentId || enrollmentId, null, { ...savedEnrollment, includedBaseEnrollment, accessDecision }, grantReason);
    } catch (error) {
        await savePaymentLog(env, manualGrantId, {
            type: 'admin_manual_enrollment_failed',
            paymentId: null,
            orderId: null,
            manualGrantId,
            user_id: uid,
            userId: uid,
            uid,
            product_id: productId,
            productId,
            error_stack: error instanceof Error ? error.stack || error.message : String(error),
            grantedBy: admin.email || admin.uid,
            created_at: new Date().toISOString(),
            createdAt: new Date().toISOString()
        }).catch((logError) => console.error(logError));
        return json({ message: '수강권 수동 지급 중 저장 오류가 발생했습니다.', code: 'MANUAL_GRANT_FAILED' }, 500, corsHeaders);
    }

    return json({
        ok: true,
        message: '수강권이 수동 지급되었습니다.',
        uid,
        orderId: null,
        manualGrantId,
        enrollmentId: savedEnrollment?.enrollmentId || enrollmentId,
        courseId: savedEnrollment?.courseId || courseId,
        canonicalCourseId: savedEnrollment?.canonicalCourseId || savedEnrollment?.courseId || courseId,
        productId: savedEnrollment?.productId || productId,
        expiresAt: savedEnrollment?.expiresAt || expiresAt,
        accessStatus: savedEnrollment?.accessStatus || accessStatus,
        enrollment: savedEnrollment,
        includedBaseEnrollment,
        accessVerified: true
    }, 200, corsHeaders);
}

async function handleAdminEnrollmentUpdate(request, env, corsHeaders) {
    let admin;
    try {
        admin = await requireFirebaseAdmin(request, env);
    } catch (error) {
        return json({ message: error.message || "관리자 권한이 없습니다.", code: "ADMIN_FORBIDDEN" }, error.status || 403, corsHeaders);
    }

    const body = await request.json().catch(() => null);
    const uid = String(body?.uid || "").trim();
    const courseId = String(body?.courseId || "").trim();
    const action = String(body?.action || "").trim();
    const reason = String(body?.reason || body?.note || "").trim();
    if (!uid || !courseId || !action || !reason) {
        return json({ message: "uid, courseId, action, reason이 필요합니다.", code: "MISSING_FIELDS" }, 400, corsHeaders);
    }

    const requestedEnrollmentId = String(body?.enrollmentId || body?.id || "").trim();
    const fallbackEnrollmentId = uid + "_" + courseId;
    const candidateEnrollmentIds = Array.from(new Set([requestedEnrollmentId, fallbackEnrollmentId].filter(isSafeFirestoreDocumentId)));
    let enrollmentId = "";
    let enrollmentPath = "";
    let existingRaw = null;
    let before = null;
    for (const candidateEnrollmentId of candidateEnrollmentIds) {
        const candidatePath = firestoreDocumentPath(env, "enrollments", candidateEnrollmentId);
        const candidateRaw = await firestoreGet(env, candidatePath).catch((error) => error.status === 404 ? null : Promise.reject(error));
        if (!candidateRaw) continue;
        const candidate = fromFirestoreFields(candidateRaw.fields || {});
        const candidateUid = String(candidate.uid || candidate.userId || uid).trim();
        const candidateCourseId = resolveCanonicalCourseId(candidate) || candidate.courseId || courseId;
        if (candidateUid !== uid || candidateCourseId !== courseId) {
            return json({ message: "요청한 수강권 ID가 선택한 회원 또는 과정과 일치하지 않습니다.", code: "ENROLLMENT_TARGET_MISMATCH" }, 409, corsHeaders);
        }
        enrollmentId = candidateEnrollmentId;
        enrollmentPath = candidatePath;
        existingRaw = candidateRaw;
        before = candidate;
        break;
    }
    if (!existingRaw || !before) return json({ message: "수강권을 찾을 수 없습니다.", code: "ENROLLMENT_NOT_FOUND" }, 404, corsHeaders);
    const product = getCourseProduct(courseId) || getCourseProduct(before.courseId) || null;
    if ((action === "extend" || action === "complete") && !product) return json({ message: "지원하지 않는 교육과정입니다.", code: "INVALID_COURSE" }, 400, corsHeaders);
    const nowIso = new Date().toISOString();
    let patch = { updatedAt: nowIso, updatedBy: admin.email || admin.uid, adminUpdateReason: reason };
    let includedBasePatch = null;
    let includedBaseEnrollmentId = null;

    if (action === "resetProgress") {
        return json({ message: "진도 초기화는 운영 데이터 보호 정책상 비활성화되어 있습니다.", code: "PROGRESS_RESET_DISABLED" }, 400, corsHeaders);
    }

    if (action === "extend") {
        const baseTime = before.expiresAt ? new Date(before.expiresAt).getTime() : Date.now();
        const extensionDays = Number(body?.extensionDays || 0);
        const explicitExpiresAt = body?.expiresAt ? new Date(String(body.expiresAt)).toISOString() : null;
        const expiresAt = explicitExpiresAt || new Date(Math.max(baseTime, Date.now()) + Math.max(1, extensionDays || 30) * 24 * 60 * 60 * 1000).toISOString();
        patch = { ...patch, expiresAt, accessStatus: "active", enrollmentStatus: "active", extendedAt: nowIso, extendedBy: admin.email || admin.uid };
    } else if (action === "revoke") {
        patch = { ...patch, status: "cancelled", accessStatus: "cancelled", enrollmentStatus: "cancelled", isActive: false, active: false, revokedAt: nowIso, revokedBy: admin.email || admin.uid, revokeReason: reason };
        if (body?.revokeIncludedBase !== false) {
            const includedBaseProduct = getIncludedBaseProductForManualGrant(before.productId);
            if (includedBaseProduct?.courseId && includedBaseProduct.courseId !== courseId) {
                const baseEnrollmentId = uid + "_" + includedBaseProduct.courseId;
                const basePath = firestoreDocumentPath(env, "enrollments", baseEnrollmentId);
                const baseRaw = await firestoreGet(env, basePath).catch((error) => error.status === 404 ? null : Promise.reject(error));
                if (baseRaw) {
                    const baseBefore = fromFirestoreFields(baseRaw.fields || {});
                    const linkedToRevokedEnrollment = baseBefore.includedWithEnrollmentId === enrollmentId || baseBefore.includedWithProductId === before.productId;
                    if (linkedToRevokedEnrollment && isFirestoreEnrollmentActiveRecord(baseBefore)) {
                        includedBaseEnrollmentId = baseEnrollmentId;
                        includedBasePatch = { status: "cancelled", accessStatus: "cancelled", enrollmentStatus: "cancelled", isActive: false, active: false, revokedAt: nowIso, revokedBy: admin.email || admin.uid, revokeReason: "심화이수과정 회수에 따른 포함 기본 수료과정 회수: " + reason, updatedAt: nowIso, updatedBy: admin.email || admin.uid, adminUpdateReason: reason };
                        await firestorePatch(env, basePath, includedBasePatch);
                        await patchExistingNestedEnrollment(env, uid, includedBaseProduct.courseId, { ...includedBasePatch, enrollmentId: baseEnrollmentId });
                        if (isManualLikeEnrollment(baseBefore)) await mirrorManualEnrollmentToUser(env, uid, includedBaseProduct.courseId, { ...baseBefore, ...includedBasePatch, uid, userId: uid, courseId: includedBaseProduct.courseId, enrollmentId: baseEnrollmentId });
                        await saveAdminAuditLog(env, request, admin, "enrollment.revokeIncludedBase", "enrollments", baseEnrollmentId, baseBefore, includedBasePatch, reason);
                    }
                }
            }
        }
    } else if (action === "complete") {
        patch = { ...patch, progress: 100, completedLessons: product.totalLessons, totalLessons: product.totalLessons, completedAt: body?.completedAt || nowIso, completionForcedBy: admin.email || admin.uid, completionForcedAt: nowIso };
        await firestorePatch(env, firestoreDocumentPath(env, "courseProgress", enrollmentId), {
            uid, userId: uid, courseId, courseTitle: before.courseTitle || product.courseTitle,
            completionRate: 100, completedModuleCount: product.totalLessons, totalModuleCount: product.totalLessons,
            isCompleted: true, completedAt: patch.completedAt, updatedAt: nowIso, adminUpdated: true
        });
    } else {
        return json({ message: "지원하지 않는 작업입니다.", code: "INVALID_ACTION" }, 400, corsHeaders);
    }

    await firestorePatch(env, enrollmentPath, patch);
    if (action === "revoke") await patchExistingNestedEnrollment(env, uid, courseId, { ...patch, enrollmentId });
    if (action === "revoke" && isManualLikeEnrollment(before)) await mirrorManualEnrollmentToUser(env, uid, courseId, { ...before, ...patch, uid, userId: uid, courseId, enrollmentId });
    await saveAdminAuditLog(env, request, admin, "enrollment." + action, "enrollments", enrollmentId, before, patch, reason);
    await savePaymentLog(env, enrollmentId, { type: "admin_enrollment_" + action, uid, userId: uid, courseId, beforeValue: before, afterValue: patch, includedBaseEnrollmentId, includedBasePatch, reason, processedBy: admin.email || admin.uid, createdAt: nowIso, created_at: nowIso }).catch((error) => console.error(error));
    return json({ ok: true, enrollmentId, action, updated: patch, includedBaseEnrollmentId, includedBaseUpdated: includedBasePatch, message: action === "revoke" ? "수강권을 회수했습니다." : "수강권 변경사항이 저장되었습니다." }, 200, corsHeaders);
}

function getActiveEnrollmentCount(enrollments) {
    return enrollments.filter((row) => isFirestoreEnrollmentActiveRecord(row)).length;
}

function getCollectionHealthCounts(rows) {
    return {
        users: rows.users.length,
        orders: rows.orders.length,
        payments: rows.payments.length,
        purchases: rows.purchases.length,
        enrollments: rows.enrollments.length,
        activeEnrollments: getActiveEnrollmentCount(rows.enrollments),
        courseProgress: rows.courseProgress.length,
        certificates: rows.certificates.length
    };
}

async function loadOperationalCollections(env, options = {}) {
    const pageSize = Math.max(1, Math.min(Number(options.pageSize || env.ADMIN_OPERATIONAL_SCAN_LIMIT || 50), 100));
    const [users, orders, payments, purchases, enrollments, courseProgress, certificates] = await Promise.all([
        firestoreListLimited(env, 'users', { pageSize, orderBy: 'createdAt desc' }).catch(() => []),
        firestoreListLimited(env, 'orders', { pageSize, orderBy: 'createdAt desc' }).catch(() => []),
        firestoreListLimited(env, 'payments', { pageSize, orderBy: 'createdAt desc' }).catch(() => []),
        firestoreListLimited(env, 'purchases', { pageSize, orderBy: 'createdAt desc' }).catch(() => []),
        firestoreListLimited(env, 'enrollments', { pageSize, orderBy: 'createdAt desc' }).catch(() => []),
        firestoreListLimited(env, 'courseProgress', { pageSize, orderBy: 'updatedAt desc' }).catch(() => []),
        firestoreListLimited(env, 'certificates', { pageSize, orderBy: 'createdAt desc' }).catch(() => [])
    ]);
    return { users, orders, payments, purchases, enrollments, courseProgress, certificates, scanLimited: true, scanLimit: pageSize };
}

function buildOperationalMetadata(env) {
    return {
        deploymentVersion: env.DEPLOYMENT_VERSION || env.CF_VERSION_METADATA?.id || null,
        environment: getRuntimeEnvironment(env),
        firebaseProjectId: getFirestoreProjectId(env),
        expectedFirebaseProjectId: env.EXPECTED_FIREBASE_PROJECT_ID || PRODUCTION_FIREBASE_PROJECT_ID,
        hostingEnvironment: env.HOSTING_ENVIRONMENT || 'cloudflare-workers',
        buildTime: env.BUILD_TIME || null,
        checkedAt: new Date().toISOString()
    };
}

async function handleAdminDataHealth(request, env, corsHeaders) {
    let admin;
    try {
        admin = await requireFirebaseAdmin(request, env);
    } catch (error) {
        return json({ message: error.message || '관리자 권한이 없습니다.', code: 'ADMIN_FORBIDDEN' }, error.status || 403, corsHeaders);
    }
    try {
        assertProductionFirestoreProject(env, 'HEALTH_CHECK');
        const rows = await loadOperationalCollections(env);
        const metadata = buildOperationalMetadata(env);
        const counts = { ...getCollectionHealthCounts(rows), scanLimited: rows.scanLimited === true, scanLimit: rows.scanLimit || null };
        const snapshotId = 'health_' + Date.now();
        await firestorePatch(env, firestoreDocumentPath(env, 'adminAuditLogs', snapshotId), {
            actionType: 'DATA_HEALTH_CHECK',
            adminId: admin.uid || null,
            counts,
            ...metadata,
            createdAt: metadata.checkedAt
        }).catch((error) => console.error(error));
        return json({ ok: true, metadata, counts }, 200, corsHeaders);
    } catch (error) {
        await firestorePatch(env, firestoreDocumentPath(env, 'adminAuditLogs', 'health_failed_' + Date.now()), {
            actionType: 'DATA_HEALTH_CHECK_FAILED',
            adminId: admin.uid || null,
            message: error instanceof Error ? error.message : String(error),
            ...buildOperationalMetadata(env),
            createdAt: new Date().toISOString()
        }).catch((logError) => console.error(logError));
        return json({ ok: false, message: error instanceof Error ? error.message : '데이터 health check 실패', code: error.code || 'DATA_HEALTH_CHECK_FAILED' }, error.status || 500, corsHeaders);
    }
}

function getSafeIssueRepairAction(issue) {
    if (issue?.type === 'paid_without_enrollment' && issue.paymentId && issue.uid && issue.courseId && getCourseProduct(issue.courseId)) return 'RESTORE_PAYMENT_ENROLLMENT';
    if (issue?.type === 'manual_inactive_or_denied' && issue.enrollmentId && issue.uid && issue.courseId && getCourseProduct(issue.courseId)) return 'RESTORE_MANUAL_ENROLLMENT';
    return null;
}

function isPaidOperationalRecord(row) {
    return ['paid', 'done', 'completed', 'approved', 'success'].includes(String(row.paymentStatus || row.status || row.orderStatus || '').toLowerCase());
}

function getPaidRecordKey(row) {
    return row.paymentId || row.orderId || row.paymentKey || row.id || null;
}

function buildRestoredEnrollmentFromPaidRecord(row, admin, sourceCollection) {
    const uid = row.uid || row.userId;
    const courseId = row.courseId;
    if (!uid || !courseId || !getCourseProduct(courseId)) return null;
    const productId = row.productId || resolveApplicationProductIdFromRecord(row);
    const product = APPLICATION_PRODUCTS[productId] || getCourseProduct(courseId);
    const approvedAt = row.approvedAt || row.purchasedAt || row.orderedAt || row.paidAt || row.createdAt || new Date().toISOString();
    const purchasedAt = new Date(approvedAt);
    const expiresAt = row.expiresAt || new Date(purchasedAt.getTime() + (getCourseProduct(courseId).durationDays || DUI_COURSE_PRODUCT.durationDays) * 24 * 60 * 60 * 1000).toISOString();
    const paymentKey = getPaidRecordKey(row);
    const nowIso = new Date().toISOString();
    const enrollmentId = uid + '_' + courseId;
    return {
        enrollmentId, userId: uid, uid, courseId,
        categoryId: row.categoryId || product.categoryId || null,
        productId: productId || row.productId || null,
        productTitle: row.productTitle || product.title || null,
        courseTitle: row.courseTitle || product.courseTitle || getCourseProduct(courseId).courseTitle,
        amount: row.amount ?? null,
        paymentId: row.paymentId || row.paymentKey || row.id || paymentKey,
        orderId: row.orderId || row.paymentId || row.id || paymentKey,
        sourceType: 'PAYMENT',
        paymentStatus: 'paid',
        status: 'active',
        isActive: true,
        enrollmentStatus: 'active',
        accessStatus: 'active',
        startsAt: row.startsAt || row.purchasedAt || approvedAt,
        accessStartsAt: row.startsAt || row.purchasedAt || approvedAt,
        purchasedAt: row.purchasedAt || approvedAt,
        expiresAt,
        accessEndsAt: expiresAt,
        progress: 0,
        completedLessons: 0,
        totalLessons: product.totalLessons || getCourseProduct(courseId).totalLessons,
        certificateIssued: Boolean(row.certificateIssued),
        certificateIssuedAt: row.certificateIssuedAt || null,
        recoveredFrom: sourceCollection || row.recordSource || 'paid_operational_record',
        restoredByAdminId: admin?.uid || null,
        restoredAt: nowIso,
        createdAt: row.createdAt || nowIso,
        updatedAt: nowIso
    };
}

async function restoreEnrollmentFromPaidRecord(env, row, admin, request, sourceCollection) {
    const record = buildRestoredEnrollmentFromPaidRecord(row, admin, sourceCollection);
    if (!record) throw new Error('userId/courseId가 명확하지 않아 자동 복구할 수 없습니다.');
    const saved = await grantCourseAccess(env, { ...record, canonicalCourseId: record.courseId, source: 'migration', restoredByAdminId: admin?.uid || null });
    await saveAdminAuditLog(env, request, admin, 'enrollment.restore.payment', 'enrollments', record.enrollmentId, null, saved, '결제완료 수강권 자동 복구');
    return saved;
}

async function restoreEnrollmentFromPayment(env, issue, admin, request) {
    const payment = await firestoreGetData(env, 'payments', issue.paymentId).catch((error) => error.status === 404 ? null : Promise.reject(error));
    if (!payment) throw new Error('복구할 결제 문서를 찾을 수 없습니다.');
    return restoreEnrollmentFromPaidRecord(env, payment, admin, request, 'payments');
}

async function restoreManualEnrollment(env, issue, admin, request) {
    const enrollmentId = issue.enrollmentId || (issue.uid + '_' + issue.courseId);
    const existing = await firestoreGetData(env, 'enrollments', enrollmentId).catch((error) => error.status === 404 ? null : Promise.reject(error));
    if (!existing) throw new Error('복구할 수동 수강권을 찾을 수 없습니다.');
    if (!existing.courseId && !issue.courseId) throw new Error('courseId가 없어 자동 복구할 수 없습니다.');
    const courseId = existing.courseId || issue.courseId;
    const product = getCourseProduct(courseId);
    if (!product) throw new Error('존재하지 않는 courseId는 자동 복구할 수 없습니다.');
    const nowIso = new Date().toISOString();
    const patch = {
        courseId,
        sourceType: 'MANUAL',
        paymentId: null,
        orderId: null,
        paymentStatus: null,
        status: 'active',
        isActive: true,
        enrollmentStatus: 'active',
        accessStatus: 'active',
        startsAt: existing.startsAt || existing.accessStartsAt || existing.grantedAt || existing.createdAt || nowIso,
        expiresAt: existing.expiresAt || existing.accessEndsAt || new Date(Date.now() + product.durationDays * 24 * 60 * 60 * 1000).toISOString(),
        restoredByAdminId: admin.uid || null,
        restoredAt: nowIso,
        updatedAt: nowIso
    };
    const saved = await grantCourseAccess(env, { ...existing, ...patch, uid, canonicalCourseId: courseId, source: 'manual', grantedBy: existing.grantedBy || admin.email || admin.uid, grantedByAdminId: existing.grantedByAdminId || admin.uid || null });
    await saveAdminAuditLog(env, request, admin, 'enrollment.restore.manual', 'enrollments', enrollmentId, existing, saved, '수동 수강권 접근 복구');
    return { ...saved, enrollmentId };
}

async function handleAdminIntegrityRepair(request, env, corsHeaders) {
    let admin;
    try {
        admin = await requireFirebaseAdmin(request, env);
    } catch (error) {
        return json({ message: error.message || '관리자 권한이 없습니다.', code: 'ADMIN_FORBIDDEN' }, error.status || 403, corsHeaders);
    }
    const body = await request.json().catch(() => null);
    const issue = body?.issue || body;
    const confirm = String(body?.confirm || '').trim();
    const action = getSafeIssueRepairAction(issue);
    if (!action) return json({ message: '이 항목은 자동 복구 대상이 아닙니다. courseId와 결제/수강권 정보를 관리자 확인 목록에서 점검해 주세요.', code: 'UNSAFE_REPAIR' }, 400, corsHeaders);
    if (confirm !== 'REPAIR') return json({ message: '복구 전 확인값 REPAIR가 필요합니다.', code: 'CONFIRMATION_REQUIRED' }, 400, corsHeaders);
    try {
        const restored = action === 'RESTORE_PAYMENT_ENROLLMENT'
            ? await restoreEnrollmentFromPayment(env, issue, admin, request)
            : await restoreManualEnrollment(env, issue, admin, request);
        return json({ ok: true, action, restored }, 200, corsHeaders);
    } catch (error) {
        return json({ ok: false, message: error instanceof Error ? error.message : '복구 중 오류가 발생했습니다.', code: 'REPAIR_FAILED' }, 500, corsHeaders);
    }
}

async function handleAdminIntegrityRepairAll(request, env, corsHeaders) {
    let admin;
    try {
        admin = await requireFirebaseAdmin(request, env);
    } catch (error) {
        return json({ message: error.message || '관리자 권한이 없습니다.', code: 'ADMIN_FORBIDDEN' }, error.status || 403, corsHeaders);
    }
    const body = await request.json().catch(() => null);
    const dryRun = body?.dryRun === true;
    if (!dryRun && String(body?.confirm || '').trim() !== 'RESTORE_PAID_ENROLLMENTS') {
        return json({ message: '복구 전 확인값 RESTORE_PAID_ENROLLMENTS가 필요합니다.', code: 'CONFIRMATION_REQUIRED' }, 400, corsHeaders);
    }

    const rows = await loadOperationalCollections(env);
    const usersByUid = new Map(rows.users.map((row) => [row.uid || row.userId || row.id, row]));
    const enrollments = rows.enrollments;
    const enrollmentByUserCourse = new Map(enrollments.map((row) => [(row.uid || row.userId) + '_' + row.courseId, row]));
    const paidRecords = [
        ...rows.orders.map((row) => ({ ...row, sourceCollection: 'orders' })),
        ...rows.payments.map((row) => ({ ...row, sourceCollection: 'payments' })),
        ...rows.purchases.map((row) => ({ ...row, sourceCollection: 'purchases' }))
    ];
    const summary = {
        totalPaymentRecords: paidRecords.length,
        paidPaymentRecords: 0,
        cancelledOrRefundedRecords: 0,
        alreadyValidEnrollments: 0,
        recoveryTargetUsers: 0,
        recoveryTargetEnrollments: 0,
        uidMissingCount: 0,
        courseMappingMissingCount: 0,
        duplicatePreventedCount: 0,
        failedCount: 0
    };
    const seen = new Set();
    const targetUsers = new Set();
    const candidates = [];
    const skipped = [];
    for (const row of paidRecords) {
        const paymentKey = getPaidRecordKey(row);
        if (isCancelledOrRefundedOperationalRecord(row)) {
            summary.cancelledOrRefundedRecords += 1;
            skipped.push({ reason: 'CANCELLED_OR_REFUNDED', paymentId: paymentKey, uid: row.uid || row.userId || null, courseId: row.courseId || null, sourceCollection: row.sourceCollection });
            continue;
        }
        if (!isRestorablePaidOperationalRecord(row)) continue;
        summary.paidPaymentRecords += 1;
        const uid = row.uid || row.userId;
        const courseId = resolveCanonicalCourseId(row);
        if (!uid) {
            summary.uidMissingCount += 1;
            skipped.push({ reason: 'UID_NOT_FOUND', paymentId: paymentKey, uid: null, courseId, sourceCollection: row.sourceCollection });
            continue;
        }
        if (!courseId || !getCourseProduct(courseId)) {
            summary.courseMappingMissingCount += 1;
            skipped.push({ reason: 'COURSE_ID_NOT_FOUND', paymentId: paymentKey, uid, courseId: row.courseId || null, productId: row.productId || null, sourceCollection: row.sourceCollection });
            continue;
        }
        const key = uid + '_' + courseId;
        if (seen.has(key)) {
            summary.duplicatePreventedCount += 1;
            continue;
        }
        seen.add(key);
        if (isFirestoreEnrollmentActiveRecord(enrollmentByUserCourse.get(key))) {
            summary.alreadyValidEnrollments += 1;
            continue;
        }
        const record = buildRestoredEnrollmentFromPaidRecord({ ...row, courseId }, admin, row.sourceCollection);
        if (record) {
            targetUsers.add(uid);
            candidates.push({ row: { ...row, courseId }, record, user: usersByUid.get(uid) || null });
        }
    }
    summary.recoveryTargetUsers = targetUsers.size;
    summary.recoveryTargetEnrollments = candidates.length;

    const candidateRows = candidates.map(({ row, record, user }) => ({
        userName: user?.realName || user?.fullName || row.userName || row.customerName || '',
        userEmail: user?.email || row.email || row.customerEmail || '',
        uid: record.uid,
        paymentId: record.paymentId,
        orderId: record.orderId,
        paidAt: row.approvedAt || row.purchasedAt || row.paidAt || row.createdAt || null,
        amount: record.amount,
        productName: record.productTitle || record.courseTitle,
        canonicalCourseId: record.courseId,
        sourceCollection: row.sourceCollection,
        result: dryRun ? 'DRY_RUN_RESTORE_TARGET' : 'PENDING'
    }));

    if (dryRun) {
        return json({ ok: true, dryRun: true, summary, candidates: candidateRows, skipped }, 200, corsHeaders);
    }

    const restored = [];
    const failed = [];
    for (const item of candidates) {
        try {
            const saved = await restoreEnrollmentFromPaidRecord(env, item.row, admin, request, item.row.sourceCollection);
            restored.push({ enrollmentId: saved.enrollmentId, uid: saved.uid, courseId: saved.courseId, paymentId: saved.paymentId, sourceCollection: item.row.sourceCollection, result: 'RESTORED' });
        } catch (error) {
            summary.failedCount += 1;
            failed.push({ paymentId: getPaidRecordKey(item.row), uid: item.row.uid || item.row.userId, courseId: item.row.courseId, message: error instanceof Error ? error.message : String(error), result: 'FAILED' });
        }
    }
    await firestorePatch(env, firestoreDocumentPath(env, 'adminAuditLogs', 'bulk_restore_paid_enrollments_' + Date.now()), {
        actionType: 'ENROLLMENT_RESTORED_FROM_PAYMENTS',
        adminId: admin.uid || null,
        summary,
        restoredCount: restored.length,
        failedCount: failed.length,
        skippedCount: skipped.length,
        restored,
        failed,
        skipped,
        reason: '결제완료 문서 기준 누락 수강권 일괄 복구',
        createdAt: new Date().toISOString()
    }).catch((error) => console.error(error));
    return json({ ok: failed.length === 0, dryRun: false, summary: { ...summary, failedCount: failed.length }, restoredCount: restored.length, failedCount: failed.length, skippedCount: skipped.length, restored, failed, skipped }, failed.length ? 207 : 200, corsHeaders);
}
async function handleAdminIntegrityCheck(request, env, corsHeaders) {
    let admin;
    try {
        admin = await requireFirebaseAdmin(request, env);
    } catch (error) {
        return json({ message: error.message || "관리자 권한이 없습니다.", code: "ADMIN_FORBIDDEN" }, error.status || 403, corsHeaders);
    }
    const rows = await loadOperationalCollections(env);
    const { users, orders, payments, purchases, enrollments, courseProgress, certificates } = rows;
    const allPaymentLikeRows = [...orders, ...payments, ...purchases];
    const enrollmentByPayment = new Map(enrollments.map((row) => [row.paymentId || row.orderId, row]));
    const enrollmentByUserCourse = new Map(enrollments.map((row) => [(row.uid || row.userId) + "_" + row.courseId, row]));
    const certificateByUserCourse = new Map(certificates.map((row) => [(row.uid || row.userId) + "_" + row.courseId, row]));
    const progressByUserCourse = new Map(courseProgress.map((row) => [(row.uid || row.userId) + "_" + row.courseId, row]));
    const courseIds = new Set(Object.keys(COURSE_PRODUCTS_BY_ID));
    const issues = [];

    for (const payment of allPaymentLikeRows) {
        const status = String(payment.paymentStatus || payment.status || payment.orderStatus || "").toLowerCase();
        const key = payment.paymentId || payment.orderId || payment.id;
        const uid = payment.uid || payment.userId;
        const courseId = payment.courseId;
        const userCourseKey = uid + "_" + courseId;
        const paidLike = ["paid", "done", "completed", "approved", "success"].includes(status);
        const linkedEnrollment = enrollmentByPayment.get(key);
        if (paidLike && uid && courseId && !linkedEnrollment && !enrollmentByUserCourse.get(userCourseKey)) {
            issues.push({ type: "paid_without_enrollment", severity: "high", safeRepair: true, paymentId: key, uid, courseId, productId: payment.productId || null, amount: payment.amount ?? null });
        }
        if (paidLike && !courseId) issues.push({ type: "paid_record_missing_course_id", severity: "high", safeRepair: false, paymentId: key, uid, productId: payment.productId || null, amount: payment.amount ?? null });
        if (["cancelled", "canceled", "refunded"].includes(status) && isFirestoreEnrollmentActiveRecord(linkedEnrollment)) issues.push({ type: "cancelled_payment_active_enrollment", severity: "high", safeRepair: false, paymentId: key, uid, courseId });
        if (!paidLike && isFirestoreEnrollmentActiveRecord(linkedEnrollment)) issues.push({ type: "non_paid_payment_active_enrollment", severity: "high", safeRepair: false, paymentId: key, uid, courseId, paymentStatus: status || null, enrollmentId: linkedEnrollment.enrollmentId || linkedEnrollment.id || null });
    }

    for (const enrollment of enrollments) {
        const uid = enrollment.uid || enrollment.userId;
        const key = enrollment.paymentId || enrollment.orderId;
        const product = APPLICATION_PRODUCTS[enrollment.productId];
        const decision = getEnrollmentAccessDecision(enrollment, uid, enrollment.courseId);
        const sourceType = normalizeEnrollmentSourceType(enrollment);
        const enrollmentId = enrollment.enrollmentId || enrollment.id || (uid && enrollment.courseId ? uid + "_" + enrollment.courseId : enrollment.id);
        if (!enrollment.courseId) issues.push({ type: "enrollment_missing_course_id", severity: "high", safeRepair: false, enrollmentId, uid, productId: enrollment.productId, adminGranted: Boolean(enrollment.adminGranted), sourceType });
        if (enrollment.courseId && !courseIds.has(enrollment.courseId)) issues.push({ type: "enrollment_unknown_course_id", severity: "high", safeRepair: false, enrollmentId, uid, courseId: enrollment.courseId, productId: enrollment.productId, adminGranted: Boolean(enrollment.adminGranted), sourceType });
        if (product && enrollment.courseId && product.courseId !== enrollment.courseId) issues.push({ type: "enrollment_product_course_mismatch", severity: "high", safeRepair: false, enrollmentId, uid, courseId: enrollment.courseId, expectedCourseId: product.courseId, productId: enrollment.productId, adminGranted: Boolean(enrollment.adminGranted), sourceType });
        if ((sourceType === "MANUAL" || enrollment.adminGranted) && !decision.allowed) issues.push({ type: "manual_inactive_or_denied", severity: "high", safeRepair: Boolean(enrollment.courseId && courseIds.has(enrollment.courseId)), enrollmentId, uid, courseId: enrollment.courseId, reason: decision.reason, sourceType });
        if (sourceType === "PAYMENT" && key && !allPaymentLikeRows.find((payment) => payment.paymentId === key || payment.orderId === key || payment.id === key)) issues.push({ type: "payment_enrollment_without_payment", severity: "medium", safeRepair: false, enrollmentId, uid, courseId: enrollment.courseId, paymentId: key });
        if (enrollment.deletedAt && isFirestoreEnrollmentActiveRecord(enrollment)) issues.push({ type: "deleted_marker_active_enrollment", severity: "high", safeRepair: false, enrollmentId, uid, courseId: enrollment.courseId });
        if (enrollment.expiresAt && getEnrollmentRecordTime(enrollment.expiresAt) && getEnrollmentRecordTime(enrollment.expiresAt) < getEnrollmentRecordTime(enrollment.startsAt || enrollment.purchasedAt || enrollment.createdAt || 0)) issues.push({ type: "invalid_expiration_period", severity: "high", safeRepair: false, enrollmentId, uid, courseId: enrollment.courseId });
        if (uid && enrollment.courseId && !decision.allowed && progressByUserCourse.has(uid + "_" + enrollment.courseId)) issues.push({ type: "progress_exists_but_access_denied", severity: "medium", safeRepair: false, enrollmentId, uid, courseId: enrollment.courseId, reason: decision.reason });
        if ((Number(enrollment.progress || 0) >= 100 || Number(enrollment.completedLessons || 0) >= Number(enrollment.totalLessons || 0)) && !certificateByUserCourse.get(uid + "_" + enrollment.courseId)) issues.push({ type: "completed_without_certificate", severity: "medium", safeRepair: false, enrollmentId, uid, courseId: enrollment.courseId });
    }

    const seenUserCourse = new Map();
    for (const enrollment of enrollments) {
        const key = (enrollment.uid || enrollment.userId) + "_" + enrollment.courseId;
        if (!key.includes('undefined') && seenUserCourse.has(key)) issues.push({ type: "duplicate_enrollment", severity: "medium", safeRepair: false, enrollmentIds: [seenUserCourse.get(key), enrollment.id], uid: enrollment.uid || enrollment.userId, courseId: enrollment.courseId });
        else seenUserCourse.set(key, enrollment.id || enrollment.enrollmentId);
    }

    const certificateNos = new Map();
    for (const certificate of certificates) {
        const no = certificate.certificateNo || certificate.issueNumber;
        if (!no) continue;
        if (certificateNos.has(no)) issues.push({ type: "duplicate_certificate_no", severity: "high", safeRepair: false, certificateNo: no, certificateIds: [certificateNos.get(no), certificate.id] });
        certificateNos.set(no, certificate.id);
    }

    const counts = { ...getCollectionHealthCounts(rows), scanLimited: rows.scanLimited === true, scanLimit: rows.scanLimit || null };
    await saveAdminAuditLog(env, request, admin, "integrity.check", "admin", "integrity", null, { issueCount: issues.length, counts }, "관리자 데이터 정합성 점검").catch((error) => console.error(error));
    return json({ ok: true, checkedAt: new Date().toISOString(), metadata: buildOperationalMetadata(env), counts, issues }, 200, corsHeaders);
}
async function handleAdminCertificateDateUpdate(request, env, corsHeaders) {
    let admin;
    try {
        admin = await requireFirebaseAdmin(request, env);
    } catch (error) {
        return json({ message: error.message || '관리자 권한이 없습니다.', code: 'ADMIN_FORBIDDEN' }, error.status || 403, corsHeaders);
    }

    const body = await request.json().catch(() => null);
    const certificateId = String(body?.certificateId || body?.id || '').trim();
    const displayDate = normalizeAdminDateOnly(body?.displayDate || body?.completedAt || body?.issuedAt);
    const reason = String(body?.reason || body?.note || '').trim();
    if (!certificateId || certificateId.includes('/')) {
        return json({ message: '수료증 ID가 올바르지 않습니다.', code: 'INVALID_CERTIFICATE_ID' }, 400, corsHeaders);
    }
    if (!displayDate) {
        return json({ message: '표시일자는 YYYY-MM-DD 형식으로 입력해 주세요.', code: 'INVALID_DISPLAY_DATE' }, 400, corsHeaders);
    }
    if (!reason) {
        return json({ message: '변경 사유를 입력해 주세요.', code: 'MISSING_REASON' }, 400, corsHeaders);
    }

    const certificatePath = firestoreDocumentPath(env, 'certificates', certificateId);
    const existingRaw = await firestoreGet(env, certificatePath).catch((error) => error.status === 404 ? null : Promise.reject(error));
    if (!existingRaw) return json({ message: '수료증을 찾을 수 없습니다.', code: 'CERTIFICATE_NOT_FOUND' }, 404, corsHeaders);
    const before = fromFirestoreFields(existingRaw.fields || {});
    const nowIso = new Date().toISOString();
    const patch = {
        completedAt: displayDate,
        issuedAt: displayDate,
        certificateIssuedAt: displayDate,
        displayDate,
        dateAdjustedByAdmin: true,
        dateAdjustedAt: nowIso,
        dateAdjustedBy: admin.email || admin.uid,
        dateAdjustmentReason: reason,
        updatedAt: nowIso,
        updatedBy: admin.email || admin.uid
    };

    await firestorePatch(env, certificatePath, patch);
    await saveAdminAuditLog(env, request, admin, 'certificate.date.update', 'certificates', certificateId, before, patch, reason).catch((error) => console.error(error));
    await savePaymentLog(env, certificateId, {
        type: 'admin_certificate_date_updated',
        certificateId,
        uid: before.uid || before.userId || null,
        userId: before.userId || before.uid || null,
        courseId: before.courseId || null,
        beforeCompletedAt: before.completedAt || null,
        beforeIssuedAt: before.issuedAt || null,
        displayDate,
        reason,
        processedBy: admin.email || admin.uid,
        created_at: nowIso,
        createdAt: nowIso
    }).catch((error) => console.error(error));

    return json({ ok: true, certificateId, displayDate, message: '수료증 표시일자를 변경했습니다.' }, 200, corsHeaders);
}

async function handleAdminCertificateIssue(request, env, corsHeaders) {
    let admin;
    try {
        admin = await requireFirebaseAdmin(request, env);
    } catch (error) {
        return json({ message: error.message || '관리자 권한이 없습니다.', code: 'ADMIN_FORBIDDEN' }, error.status || 403, corsHeaders);
    }

    const body = await request.json().catch(() => null);
    const uid = String(body?.uid || '').trim();
    const courseId = String(body?.courseId || "").trim();
    const product = getCourseProduct(courseId);
    if (!uid || !product) {
        return json({ message: '사용자 ID 또는 교육과정 정보가 올바르지 않습니다.', code: 'INVALID_REQUEST' }, 400, corsHeaders);
    }

    const requestedDocumentType = String(body?.documentType || '').trim();
    const defaultDocumentType = courseId === CBT_COURSE_PRODUCT.courseId || product.includesCbtCourse ? 'cbt-completion' : 'completion';
    const rawDocumentType = requestedDocumentType || defaultDocumentType;
    const allowedDocumentTypes = new Set(['completion', 'course-certificate', 'cbt-completion', 'cbt-detail', 'attendance']);
    if (!allowedDocumentTypes.has(rawDocumentType)) {
        return json({ message: '지원하지 않는 수료증 문서 종류입니다.', code: 'INVALID_DOCUMENT_TYPE' }, 400, corsHeaders);
    }
    const documentType = rawDocumentType === 'course-certificate' ? 'completion' : rawDocumentType;
    const certificateId = documentType && documentType !== 'completion' ? uid + '_' + courseId + '_' + documentType : uid + '_' + courseId;
    const existing = await firestoreGetData(env, 'certificates', certificateId).catch((error) => error.status === 404 ? null : Promise.reject(error));
    if (existing?.certificateNo || existing?.issueNumber) {
        const existingDocumentType = inferWorkerCertificateDocumentType(certificateId, documentType, existing.documentType, courseId);
        await updateCertificateFlags(env, uid, courseId, existing.certificateNo || existing.issueNumber, certificateId, existing.issuedAt || existing.createdAt, existingDocumentType !== 'attendance').catch((error) => console.error(error));
        return json({ ok: true, certificateId, certificateNo: existing.certificateNo || existing.issueNumber, alreadyIssued: true, documentType: existingDocumentType, message: '이미 저장된 수료증이 있습니다.' }, 200, corsHeaders);
    }

    const user = await firestoreGetData(env, 'users', uid).catch((error) => error.status === 404 ? null : Promise.reject(error));
    if (!user) return json({ message: '회원 정보를 확인할 수 없습니다.', code: 'USER_NOT_FOUND' }, 400, corsHeaders);

    const enrollment = await getWorkerEnrollmentRecord(env, uid, courseId, user.email || null).catch(() => null);
    if (!isFirestoreEnrollmentActiveRecord(enrollment)) {
        return json({ message: '활성 수강권이 없습니다. 먼저 관리자 페이지에서 수강권을 직접 부여해 주세요.', code: 'ENROLLMENT_NOT_ACTIVE' }, 400, corsHeaders);
    }

    const locked = user.certificateIdentity || {};
    const userName = String(body?.userName || locked.realName || user.realName || user.fullName || user.name || '').trim();
    const birthDate = String(body?.birthDate || locked.dateOfBirth || user.dateOfBirth || user.birthDate || '').trim();
    if (!userName) return json({ message: '성명을 입력해 주세요.', code: 'MISSING_NAME' }, 400, corsHeaders);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
        return json({ message: '생년월일은 YYYY-MM-DD 형식으로 입력해 주세요.', code: 'MISSING_BIRTH_DATE' }, 400, corsHeaders);
    }

    const issuedAt = new Date().toISOString();
    const progressId = uid + '_' + courseId;
    const progress = await firestoreGetData(env, 'courseProgress', progressId).catch((error) => error.status === 404 ? null : Promise.reject(error));
    const isProgressCompleted = Boolean(progress?.isCompleted) || Number(progress?.completionRate || 0) >= 100 || Number(enrollment.completedLessons || 0) >= Number(enrollment.totalLessons || product.totalLessons);
    const exceptionReason = String(body?.exceptionReason || body?.note || '').trim();
    const isExceptionIssue = documentType !== 'attendance' && !isProgressCompleted;
    if (isExceptionIssue && !exceptionReason) {
        return json({ message: '수료 조건이 충족되지 않았습니다. 예외 발급 사유를 입력해 주세요.', code: 'COMPLETION_NOT_MET' }, 409, corsHeaders);
    }
    const certificateNo = await makeCertificateNo(certificateId, issuedAt, courseId);
    const completedAt = documentType === 'attendance' ? issuedAt : null;
    const issuerName = '리셋에듀센터';
    const certificateRecord = {
        certificateId, certificateNo, issueNumber: certificateNo,
        userId: uid, uid, userName, birthDate, dateOfBirth: birthDate,
        email: user.email || '', phoneNumber: user.phoneNumber || '',
        courseId, courseTitle: getWorkerCertificateCourseTitleForDocument(product, documentType, courseId),
        totalLessons: product.totalLessons, completedLessons: product.totalLessons,
        progress: 100, completedAt,
        purchasedAt: enrollment.purchasedAt || null,
        expiresAt: enrollment.expiresAt || null,
        issuedAt, certificateIssuedAt: issuedAt,
        issuerName,
        issuerBusinessNumber: env.CERTIFICATE_ISSUER_BUSINESS_NUMBER || '',
        issuerContact: env.CERTIFICATE_ISSUER_CONTACT || '',
        issuerEmail: env.CERTIFICATE_ISSUER_EMAIL || '',
        status: 'issued', documentType,
        issueMode: isExceptionIssue ? 'exception' : 'normal',
        exceptionIssue: isExceptionIssue,
        exceptionReason: isExceptionIssue ? exceptionReason : '',
        issuedByAdmin: true,
        issuedBy: admin.email || admin.uid,
        adminIssueReason: exceptionReason || '관리자 직접 수료증 발급',
        createdAt: issuedAt, updatedAt: issuedAt
    };

    await firestorePatch(env, firestoreDocumentPath(env, 'certificates', certificateId), certificateRecord);
    await updateCertificateFlags(env, uid, courseId, certificateNo, certificateId, issuedAt, documentType !== 'attendance');
    await savePaymentLog(env, certificateId, {
        type: 'admin_certificate_issued', certificateId, certificateNo, uid, userId: uid,
        courseId, documentType, issuedBy: admin.email || admin.uid,
        issueMode: isExceptionIssue ? 'exception' : 'normal', exceptionIssue: isExceptionIssue, exceptionReason: isExceptionIssue ? exceptionReason : '',
        created_at: issuedAt, createdAt: issuedAt
    }).catch((logError) => console.error(logError));
    await saveAdminAuditLog(env, request, admin, 'certificate.issue', 'certificates', certificateId, null, certificateRecord, String(body?.note || '관리자 직접 수료증 발급').trim()).catch((error) => console.error(error));

    return json({ ok: true, certificateId, certificateNo, alreadyIssued: false, documentType, message: '수료증이 발급 및 저장되었습니다.' }, 200, corsHeaders);
}

async function handleAdminPayments(request, env, corsHeaders) {
    const providedKey = request.headers.get('x-admin-key') || '';
    if (!env.ADMIN_API_KEY || providedKey !== env.ADMIN_API_KEY) {
        return json({ message: '관리자 확인 키가 올바르지 않습니다.', code: 'ADMIN_FORBIDDEN' }, 403, corsHeaders);
    }
    const payments = await firestoreListLimited(env, 'payments', { pageSize: 30, orderBy: 'createdAt desc' });
    return json({
        items: payments.map((payment) => {
            const userId = payment.userId || payment.uid || '';
            const courseId = resolveCanonicalCourseId(payment) || payment.courseId || DUI_COURSE_PRODUCT.courseId;
            const completedLessons = Number(payment.completedLessons || 0);
            const totalLessons = Number(payment.totalLessons || DUI_COURSE_PRODUCT.totalLessons);
            const unusedLessons = Math.max(0, totalLessons - completedLessons);
            const certificateIssued = Boolean(payment.certificateIssued || payment.certificateNo);
            const refundAmount = certificateIssued || unusedLessons === 0 ? 0 : unusedLessons * DUI_COURSE_PRODUCT.pricePerLesson;
            return {
                orderId: payment.orderId,
                userId,
                courseId,
                userName: payment.customerName || payment.userName || '',
                email: payment.customerEmail || payment.userEmail || payment.email || '',
                birthDate: payment.birthDate || payment.dateOfBirth || '',
                courseTitle: payment.courseTitle || getCourseProduct(courseId)?.courseTitle || DUI_COURSE_PRODUCT.courseTitle,
                amount: payment.amount || DUI_COURSE_PRODUCT.price,
                paymentStatus: payment.status || payment.paymentStatus,
                approvedAt: payment.approvedAt || null,
                expiresAt: payment.expiresAt || null,
                progress: payment.progress || 0,
                completedLessons,
                unusedLessons,
                completedAt: payment.completedAt || null,
                certificateIssued,
                certificateNo: payment.certificateNo || '',
                certificateId: payment.certificateId || '',
                certificateUrl: payment.certificateId ? `${env.APP_BASE_URL || 'https://resetedu.kr'}/certificate?certificateId=${encodeURIComponent(payment.certificateId)}` : '',
                estimatedRefundAmount: refundAmount,
                refundReason: certificateIssued ? '수료증이 발급된 과정은 환불이 불가합니다.' : ''
            };
        })
    }, 200, corsHeaders);
}

async function firestoreList(env, collectionName) {
    assertFirestoreReadAllowed(env, 'LIST ' + collectionName);
    const projectId = getFirestoreProjectId(env);
    const token = await getGoogleAccessToken(env);
    const rows = [];
    let pageToken = '';
    do {
        const url = new URL(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collectionName}`);
        url.searchParams.set('pageSize', '300');
        if (pageToken) url.searchParams.set('pageToken', pageToken);
        const response = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } });
        if (!response.ok) {
            const body = await response.text().catch(() => '');
            throw new Error(`Firestore LIST failed: ${response.status} ${body}`);
        }
        const data = await response.json().catch(() => ({}));
        rows.push(...(data.documents || []).map((doc) => ({ id: String(doc.name || '').split('/').pop(), ...fromFirestoreFields(doc.fields || {}) })));
        pageToken = data.nextPageToken || '';
    } while (pageToken);
    return rows;
}

async function firestoreListPage(env, collectionName, options = {}) {
    assertFirestoreReadAllowed(env, 'PAGE LIST ' + collectionName);
    const projectId = getFirestoreProjectId(env);
    const token = await getGoogleAccessToken(env);
    const pageSize = Math.max(1, Math.min(Number(options.pageSize || options.limit || 5), 20));
    const url = new URL(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collectionName}`);
    url.searchParams.set('pageSize', String(pageSize));
    if (options.pageToken) url.searchParams.set('pageToken', String(options.pageToken));
    const response = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new Error(`Firestore PAGE LIST failed: ${response.status} ${body}`);
    }
    const data = await response.json().catch(() => ({}));
    return {
        rows: (data.documents || []).map((doc) => ({ id: String(doc.name || '').split('/').pop(), ...fromFirestoreFields(doc.fields || {}) })),
        nextPageToken: data.nextPageToken || ''
    };
}

async function firestoreListLimited(env, collectionName, options = {}) {
    assertFirestoreReadAllowed(env, 'LIMITED LIST ' + collectionName);
    const projectId = getFirestoreProjectId(env);
    const token = await getGoogleAccessToken(env);
    const pageSize = Math.max(1, Math.min(Number(options.pageSize || options.limit || 50), 100));
    const url = new URL(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collectionName}`);
    url.searchParams.set('pageSize', String(pageSize));
    if (options.orderBy) url.searchParams.set('orderBy', String(options.orderBy));
    const response = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new Error(`Firestore LIMITED LIST failed: ${response.status} ${body}`);
    }
    const data = await response.json().catch(() => ({}));
    return (data.documents || []).map((doc) => ({ id: String(doc.name || '').split('/').pop(), ...fromFirestoreFields(doc.fields || {}) }));
}

async function firestoreGetDataOrNull(env, collectionName, documentId) {
    if (!documentId) return null;
    return firestoreGetData(env, collectionName, documentId).catch((error) => error.status === 404 ? null : Promise.reject(error));
}


function mergeOperationalRows(rows) {
    const map = new Map();
    for (const row of rows.filter(Boolean)) {
        const key = String(row.id || row.documentPath || JSON.stringify(row));
        if (!map.has(key)) map.set(key, row);
    }
    return Array.from(map.values());
}

function chunkArray(values, size = 10) {
    const unique = Array.from(new Set(values.map((value) => String(value || '').trim()).filter(Boolean)));
    const chunks = [];
    for (let index = 0; index < unique.length; index += size) chunks.push(unique.slice(index, index + size));
    return chunks;
}

async function firestoreQueryIn(env, collectionName, field, values, options = {}) {
    assertFirestoreReadAllowed(env, 'QUERY ' + collectionName);
    const chunks = chunkArray(values, 10);
    if (!chunks.length) return [];
    const projectId = getFirestoreProjectId(env);
    const token = await getGoogleAccessToken(env);
    const limit = Math.max(1, Math.min(Number(options.limit || 100), 100));
    const rows = [];
    for (const chunk of chunks) {
        const response = await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                structuredQuery: {
                    from: [{ collectionId: collectionName }],
                    where: {
                        fieldFilter: {
                            field: { fieldPath: field },
                            op: 'IN',
                            value: { arrayValue: { values: chunk.map(toFirestoreValue) } }
                        }
                    },
                    limit
                }
            })
        });
        if (!response.ok) {
            const body = await response.text().catch(() => '');
            console.warn('[admin-member-dataset:query-in-failed]', { collectionName, field, status: response.status, message: body.slice(0, 220) });
            continue;
        }
        const queryRows = await response.json().catch(() => []);
        rows.push(...queryRows.flatMap((row) => {
            const document = row.document;
            if (!document) return [];
            const documentPath = String(document.name || '');
            return [{ id: documentPath.split('/').pop(), documentPath, ...fromFirestoreFields(document.fields || {}), recordSource: collectionName + ':' + field }];
        }));
    }
    return mergeOperationalRows(rows);
}

function normalizeFirebaseAuthMillis(value) {
    const numeric = Number(value || 0);
    if (!Number.isFinite(numeric) || numeric <= 0) return null;
    return new Date(numeric).toISOString();
}

function sanitizeFirebaseAuthUser(user) {
    const provider = user.providerUserInfo?.[0] || {};
    return {
        id: user.localId,
        uid: user.localId,
        userId: user.localId,
        email: user.email || provider.email || '',
        realName: user.displayName || provider.displayName || '',
        fullName: user.displayName || provider.displayName || '',
        displayName: user.displayName || provider.displayName || '',
        provider: provider.providerId || (user.passwordHash ? 'password' : ''),
        isEmailVerified: Boolean(user.emailVerified),
        emailVerified: Boolean(user.emailVerified),
        createdAt: normalizeFirebaseAuthMillis(user.createdAt),
        lastLoginAt: normalizeFirebaseAuthMillis(user.lastLoginAt),
        lastRefreshAt: user.lastRefreshAt || null,
        authSource: 'firebaseAuth'
    };
}

async function lookupFirebaseAuthUsers(env, { uids = [], emails = [] } = {}) {
    const localId = chunkArray(uids, 100).flat();
    const email = chunkArray(emails.map((value) => String(value || '').trim().toLowerCase()), 100).flat();
    if (!localId.length && !email.length) return [];
    const token = await getGoogleAccessToken(env, 'https://www.googleapis.com/auth/identitytoolkit');
    const response = await fetch('https://identitytoolkit.googleapis.com/v1/accounts:lookup', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetProjectId: getFirestoreProjectId(env), localId, email })
    });
    if (!response.ok) {
        const body = await response.text().catch(() => '');
        console.warn('[admin-member-dataset:auth-lookup-failed]', { status: response.status, message: body.slice(0, 220) });
        return [];
    }
    const data = await response.json().catch(() => ({}));
    return (data.users || []).map(sanitizeFirebaseAuthUser);
}

async function listFirebaseAuthUsersPage(env, limit = 1000, pageToken = '') {
    const token = await getGoogleAccessToken(env, 'https://www.googleapis.com/auth/identitytoolkit');
    const url = new URL(`https://identitytoolkit.googleapis.com/v1/projects/${getFirestoreProjectId(env)}/accounts:batchGet`);
    url.searchParams.set('maxResults', String(Math.max(1, Math.min(Number(limit || 1000), 1000))));
    if (pageToken) url.searchParams.set('nextPageToken', pageToken);
    const response = await fetch(url.toString(), { method: 'GET', headers: { Authorization: 'Bearer ' + token } });
    if (!response.ok) {
        const body = await response.text().catch(() => '');
        console.warn('[admin-member-dataset:auth-batch-get-failed]', { status: response.status, message: body.slice(0, 220) });
        return { users: [], nextPageToken: '', failed: true, status: response.status, message: body.slice(0, 500) };
    }
    const data = await response.json().catch(() => ({}));
    return { users: (data.users || []).map(sanitizeFirebaseAuthUser), nextPageToken: data.nextPageToken || '', failed: false };
}

async function listRecentFirebaseAuthUsers(env, limit = 50, offset = 0) {
    const targetLimit = Math.max(1, Math.min(Number(limit || 50), 1000));
    const targetOffset = Math.max(0, Number(offset || 0));
    const scanLimit = Math.min(1000, Math.max(targetOffset + targetLimit, 200));
    const rows = [];
    let pageToken = '';
    while (rows.length < scanLimit) {
        const page = await listFirebaseAuthUsersPage(env, Math.min(1000, scanLimit - rows.length), pageToken);
        rows.push(...page.users);
        if (page.failed || !page.nextPageToken) break;
        pageToken = page.nextPageToken;
    }
    return rows
        .sort((a, b) => parseOperationalTime(b.createdAt) - parseOperationalTime(a.createdAt))
        .slice(targetOffset, targetOffset + targetLimit);
}

async function getUserProfileRowsByDocumentIds(env, uids, options = {}) {
    const limited = Array.from(new Set((uids || []).map((value) => String(value || '').trim()).filter(Boolean))).slice(0, options.limit || 50);
    if (!limited.length) return [];
    const projectId = getFirestoreProjectId(env);
    const token = await getGoogleAccessToken(env);
    const documents = limited.map((uid) => 'projects/' + projectId + '/databases/(default)/documents/users/' + uid);
    const response = await fetch('https://firestore.googleapis.com/v1/projects/' + projectId + '/databases/(default)/documents:batchGet', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ documents })
    });
    if (!response.ok) {
        const body = await response.text().catch(() => '');
        if (options.warnings) options.warnings.push('users:batchGet:' + response.status + ':' + body.slice(0, 160));
        return [];
    }
    const rows = await response.json().catch(() => []);
    return (Array.isArray(rows) ? rows : []).flatMap((item) => {
        const doc = item.found;
        if (!doc?.name) return [];
        const id = String(doc.name).split('/').pop();
        return [{ id, uid: id, userId: id, ...fromFirestoreFields(doc.fields || {}), recordSource: 'users:batchGet' }];
    });
}

async function getAdminRowsByIdentity(env, collectionName, identity, fields, options = {}) {
    const valuesByField = new Map();
    for (const field of fields) valuesByField.set(field, []);
    for (const value of identity.uids || []) {
        for (const field of fields.filter((item) => !String(item).toLowerCase().includes('email'))) valuesByField.get(field).push(value);
    }
    for (const value of identity.emails || []) {
        for (const field of fields.filter((item) => String(item).toLowerCase().includes('email') || item === 'email')) valuesByField.get(field).push(value);
    }
    const groups = await Promise.all(Array.from(valuesByField.entries()).map(([field, values]) => firestoreQueryIn(env, collectionName, field, values, { limit: options.limit || 50 }).catch((error) => {
        if (options.warnings) options.warnings.push(collectionName + ':' + field + ':' + (error instanceof Error ? error.message : String(error)));
        return [];
    })));
    return mergeOperationalRows(groups.flat());
}

const ADMIN_MEMBER_DATASET_CONFIG = {
    dashboard: {
        authUsers: true,
        pageSize: 20,
        recent: [['users', 'createdAt desc'], ['payments', 'createdAt desc'], ['enrollments', 'createdAt desc'], ['certificates', 'createdAt desc']],
        related: {}
    },
    users: {
        authUsers: true,
        relatedLimit: 100,
        recent: [['users', 'createdAt desc'], ['payments', 'createdAt desc'], ['purchases', 'createdAt desc'], ['orders', 'createdAt desc'], ['enrollments', 'createdAt desc']],
        related: {
            users: ['uid', 'userId', 'email'],
            payments: ['uid', 'userId', 'firebaseUid', 'customerUid', 'buyerUid', 'email', 'userEmail', 'customerEmail', 'buyerEmail'],
            purchases: ['uid', 'userId', 'firebaseUid', 'customerUid', 'buyerUid', 'email', 'userEmail', 'customerEmail', 'buyerEmail'],
            orders: ['uid', 'userId', 'firebaseUid', 'customerUid', 'buyerUid', 'email', 'userEmail', 'customerEmail', 'buyerEmail'],
            enrollments: ['uid', 'userId', 'firebaseUid', 'customerUid', 'buyerUid', 'email', 'userEmail']
        }
    },
    payments: {
        authUsers: false,
        recent: [['payments', 'createdAt desc'], ['purchases', 'createdAt desc'], ['orders', 'createdAt desc']],
        related: {
            users: ['uid', 'userId', 'email']
        }
    },
    enrollments: {
        authUsers: false,
        recent: [['enrollments', 'createdAt desc']],
        related: {
            users: ['uid', 'userId', 'email'],
            certificates: ['uid', 'userId', 'email'],
            courseProgress: ['uid', 'userId']
        }
    },
    certificates: {
        authUsers: false,
        recent: [['certificates', 'createdAt desc'], ['documentOutputLogs', 'createdAt desc']],
        related: {
            users: ['uid', 'userId', 'email'],
            enrollments: ['uid', 'userId', 'email', 'userEmail'],
            courseProgress: ['uid', 'userId'],
            documentOutputLogs: ['uid', 'userId', 'email']
        }
    }
};
ADMIN_MEMBER_DATASET_CONFIG.revocations = ADMIN_MEMBER_DATASET_CONFIG.enrollments;
ADMIN_MEMBER_DATASET_CONFIG.refunds = ADMIN_MEMBER_DATASET_CONFIG.enrollments;

function getAdminMemberDatasetConfig(view) {
    return ADMIN_MEMBER_DATASET_CONFIG[view] || ADMIN_MEMBER_DATASET_CONFIG.dashboard;
}

function collectionResultKey(collectionName) {
    return collectionName === 'courseProgress' ? 'progress' : collectionName;
}

function isOperationalUserLikeRow(row) {
    const source = String(row?.recordSource || row?.sourceCollection || row?.authSource || '').toLowerCase();
    return source.includes('users') || source.includes('auth') || Boolean(row?.emailVerified !== undefined || row?.crmJoinedAt || row?.joinedAt);
}

function getOperationalUid(row) {
    const direct = String(row?.uid || row?.userId || row?.firebaseUid || row?.customerUid || row?.buyerUid || '').trim();
    if (direct) return direct;
    return isOperationalUserLikeRow(row) ? String(row?.id || '').trim() : '';
}

function getOperationalEmail(row) {
    return String(row?.loginId || row?.login_id || row?.email || row?.userEmail || row?.customerEmail || row?.buyerEmail || '').trim().toLowerCase();
}

function getOperationalUids(row) {
    const values = [row?.uid, row?.userId, row?.firebaseUid, row?.customerUid, row?.buyerUid];
    if (isOperationalUserLikeRow(row)) values.push(row?.id);
    return values.map((value) => String(value || '').trim()).filter(Boolean);
}

function getOperationalEmails(row) {
    return [row?.loginId, row?.login_id, row?.email, row?.userEmail, row?.customerEmail, row?.buyerEmail]
        .map((value) => String(value || '').trim().toLowerCase())
        .filter(Boolean);
}

function getOperationalIdentity(row) {
    return {
        uids: new Set(getOperationalUids(row)),
        emails: new Set(getOperationalEmails(row))
    };
}

function matchesOperationalIdentity(row, identity) {
    const rowUids = getOperationalUids(row);
    if (rowUids.some((value) => identity.uids.has(value))) return true;
    const rowEmails = getOperationalEmails(row);
    return rowEmails.some((value) => identity.emails.has(value));
}

function parseOperationalTime(value) {
    if (!value) return 0;
    if (typeof value === 'object' && typeof value.seconds === 'number') return value.seconds * 1000;
    const time = new Date(value).getTime();
    return Number.isFinite(time) ? time : 0;
}

function getOperationalPaymentTime(row) {
    return row?.approvedAt || row?.paidAt || row?.refundedAt || row?.refundRequestedAt || row?.failedAt || row?.attemptedAt || row?.orderedAt || row?.createdAt || row?.updatedAt;
}

function isOperationalPaidPayment(row) {
    const status = String(row?.paymentStatus || row?.status || row?.orderStatus || row?.rawResponse?.status || '').toLowerCase();
    const state = String(row?.paymentState || row?.state || '').toLowerCase();
    const hardBlocked = ['failed', 'fail', 'error', 'cancelled', 'canceled', 'refunded'].includes(status) || state.includes('실패') || state.includes('취소') || state.includes('환불');
    if (hardBlocked) return false;
    if (['pending', 'ready', 'awaiting_deposit'].includes(status) && !row?.approvedAt && !row?.paidAt && String(row?.rawResponse?.status || '').toUpperCase() !== 'PAID' && !state.includes('결제완료')) return false;
    return ['paid', 'done', 'completed', 'complete', 'success', 'approved'].includes(status)
        || String(row?.rawResponse?.status || '').toUpperCase() === 'PAID'
        || state.includes('결제완료')
        || Boolean(row?.approvedAt || row?.paidAt || row?.receiptUrl);
}

function isOperationalRefundPayment(row) {
    const status = String(row?.refundStatus || row?.paymentStatus || row?.status || row?.cancelStatus || '').toLowerCase();
    return status.includes('refund') || status === 'cancelled' || status === 'canceled' || Boolean(row?.refundedAt || row?.refundRequestedAt || row?.cancelledAt || row?.canceledAt);
}

function getOperationalPaymentRank(row) {
    if (isOperationalRefundPayment(row)) return 4;
    if (isOperationalPaidPayment(row)) return 3;
    if (row?.paymentId || row?.orderId || row?.paymentKey || row?.createdAt || row?.attemptedAt || row?.orderedAt) return 2;
    return 0;
}

function chooseOperationalPaymentRecord(current, next) {
    if (!current) return next;
    const rankDiff = getOperationalPaymentRank(next) - getOperationalPaymentRank(current);
    if (rankDiff !== 0) return rankDiff > 0 ? next : current;
    return parseOperationalTime(getOperationalPaymentTime(next)) >= parseOperationalTime(getOperationalPaymentTime(current)) ? next : current;
}

function attachAdminPaymentSummariesToUsers(dataset) {
    const paymentRows = mergeOperationalRows([...(dataset.payments || []), ...(dataset.purchases || []), ...(dataset.orders || [])]);
    dataset.users = (dataset.users || []).map((user) => {
        const identity = getOperationalIdentity(user);
        const matched = paymentRows.filter((row) => matchesOperationalIdentity(row, identity));
        const canonical = matched.reduce((current, row) => chooseOperationalPaymentRecord(current, row), null);
        if (!canonical) return user;
        return {
            ...user,
            adminPaymentSummary: buildAdminUserPaymentSummary(canonical, new Date().toISOString()),
            adminPaymentSummarySource: canonical.recordSource || canonical.sourceCollection || 'admin_member_dataset'
        };
    });
    return dataset;
}

function getAdminProfileBirthDate(row) {
    return firstPresent(row, ['birthDate', 'dateOfBirth', 'date_of_birth', 'birth_date', 'birthday', 'birth', 'certificateBirthDate', 'certificate_birth_date', 'buyerBirthDate', 'buyer_birth_date', 'userBirthDate', 'user_birth_date']) || row?.certificateIdentity?.dateOfBirth || row?.certificateIdentity?.birthDate || null;
}

function getAdminProfilePhone(row) {
    const value = firstPresent(row, ['phoneNumber', 'phone_number', 'phone', 'mobile', 'tel', 'telephone', 'contactPhone', 'contact_phone', 'contactNumber', 'contact_number', 'customerPhone', 'customer_phone', 'buyerPhone', 'buyer_phone']) || row?.profile?.phoneNumber || row?.profile?.phone_number || row?.profile?.phone || null;
    return value ? normalizePhoneNumberValue(value) : null;
}

function mergeRecentAuthUsersWithProfiles(authRows, profileRows) {
    const profileByUid = new Map();
    for (const profile of profileRows || []) {
        const uid = getOperationalUid(profile) || profile?.id;
        if (uid) profileByUid.set(uid, profile);
    }
    return (authRows || []).map((authUser) => {
        const uid = getOperationalUid(authUser) || authUser?.id;
        const profile = profileByUid.get(uid);
        if (!profile) return authUser;
        const birthDate = getAdminProfileBirthDate(profile) || getAdminProfileBirthDate(authUser) || null;
        const phoneNumber = getAdminProfilePhone(profile) || getAdminProfilePhone(authUser) || null;
        const email = profile.email || profile.loginId || profile.login_id || authUser.email || '';
        const realName = profile.realName || profile.fullName || profile.name || authUser.realName || authUser.fullName || authUser.displayName || '';
        return {
            ...authUser,
            ...profile,
            id: profile.id || uid,
            uid,
            userId: uid,
            loginId: profile.loginId || profile.login_id || email || null,
            email,
            realName,
            fullName: profile.fullName || realName,
            displayName: authUser.displayName || realName,
            birthDate: birthDate || profile.birthDate || null,
            dateOfBirth: birthDate || profile.dateOfBirth || null,
            phoneNumber: phoneNumber || profile.phoneNumber || null,
            phone: profile.phone || phoneNumber || null,
            createdAt: profile.createdAt || authUser.createdAt || null,
            joinedAt: profile.joinedAt || authUser.joinedAt || null,
            crmJoinedAt: profile.crmJoinedAt || profile.joinedAt || profile.createdAt || authUser.createdAt || null,
            lastLoginAt: profile.lastLoginAt || authUser.lastLoginAt || null,
            adminProfileMissing: false,
            authSource: 'firebaseAuth+users'
        };
    });
}


async function getAdminRowsByUidFields(env, collectionName, uids, fields, options = {}) {
    const limitedUids = Array.from(new Set((uids || []).map((value) => String(value || '').trim()).filter(Boolean))).slice(0, options.uidLimit || 50);
    if (!limitedUids.length) return [];
    const groups = await Promise.all(fields.map((field) => firestoreQueryIn(env, collectionName, field, limitedUids, { limit: options.limit || 100 }).catch((error) => {
        if (options.warnings) options.warnings.push(collectionName + ':' + field + ':' + (error instanceof Error ? error.message : String(error)));
        return [];
    })));
    return mergeOperationalRows(groups.flat());
}

async function attachRecentMemberPaymentSummaries(env, members, warnings = []) {
    const uids = Array.from(new Set((members || []).map((row) => getOperationalUid(row) || row.uid || row.userId || row.id).filter(Boolean))).slice(0, 50);
    if (!uids.length) return { members, readCount: 0 };
    const identity = { uids: new Set(uids), emails: new Set() };
    const uidFields = ['uid', 'userId', 'firebaseUid'];
    const [payments, purchases, orders, enrollments] = await Promise.all([
        getAdminRowsByUidFields(env, 'payments', uids, uidFields, { limit: 100, warnings }).catch(() => []),
        getAdminRowsByUidFields(env, 'purchases', uids, uidFields, { limit: 100, warnings }).catch(() => []),
        getAdminRowsByUidFields(env, 'orders', uids, uidFields, { limit: 100, warnings }).catch(() => []),
        getAdminRowsByUidFields(env, 'enrollments', uids, uidFields, { limit: 100, warnings }).catch(() => [])
    ]);
    const paymentRows = mergeOperationalRows([...payments, ...purchases, ...orders]);
    const enrollmentsByUid = groupRowsByOperationalUid(enrollments);
    const enriched = (members || []).map((member) => {
        const memberIdentity = getOperationalIdentity(member);
        const matched = paymentRows.filter((row) => matchesOperationalIdentity(row, memberIdentity));
        const canonical = matched.reduce((current, row) => chooseOperationalPaymentRecord(current, row), null);
        const latestEnrollment = (enrollmentsByUid.get(getOperationalUid(member) || member.uid || member.userId || member.id) || []).slice().sort(compareAdminMemberTimeDesc)[0] || null;
        const demographicsSource = canonical || latestEnrollment || null;
        if (!canonical && !latestEnrollment) return member;
        const summary = canonical ? buildAdminUserPaymentSummary(canonical, new Date().toISOString()) : null;
        return {
            ...member,
            birthDate: getAdminProfileBirthDate(member) || getAdminProfileBirthDate(demographicsSource) || null,
            dateOfBirth: getAdminProfileBirthDate(member) || getAdminProfileBirthDate(demographicsSource) || null,
            phoneNumber: getAdminProfilePhone(member) || getAdminProfilePhone(demographicsSource) || null,
            phone: getAdminProfilePhone(member) || getAdminProfilePhone(demographicsSource) || null,
            hasPayment: member.hasPayment || (canonical ? isOperationalPaidPayment(canonical) : false),
            paymentStatus: member.paymentStatus || canonical?.paymentStatus || canonical?.status || null,
            adminPaymentSummary: summary || member.adminPaymentSummary || null,
            lastPaymentDate: member.lastPaymentDate || summary?.paidAt || summary?.lastPaymentAt || null,
            lastPaymentAmount: member.lastPaymentAmount || summary?.amount || 0,
            lastCourseId: member.lastCourseId || summary?.courseId || canonical?.courseId || latestEnrollment?.courseId || null,
            lastCourseName: member.lastCourseName || summary?.courseTitle || summary?.productTitle || canonical?.courseName || canonical?.courseTitle || canonical?.productTitle || latestEnrollment?.courseName || latestEnrollment?.courseTitle || null,
            adminPaymentSummarySource: canonical ? (canonical.recordSource || canonical.sourceCollection || 'recent_member_payment_lookup') : member.adminPaymentSummarySource
        };
    });
    return { members: enriched, readCount: paymentRows.length + enrollments.length };
}


function getAdminMemberTime(row) {
    return row?.paidAt || row?.approvedAt || row?.createdAt || row?.updatedAt || row?.startedAt || row?.purchasedAt || row?.issuedAt || row?.completionDate || row?.completedAt || null;
}

function compareAdminMemberTimeDesc(a, b) {
    return parseOperationalTime(getAdminMemberTime(b)) - parseOperationalTime(getAdminMemberTime(a));
}

function normalizeAdminMemberRow(row, collectionName) {
    return { ...row, sourceCollection: row.sourceCollection || collectionName, recordSource: row.recordSource || collectionName };
}

function buildAdminMemberTimeline(member, detail) {
    const rows = [];
    const uid = member?.uid || member?.userId || member?.id || '';
    const add = (at, label, detailText, id) => {
        if (!at) return;
        rows.push({ id: id || label + '_' + rows.length, at, label, detail: detailText || '-' });
    };
    add(member?.createdAt, '회원가입', member?.email || uid, 'signup_' + uid);
    for (const payment of detail.payments || []) {
        const amount = Number(payment.amount || payment.paidAmount || 0).toLocaleString('ko-KR');
        add(payment.paidAt || payment.approvedAt || payment.createdAt, '결제', `${payment.courseName || payment.courseTitle || payment.productTitle || payment.courseId || '과정'} ${amount ? amount + '원' : ''} / ${payment.orderId || payment.paymentId || payment.id || '-'}`, 'payment_' + (payment.id || payment.paymentId || payment.orderId));
        if (payment.refundedAt || payment.cancelledAt || payment.canceledAt) add(payment.refundedAt || payment.cancelledAt || payment.canceledAt, '환불', payment.orderId || payment.paymentId || payment.id, 'refund_' + (payment.id || payment.paymentId || payment.orderId));
    }
    for (const enrollment of detail.enrollments || []) {
        add(enrollment.startedAt || enrollment.createdAt || enrollment.purchasedAt, '수강 시작', enrollment.courseName || enrollment.courseTitle || enrollment.courseId || '-', 'enrollment_' + (enrollment.id || enrollment.enrollmentId));
        add(enrollment.completionDate || enrollment.completedAt, '과정 수료', enrollment.courseName || enrollment.courseTitle || enrollment.courseId || '-', 'complete_' + (enrollment.id || enrollment.enrollmentId));
        add(enrollment.certificateIssuedAt, '수료증 최초 발급', enrollment.courseName || enrollment.courseTitle || enrollment.courseId || '-', 'enrollment_cert_' + (enrollment.id || enrollment.enrollmentId));
    }
    for (const certificate of detail.certificates || []) {
        add(certificate.issuedAt || certificate.certificateIssuedAt || certificate.createdAt, '수료증 발급', certificate.certificateNo || certificate.id || '-', 'certificate_' + (certificate.id || certificate.certificateId));
    }
    for (const output of detail.documentOutputLogs || []) {
        add(output.createdAt || output.issuedAt || output.updatedAt, output.issueCount && Number(output.issueCount) > 1 ? '수료증 재발급' : '문서 발급', output.documentName || output.certificateId || output.materialId || output.id || '-', 'output_' + (output.id || rows.length));
    }
    return rows.sort((a, b) => parseOperationalTime(a.at) - parseOperationalTime(b.at));
}

function getAdminMemberRefundRows(payments) {
    return (payments || []).filter((row) => isOperationalRefundPayment(row) || row.refundedAt || row.cancelledAt || row.canceledAt || (row.refundStatus && row.refundStatus !== 'none'));
}

function buildAdminUserLedgerPatch(authUser, payments = [], enrollments = []) {
    const paidPayments = payments.filter(isOperationalPaidPayment).sort(compareAdminMemberTimeDesc);
    const latestPayment = (paidPayments[0] || payments.slice().sort(compareAdminMemberTimeDesc)[0] || null);
    const latestEnrollment = enrollments.slice().sort(compareAdminMemberTimeDesc)[0] || null;
    const completedEnrollment = enrollments.find((row) => row.completionStatus === true || row.completionStatus === 'completed' || row.certificateIssued || row.completionDate || row.completedAt);
    const refunded = payments.some(isOperationalRefundPayment);
    return {
        uid: authUser.uid,
        email: authUser.email || '',
        name: authUser.realName || authUser.fullName || authUser.displayName || '',
        createdAt: authUser.createdAt || null,
        lastLoginAt: authUser.lastLoginAt || null,
        memberStatus: '정상',
        hasPayment: paidPayments.length > 0,
        totalPaidAmount: paidPayments.reduce((sum, row) => sum + Number(row.amount || row.paidAmount || 0), 0),
        lastPaymentDate: latestPayment ? latestPayment.paidAt || latestPayment.approvedAt || latestPayment.createdAt || null : null,
        lastPaymentAmount: latestPayment ? Number(latestPayment.amount || latestPayment.paidAmount || 0) : 0,
        lastCourseId: latestPayment?.courseId || latestEnrollment?.courseId || '',
        lastCourseName: latestPayment?.courseName || latestPayment?.courseTitle || latestPayment?.productTitle || latestEnrollment?.courseName || latestEnrollment?.courseTitle || '',
        enrollmentStatus: latestEnrollment?.enrollmentStatus || latestEnrollment?.accessStatus || latestEnrollment?.status || (enrollments.length ? '수강이력 있음' : '수강권 없음'),
        completionStatus: completedEnrollment ? 'completed' : 'not_completed',
        completionDate: completedEnrollment?.completionDate || completedEnrollment?.completedAt || null,
        refundStatus: refunded ? 'refunded_or_requested' : 'none',
        updatedAt: new Date().toISOString(),
        adminSyncSource: 'firebaseAuth',
        adminSyncedAt: new Date().toISOString()
    };
}

async function firestoreRunStructuredQuery(env, structuredQuery, operation = 'QUERY') {
    assertFirestoreReadAllowed(env, operation);
    const projectId = getFirestoreProjectId(env);
    const token = await getGoogleAccessToken(env);
    const response = await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ structuredQuery })
    });
    if (!response.ok) {
        const body = await response.text().catch(() => '');
        const error = new Error(`Firestore ${operation} failed: ${response.status} ${body}`);
        error.status = response.status;
        throw error;
    }
    const rows = await response.json().catch(() => []);
    return rows.flatMap((row) => {
        const document = row.document;
        if (!document) return [];
        const documentPath = String(document.name || '');
        return [{ id: documentPath.split('/').pop(), documentPath, ...fromFirestoreFields(document.fields || {}) }];
    });
}

function getAdminRecentMemberDate(row) {
    const candidates = [row.crmJoinedAt, row.joinedAt, row.createdAt].filter(Boolean);
    const times = candidates.map((value) => Date.parse(String(value))).filter((time) => Number.isFinite(time));
    if (!times.length) return null;
    return new Date(Math.max(...times)).toISOString();
}

function encodeAdminMembersCursor(row) {
    const joinedAt = getAdminRecentMemberDate(row);
    if (!joinedAt || !row.id) return '';
    return btoa(JSON.stringify({ joinedAt, id: row.id }));
}

function decodeAdminMembersCursor(cursor) {
    if (!cursor) return null;
    try {
        const parsed = JSON.parse(atob(cursor));
        const joinedAt = normalizeLedgerTimestamp(parsed?.joinedAt);
        const id = String(parsed?.id || '').trim();
        return joinedAt && id ? { joinedAt, id } : null;
    } catch {
        return null;
    }
}

async function firestoreQueryRecentUsersByDateField(env, fieldPath, cutoffIso, cursorState, limit, valueType = 'timestampValue') {
    const filters = [{ fieldFilter: { field: { fieldPath }, op: 'GREATER_THAN_OR_EQUAL', value: { [valueType]: cutoffIso } } }];
    if (cursorState?.joinedAt) filters.push({ fieldFilter: { field: { fieldPath }, op: 'LESS_THAN', value: { [valueType]: cursorState.joinedAt } } });
    const structuredQuery = {
        from: [{ collectionId: 'users' }],
        where: { compositeFilter: { op: 'AND', filters } },
        orderBy: [{ field: { fieldPath }, direction: 'DESCENDING' }, { field: { fieldPath: '__name__' }, direction: 'DESCENDING' }],
        limit
    };
    return firestoreRunStructuredQuery(env, structuredQuery, 'RECENT_USERS_' + fieldPath + '_' + valueType).catch((error) => {
        console.warn('[admin-members:recent-field-failed]', { fieldPath, valueType, message: error instanceof Error ? error.message : String(error) });
        return [];
    });
}

async function firestoreListUsersPage(env, { limit = 50, cursor = '' } = {}) {
    const pageSize = Math.max(30, Math.min(Number(limit || 50), 50));
    const cutoffIso = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
    const cursorState = decodeAdminMembersCursor(cursor);
    const queryLimit = pageSize + 1;
    const dateFieldQueries = ['crmJoinedAt', 'createdAt', 'joinedAt'].flatMap((field) => [
        [field, 'timestampValue'],
        [field, 'stringValue']
    ]);
    const results = await Promise.all(dateFieldQueries.map(([field, valueType]) => firestoreQueryRecentUsersByDateField(env, field, cutoffIso, cursorState, queryLimit, valueType))); 
    const readCount = results.reduce((sum, rows) => sum + rows.length, 0);
    const unique = new Map();
    for (const row of results.flat()) {
        const uid = row.uid || row.userId || row.id;
        if (!uid || unique.has(uid)) continue;
        const joinedAt = getAdminRecentMemberDate(row);
        if (!joinedAt || Date.parse(joinedAt) < Date.parse(cutoffIso)) continue;
        unique.set(uid, { uid, userId: uid, loginId: row.loginId || row.email || null, crmJoinedAt: joinedAt, ...row });
    }
    const sorted = Array.from(unique.values()).sort((a, b) => {
        const diff = Date.parse(getAdminRecentMemberDate(b) || '') - Date.parse(getAdminRecentMemberDate(a) || '');
        return diff || String(b.id || '').localeCompare(String(a.id || ''));
    });
    const pageRows = sorted.slice(0, pageSize);
    const nextCursor = sorted.length > pageSize ? encodeAdminMembersCursor(pageRows[pageRows.length - 1]) : '';
    console.info('[admin-members:recent-60d:reads]', { readCount, returnedCount: pageRows.length, cutoffIso, cursor: Boolean(cursor), fields: dateFieldQueries.map(([field, valueType]) => field + ':' + valueType) });
    return { members: pageRows, nextCursor, readCount, cutoffIso, windowDays: 60 };
}

async function handleAdminMembers(request, env, corsHeaders) {
    let admin;
    try { admin = await requireFirebaseAdmin(request, env); }
    catch (error) { return json({ message: error.message || '관리자 권한이 없습니다.', code: 'ADMIN_FORBIDDEN' }, error.status || 403, corsHeaders); }
    const url = new URL(request.url);
    const limit = Number(url.searchParams.get('limit') || 50);
    const cursor = String(url.searchParams.get('cursor') || '').trim();
    try {
        const warnings = [];
        const result = await firestoreListUsersPage(env, { limit, cursor });
        let membersForPage = result.members || [];
        if (!cursor) {
            const cutoffTime = Date.parse(result.cutoffIso || new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString());
            const authRowsRaw = await listRecentFirebaseAuthUsers(env, 1000, 0).catch((error) => {
                warnings.push('auth:recent:' + (error instanceof Error ? error.message : String(error)));
                return [];
            });
            const authRowsRecent = authRowsRaw
                .filter((authUser) => {
                    const joinedAt = getAdminRecentMemberDate(authUser) || authUser.createdAt;
                    return joinedAt && Date.parse(joinedAt) >= cutoffTime;
                })
                .slice(0, Math.max(30, Math.min(Number(limit || 50), 50)));
            const authProfileRows = await getUserProfileRowsByDocumentIds(env, authRowsRecent.map((row) => getOperationalUid(row) || row.id), { limit: 50, warnings }).catch((error) => {
                warnings.push('auth:profiles:' + (error instanceof Error ? error.message : String(error)));
                return [];
            });
            const authRows = mergeRecentAuthUsersWithProfiles(authRowsRecent, authProfileRows);
            const merged = new Map();
            for (const row of membersForPage) merged.set(getOperationalUid(row) || row.id, row);
            for (const authUser of authRows) {
                const joinedAt = getAdminRecentMemberDate(authUser) || authUser.createdAt;
                if (!joinedAt || Date.parse(joinedAt) < cutoffTime) continue;
                const uid = getOperationalUid(authUser);
                if (!uid || merged.has(uid)) continue;
                merged.set(uid, { ...authUser, loginId: authUser.loginId || authUser.email || null, crmJoinedAt: authUser.crmJoinedAt || joinedAt, adminProfileMissing: !getAdminProfileBirthDate(authUser) || !getAdminProfilePhone(authUser) });
            }
            membersForPage = Array.from(merged.values()).sort((a, b) => (Date.parse(getAdminRecentMemberDate(b) || '') || 0) - (Date.parse(getAdminRecentMemberDate(a) || '') || 0)).slice(0, Math.max(30, Math.min(Number(limit || 50), 50)));
        }
        const enriched = await attachRecentMemberPaymentSummaries(env, membersForPage, warnings);
        const readCount = Number(result.readCount || 0) + Number(enriched.readCount || 0);
        return json({ ok: true, ...result, members: enriched.members, readCount, paymentSummaryReadCount: enriched.readCount, admin: { uid: admin.uid, email: admin.email }, warnings }, 200, corsHeaders);
    } catch (error) {
        console.error('[admin-members:list:failed]', { message: error instanceof Error ? error.message : String(error) });
        return json({ ok: false, message: error instanceof Error ? error.message : '회원 목록 조회 실패', code: 'ADMIN_MEMBERS_LIST_FAILED' }, 500, corsHeaders);
    }
}

async function getAdminMemberRowsByIdentity(env, collectionName, uid, email, fields, warnings) {
    const identity = { uids: uid ? [uid] : [], emails: email ? [String(email).trim().toLowerCase()] : [] };
    const rows = await getAdminRowsByIdentity(env, collectionName, identity, fields, { limit: 100, warnings }).catch((error) => {
        warnings.push(collectionName + ':' + (error instanceof Error ? error.message : String(error)));
        return [];
    });
    return rows.map((row) => normalizeAdminMemberRow(row, collectionName));
}

async function handleAdminMemberDetail(request, env, corsHeaders) {
    let admin;
    try { admin = await requireFirebaseAdmin(request, env); }
    catch (error) { return json({ message: error.message || '관리자 권한이 없습니다.', code: 'ADMIN_FORBIDDEN' }, error.status || 403, corsHeaders); }
    const url = new URL(request.url);
    const uid = String(url.searchParams.get('uid') || '').trim();
    const email = String(url.searchParams.get('email') || '').trim().toLowerCase();
    if (!uid && !email) return json({ ok: false, message: 'uid 또는 email이 필요합니다.', code: 'MEMBER_ID_REQUIRED' }, 400, corsHeaders);
    const warnings = [];
    try {
        const member = uid ? await firestoreGetDataOrNull(env, 'users', uid) : null;
        const [payments, purchases, orders, enrollments, progress, certificates, documentOutputLogs, paymentLogs, adminLogs] = await Promise.all([
            getAdminMemberRowsByIdentity(env, 'payments', uid, email, ['uid', 'userId', 'firebaseUid', 'customerUid', 'buyerUid', 'email', 'userEmail', 'customerEmail', 'buyerEmail'], warnings),
            getAdminMemberRowsByIdentity(env, 'purchases', uid, email, ['uid', 'userId', 'firebaseUid', 'customerUid', 'buyerUid', 'email', 'userEmail', 'customerEmail', 'buyerEmail'], warnings),
            getAdminMemberRowsByIdentity(env, 'orders', uid, email, ['uid', 'userId', 'firebaseUid', 'customerUid', 'buyerUid', 'email', 'userEmail', 'customerEmail', 'buyerEmail'], warnings),
            getAdminMemberRowsByIdentity(env, 'enrollments', uid, email, ['uid', 'userId', 'firebaseUid', 'customerUid', 'buyerUid', 'email', 'userEmail'], warnings),
            getAdminMemberRowsByIdentity(env, 'courseProgress', uid, email, ['uid', 'userId'], warnings),
            getAdminMemberRowsByIdentity(env, 'certificates', uid, email, ['uid', 'userId', 'email'], warnings),
            getAdminMemberRowsByIdentity(env, 'documentOutputLogs', uid, email, ['uid', 'userId', 'email'], warnings),
            getAdminMemberRowsByIdentity(env, 'paymentLogs', uid, email, ['uid', 'userId', 'email', 'userEmail'], warnings),
            getAdminMemberRowsByIdentity(env, 'adminLogs', uid, email, ['uid', 'userId', 'email', 'targetId'], warnings)
        ]);
        const allPayments = mergeOperationalRows([...payments, ...purchases, ...orders]).sort(compareAdminMemberTimeDesc);
        const detail = { payments: allPayments, enrollments, progress, certificates, documentOutputLogs, paymentLogs, adminLogs };
        const demographicsSource = member || allPayments.find((row) => getAdminProfileBirthDate(row) || getAdminProfilePhone(row)) || enrollments.find((row) => getAdminProfileBirthDate(row) || getAdminProfilePhone(row)) || certificates.find((row) => getAdminProfileBirthDate(row) || getAdminProfilePhone(row)) || null;
        const displayBirthDate = getAdminProfileBirthDate(member) || getAdminProfileBirthDate(demographicsSource) || null;
        const displayPhone = getAdminProfilePhone(member) || getAdminProfilePhone(demographicsSource) || null;
        const displayMember = {
            id: uid,
            uid: member?.uid || uid,
            userId: member?.userId || uid,
            email: member?.email || email || getOperationalEmail(demographicsSource) || null,
            ...(member || {}),
            birthDate: displayBirthDate || member?.birthDate || null,
            dateOfBirth: displayBirthDate || member?.dateOfBirth || null,
            phoneNumber: displayPhone || member?.phoneNumber || null,
            phone: displayPhone || member?.phone || null
        };
        const timeline = buildAdminMemberTimeline(displayMember, detail);
        const readCount = (member ? 1 : 0) + allPayments.length + enrollments.length + progress.length + certificates.length + documentOutputLogs.length + paymentLogs.length + adminLogs.length;
        return json({ ok: true, member: displayMember, payments: allPayments, enrollments, progress, certificates, refunds: getAdminMemberRefundRows(allPayments), timeline, readCount, warnings, admin: { uid: admin.uid, email: admin.email } }, 200, corsHeaders);
    } catch (error) {
        console.error('[admin-member:detail:failed]', { uid, message: error instanceof Error ? error.message : String(error) });
        return json({ ok: false, message: error instanceof Error ? error.message : '회원 상세 조회 실패', code: 'ADMIN_MEMBER_DETAIL_FAILED' }, 500, corsHeaders);
    }
}

async function listAllFirebaseAuthUsersForAdminSync(env, maxUsers = 10000) {
    const users = [];
    let pageToken = '';
    while (users.length < maxUsers) {
        const page = await listFirebaseAuthUsersPage(env, Math.min(1000, maxUsers - users.length), pageToken);
        users.push(...page.users);
        if (page.failed || !page.nextPageToken) break;
        pageToken = page.nextPageToken;
    }
    return users;
}

async function handleAdminMembersSync(request, env, corsHeaders) {
    void request;
    void env;
    return json({ ok: false, message: "최근 60일 CRM에서는 Firebase Auth 전체 회원 동기화를 실행하지 않습니다. 신규 가입 시 users 문서를 생성하는 방식으로 누락을 방지합니다.", code: "ADMIN_MEMBERS_SYNC_DISABLED" }, 410, corsHeaders);
}


function requireSupabaseLedgerConfigured(env) {
    if (!hasSupabaseLedgerConfig(env)) {
        const error = new Error('Supabase 원장 설정이 필요합니다. SUPABASE_URL과 SUPABASE_SERVICE_ROLE_KEY를 Worker에 설정해 주세요.');
        error.status = 503;
        error.code = 'SUPABASE_LEDGER_NOT_CONFIGURED';
        throw error;
    }
}

function getSupabaseAdminLimit(url) {
    return Math.max(1, Math.min(Number(url.searchParams.get('limit') || 50), 50));
}

function appendSupabaseDateFilter(url, field, fromValue, toValue) {
    if (fromValue) url.searchParams.set(field, 'gte.' + new Date(String(fromValue)).toISOString());
    if (toValue) {
        const end = new Date(String(toValue));
        if (/^\d{4}-\d{2}-\d{2}$/.test(String(toValue))) end.setUTCHours(23, 59, 59, 999);
        url.searchParams.append(field, 'lte.' + end.toISOString());
    }
}


function supabaseInFilter(values) {
    const unique = Array.from(new Set((values || []).map((value) => String(value || '').trim()).filter(Boolean))).slice(0, 200);
    return '(' + unique.map((value) => JSON.stringify(value)).join(',') + ')';
}

function isSupabasePaidPayment(row) {
    const status = String(row?.payment_status || '').toLowerCase();
    const refundStatus = String(row?.refund_status || '').toLowerCase();
    if (refundStatus && refundStatus !== 'none') return false;
    return ['paid', 'done', 'completed', 'complete', 'success', 'approved'].includes(status) || Boolean(row?.paid_at);
}

function isSupabaseRefundedPayment(row) {
    const status = String(row?.refund_status || row?.payment_status || '').toLowerCase();
    const amount = Number(row?.amount || 0);
    const refundAmount = Number(row?.refund_amount || 0);
    return status.includes('refund') || status.includes('cancel') || Boolean(row?.refunded_at) || (amount > 0 && refundAmount >= amount);
}

function isSupabaseFailedPayment(row) {
    const status = String(row?.payment_status || '').toLowerCase();
    return status.includes('fail') || status.includes('error') || status === 'failed';
}

function getSupabasePaymentSummary(payments) {
    const rows = [...(payments || [])].sort((a, b) => Date.parse(b.paid_at || b.created_at || '') - Date.parse(a.paid_at || a.created_at || ''));
    const paid = rows.filter(isSupabasePaidPayment);
    const refunded = rows.filter(isSupabaseRefundedPayment);
    let status = '미결제';
    if (paid.length) status = '결제완료';
    else if (refunded.length) status = '환불';
    else if (rows.some(isSupabaseFailedPayment)) status = '결제실패';
    const courseRows = paid.length ? paid : rows;
    const courseNames = Array.from(new Set(courseRows.map((row) => row.course_name || row.course_id).filter(Boolean)));
    return {
        status,
        count: rows.length,
        paidCount: paid.length,
        latest: rows[0] || null,
        courseSummary: courseNames.length > 1 ? courseNames[0] + ' 외 ' + (courseNames.length - 1) + '건' : courseNames[0] || '-'
    };
}

function getSupabaseEnrollmentSummary(enrollments) {
    const rows = [...(enrollments || [])].sort((a, b) => Date.parse(b.started_at || b.created_at || '') - Date.parse(a.started_at || a.created_at || ''));
    if (!rows.length) return { status: '없음', count: 0, latest: null, completed: false };
    const active = rows.find((row) => ['active', 'in_progress', 'started'].includes(String(row.enrollment_status || '').toLowerCase()));
    const cancelled = rows.find((row) => String(row.enrollment_status || '').toLowerCase().includes('cancel'));
    const expired = rows.find((row) => String(row.enrollment_status || '').toLowerCase().includes('expired') || (row.expires_at && Date.parse(row.expires_at) < Date.now()));
    const completed = rows.some((row) => String(row.completion_status || '').toLowerCase() === 'completed' || row.completion_date);
    return { status: active ? '생성됨' : expired ? '만료' : cancelled ? '취소' : '생성됨', count: rows.length, latest: active || rows[0], completed };
}

function getSupabaseDocumentSummary(documents) {
    const rows = [...(documents || [])].sort((a, b) => Date.parse(b.updated_at || b.generated_at || b.created_at || '') - Date.parse(a.updated_at || a.generated_at || a.created_at || ''));
    const names = Array.from(new Set(rows.map((row) => row.document_name || row.document_type).filter(Boolean)));
    return {
        status: rows.length ? '생성됨' : '없음',
        count: rows.length,
        names,
        nameSummary: names.length > 2 ? names.slice(0, 2).join(', ') + ' 외 ' + (names.length - 2) + '건' : names.join(', ') || '-'
    };
}

async function fetchSupabaseRowsByUids(env, tableName, uids, order = 'created_at.desc') {
    if (!uids.length) return [];
    const rows = await supabaseLedgerRequest(env, tableName + '?select=*&firebase_uid=in.' + supabaseInFilter(uids) + '&order=' + encodeURIComponent(order) + '&limit=500');
    return Array.isArray(rows) ? rows : [];
}

function groupSupabaseRowsByUid(rows) {
    const map = new Map();
    for (const row of rows || []) {
        const uid = String(row.firebase_uid || '').trim();
        if (!uid) continue;
        if (!map.has(uid)) map.set(uid, []);
        map.get(uid).push(row);
    }
    return map;
}

function groupRowsByOperationalUid(rows) {
    const map = new Map();
    for (const row of rows || []) {
        const uid = getOperationalUid(row) || String(row?.uid || row?.userId || row?.id || '').trim();
        if (!uid) continue;
        if (!map.has(uid)) map.set(uid, []);
        map.get(uid).push(row);
    }
    return map;
}

async function getFirebaseAuthFallbackMembersForSupabaseLedger(env, { limit = 50, offset = 0, search = '', existingUids = [] } = {}) {
    const safeSearch = sanitizeSupabaseSearchTerm(search);
    let authUsers = [];
    if (safeSearch) {
        if (!safeSearch.includes('@')) return [];
        authUsers = await lookupFirebaseAuthUsers(env, { emails: [safeSearch.toLowerCase()] }).catch(() => []);
    } else {
        if (offset !== 0) return [];
        authUsers = await listRecentFirebaseAuthUsers(env, Math.min(Number(limit || 50), 50), 0).catch(() => []);
    }
    const existing = new Set((existingUids || []).map((uid) => String(uid || '').trim()).filter(Boolean));
    const missingAuthUsers = (authUsers || []).filter((user) => user?.uid && !existing.has(user.uid));
    if (!missingAuthUsers.length) return [];
    const profiles = await getUserProfileRowsByDocumentIds(env, missingAuthUsers.map((user) => user.uid), { limit: Math.min(missingAuthUsers.length, 50) }).catch(() => []);
    const profileByUid = new Map((profiles || []).map((profile) => [getOperationalUid(profile) || profile.id, profile]));
    return missingAuthUsers.map((user) => {
        const profile = profileByUid.get(user.uid) || null;
        const createdAt = user.createdAt || new Date().toISOString();
        return {
            id: 'firebase_auth:' + user.uid,
            firebase_uid: user.uid,
            email: user.email || firstPresent(profile, ['email', 'loginId', 'login_id']) || null,
            login_id: user.email || firstPresent(profile, ['loginId', 'login_id', 'email']) || null,
            name: firstPresent(profile, ['name', 'realName', 'fullName', 'displayName']) || user.realName || user.displayName || null,
            phone: getAdminProfilePhone(profile),
            birth_date: getAdminProfileBirthDate(profile),
            joined_at: firstPresent(profile, ['joinedAt', 'crmJoinedAt', 'createdAt']) || createdAt,
            created_at: createdAt,
            updated_at: firstPresent(profile, ['updatedAt']) || user.lastLoginAt || createdAt,
            member_status: 'active',
            record_source: 'firebase_auth_fallback'
        };
    });
}

async function enrichSupabaseMembersForAdmin(env, members) {
    const mergedMembers = members || [];
    const uids = Array.from(new Set((mergedMembers || []).map((row) => row.firebase_uid).filter(Boolean))).slice(0, 100);
    const [payments, enrollments, documents, authUsers, profiles] = await Promise.all([
        fetchSupabaseRowsByUids(env, 'payments', uids, 'paid_at.desc.nullslast,created_at.desc'),
        fetchSupabaseRowsByUids(env, 'enrollments', uids, 'started_at.desc.nullslast,created_at.desc'),
        fetchSupabaseRowsByUids(env, 'documents', uids, 'updated_at.desc.nullslast,created_at.desc'),
        lookupFirebaseAuthUsers(env, { uids }).catch(() => []),
        getUserProfileRowsByDocumentIds(env, uids, { limit: 200 }).catch(() => [])
    ]);
    const paymentsByUid = groupSupabaseRowsByUid(payments);
    const enrollmentsByUid = groupSupabaseRowsByUid(enrollments);
    const documentsByUid = groupSupabaseRowsByUid(documents);
    const authByUid = new Map((authUsers || []).map((user) => [user.uid, user]));
    const profileByUid = new Map((profiles || []).map((profile) => [getOperationalUid(profile) || profile.id, profile]));
    return (mergedMembers || []).map((member) => {
        const uid = member.firebase_uid;
        const authUser = authByUid.get(uid) || null;
        const profile = profileByUid.get(uid) || null;
        const paymentSummary = getSupabasePaymentSummary(paymentsByUid.get(uid) || []);
        const enrollmentSummary = getSupabaseEnrollmentSummary(enrollmentsByUid.get(uid) || []);
        const documentSummary = getSupabaseDocumentSummary(documentsByUid.get(uid) || []);
        const effectivePaymentStatus = paymentSummary.status;
        const effectiveCourseSummary = paymentSummary.courseSummary !== '-' ? paymentSummary.courseSummary : member.lastCourseName || paymentSummary.courseSummary;
        const displayName = member.name || firstPresent(profile, ['name', 'realName', 'fullName', 'displayName']) || firstPresent(paymentSummary.latest, ['member_name', 'name', 'userName', 'customerName', 'buyerName']) || firstPresent(enrollmentSummary.latest, ['member_name', 'name', 'userName']) || authUser?.realName || authUser?.displayName || null;
        const displayEmail = member.login_id || member.email || firstPresent(profile, ['loginId', 'login_id', 'email']) || firstPresent(paymentSummary.latest, ['login_id', 'loginId', 'email', 'userEmail', 'customerEmail', 'buyerEmail']) || authUser?.email || null;
        const displayBirthDate = member.birth_date || getAdminProfileBirthDate(member) || getAdminProfileBirthDate(profile) || getAdminProfileBirthDate(paymentSummary.latest) || getAdminProfileBirthDate(enrollmentSummary.latest) || null;
        const displayPhone = member.phone || getAdminProfilePhone(member) || getAdminProfilePhone(profile) || getAdminProfilePhone(paymentSummary.latest) || getAdminProfilePhone(enrollmentSummary.latest) || null;
        return {
            ...member,
            name: displayName,
            login_id: displayEmail,
            email: member.email || displayEmail,
            birth_date: displayBirthDate,
            phone: displayPhone,
            ledger_payment_status: effectivePaymentStatus,
            ledger_payment_count: paymentSummary.count,
            ledger_paid_count: paymentSummary.paidCount,
            ledger_course_summary: effectiveCourseSummary,
            ledger_enrollment_status: enrollmentSummary.status,
            ledger_enrollment_count: enrollmentSummary.count,
            ledger_completion_status: enrollmentSummary.completed ? '수료완료' : '미수료',
            ledger_document_status: documentSummary.status,
            ledger_document_count: documentSummary.count,
            ledger_document_summary: documentSummary.nameSummary,
            ledger_document_names: documentSummary.names,
            ledger_warning: effectivePaymentStatus === '결제완료' && enrollmentSummary.status === '없음' ? '결제완료 + 수강권 없음' : null
        };
    });
}

function sanitizeSupabaseSearchTerm(value) {
    return String(value || '').trim().replace(/[(),*]/g, ' ').replace(/\s+/g, ' ').slice(0, 80);
}

async function findSupabaseUidsForLedgerSearch(env, search) {
    const term = sanitizeSupabaseSearchTerm(search);
    if (!term) return [];
    const read = async (tableName, fields) => {
        const url = new URL(getSupabaseUrl(env, tableName));
        url.searchParams.set('select', 'firebase_uid');
        url.searchParams.set('or', '(' + fields.map((field) => field + '.ilike.*' + term + '*').join(',') + ')');
        url.searchParams.set('limit', '200');
        const path = url.toString().replace(String(env.SUPABASE_URL).replace(/\/$/, '') + '/rest/v1/', '');
        const rows = await supabaseLedgerRequest(env, path).catch(() => []);
        return Array.isArray(rows) ? rows.map((row) => row.firebase_uid).filter(Boolean) : [];
    };
    const [paymentUids, enrollmentUids, documentUids] = await Promise.all([
        read('payments', ['course_name', 'order_id', 'payment_id']),
        read('enrollments', ['course_name', 'order_id']),
        read('documents', ['document_name', 'document_type', 'course_name'])
    ]);
    return Array.from(new Set([...paymentUids, ...enrollmentUids, ...documentUids])).slice(0, 200);
}


function filterSupabaseLedgerMembers(members, filter) {
    if (!filter || filter === '전체') return members;
    return members.filter((member) => {
        if (filter === '결제완료') return member.ledger_payment_status === '결제완료';
        if (filter === '미결제') return member.ledger_payment_status === '미결제';
        if (filter === '수강권 없음') return member.ledger_enrollment_status === '없음';
        if (filter === '수강중') return member.ledger_enrollment_status === '생성됨' && member.ledger_completion_status !== '수료완료';
        if (filter === '수료완료') return member.ledger_completion_status === '수료완료';
        if (filter === '문서 생성됨') return member.ledger_document_status === '생성됨';
        if (filter === '문서 없음') return member.ledger_document_status === '없음';
        if (filter === '결제완료 + 수강권 없음') return member.ledger_warning === '결제완료 + 수강권 없음';
        return true;
    });
}

async function handleAdminSupabaseMembers(request, env, corsHeaders) {
    let admin;
    try { admin = await requireFirebaseAdmin(request, env); requireSupabaseLedgerConfigured(env); }
    catch (error) { return json({ ok: false, message: error.message || '관리자 권한 또는 Supabase 설정을 확인해 주세요.', code: error.code || 'ADMIN_FORBIDDEN' }, error.status || 403, corsHeaders); }
    const requestUrl = new URL(request.url);
    const limit = getSupabaseAdminLimit(requestUrl);
    const offset = Math.max(0, Number(requestUrl.searchParams.get('offset') || 0));
    const search = String(requestUrl.searchParams.get('search') || '').trim();
    const filter = String(requestUrl.searchParams.get('filter') || '').trim();
    const sort = String(requestUrl.searchParams.get('sort') || 'joined_desc').trim();
    const order = sort === 'joined_asc' ? 'joined_at.asc.nullslast,created_at.asc'
        : sort === 'payment_desc' ? 'last_payment_at.desc.nullslast,joined_at.desc.nullslast,created_at.desc'
        : sort === 'name_asc' ? 'name.asc.nullslast,joined_at.desc.nullslast,created_at.desc'
        : 'joined_at.desc.nullslast,created_at.desc';
    try {
        const url = new URL(getSupabaseUrl(env, 'members'));
        const safeSearch = sanitizeSupabaseSearchTerm(search);
        const relatedUids = safeSearch ? await findSupabaseUidsForLedgerSearch(env, safeSearch) : [];
        url.searchParams.set('select', '*');
        url.searchParams.set('order', order);
        url.searchParams.set('limit', String(limit));
        url.searchParams.set('offset', String(offset));
        if (safeSearch) {
            const memberTerms = [`firebase_uid.ilike.*${safeSearch}*`, `email.ilike.*${safeSearch}*`, `name.ilike.*${safeSearch}*`];
            if (relatedUids.length) memberTerms.push('firebase_uid.in.' + supabaseInFilter(relatedUids));
            url.searchParams.set('or', '(' + memberTerms.join(',') + ')');
        }
        const rows = await supabaseLedgerRequest(env, url.toString().replace(String(env.SUPABASE_URL).replace(/\/$/, '') + '/rest/v1/', ''));
        const supabaseRows = Array.isArray(rows) ? rows : [];
        const fallbackRows = await getFirebaseAuthFallbackMembersForSupabaseLedger(env, { limit, offset, search: safeSearch, existingUids: supabaseRows.map((row) => row.firebase_uid) });
        const combinedRows = [...supabaseRows, ...fallbackRows]
            .sort((a, b) => parseOperationalTime(b.joined_at || b.created_at || b.updated_at) - parseOperationalTime(a.joined_at || a.created_at || a.updated_at))
            .slice(0, limit);
        const enriched = await enrichSupabaseMembersForAdmin(env, combinedRows);
        const filtered = filterSupabaseLedgerMembers(enriched, filter);
        return json({ ok: true, members: filtered, limit, offset, nextOffset: supabaseRows.length === limit ? offset + limit : null, sort, filter, admin: { uid: admin.uid, email: admin.email } }, 200, corsHeaders);
    } catch (error) {
        console.error('[admin-supabase-members:failed]', { message: error instanceof Error ? error.message : String(error) });
        return json({ ok: false, message: error instanceof Error ? error.message : 'Supabase 회원 원장 조회 실패', code: 'SUPABASE_MEMBERS_FAILED' }, 500, corsHeaders);
    }
}


async function handleAdminSupabaseMemberDetail(request, env, corsHeaders) {
    let admin;
    try { admin = await requireFirebaseAdmin(request, env); requireSupabaseLedgerConfigured(env); }
    catch (error) { return json({ ok: false, message: error.message || '관리자 권한 또는 Supabase 설정을 확인해 주세요.', code: error.code || 'ADMIN_FORBIDDEN' }, error.status || 403, corsHeaders); }
    const requestUrl = new URL(request.url);
    const firebaseUid = String(requestUrl.searchParams.get('firebase_uid') || requestUrl.searchParams.get('uid') || '').trim();
    if (!firebaseUid) return json({ ok: false, message: 'firebase_uid가 필요합니다.', code: 'FIREBASE_UID_REQUIRED' }, 400, corsHeaders);
    try {
        const [members, payments, enrollments, documents, logs, profile] = await Promise.all([
            supabaseLedgerRequest(env, 'members?select=*&firebase_uid=eq.' + encodeURIComponent(firebaseUid) + '&limit=1'),
            supabaseLedgerRequest(env, 'payments?select=*&firebase_uid=eq.' + encodeURIComponent(firebaseUid) + '&order=paid_at.desc.nullslast,created_at.desc'),
            supabaseLedgerRequest(env, 'enrollments?select=*&firebase_uid=eq.' + encodeURIComponent(firebaseUid) + '&order=started_at.desc.nullslast,created_at.desc'),
            supabaseLedgerRequest(env, 'documents?select=*&firebase_uid=eq.' + encodeURIComponent(firebaseUid) + '&order=created_at.desc'),
            supabaseLedgerRequest(env, 'activity_logs?select=*&firebase_uid=eq.' + encodeURIComponent(firebaseUid) + '&order=event_at.asc'),
            firestoreGetDataOrNull(env, 'users', firebaseUid).catch(() => null)
        ]);
        const member = Array.isArray(members) ? members[0] || null : null;
        const enrichedMember = member || profile ? {
            ...(member || { firebase_uid: firebaseUid }),
            name: member?.name || firstPresent(profile, ['name', 'realName', 'fullName', 'displayName']) || null,
            login_id: member?.login_id || member?.email || firstPresent(profile, ['loginId', 'login_id', 'email']) || null,
            email: member?.email || firstPresent(profile, ['email', 'loginId', 'login_id']) || null,
            birth_date: member?.birth_date || getAdminProfileBirthDate(profile) || null,
            phone: member?.phone || getAdminProfilePhone(profile) || null
        } : null;
        return json({ ok: true, member: enrichedMember, payments: payments || [], enrollments: enrollments || [], documents: documents || [], activityLogs: logs || [], admin: { uid: admin.uid, email: admin.email } }, 200, corsHeaders);
    } catch (error) {
        console.error('[admin-supabase-member-detail:failed]', { firebaseUid: maskLogIdentifier(firebaseUid), message: error instanceof Error ? error.message : String(error) });
        return json({ ok: false, message: error instanceof Error ? error.message : 'Supabase 회원 상세 조회 실패', code: 'SUPABASE_MEMBER_DETAIL_FAILED' }, 500, corsHeaders);
    }
}

async function firestoreCountCollection(env, collectionName) {
    assertFirestoreReadAllowed(env, 'COUNT ' + collectionName);
    const projectId = getFirestoreProjectId(env);
    const token = await getGoogleAccessToken(env);
    const response = await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runAggregationQuery`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ structuredAggregationQuery: { structuredQuery: { from: [{ collectionId: collectionName }] }, aggregations: [{ alias: 'count', count: {} }] } })
    });
    if (!response.ok) return null;
    const rows = await response.json().catch(() => []);
    const value = rows?.[0]?.result?.aggregateFields?.count;
    return Number(value?.integerValue || value?.doubleValue || 0);
}

async function supabaseLedgerCountTable(env, tableName) {
    if (!hasSupabaseLedgerConfig(env)) return null;
    const response = await fetch(getSupabaseUrl(env, tableName + '?select=id&limit=1'), {
        method: 'GET',
        headers: getSupabaseHeaders(env, 'count=exact')
    });
    if (!response.ok) return null;
    const range = response.headers.get('content-range') || '';
    const total = Number(range.split('/').pop());
    return Number.isFinite(total) ? total : null;
}

async function firestoreCountCollectionSafe(env, collectionName) {
    try { return await firestoreCountCollection(env, collectionName); }
    catch (error) {
        console.warn('[supabase-migration:firestore-count-failed]', { collectionName, message: error instanceof Error ? error.message : String(error) });
        return null;
    }
}

async function firestoreListCollectionSafe(env, collectionName) {
    try { return await firestoreList(env, collectionName); }
    catch (error) {
        console.warn('[supabase-migration:firestore-list-failed]', { collectionName, message: error instanceof Error ? error.message : String(error) });
        return [];
    }
}

async function handleAdminSupabaseMigrationInspect(request, env, corsHeaders) {
    let admin;
    try { admin = await requireFirebaseAdmin(request, env); }
    catch (error) { return json({ ok: false, message: error.message || '관리자 권한을 확인해 주세요.', code: error.code || 'ADMIN_FORBIDDEN' }, error.status || 403, corsHeaders); }
    try {
        const firestoreCollections = ['users', 'payments', 'purchases', 'orders', 'enrollments', 'courseProgress', 'certificates', 'documentOutputLogs'];
        const [authUsers, firestoreCounts, supabaseCounts] = await Promise.all([
            listAllFirebaseAuthUsersForAdminSync(env, 10000),
            Promise.all(firestoreCollections.map((name) => firestoreCountCollectionSafe(env, name))),
            Promise.all(['members', 'payments', 'enrollments', 'documents', 'activity_logs'].map((name) => supabaseLedgerCountTable(env, name)))
        ]);
        const counts = { authUsers: authUsers.length };
        firestoreCollections.forEach((name, index) => { counts[name] = firestoreCounts[index]; });
        const supabase = { members: supabaseCounts[0], payments: supabaseCounts[1], enrollments: supabaseCounts[2], documents: supabaseCounts[3], activityLogs: supabaseCounts[4], configured: hasSupabaseLedgerConfig(env) };
        console.log('[supabase-migration:inspect]', { counts, supabase });
        return json({ ok: true, counts, supabase, checkedAt: new Date().toISOString(), admin: { uid: admin.uid, email: admin.email } }, 200, corsHeaders);
    } catch (error) {
        console.error('[admin-supabase-migration-inspect:failed]', { message: error instanceof Error ? error.message : String(error) });
        return json({ ok: false, message: error instanceof Error ? error.message : '마이그레이션 사전 점검 실패', code: 'SUPABASE_MIGRATION_INSPECT_FAILED' }, 500, corsHeaders);
    }
}

function normalizeLedgerEmail(value) {
    return String(value || '').trim().toLowerCase();
}

function getRowCustomData(row) {
    return parsePortOneCustomData(row?.customData || row?.custom_data || row?.rawResponse?.customData || row?.raw_response?.customData || row?.raw_response?.custom_data);
}

function firstPresent(row, keys) {
    for (const key of keys) {
        const value = row?.[key];
        if (value !== undefined && value !== null && String(value).trim() !== '') return value;
    }
    return null;
}

function getRowEmail(row) {
    const customData = getRowCustomData(row);
    return firstPresent(row, ['login_id', 'loginId', 'email', 'userEmail', 'user_email', 'customerEmail', 'customer_email', 'buyerEmail', 'buyer_email'])
        || row?.customer?.email || row?.rawResponse?.customer?.email || row?.raw_response?.customer?.email
        || customData.email || customData.userEmail || customData.user_email || customData.customerEmail || customData.customer_email || customData.buyerEmail || customData.buyer_email;
}

function getRowFirebaseUid(row, identity = null) {
    const customData = getRowCustomData(row);
    const direct = firstPresent(row, ['firebase_uid', 'firebaseUid', 'uid', 'userId', 'user_id', 'customerUid', 'customer_uid', 'buyerUid', 'buyer_uid', 'targetUid', 'target_uid', 'shop_user_id', 'customerId', 'customer_id'])
        || row?.customer?.id || row?.customer?.customerId || row?.customer?.customer_id
        || row?.rawResponse?.customer?.id || row?.rawResponse?.customer?.customerId || row?.rawResponse?.customer?.customer_id
        || customData.uid || customData.userId || customData.user_id || customData.firebaseUid || customData.firebase_uid || customData.customerUid || customData.customer_uid || customData.shop_user_id;
    if (direct) return String(direct).trim();
    const email = normalizeLedgerEmail(getRowEmail(row));
    return email && identity?.uidByEmail?.get(email) ? identity.uidByEmail.get(email) : '';
}

async function resolveSupabaseMigrationIdentityForRow(env, row, phase) {
    const directUid = getRowFirebaseUid(row, null);
    const email = normalizeLedgerEmail(getRowEmail(row));
    if (directUid) return { uid: directUid, email, source: 'direct' };
    if (phase === 'users' && row?.id) return { uid: String(row.id), email, source: 'users_doc_id' };
    if (!email) return { uid: '', email: '', source: 'missing' };
    const authRows = await lookupFirebaseAuthUsers(env, { emails: [email] }).catch(() => []);
    const authUser = authRows.find((user) => normalizeLedgerEmail(user.email) === email) || authRows[0] || null;
    if (authUser?.uid) return { uid: String(authUser.uid), email, source: 'auth_email' };
    const userRows = await firestoreQuery(env, 'users', [{ field: 'email', value: email }]).catch(() => []);
    const userRow = userRows.find((user) => getRowFirebaseUid(user, null) || user.id) || null;
    const uid = getRowFirebaseUid(userRow, null) || userRow?.id || '';
    return { uid: uid ? String(uid) : '', email, source: uid ? 'firestore_user_email' : 'unresolved_email' };
}

function withResolvedSupabaseUid(row, resolved) {
    if (!resolved?.uid) return row;
    return {
        ...row,
        uid: row?.uid || resolved.uid,
        userId: row?.userId || resolved.uid,
        firebaseUid: row?.firebaseUid || resolved.uid,
        email: row?.email || resolved.email || null,
        userEmail: row?.userEmail || resolved.email || null,
        migrationIdentitySource: resolved.source || null
    };
}

function getRowCourseId(row) {
    const customData = getRowCustomData(row);
    const productId = row?.productId || row?.product_id || customData.productId || customData.product_id;
    const raw = firstPresent(row, ['courseId', 'course_id', 'canonicalCourseId', 'canonical_course_id', 'productCourseId', 'product_course_id']) || customData.courseId || customData.course_id;
    if (raw) return resolveCanonicalCourseId({ courseId: String(raw), productId }) || String(raw);
    if (productId) {
        const product = APPLICATION_PRODUCTS[productId] || getCourseProduct(productId);
        if (product?.courseId) return product.courseId;
    }
    return '';
}

function buildSupabaseMigrationIdentity(authUsers, firestoreUsers) {
    const uidByEmail = new Map();
    const authByUid = new Map();
    for (const user of authUsers || []) {
        if (user?.uid) authByUid.set(String(user.uid), user);
        const email = normalizeLedgerEmail(user?.email);
        if (email && user?.uid && !uidByEmail.has(email)) uidByEmail.set(email, String(user.uid));
    }
    for (const user of firestoreUsers || []) {
        const uid = getRowFirebaseUid(user);
        const email = normalizeLedgerEmail(getRowEmail(user));
        if (email && uid && !uidByEmail.has(email)) uidByEmail.set(email, uid);
    }
    return { uidByEmail, authByUid };
}

function firestoreUserToSupabaseMember(row, identity = null) {
    const uid = getRowFirebaseUid(row, identity);
    return {
        firebase_uid: uid,
        email: getRowEmail(row) || null,
        name: firstPresent(row, ['name', 'realName', 'fullName', 'displayName']) || null,
        phone: firstPresent(row, ['phone', 'phoneNumber', 'phone_number', 'mobile', 'tel', 'telephone']) || null,
        birth_date: firstPresent(row, ['birthDate', 'dateOfBirth', 'date_of_birth', 'birth_date', 'birthday', 'certificateBirthDate', 'certificate_birth_date']) || null,
        joined_at: firstPresent(row, ['createdAt', 'joinedAt', 'signupAt']) || null,
        last_login_at: firstPresent(row, ['lastLoginAt', 'lastSignInAt']) || null,
        member_status: firstPresent(row, ['memberStatus', 'status']) || 'active',
        total_paid_amount: firstPresent(row, ['totalPaidAmount', 'total_paid_amount']) || 0,
        last_payment_at: row.lastPaymentDate || row.lastPaymentAt || row.adminPaymentSummary?.paidAt || row.adminPaymentSummary?.lastPaymentAt || null,
        last_course_id: row.lastCourseId || row.adminPaymentSummary?.courseId || null,
        last_course_name: row.lastCourseName || row.adminPaymentSummary?.courseTitle || row.adminPaymentSummary?.productTitle || null,
        last_enrollment_status: row.enrollmentStatus || row.lastEnrollmentStatus || null,
        last_completion_status: row.completionStatus || row.lastCompletionStatus || null,
        last_completion_date: row.completionDate || row.completedAt || null
    };
}

function firestorePaymentToSupabaseInput(row, identity = null) {
    const uid = getRowFirebaseUid(row, identity);
    const orderId = firstPresent(row, ['orderId', 'merchantUid', 'paymentId', 'paymentKey', 'id']);
    return {
        ...row,
        uid,
        userId: uid,
        orderId,
        paymentId: firstPresent(row, ['paymentId', 'payment_id', 'paymentKey', 'payment_key', 'impUid', 'imp_uid', 'transactionId', 'transaction_id', 'id']),
        loginId: getRowEmail(row),
        userEmail: getRowEmail(row),
        userName: firstPresent(row, ['userName', 'user_name', 'memberName', 'member_name', 'customerName', 'customer_name', 'buyerName', 'buyer_name', 'certificateName', 'certificate_name']) || row?.customer?.name || row?.customer?.fullName || row?.rawResponse?.customer?.name || row?.rawResponse?.customer?.fullName || getRowCustomData(row).userName || getRowCustomData(row).user_name || getRowCustomData(row).certificateName || getRowCustomData(row).certificate_name || null,
        courseId: getRowCourseId(row),
        courseName: getLedgerCourseName(row),
        paidAt: firstPresent(row, ['paidAt', 'paid_at', 'approvedAt', 'approved_at', 'purchasedAt', 'purchased_at', 'orderedAt', 'ordered_at', 'createdAt', 'created_at']),
        sourceCollection: row.sourceCollection || null
    };
}

function firestoreEnrollmentToSupabaseInput(row, identity = null, related = {}) {
    const uid = getRowFirebaseUid(row, identity);
    const progress = related.progress || null;
    const certificate = related.certificate || null;
    const outputLogs = related.outputLogs || [];
    const firstOutputAt = earliestLedgerTimestamp(outputLogs.map((log) => firstPresent(log, ['certificateFirstIssuedAt', 'firstIssuedAt', 'issuedAt', 'createdAt'])));
    const lastOutputAt = latestLedgerTimestamp(outputLogs.map((log) => firstPresent(log, ['lastCertificateIssuedAt', 'issuedAt', 'updatedAt', 'createdAt'])));
    const issueCountFromLogs = outputLogs.reduce((sum, log) => sum + Math.max(0, Number(log.issueCount || log.certificateIssueCount || 1)), 0);
    const firstIssued = firstPresent(row, ['certificateFirstIssuedAt', 'certificateIssuedAt', 'issuedAt']) || firstPresent(certificate, ['certificateFirstIssuedAt', 'firstIssuedAt', 'issuedAt', 'createdAt']) || firstOutputAt;
    const lastIssued = firstPresent(row, ['lastCertificateIssuedAt', 'certificateIssuedAt', 'issuedAt']) || firstPresent(certificate, ['lastCertificateIssuedAt', 'issuedAt', 'updatedAt', 'createdAt']) || lastOutputAt || firstIssued;
    const completionDate = firstPresent(row, ['completionDate', 'completedAt']) || firstPresent(progress, ['completionDate', 'completedAt']) || firstPresent(certificate, ['completionDate', 'completedAt']);
    return {
        ...row,
        uid,
        userId: uid,
        orderId: firstPresent(row, ['orderId', 'paymentId', 'merchantUid']) || null,
        courseId: getRowCourseId(row),
        courseName: getLedgerCourseName(row),
        startedAt: firstPresent(row, ['startedAt', 'startsAt', 'accessStartsAt', 'purchasedAt', 'createdAt']) || firstPresent(progress, ['startedAt', 'createdAt']),
        expiresAt: firstPresent(row, ['expiresAt', 'accessEndsAt']),
        progress: firstPresent(row, ['progress', 'progressRate', 'completionRate']) ?? firstPresent(progress, ['progress', 'progressRate', 'completionRate']) ?? 0,
        enrollmentStatus: firstPresent(row, ['enrollmentStatus', 'accessStatus', 'status']),
        completionStatus: row.completionStatus || (completionDate ? 'completed' : undefined),
        completionDate,
        certificateIssued: Boolean(row.certificateIssued || certificate || firstIssued || outputLogs.length),
        certificateFirstIssuedAt: firstIssued,
        lastCertificateIssuedAt: lastIssued,
        certificateIssueCount: Number(row.certificateIssueCount || issueCountFromLogs || (firstIssued ? 1 : 0))
    };
}

function ledgerTimeValue(value) {
    const normalized = normalizeLedgerTimestamp(value);
    return normalized ? Date.parse(normalized) : 0;
}

function earliestLedgerTimestamp(values) {
    const times = values.map(normalizeLedgerTimestamp).filter(Boolean).sort((a, b) => Date.parse(a) - Date.parse(b));
    return times[0] || null;
}

function latestLedgerTimestamp(values) {
    const times = values.map(normalizeLedgerTimestamp).filter(Boolean).sort((a, b) => Date.parse(b) - Date.parse(a));
    return times[0] || null;
}

function pushLedgerMapList(map, key, value) {
    if (!key) return;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(value);
}

function ledgerUserCourseKey(uid, courseId) {
    return uid && courseId ? uid + '_' + courseId : '';
}

const SUPABASE_MIGRATION_PHASES = ['authMembers', 'users', 'payments', 'purchases', 'orders', 'enrollments', 'courseProgress', 'certificates', 'documentOutputLogs'];

function getNextSupabaseMigrationPhase(phase) {
    const index = SUPABASE_MIGRATION_PHASES.indexOf(phase);
    return index >= 0 && index + 1 < SUPABASE_MIGRATION_PHASES.length ? SUPABASE_MIGRATION_PHASES[index + 1] : null;
}

function getSupabaseMigrationFirestoreCollection(phase) {
    return phase === 'authMembers' ? '' : phase;
}

async function processSupabaseMigrationRow(env, phase, row) {
    if (phase === 'authMembers') {
        const member = {
            firebase_uid: row.uid,
            email: row.email || null,
            name: row.realName || row.fullName || row.displayName || null,
            joined_at: row.createdAt || null,
            last_login_at: row.lastLoginAt || null,
            member_status: row.disabled ? 'disabled' : 'active'
        };
        if (!member.firebase_uid) return { type: 'member', ok: false, skipped: true };
        const result = await supabaseLedgerUpsertMember(env, member, { eventType: 'member_joined', description: 'Firebase/Auth 과거 회원 동기화', eventAt: member.joined_at, metadata: { source: 'firebase_migration' }, event_key: 'member_joined:' + member.firebase_uid });
        return { type: 'member', ok: Boolean(result), skipped: !result };
    }
    if (phase === 'users') {
        const resolved = await resolveSupabaseMigrationIdentityForRow(env, row, phase);
        const member = firestoreUserToSupabaseMember(withResolvedSupabaseUid(row, resolved), null);
        if (!member.firebase_uid) return { type: 'member', ok: false, skipped: true, reason: resolved.source || 'missing_uid' };
        const result = await supabaseLedgerUpsertMember(env, member, { eventType: 'member_joined', description: 'Firestore users 과거 회원 동기화', eventAt: member.joined_at, metadata: { source: 'firestore_users_migration', source_id: row.id || null, identity_source: resolved.source || null }, event_key: 'member_joined:' + member.firebase_uid });
        return { type: 'member', ok: Boolean(result), skipped: !result };
    }
    if (['payments', 'purchases', 'orders'].includes(phase)) {
        const resolved = await resolveSupabaseMigrationIdentityForRow(env, row, phase);
        const payment = firestorePaymentToSupabaseInput({ ...withResolvedSupabaseUid(row, resolved), sourceCollection: phase }, null);
        if (!payment.uid || !payment.orderId) return { type: 'payment', ok: false, skipped: true, reason: resolved.source || 'missing_uid_or_order' };
        const result = await supabaseLedgerRecordPayment(env, payment, { preserveExisting: true });
        return { type: 'payment', ok: Boolean(result), skipped: !result };
    }
    if (['enrollments', 'courseProgress', 'certificates'].includes(phase)) {
        const resolved = await resolveSupabaseMigrationIdentityForRow(env, row, phase);
        const rowWithUid = withResolvedSupabaseUid(row, resolved);
        const enrollment = firestoreEnrollmentToSupabaseInput(rowWithUid, null, phase === 'courseProgress' ? { progress: rowWithUid } : phase === 'certificates' ? { certificate: rowWithUid } : {});
        if (!enrollment.uid || !enrollment.courseId) return { type: 'enrollment', ok: false, skipped: true, reason: resolved.source || 'missing_uid_or_course' };
        const result = await supabaseLedgerUpsertEnrollment(env, enrollment);
        if (phase === 'certificates') {
            await supabaseLedgerRecordDocument(env, {
                uid: enrollment.uid,
                courseId: enrollment.courseId,
                courseName: enrollment.courseName,
                orderId: enrollment.orderId,
                documentType: firstPresent(row, ['documentType', 'documentKind']) || 'certificate',
                documentName: firstPresent(row, ['documentTitle', 'courseTitle', 'certificateNo', 'issueNumber']) || '수료증',
                documentAction: 'generated',
                documentKey: row.certificateId || row.id,
                certificateId: row.certificateId || row.id || null,
                certificateNo: row.certificateNo || row.issueNumber || null,
                firstIssuedAt: firstPresent(row, ['firstDocumentOutputAt', 'documentFirstOutputAt', 'firstIssuedAt', 'issuedAt', 'certificateIssuedAt', 'createdAt']),
                eventAt: firstPresent(row, ['issuedAt', 'certificateIssuedAt', 'createdAt']),
                issueCount: row.issueCount || row.certificateIssueCount || 1,
                source: 'firebase_migration',
                eventKey: 'migration:certificates:' + (row.id || row.certificateId || [enrollment.uid, enrollment.courseId].join(':')),
                metadata: { source_collection: 'certificates', source_id: row.id || row.certificateId || null }
            });
        }
        return { type: 'enrollment', ok: Boolean(result), skipped: !result };
    }
    if (phase === 'documentOutputLogs') {
        const resolved = await resolveSupabaseMigrationIdentityForRow(env, row, phase);
        const rowWithUid = withResolvedSupabaseUid(row, resolved);
        const uid = getRowFirebaseUid(rowWithUid, null);
        const courseId = getRowCourseId(rowWithUid);
        if (!uid) return { type: 'document', ok: false, skipped: true, reason: resolved.source || 'missing_uid' };
        const action = String(row.action || row.method || '').toLowerCase() === 'print' ? 'print_requested' : String(row.action || row.method || '').toLowerCase() === 'pdf' ? 'downloaded' : 'generated';
        const result = await supabaseLedgerRecordDocument(env, {
            uid,
            courseId,
            courseName: getLedgerCourseName(row),
            orderId: firstPresent(row, ['orderId', 'paymentId']),
            documentType: firstPresent(row, ['documentType', 'documentKind']) || 'certificate',
            documentName: firstPresent(row, ['documentTitle', 'materialTitle', 'courseTitle', 'certificateNo', 'issueNumber']) || '문서',
            documentAction: action,
            documentKey: row.rawDocumentKey || row.documentKey || row.certificateId || row.logId || row.id,
            certificateId: row.certificateId || null,
            certificateNo: row.certificateNo || row.issueNumber || null,
            firstIssuedAt: firstPresent(row, ['firstDocumentOutputAt', 'documentFirstOutputAt', 'firstIssuedAt', 'issuedAt', 'certificateIssuedAt', 'createdAt']),
            eventAt: firstPresent(row, ['lastIssuedAt', 'issuedAt', 'certificateIssuedAt', 'firstDocumentOutputAt', 'createdAt']),
            issueCount: row.issueCount || row.certificateIssueCount || 1,
            downloadCount: action === 'downloaded' ? 1 : 0,
            printCount: action === 'print_requested' ? 1 : 0,
            source: 'firebase_migration',
            eventKey: 'migration:documentOutputLogs:' + (row.id || row.logId || [uid, courseId].join(':')),
            metadata: { source_collection: 'documentOutputLogs', source_id: row.id || row.logId || null }
        });
        return { type: 'document', ok: Boolean(result), skipped: !result };
    }
    return { type: 'unknown', ok: false, skipped: true };
}

async function handleAdminSupabaseMigrationRun(request, env, corsHeaders) {
    let admin;
    try { admin = await requireFirebaseAdmin(request, env); requireSupabaseLedgerConfigured(env); }
    catch (error) { return json({ ok: false, message: error.message || '관리자 권한 또는 Supabase 설정을 확인해 주세요.', code: error.code || 'ADMIN_FORBIDDEN' }, error.status || 403, corsHeaders); }
    const body = await request.json().catch(() => ({}));
    if (body.confirm !== 'COPY_FIREBASE_TO_SUPABASE') return json({ ok: false, message: '마이그레이션 실행 확인 문구가 필요합니다.', code: 'CONFIRMATION_REQUIRED' }, 400, corsHeaders);
    const phase = SUPABASE_MIGRATION_PHASES.includes(String(body.phase || '')) ? String(body.phase) : SUPABASE_MIGRATION_PHASES[0];
    const cursor = String(body.cursor || '');
    const batchSize = Math.max(1, Math.min(Number(body.batchSize || 3), 5));
    try {
        let rows = [];
        let nextCursor = '';
        if (phase === 'authMembers') {
            const page = await listFirebaseAuthUsersPage(env, batchSize, cursor);
            rows = page.users || [];
            nextCursor = page.nextPageToken || '';
        } else {
            const page = await firestoreListPage(env, getSupabaseMigrationFirestoreCollection(phase), { pageSize: batchSize, pageToken: cursor });
            rows = page.rows || [];
            nextCursor = page.nextPageToken || '';
        }
        const summary = { memberCount: 0, paymentCount: 0, enrollmentCount: 0, documentCount: 0, skippedCount: 0, failedCount: 0 };
        for (const row of rows) {
            try {
                const result = await processSupabaseMigrationRow(env, phase, row);
                if (result.skipped) summary.skippedCount += 1;
                else if (result.type === 'member') summary.memberCount += 1;
                else if (result.type === 'payment') summary.paymentCount += 1;
                else if (result.type === 'enrollment') summary.enrollmentCount += 1;
                else if (result.type === 'document') summary.documentCount += 1;
            } catch (error) {
                summary.failedCount += 1;
                console.error('[supabase-migration:row-failed]', { phase, id: row?.id || row?.uid || null, message: error instanceof Error ? error.message : String(error) });
            }
        }
        const nextPhase = nextCursor ? phase : getNextSupabaseMigrationPhase(phase);
        const done = !nextPhase;
        const response = { ok: true, phase, cursor, nextCursor, nextPhase, done, batchSize, processedCount: rows.length, ...summary, message: done ? 'Supabase 추가 복사가 완료되었습니다. Firebase 원본은 변경하지 않았습니다.' : '배치 복사가 진행 중입니다.' };
        console.log('[supabase-migration:run:batch]', response);
        return json(response, 200, corsHeaders);
    } catch (error) {
        console.error('[admin-supabase-migration-run:failed]', { phase, message: error instanceof Error ? error.message : String(error) });
        return json({ ok: false, message: error instanceof Error ? error.message : 'Supabase 마이그레이션 실패', code: 'SUPABASE_MIGRATION_RUN_FAILED', phase }, 500, corsHeaders);
    }
}

async function handleAdminMemberDataset(request, env, corsHeaders) {
    let admin;
    try {
        admin = await requireFirebaseAdmin(request, env);
    } catch (error) {
        return json({ message: error.message || '관리자 권한이 없습니다.', code: 'ADMIN_FORBIDDEN' }, error.status || 403, corsHeaders);
    }
    const url = new URL(request.url);
    const view = String(url.searchParams.get('view') || 'dashboard');
    const requestedLimit = Number(url.searchParams.get('limit') || 30);
    const limit = Math.max(10, Math.min(requestedLimit, 50));
    const offset = Math.max(0, Number(url.searchParams.get('offset') || 0));
    const warnings = [];
    const config = getAdminMemberDatasetConfig(view);
    const pageSize = Math.min(limit, Number(config.pageSize || limit));
    try {
        const authUsers = config.authUsers ? await listRecentFirebaseAuthUsers(env, pageSize, offset) : [];
        const dataset = {
            authUsers,
            users: [],
            payments: [],
            purchases: [],
            orders: [],
            enrollments: [],
            certificates: [],
            progress: [],
            documentOutputLogs: [],
            paymentLogs: [],
            refundPolicies: [],
            adminLogs: []
        };

        const recentResults = await Promise.all(config.recent.map(([collectionName, orderBy]) => (
            firestoreListLimited(env, collectionName, { pageSize, orderBy }).catch((error) => {
                warnings.push(collectionName + ':' + (error instanceof Error ? error.message : String(error)));
                return [];
            })
        )));
        config.recent.forEach(([collectionName], index) => {
            const key = collectionResultKey(collectionName);
            dataset[key] = mergeOperationalRows([...(dataset[key] || []), ...recentResults[index]]);
        });
        if (view === 'users' && authUsers.length) {
            const profileRowsByDocId = await getUserProfileRowsByDocumentIds(env, authUsers.map(getOperationalUid), { limit: pageSize, warnings });
            dataset.users = mergeOperationalRows([...(dataset.users || []), ...profileRowsByDocId]);
        }

        const activityRows = [
            ...dataset.users, ...dataset.payments, ...dataset.purchases, ...dataset.orders, ...dataset.enrollments,
            ...dataset.progress, ...dataset.certificates, ...dataset.documentOutputLogs, ...dataset.paymentLogs
        ];
        const seedUids = Array.from(new Set([
            ...authUsers.map(getOperationalUid),
            ...dataset.users.map((row) => getOperationalUid(row) || String(row.id || '').trim()),
            ...activityRows.map(getOperationalUid)
        ].filter(Boolean)));
        const seedEmails = Array.from(new Set([...authUsers, ...activityRows].map(getOperationalEmail).filter(Boolean)));
        const identitySeed = {
            uids: seedUids.slice(0, pageSize),
            emails: seedEmails.slice(0, pageSize)
        };
        const lookedUpAuthUsers = await lookupFirebaseAuthUsers(env, identitySeed).catch((error) => {
            warnings.push('auth:lookup:' + (error instanceof Error ? error.message : String(error)));
            return [];
        });
        dataset.authUsers = mergeOperationalRows([...authUsers, ...lookedUpAuthUsers]);
        if (view === 'users') {
            dataset.users = mergeOperationalRows([
                ...mergeRecentAuthUsersWithProfiles(dataset.authUsers, dataset.users || []),
                ...(dataset.users || [])
            ]);
        }

        const identity = {
            uids: Array.from(new Set([...identitySeed.uids, ...lookedUpAuthUsers.map((row) => row.uid).filter(Boolean)])).slice(0, limit),
            emails: Array.from(new Set([...identitySeed.emails, ...lookedUpAuthUsers.map((row) => row.email).filter(Boolean)])).slice(0, limit)
        };
        const relatedEntries = Object.entries(config.related || {});
        const relatedResults = await Promise.all(relatedEntries.map(([collectionName, fields]) => (
            getAdminRowsByIdentity(env, collectionName, identity, fields, { limit: config.relatedLimit || pageSize, warnings })
        )));
        relatedEntries.forEach(([collectionName], index) => {
            const key = collectionResultKey(collectionName);
            dataset[key] = mergeOperationalRows([...(dataset[key] || []), ...relatedResults[index]]);
        });
        if (view === 'users') attachAdminPaymentSummariesToUsers(dataset);

        return json({ ok: true, view, limit: pageSize, offset, checkedAt: new Date().toISOString(), warnings, dataset, identity: { uidCount: identity.uids.length, emailCount: identity.emails.length }, admin: { uid: admin.uid, email: admin.email, role: admin.role } }, 200, corsHeaders);
    } catch (error) {
        console.error('[admin-member-dataset:failed]', { message: error instanceof Error ? error.message : String(error), view });
        return json({ ok: false, message: error instanceof Error ? error.message : '관리자 데이터 조회 실패', code: 'ADMIN_MEMBER_DATASET_FAILED', warnings }, 500, corsHeaders);
    }
}

async function firestoreQuery(env, collectionName, filters) {
    assertFirestoreReadAllowed(env, 'QUERY ' + collectionName);
    const projectId = getFirestoreProjectId(env);
    const token = await getGoogleAccessToken(env);
    const fieldFilters = filters.map(({ field, value }) => ({
        fieldFilter: {
            field: { fieldPath: field },
            op: 'EQUAL',
            value: toFirestoreValue(value)
        }
    }));
    const where = fieldFilters.length === 1
        ? fieldFilters[0]
        : { compositeFilter: { op: 'AND', filters: fieldFilters } };
    const response = await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ structuredQuery: { from: [{ collectionId: collectionName }], where, limit: 100 } })
    });
    if (!response.ok) {
        const body = await response.text().catch(() => '');
        const error = new Error(`Firestore QUERY failed: ${response.status} ${body}`);
        error.status = response.status;
        throw error;
    }
    const rows = await response.json().catch(() => []);
    return rows.flatMap((row) => {
        const document = row.document;
        if (!document) return [];
        const documentPath = String(document.name || '');
        return [{ id: documentPath.split('/').pop(), documentPath, ...fromFirestoreFields(document.fields || {}), recordSource: collectionName + '_query' }];
    });
}

function fromFirestoreFields(fields) {
    return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, fromFirestoreValue(value)]));
}

function fromFirestoreValue(value) {
    if ('stringValue' in value) return value.stringValue;
    if ('integerValue' in value) return Number(value.integerValue);
    if ('doubleValue' in value) return Number(value.doubleValue);
    if ('booleanValue' in value) return Boolean(value.booleanValue);
    if ('timestampValue' in value) return value.timestampValue;
    if ('nullValue' in value) return null;
    if ('arrayValue' in value) return (value.arrayValue.values || []).map(fromFirestoreValue);
    if ('mapValue' in value) return fromFirestoreFields(value.mapValue.fields || {});
    return null;
}

export { getEnrollmentAccessDecision, isFirestoreEnrollmentActiveRecord, normalizeEnrollmentSourceType };
