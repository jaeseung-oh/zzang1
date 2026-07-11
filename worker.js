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
    'afa89d104a50e779ee12112f1ec59655'
]);

function getConfiguredCourseStreamUids(env) {
    return new Set([
        ...COURSE_STREAM_UIDS,
        env.STREAM_UID_VIOLENCE_PREVENTION,
        env.STREAM_UID_GAMBLING_RELAPSE_PREVENTION,
        env.STREAM_UID_SEXUAL_OFFENSE_PREVENTION
    ].filter(Boolean));
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
            return handlePortOneOrderCreate(request, env, corsHeaders);
        }

        if (url.pathname === '/api/payments/confirm' && request.method === 'POST') {
            return handlePaymentConfirm(request, env, corsHeaders);
        }

        if (url.pathname === '/api/payments/portone-webhook' && request.method === 'POST') {
            return handlePortOneWebhookSafely(request, env, corsHeaders);
        }

        if (url.pathname === '/api/certificates/issue' && request.method === 'POST') {
            return handleCertificateIssue(request, env, corsHeaders);
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

        if (url.pathname === '/api/admin/integrity' && request.method === 'GET') {
            return handleAdminIntegrityCheck(request, env, corsHeaders);
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

    headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-key');
    headers.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    return headers;
}

function json(payload, status = 200, baseHeaders = new Headers()) {
    const headers = new Headers(baseHeaders);
    headers.set('Content-Type', 'application/json; charset=utf-8');
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

function isFirestoreEnrollmentActiveRecord(enrollment) {
    if (!enrollment) return false;
    const paymentStatus = String(enrollment.paymentStatus || enrollment.status || '').toLowerCase();
    const paid = ['paid', 'done', 'completed', 'approved', 'success'].includes(paymentStatus);
    const accessStatus = String(enrollment.enrollmentStatus || enrollment.accessStatus || (paid ? 'active' : '')).toLowerCase();
    const blocked = ['cancelled', 'canceled', 'refunded', 'expired', 'failed'].includes(accessStatus)
        || ['cancelled', 'canceled', 'refunded', 'failed'].includes(paymentStatus);
    const expiresAt = enrollment.expiresAt ? new Date(enrollment.expiresAt).getTime() : null;
    return paid && !blocked && accessStatus === 'active' && (!expiresAt || expiresAt >= Date.now());
}

function isExplicitlyBlockedEnrollmentRecord(enrollment) {
    if (!enrollment) return false;
    const paymentStatus = String(enrollment.paymentStatus || enrollment.status || '').toLowerCase();
    const accessStatus = String(enrollment.enrollmentStatus || enrollment.accessStatus || '').toLowerCase();
    return ['cancelled', 'canceled', 'refunded', 'failed'].includes(paymentStatus)
        || ['cancelled', 'canceled', 'refunded'].includes(accessStatus);
}

function resolveApplicationProductIdFromRecord(source = {}, fallbackProductId = 'basic') {
    if (source.productId && APPLICATION_PRODUCTS[source.productId]) return source.productId;
    const byCourse = Object.values(APPLICATION_PRODUCTS).find((product) => product.courseId === source.courseId);
    if (byCourse) return byCourse.productId;
    const sourceAmount = Number(source.amount || source.totalAmount || 0);
    if (source.productId === 'dui-cbt-advanced' || source.courseId === CBT_COURSE_PRODUCT.courseId || sourceAmount >= APPLICATION_PRODUCTS['dui-cbt-advanced'].amount) {
        return 'dui-cbt-advanced';
    }
    if (source.productId === 'dui-documents' || sourceAmount >= APPLICATION_PRODUCTS['dui-documents'].amount) {
        return 'dui-documents';
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
        paymentStatus: 'paid',
        accessStatus: 'active',
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
    await firestorePatch(env, canonicalPath, repaired);
    logEnrollmentWorkerEvent('enrollment_canonical_repaired', { uid: maskLogIdentifier(uid), courseId, source: repaired.recoveredFrom });
    return { ...source, ...repaired, id: repaired.enrollmentId, documentPath: canonicalPath, recordSource: 'root_repaired' };
}

async function getWorkerCourseAccessDecision(env, user, courseId) {
    if (isWorkerAdminUser(user, env)) {
        return { allowed: true, enrollment: null, adminBypass: true };
    }
    const enrollment = await getWorkerEnrollmentRecord(env, user.uid, courseId);
    return { allowed: isFirestoreEnrollmentActiveRecord(enrollment), enrollment, adminBypass: false };
}

async function userHasWorkerCourseAccess(env, user, courseId) {
    const decision = await getWorkerCourseAccessDecision(env, user, courseId);
    return decision.allowed;
}

async function getWorkerEnrollmentRecord(env, uid, courseId) {
    const enrollmentId = uid + '_' + courseId;
    const canonicalPath = firestoreDocumentPath(env, 'enrollments', enrollmentId);
    const byId = await firestoreGet(env, canonicalPath).catch((error) => error.status === 404 ? null : Promise.reject(error));
    const canonical = byId ? { id: enrollmentId, documentPath: canonicalPath, ...fromFirestoreFields(byId.fields || {}), recordSource: 'root' } : null;
    logEnrollmentWorkerEvent('enrollment_root_checked', { uid: maskLogIdentifier(uid), courseId, exists: Boolean(canonical), active: isFirestoreEnrollmentActiveRecord(canonical) });
    if (isFirestoreEnrollmentActiveRecord(canonical)) return canonical;

    const nestedPath = firestoreDocumentPath(env, 'users/' + uid + '/enrollments', courseId);
    const nested = await firestoreGet(env, nestedPath).catch((error) => error.status === 404 ? null : Promise.reject(error));
    const nestedRecord = nested ? { id: courseId, documentPath: nestedPath, ...fromFirestoreFields(nested.fields || {}), recordSource: 'nested' } : null;
    logEnrollmentWorkerEvent('enrollment_nested_checked', { uid: maskLogIdentifier(uid), courseId, exists: Boolean(nestedRecord), active: isFirestoreEnrollmentActiveRecord(nestedRecord) });
    if (isFirestoreEnrollmentActiveRecord(nestedRecord)) {
        return repairCanonicalWorkerEnrollment(env, uid, courseId, nestedRecord, canonicalPath).catch((error) => {
            logEnrollmentWorkerEvent('enrollment_canonical_repair_failed', { uid: maskLogIdentifier(uid), courseId, source: 'nested', message: error instanceof Error ? error.message : String(error) });
            return nestedRecord;
        });
    }
    if (isExplicitlyBlockedEnrollmentRecord(canonical) || isExplicitlyBlockedEnrollmentRecord(nestedRecord)) {
        return canonical || nestedRecord;
    }

    // Historical purchases may use a payment/order ID as the document ID.
    const [byUserId, byUid] = await Promise.all([
        firestoreQuery(env, 'enrollments', [{ field: 'userId', value: uid }]),
        firestoreQuery(env, 'enrollments', [{ field: 'uid', value: uid }])
    ]);
    const matchesCourse = (row) => row.courseId === courseId || (!row.courseId && row.categoryId === 'dui');
    const candidates = [canonical, nestedRecord, ...byUserId, ...byUid].filter((row) => row && matchesCourse(row));
    const activeEnrollment = candidates.find(isFirestoreEnrollmentActiveRecord);
    if (activeEnrollment) {
        return repairCanonicalWorkerEnrollment(env, uid, courseId, activeEnrollment, canonicalPath).catch((error) => {
            logEnrollmentWorkerEvent('enrollment_canonical_repair_failed', { uid: maskLogIdentifier(uid), courseId, source: activeEnrollment.recordSource || 'historical_enrollment', message: error instanceof Error ? error.message : String(error) });
            return activeEnrollment;
        });
    }

    // Recover access from trusted, server-written purchase/payment records when
    // an enrollment document was removed or reset.
    const [purchasesByUserId, purchasesByUid, paymentsByUserId, paymentsByUid] = await Promise.all([
        firestoreQuery(env, 'purchases', [{ field: 'userId', value: uid }]),
        firestoreQuery(env, 'purchases', [{ field: 'uid', value: uid }]),
        firestoreQuery(env, 'payments', [{ field: 'userId', value: uid }]),
        firestoreQuery(env, 'payments', [{ field: 'uid', value: uid }])
    ]);
    const paidRecords = [...purchasesByUserId, ...purchasesByUid, ...paymentsByUserId, ...paymentsByUid]
        .filter(matchesCourse)
        .map((row) => {
            const purchasedAt = row.purchasedAt || row.approvedAt || row.orderedAt || row.createdAt || null;
            const purchasedTime = purchasedAt ? new Date(purchasedAt).getTime() : NaN;
            const expiresAt = row.expiresAt || (Number.isFinite(purchasedTime)
                ? new Date(purchasedTime + (getCourseProduct(courseId)?.durationDays || DUI_COURSE_PRODUCT.durationDays) * 24 * 60 * 60 * 1000).toISOString()
                : null);
            return {
                ...row,
                userId: row.userId || row.uid || uid,
                uid: row.uid || row.userId || uid,
                courseId,
                paymentStatus: row.paymentStatus || row.status,
                accessStatus: row.accessStatus || row.enrollmentStatus || 'active',
                purchasedAt,
                expiresAt
            };
        });
    const recovered = paidRecords.find(isFirestoreEnrollmentActiveRecord);
    if (!recovered) return candidates[0] || null;
    return repairCanonicalWorkerEnrollment(env, uid, courseId, { ...recovered, recordSource: recovered.recordSource || 'trusted_payment_record' }, canonicalPath).catch((error) => {
        logEnrollmentWorkerEvent('enrollment_canonical_repair_failed', { uid: maskLogIdentifier(uid), courseId, source: recovered.recordSource || 'trusted_payment_record', message: error instanceof Error ? error.message : String(error) });
        return recovered;
    });
}

async function enrichWorkerEnrollmentEntitlement(env, uid, courseId, enrollment) {
    try {
        const [purchasesByUserId, purchasesByUid, paymentsByUserId, paymentsByUid] = await Promise.all([
            firestoreQuery(env, 'purchases', [{ field: 'userId', value: uid }]),
            firestoreQuery(env, 'purchases', [{ field: 'uid', value: uid }]),
            firestoreQuery(env, 'payments', [{ field: 'userId', value: uid }]),
            firestoreQuery(env, 'payments', [{ field: 'uid', value: uid }])
        ]);
        const records = [...purchasesByUserId, ...purchasesByUid, ...paymentsByUserId, ...paymentsByUid]
            .filter((row) => {
                const paid = ['paid', 'done', 'completed', 'approved', 'success'].includes(String(row.paymentStatus || row.status || '').toLowerCase());
                const sameCourse = row.courseId === courseId || (!row.courseId && row.categoryId === 'dui');
                return paid && sameCourse;
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
        const resolvedProductId = resolveApplicationProductIdFromRecord({ ...enrollment, ...entitlement, amount }, enrollment.productId || 'basic');
        const product = APPLICATION_PRODUCTS[resolvedProductId] || APPLICATION_PRODUCTS.basic;
        return {
            ...enrollment,
            categoryId: entitlement.categoryId || enrollment.categoryId || product.categoryId || 'dui',
            productId: resolvedProductId,
            productTitle: entitlement.productTitle || enrollment.productTitle || product.title,
            courseTitle: enrollment.courseTitle || product.courseTitle,
            totalLessons: Number(enrollment.totalLessons) || product.totalLessons,
            amount: Number.isFinite(amount) && amount > 0 ? amount : enrollment.amount
        };
    } catch (error) {
        logEnrollmentWorkerEvent('enrollment_entitlement_lookup_failed', {
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
        courseId: enrollment.courseId,
        courseTitle: enrollment.courseTitle || product.courseTitle || DUI_COURSE_PRODUCT.courseTitle,
        categoryId: enrollment.categoryId || product.categoryId,
        productId: enrollment.productId || product.productId,
        productTitle: enrollment.productTitle || product.title,
        paymentId: enrollment.paymentId || null,
        orderId: enrollment.orderId || null,
        amount: typeof enrollment.amount === 'number' ? enrollment.amount : product.amount,
        paymentStatus: enrollment.paymentStatus || '',
        enrollmentStatus: enrollment.enrollmentStatus || enrollment.accessStatus || '',
        accessStatus: enrollment.accessStatus || enrollment.enrollmentStatus || '',
        purchasedAt: enrollment.purchasedAt || enrollment.approvedAt || null,
        expiresAt: enrollment.expiresAt || null,
        progress: Math.max(0, Math.min(100, Number.isFinite(progressRate) ? progressRate : 0)),
        completedLessons: Number.isFinite(completedLessons) ? completedLessons : 0,
        totalLessons: Number.isFinite(totalLessons) ? totalLessons : product.totalLessons,
        certificateIssued: Boolean(enrollment.certificateIssued),
        certificateId: enrollment.certificateId || null,
        certificateNo: enrollment.certificateNo || null,
    };
}

async function getWorkerAllActiveEnrollmentRecords(env, firebaseUser) {
    const uid = firebaseUser.uid;
    const [currentCourseEnrollment, advancedCourseEnrollment] = await Promise.all([
        getWorkerEnrollmentRecord(env, uid, DUI_COURSE_PRODUCT.courseId),
        getWorkerEnrollmentRecord(env, uid, CBT_COURSE_PRODUCT.courseId)
    ]);
    const [byUserId, byUid] = await Promise.all([
        firestoreQuery(env, 'enrollments', [{ field: 'userId', value: uid }]),
        firestoreQuery(env, 'enrollments', [{ field: 'uid', value: uid }])
    ]);

    const byCourse = new Map();
    [currentCourseEnrollment, advancedCourseEnrollment, ...byUserId, ...byUid]
        .filter((enrollment) => enrollment?.courseId && isFirestoreEnrollmentActiveRecord(enrollment))
        .forEach((enrollment) => {
            const existing = byCourse.get(enrollment.courseId);
            if (!existing || enrollment.recordSource === 'root_repaired' || enrollment.recordSource === 'root') {
                byCourse.set(enrollment.courseId, enrollment);
            }
        });

    return Promise.all(Array.from(byCourse.values()).map(async (enrollment) => {
        const courseId = enrollment.courseId;
        const enriched = await enrichWorkerEnrollmentEntitlement(env, uid, courseId, enrollment);
        const progressId = uid + '_' + courseId;
        const progress = await firestoreGetData(env, 'courseProgress', progressId).catch(() => null);
        return buildEnrollmentApiRecord(enriched, progress);
    }));
}

async function handleCurrentUserEnrollments(request, env, corsHeaders) {
    const url = new URL(request.url);
    const courseId = (url.searchParams.get('courseId') || DUI_COURSE_PRODUCT.courseId).trim();
    const scope = url.searchParams.get('scope') === 'all' ? 'all' : 'course';
    const authHeader = request.headers.get('Authorization') || '';
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    logEnrollmentWorkerEvent('enrollments_me_received', { method: request.method, courseId, scope });
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
            logEnrollmentWorkerEvent('enrollments_me_completed', { status: 500, code: 'ENROLLMENT_LOOKUP_FAILED', uid: maskedUid, scope });
            return json({ message: '수강권 서버 조회 중 오류가 발생했습니다.', code: 'ENROLLMENT_LOOKUP_FAILED' }, 500, corsHeaders);
        }
    }

    if (!getCourseProduct(courseId)) {
        logEnrollmentWorkerEvent('enrollments_me_completed', { status: 400, code: 'INVALID_COURSE', uid: maskedUid, courseId });
        return json({ message: '지원하지 않는 교육과정입니다.', code: 'INVALID_COURSE' }, 400, corsHeaders);
    }

    let enrollment;
    try {
        const accessDecision = await getWorkerCourseAccessDecision(env, firebaseUser, courseId);
        enrollment = accessDecision.enrollment;
    } catch (error) {
        const errorLike = error || {};
        logEnrollmentWorkerEvent('enrollment_access_result', {
            uid: maskedUid,
            courseId,
            allowed: false,
            reason: 'lookup_failed',
            firestoreStatus: typeof errorLike.status === 'number' ? errorLike.status : undefined
        });
        logEnrollmentWorkerEvent('enrollments_me_completed', { status: 500, code: 'ENROLLMENT_LOOKUP_FAILED', uid: maskedUid, courseId });
        return json({ message: '수강권 서버 조회 중 오류가 발생했습니다.', code: 'ENROLLMENT_LOOKUP_FAILED' }, 500, corsHeaders);
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
    enrollment = await enrichWorkerEnrollmentEntitlement(env, firebaseUser.uid, courseId, enrollment);
    const progressId = firebaseUser.uid + '_' + courseId;
    const progress = await firestoreGetData(env, 'courseProgress', progressId).catch((error) => {
        logEnrollmentWorkerEvent('enrollment_progress_unavailable', { uid: maskedUid, courseId, firestoreStatus: typeof error?.status === 'number' ? error.status : undefined });
        return null;
    });
    const apiEnrollment = buildEnrollmentApiRecord(enrollment, progress);
    logEnrollmentWorkerEvent('enrollments_me_completed', { status: 200, code: 'ACTIVE_ENROLLMENT', uid: maskedUid, courseId, count: 1 });
    return json({ enrollments: [apiEnrollment], courseId, access: true }, 200, corsHeaders);
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
    const courseId = (url.searchParams.get('courseId') || DUI_COURSE_PRODUCT.courseId).trim();

    if (!getConfiguredCourseStreamUids(env).has(uid)) {
        return json({ error: 'invalid_stream_uid', message: '지원하지 않는 강의 영상입니다.' }, 400, corsHeaders);
    }
    if (!getCourseProduct(courseId)) {
        return json({ error: 'invalid_course', message: '지원하지 않는 교육과정입니다.' }, 400, corsHeaders);
    }

    const allowed = await userHasWorkerCourseAccess(env, firebaseUser, courseId);
    if (!allowed) {
        return json({ error: 'enrollment_required', message: '수강권 결제 후 이용할 수 있습니다.' }, 403, corsHeaders);
    }

    const response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_STREAM_ACCOUNT_ID}/stream/${uid}/token`,
        {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${env.CLOUDFLARE_STREAM_API_TOKEN}`
            }
        }
    );

    const data = await response.json().catch(() => null);
    const token = data?.result?.token;

    if (!response.ok || !data?.success || !token) {
        const message =
            data?.errors?.[0]?.message ||
            data?.messages?.[0]?.message ||
            `Cloudflare Stream token failed: ${response.status}`;
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
    courseTitle: '음주운전 예방교육',
    price: 49000,
    currency: 'KRW',
    durationDays: 90,
    totalLessons: 3,
    pricePerLesson: 16333,
    description: '음주운전의 위험성과 법적 책임, 재범 예방을 위한 온라인 예방교육 과정',
    certificateAvailable: true
};

const CBT_COURSE_PRODUCT = {
    courseId: 'dui-cbt-advanced',
    courseTitle: '인지행동기반 재발방지교육 심화과정',
    price: 99000,
    currency: 'KRW',
    durationDays: 90,
    totalLessons: 2,
    pricePerLesson: 49500,
    description: '인지행동기반 재발방지 교육 심화과정',
    certificateAvailable: true
};

const NEW_PREVENTION_COURSE_PRODUCTS = {
    'violence-basic': { courseId: 'violence-basic', courseTitle: '폭력범죄 재범방지교육 기본과정', certificateTitle: '폭력범죄 재범방지교육', price: 49000, currency: 'KRW', durationDays: 90, totalLessons: 1, pricePerLesson: 49000, description: '폭력범죄 재범방지교육 기본과정', certificateAvailable: true },
    'violence-advanced': { courseId: 'violence-advanced', courseTitle: '폭력범죄 재범방지교육 심화과정', certificateTitle: '폭력범죄 재범방지교육', price: 99000, currency: 'KRW', durationDays: 90, totalLessons: 2, pricePerLesson: 49500, description: '폭력범죄 재범방지교육 심화과정', certificateAvailable: true, includesCbtCourse: true },
    'gambling-basic': { courseId: 'gambling-basic', courseTitle: '도박중독 재발방지교육 기본과정', certificateTitle: '도박중독 재발방지교육', price: 49000, currency: 'KRW', durationDays: 90, totalLessons: 1, pricePerLesson: 49000, description: '도박중독 재발방지교육 기본과정', certificateAvailable: true },
    'gambling-advanced': { courseId: 'gambling-advanced', courseTitle: '도박중독 재발방지교육 심화과정', certificateTitle: '도박중독 재발방지교육', price: 99000, currency: 'KRW', durationDays: 90, totalLessons: 2, pricePerLesson: 49500, description: '도박중독 재발방지교육 심화과정', certificateAvailable: true, includesCbtCourse: true },
    'sexual-offense-basic': { courseId: 'sexual-offense-basic', courseTitle: '성범죄 재범방지교육 기본과정', certificateTitle: '성범죄 재범방지교육', price: 49000, currency: 'KRW', durationDays: 90, totalLessons: 1, pricePerLesson: 49000, description: '성범죄 재범방지교육 기본과정', certificateAvailable: true },
    'sexual-offense-advanced': { courseId: 'sexual-offense-advanced', courseTitle: '성범죄 재범방지교육 심화과정', certificateTitle: '성범죄 재범방지교육', price: 99000, currency: 'KRW', durationDays: 90, totalLessons: 2, pricePerLesson: 49500, description: '성범죄 재범방지교육 심화과정', certificateAvailable: true, includesCbtCourse: true }
};

const COURSE_PRODUCTS_BY_ID = {
    [DUI_COURSE_PRODUCT.courseId]: DUI_COURSE_PRODUCT,
    [CBT_COURSE_PRODUCT.courseId]: CBT_COURSE_PRODUCT,
    ...NEW_PREVENTION_COURSE_PRODUCTS
};

function getCourseProduct(courseId) {
    return COURSE_PRODUCTS_BY_ID[courseId] || null;
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
    'dui-documents': {
        categoryId: 'dui',
        productId: 'dui-documents',
        title: '기본과정',
        amount: 49000,
        courseId: DUI_COURSE_PRODUCT.courseId,
        courseTitle: DUI_COURSE_PRODUCT.courseTitle,
        totalLessons: DUI_COURSE_PRODUCT.totalLessons
    },
    'dui-cbt-advanced': {
        categoryId: 'dui',
        productId: 'dui-cbt-advanced',
        title: '심화과정',
        amount: 99000,
        courseId: CBT_COURSE_PRODUCT.courseId,
        courseTitle: CBT_COURSE_PRODUCT.courseTitle,
        totalLessons: CBT_COURSE_PRODUCT.totalLessons
    },
    'violence-basic': { categoryId: 'violence-prevention', productId: 'violence-basic', title: '폭력범죄 재범방지교육 기본과정', amount: 49000, courseId: 'violence-basic', courseTitle: '폭력범죄 재범방지교육 기본과정', totalLessons: 1 },
    'violence-advanced': { categoryId: 'violence-prevention', productId: 'violence-advanced', title: '폭력범죄 재범방지교육 심화과정', amount: 99000, courseId: 'violence-advanced', courseTitle: '폭력범죄 재범방지교육 심화과정', totalLessons: 2, includesCbtCourse: true },
    'gambling-basic': { categoryId: 'gambling-relapse-prevention', productId: 'gambling-basic', title: '도박중독 재발방지교육 기본과정', amount: 49000, courseId: 'gambling-basic', courseTitle: '도박중독 재발방지교육 기본과정', totalLessons: 1 },
    'gambling-advanced': { categoryId: 'gambling-relapse-prevention', productId: 'gambling-advanced', title: '도박중독 재발방지교육 심화과정', amount: 99000, courseId: 'gambling-advanced', courseTitle: '도박중독 재발방지교육 심화과정', totalLessons: 2, includesCbtCourse: true },
    'sexual-offense-basic': { categoryId: 'sexual-offense-prevention', productId: 'sexual-offense-basic', title: '성범죄 재범방지교육 기본과정', amount: 49000, courseId: 'sexual-offense-basic', courseTitle: '성범죄 재범방지교육 기본과정', totalLessons: 1 },
    'sexual-offense-advanced': { categoryId: 'sexual-offense-prevention', productId: 'sexual-offense-advanced', title: '성범죄 재범방지교육 심화과정', amount: 99000, courseId: 'sexual-offense-advanced', courseTitle: '성범죄 재범방지교육 심화과정', totalLessons: 2, includesCbtCourse: true }
};


function parseTime(value) {
    if (!value) return null;
    const time = new Date(value).getTime();
    return Number.isFinite(time) ? time : null;
}

function compactDate(value) {
    const date = value ? new Date(value) : new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
}

async function makeCertificateNo(certificateId, issuedAt) {
    const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(certificateId));
    const hex = Array.from(new Uint8Array(bytes)).map((byte) => byte.toString(16).padStart(2, '0')).join('').slice(0, 6).toUpperCase();
    return `CERT-DUI-${compactDate(issuedAt)}-${hex}`;
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
    const product = getCourseProduct(courseId);
    if (!product) {
        return json({ message: '지원하지 않는 교육과정입니다.', code: 'INVALID_COURSE' }, 400, corsHeaders);
    }

    const uid = firebaseUser.uid;
    const certificateId = requestedDocumentType && requestedDocumentType !== "completion" ? `${uid}_${courseId}_${requestedDocumentType}` : `${uid}_${courseId}`;
    const existing = await firestoreGetData(env, 'certificates', certificateId).catch((error) => error.status === 404 ? null : Promise.reject(error));
    if ((existing?.certificateNo || existing?.issueNumber) && ['completion', 'cbt-completion', 'cbt-detail'].includes(existing.documentType)) {
        await updateCertificateFlags(env, uid, courseId, existing.certificateNo || existing.issueNumber, certificateId, existing.issuedAt || existing.createdAt, true).catch((error) => console.error(error));
        return json({ certificateId, certificateNo: existing.certificateNo || existing.issueNumber, alreadyIssued: true }, 200, corsHeaders);
    }

    const user = await firestoreGetData(env, 'users', uid).catch((error) => error.status === 404 ? null : Promise.reject(error));
    if (!user) return json({ message: '회원 정보를 확인할 수 없습니다.', code: 'USER_NOT_FOUND' }, 400, corsHeaders);

    let enrollment = await getWorkerEnrollmentRecord(env, uid, courseId);
    if (!isFirestoreEnrollmentActiveRecord(enrollment) && courseId === DUI_COURSE_PRODUCT.courseId) {
        const advancedEnrollment = await getWorkerEnrollmentRecord(env, uid, CBT_COURSE_PRODUCT.courseId).catch(() => null);
        if (isFirestoreEnrollmentActiveRecord(advancedEnrollment)) {
            enrollment = advancedEnrollment;
        }
    }
    if (!isFirestoreEnrollmentActiveRecord(enrollment)) {
        return json({ message: '정상 결제된 교육과정이 확인되지 않습니다.', code: 'ENROLLMENT_NOT_ACTIVE' }, 400, corsHeaders);
    }

    const expiresAtTime = parseTime(enrollment.expiresAt);
    if (expiresAtTime !== null && expiresAtTime < Date.now()) {
        return json({ message: '수강기간이 만료되어 수료증을 발급받을 수 없습니다.', code: 'ACCESS_EXPIRED' }, 400, corsHeaders);
    }

    const progressId = `${uid}_${courseId}`;
    const progress = await firestoreGetData(env, 'courseProgress', progressId).catch((error) => error.status === 404 ? null : Promise.reject(error));
    const completedLessons = product.totalLessons;
    const progressRate = 100;
    const isCompleted = true;

    const locked = user.certificateIdentity || {};
    const userName = String(locked.realName || user.realName || user.fullName || '').trim();
    const birthDate = String(locked.dateOfBirth || user.dateOfBirth || user.birthDate || '').trim();
    if (!userName) return json({ message: '회원 정보를 확인할 수 없습니다.', code: 'MISSING_NAME' }, 400, corsHeaders);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
        return json({ message: '수료증 발급을 위해 생년월일을 입력해 주세요.', code: 'MISSING_BIRTH_DATE' }, 400, corsHeaders);
    }

    const payments = await firestoreList(env, 'purchases').catch(() => []);
    const purchase = payments.find((item) => (item.uid || item.userId) === uid && item.courseId === courseId && item.paymentStatus === 'paid') || {};
    const issuedAt = new Date().toISOString();
    const completedAt = progress?.completedAt || issuedAt;
    const certificateNo = await makeCertificateNo(certificateId, issuedAt);
    const issuerName = '리셋에듀센터';
    const certificateRecord = {
        certificateId, certificateNo, issueNumber: certificateNo,
        userId: uid, uid, userName, birthDate, dateOfBirth: birthDate,
        email: user.email || firebaseUser.email || '', phoneNumber: user.phoneNumber || '',
        courseId, courseTitle: product.certificateTitle || product.courseTitle,
        totalLessons: product.totalLessons, completedLessons,
        progress: progressRate, completedAt,
        purchasedAt: enrollment.purchasedAt || purchase.purchasedAt || purchase.approvedAt || null,
        expiresAt: enrollment.expiresAt || purchase.expiresAt || null,
        issuedAt, certificateIssuedAt: issuedAt,
        issuerName,
        issuerBusinessNumber: env.CERTIFICATE_ISSUER_BUSINESS_NUMBER || '',
        issuerContact: env.CERTIFICATE_ISSUER_CONTACT || '',
        issuerEmail: env.CERTIFICATE_ISSUER_EMAIL || '',
        status: 'issued', documentType: requestedDocumentType === 'cbt-detail' ? 'cbt-detail' : requestedDocumentType === 'cbt-completion' ? 'cbt-completion' : courseId === CBT_COURSE_PRODUCT.courseId ? 'cbt-completion' : (isCompleted ? 'completion' : 'attendance'),
        createdAt: issuedAt, updatedAt: issuedAt
    };

    await firestorePatch(env, firestoreDocumentPath(env, 'certificates', certificateId), certificateRecord);
    await updateCertificateFlags(env, uid, courseId, certificateNo, certificateId, issuedAt, isCompleted);

    return json({ certificateId, certificateNo, alreadyIssued: false }, 200, corsHeaders);
}

async function updateCertificateFlags(env, uid, courseId, certificateNo, certificateId, issuedAt, isCompletion = true) {
    const enrollmentId = `${uid}_${courseId}`;
    const enrollment = await getWorkerEnrollmentRecord(env, uid, courseId).catch(() => null);
    const targetEnrollmentPath = enrollment?.documentPath || firestoreDocumentPath(env, 'enrollments', enrollmentId);
    await firestorePatch(env, targetEnrollmentPath, {
        certificateIssued: true,
        certificateIssuedAt: issuedAt,
        attendanceCertificateIssued: !isCompletion,
        attendanceCertificateIssuedAt: !isCompletion ? issuedAt : null,
        certificateId,
        certificateNo,
        updatedAt: new Date().toISOString()
    }).catch((error) => console.error(error));

    const purchases = await firestoreList(env, 'purchases').catch(() => []);
    const purchase = purchases.find((item) => (item.uid || item.userId) === uid && item.courseId === courseId && item.paymentStatus === 'paid');
    if (purchase?.id) {
        await firestorePatch(env, firestoreDocumentPath(env, 'purchases', purchase.id), {
            certificateIssued: true,
            certificateIssuedAt: issuedAt,
            attendanceCertificateIssued: !isCompletion,
            attendanceCertificateIssuedAt: !isCompletion ? issuedAt : null,
            certificateId,
            certificateNo,
            updatedAt: new Date().toISOString()
        }).catch((error) => console.error(error));
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

    if (body.paymentId && !body.paymentKey) {
        return handlePortOnePaymentConfirm(body, firebaseUser, env, corsHeaders);
    }

    const { paymentKey, orderId, amount, uid, courseId } = body;
    if (!paymentKey || !orderId || typeof amount !== 'number' || !uid || !courseId) {
        return json({ message: 'paymentKey, orderId, amount, uid, courseId가 모두 필요합니다.', code: 'MISSING_FIELDS' }, 400, corsHeaders);
    }
    if (uid !== firebaseUser.uid) {
        return json({ message: '로그인한 사용자와 결제 사용자 정보가 일치하지 않습니다.', code: 'USER_MISMATCH' }, 403, corsHeaders);
    }
    if (courseId !== DUI_COURSE_PRODUCT.courseId || amount !== DUI_COURSE_PRODUCT.price) {
        return json({ message: '결제 금액 또는 상품 정보가 현재 교육 상품과 일치하지 않습니다.', code: 'PAYMENT_AMOUNT_MISMATCH' }, 400, corsHeaders);
    }

    const orderDocPath = firestoreDocumentPath(env, 'payments', orderId);
    const existingOrder = await firestoreGet(env, orderDocPath).catch((error) => error.status === 404 ? null : Promise.reject(error));
    if (existingOrder) {
        return json({ message: '이미 처리된 주문번호입니다.', code: 'DUPLICATE_ORDER_ID' }, 409, corsHeaders);
    }

    const paymentKeyDocId = encodeFirestoreDocId(paymentKey);
    const paymentKeyPath = firestoreDocumentPath(env, 'paymentKeys', paymentKeyDocId);
    const existingPaymentKey = await firestoreGet(env, paymentKeyPath).catch((error) => error.status === 404 ? null : Promise.reject(error));
    if (existingPaymentKey) {
        return json({ message: '이미 승인 처리된 paymentKey입니다.', code: 'DUPLICATE_PAYMENT_KEY' }, 409, corsHeaders);
    }

    const enrollmentId = `${uid}_${courseId}`;
    const activeEnrollment = await firestoreGet(env, firestoreDocumentPath(env, 'enrollments', enrollmentId)).catch((error) => error.status === 404 ? null : Promise.reject(error));
    if (activeEnrollment && activeEnrollment.fields?.accessStatus?.stringValue === 'active') {
        const currentExpiresAt = activeEnrollment.fields?.expiresAt?.timestampValue || activeEnrollment.fields?.expiresAt?.stringValue;
        if (currentExpiresAt && new Date(currentExpiresAt).getTime() > Date.now()) {
            return json({ message: '이미 활성화된 수강권이 있어 중복 결제를 제한합니다.', code: 'ACTIVE_ENROLLMENT_EXISTS' }, 409, corsHeaders);
        }
    }

    let approved;
    try {
        approved = await confirmTossPayment(env, { paymentKey, orderId, amount });
    } catch (error) {
        await savePaymentLog(env, orderId, {
            type: 'confirm_failed', paymentKey, orderId, userId: uid, courseId, amount,
            message: error instanceof Error ? error.message : 'Unknown payment confirm error',
            createdAt: new Date().toISOString()
        }).catch((logError) => console.error(logError));
        return json({ message: error instanceof Error ? error.message : '결제 승인 중 오류가 발생했습니다.', code: 'PAYMENT_CONFIRM_FAILED' }, 400, corsHeaders);
    }

    const product = APPLICATION_PRODUCTS.basic;
    const approvedAt = approved.approvedAt || new Date().toISOString();
    const purchasedAt = new Date(approvedAt);
    const expiresAt = new Date(purchasedAt.getTime() + (getCourseProduct(courseId)?.durationDays || DUI_COURSE_PRODUCT.durationDays) * 24 * 60 * 60 * 1000).toISOString();
    const nowIso = new Date().toISOString();
    const paymentId = approved.paymentKey || paymentKey;

    const paymentRecord = {
        paymentId, orderId, paymentKey, userId: uid, uid, courseId,
        courseTitle: product.courseTitle,
        orderName: product.courseTitle,
        amount: DUI_COURSE_PRODUCT.price,
        method: approved.method || null,
        status: 'paid', paymentStatus: 'paid', paymentProvider: 'toss-payments',
        receiptUrl: approved.receipt?.url || null,
        approvedAt, createdAt: nowIso, updatedAt: nowIso, rawResponse: approved
    };
    const enrollmentRecord = {
        enrollmentId, userId: uid, uid, courseId,
        courseTitle: DUI_COURSE_PRODUCT.courseTitle,
        paymentId, orderId,
        purchasedAt: purchasedAt.toISOString(), expiresAt,
        paymentStatus: 'paid', accessStatus: 'active', progress: 0,
        completedLessons: 0, totalLessons: DUI_COURSE_PRODUCT.totalLessons,
        certificateIssued: false, certificateIssuedAt: null,
        createdAt: nowIso, updatedAt: nowIso
    };
    const purchaseRecord = {
        uid, userId: uid, courseId, courseTitle: DUI_COURSE_PRODUCT.courseTitle,
        orderId, paymentKey, paymentStatus: 'paid', accessStatus: 'active',
        paymentProvider: 'toss-payments', amount: DUI_COURSE_PRODUCT.price,
        method: approved.method || null, receiptUrl: approved.receipt?.url || null,
        orderedAt: approvedAt, approvedAt, purchasedAt: purchasedAt.toISOString(), expiresAt,
        accessValidDays: getCourseProduct(courseId)?.durationDays || DUI_COURSE_PRODUCT.durationDays, accessValidMonths: 3,
        totalLessons: DUI_COURSE_PRODUCT.totalLessons, completedLessons: 0,
        certificateIssued: false,
        legalDisclaimerAccepted: Boolean(body.legalDisclaimerAccepted),
        finalReviewResponsibilityAccepted: Boolean(body.finalReviewResponsibilityAccepted),
        rawResponse: approved, updatedAt: nowIso, createdAt: nowIso
    };

    try {
        await firestorePatch(env, orderDocPath, paymentRecord);
        await firestorePatch(env, firestoreDocumentPath(env, 'enrollments', enrollmentId), enrollmentRecord);
        await firestorePatch(env, firestoreDocumentPath(env, 'purchases', orderId), purchaseRecord);
        await firestorePatch(env, paymentKeyPath, { paymentKey, orderId, userId: uid, courseId, createdAt: nowIso });
        await firestorePatch(env, firestoreDocumentPath(env, 'refundPolicies', courseId), buildRefundPolicyRecord(nowIso));
        await savePaymentLog(env, orderId, buildPaymentLogRecord({ type: 'toss_confirm_completed', paymentId, orderId, uid, courseId, productId: 'basic', amount, approved, approvedAt, status: 'paid' })).catch((logError) => console.error(logError));
    } catch (error) {
        await savePaymentLog(env, orderId, {
            type: 'firestore_save_failed', paymentKey, orderId, userId: uid, courseId, amount, approvedAt,
            message: error instanceof Error ? error.message : 'Unknown Firestore save error',
            rawResponse: approved, createdAt: new Date().toISOString()
        }).catch((logError) => console.error(logError));
        return json({ message: '결제는 승인되었지만 수강권 저장에 실패했습니다. 운영자 재처리가 필요합니다.', code: 'ENROLLMENT_SAVE_FAILED', paymentId, orderId }, 500, corsHeaders);
    }

    return json({ ...approved, savedPurchaseId: orderId, paymentId, orderId, enrollmentId, courseId, courseTitle: DUI_COURSE_PRODUCT.courseTitle, totalAmount: DUI_COURSE_PRODUCT.price, expiresAt, accessStatus: 'active' }, 200, corsHeaders);
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

function getPortOnePaymentMethod(payment) {
    return payment?.method?.type || payment?.method?.method || payment?.method?.provider || (typeof payment?.method === 'string' ? payment.method : 'card');
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
    const courseId = String(body?.courseId || DUI_COURSE_PRODUCT.courseId).trim();
    const categoryId = String(body?.categoryId || 'dui').trim();
    const productId = String(body?.productId || 'basic').trim();
    const product = getApplicationProductForPayment(productId);
    const amount = typeof body?.amount === 'number' ? body.amount : product?.amount;
    const paymentId = String(body?.paymentId || createPortOnePaymentId(uid)).trim();
    const requestedPaymentMethod = String(body?.paymentMethod || 'card').trim() === 'kakaopay' ? 'kakaopay' : 'card';
    const requestedPaymentProvider = requestedPaymentMethod === 'kakaopay' ? 'portone-kakaopay-v2' : 'portone-kcp-v2';

    if (uid !== firebaseUser.uid) {
        return json({ message: '로그인한 사용자와 주문 사용자 정보가 일치하지 않습니다.', code: 'USER_MISMATCH' }, 403, corsHeaders);
    }
    if (!paymentId || !product || courseId !== product.courseId || categoryId !== product.categoryId || amount !== product.amount) {
        return json({ message: '주문 생성 정보가 올바르지 않습니다.', code: 'INVALID_ORDER' }, 400, corsHeaders);
    }

    const enrollmentId = uid + '_' + courseId;
    const existingEnrollment = await firestoreGet(env, firestoreDocumentPath(env, 'enrollments', enrollmentId)).catch((error) => error.status === 404 ? null : Promise.reject(error));
    if (existingEnrollment) {
        const enrollment = fromFirestoreFields(existingEnrollment.fields || {});
        const expiresAtTime = parseTime(enrollment.expiresAt);
        if (enrollment.paymentStatus === 'paid' && enrollment.accessStatus === 'active' && (expiresAtTime === null || expiresAtTime >= Date.now())) {
            return json({ message: '이미 결제 완료된 수강권이 있어 중복 결제를 진행할 수 없습니다.', code: 'ACTIVE_ENROLLMENT_EXISTS' }, 409, corsHeaders);
        }
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
        productTitle: product.title,
        courseTitle: product.courseTitle,
        orderName: product.courseTitle,
        amount: product.amount,
        requestedAmount: product.amount,
        method: requestedPaymentMethod,
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
            payment_provider: requestedPaymentProvider,
            endpoint: '/api/payments/portone-order',
            frontendOrigin: request.headers.get('origin') || null,
            created_at: nowIso,
            createdAt: nowIso
        });
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
    const candidates = signature.split(' ').flatMap((part) => part.split(',').slice(1));
    if (!candidates.some((candidate) => timingSafeEqual(candidate, expected))) {
        const error = new Error('Invalid PortOne webhook signature');
        error.status = 401;
        throw error;
    }
    return { verified: true };
}

async function getPendingPaymentRecord(env, paymentId) {
    if (!paymentId) return null;
    return firestoreGetData(env, 'payments', paymentId).catch((error) => error.status === 404 ? null : Promise.reject(error));
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

    if (!isPortOnePaidEvent(payload)) {
        await savePaymentLog(env, paymentId, buildPaymentLogRecord({ type: 'portone_webhook_non_paid_ignored', paymentId, orderId: paymentId, status: getWebhookEventType(payload) })).catch((logError) => console.error(logError));
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

    if (approved.status !== 'PAID') {
        await savePaymentLog(env, paymentId, buildPaymentLogRecord({ type: 'portone_webhook_non_paid_ignored', paymentId, orderId: paymentId, approved, status: approved.status })).catch((logError) => console.error(logError));
        return json({ ok: true, ignored: true, status: approved.status }, 200, corsHeaders);
    }
    await logWebhookStep(env, 'payment_status_verified', { paymentId, orderId: paymentId, webhookType });

    const customData = parsePortOneCustomData(approved.customData);
    const pendingOrder = await getPendingPaymentRecord(env, paymentId);
    if (pendingOrder) await logWebhookStep(env, 'order_found', { paymentId, orderId: paymentId, userId: pendingOrder.uid || pendingOrder.userId, uid: pendingOrder.uid || pendingOrder.userId, webhookType });
    const uid = String(customData.uid || customData.userId || pendingOrder?.uid || pendingOrder?.userId || approved.customer?.id || approved.customer?.customerId || '').trim();
    const courseId = String(customData.courseId || pendingOrder?.courseId || DUI_COURSE_PRODUCT.courseId).trim();
    const categoryId = String(customData.categoryId || pendingOrder?.categoryId || 'dui').trim();
    const productId = String(customData.productId || pendingOrder?.productId || 'basic').trim();
    const amount = Number(approved.amount?.total);

    if (!uid) {
        const error = new Error('포트원 결제와 pending 주문에서 사용자 uid를 찾지 못했습니다.');
        logWebhookError(request, payload, paymentId, error, { phase: 'identity_resolution' });
        await savePaymentLog(env, paymentId, buildPaymentLogRecord({ type: 'portone_webhook_missing_uid', paymentId, orderId: paymentId, courseId, productId, amount, approved, status: 'paid_missing_uid', error })).catch((logError) => console.error(logError));
        return json({ ok: false, message: error.message, code: 'WEBHOOK_UID_NOT_FOUND' }, 500, corsHeaders);
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

async function ensureIncludedBasicEnrollment(env, uid, context) {
    const enrollmentId = uid + '_' + DUI_COURSE_PRODUCT.courseId;
    const enrollmentPath = firestoreDocumentPath(env, 'enrollments', enrollmentId);
    const existingEnrollment = await firestoreGet(env, enrollmentPath).catch((error) => error.status === 404 ? null : Promise.reject(error));
    if (existingEnrollment) {
        const existing = fromFirestoreFields(existingEnrollment.fields || {});
        if (isFirestoreEnrollmentActiveRecord(existing)) return existing;
    }

    const nowIso = new Date().toISOString();
    const purchasedAt = context.purchasedAt || nowIso;
    const expiresAt = context.expiresAt || new Date(new Date(purchasedAt).getTime() + DUI_COURSE_PRODUCT.durationDays * 24 * 60 * 60 * 1000).toISOString();
    const orderId = (context.orderId || context.paymentId || 'included') + '_basic_included';
    const record = {
        enrollmentId,
        userId: uid,
        uid,
        courseId: DUI_COURSE_PRODUCT.courseId,
        categoryId: 'dui',
        productId: 'dui-documents',
        productTitle: APPLICATION_PRODUCTS['dui-documents'].title,
        amount: APPLICATION_PRODUCTS['dui-documents'].amount,
        courseTitle: DUI_COURSE_PRODUCT.courseTitle,
        paymentId: context.paymentId || context.orderId || orderId,
        orderId,
        purchasedAt,
        expiresAt,
        paymentStatus: 'paid',
        accessStatus: 'active',
        progress: 0,
        completedLessons: 0,
        totalLessons: DUI_COURSE_PRODUCT.totalLessons,
        certificateIssued: false,
        certificateIssuedAt: null,
        includedWithProductId: 'dui-cbt-advanced',
        includedWithOrderId: context.orderId || null,
        recoveredFrom: context.source || 'dui-cbt-advanced_included_access',
        createdAt: nowIso,
        updatedAt: nowIso
    };
    await firestorePatch(env, enrollmentPath, record);
    return { ...record, id: enrollmentId, documentPath: enrollmentPath, recordSource: 'included_access' };
}

async function ensureIncludedCbtEnrollment(env, uid, context = {}) {
    const enrollmentId = uid + '_' + CBT_COURSE_PRODUCT.courseId;
    const enrollmentPath = firestoreDocumentPath(env, 'enrollments', enrollmentId);
    const existingEnrollment = await firestoreGet(env, enrollmentPath).catch((error) => error.status === 404 ? null : Promise.reject(error));
    if (existingEnrollment) {
        const enrollment = fromFirestoreFields(existingEnrollment.fields || {});
        if (isFirestoreEnrollmentActiveRecord(enrollment)) return { ...enrollment, id: enrollmentId, documentPath: enrollmentPath, recordSource: 'existing_included_cbt_access' };
    }
    const nowIso = new Date().toISOString();
    const purchasedAt = context.purchasedAt || nowIso;
    const expiresAt = context.expiresAt || new Date(new Date(purchasedAt).getTime() + CBT_COURSE_PRODUCT.durationDays * 24 * 60 * 60 * 1000).toISOString();
    const record = {
        enrollmentId,
        userId: uid,
        uid,
        courseId: CBT_COURSE_PRODUCT.courseId,
        categoryId: 'cbt',
        productId: context.sourceProductId || 'included-cbt',
        productTitle: context.sourceProductTitle || '인지행동 개선교육 포함 권한',
        amount: 0,
        courseTitle: CBT_COURSE_PRODUCT.courseTitle,
        paymentId: context.paymentId || null,
        orderId: context.orderId || null,
        purchasedAt,
        expiresAt,
        paymentStatus: 'paid',
        accessStatus: 'active',
        progress: 0,
        completedLessons: 0,
        totalLessons: CBT_COURSE_PRODUCT.totalLessons,
        certificateIssued: false,
        certificateIssuedAt: null,
        includedFromProductId: context.sourceProductId || null,
        createdAt: nowIso,
        updatedAt: nowIso
    };
    await firestorePatch(env, enrollmentPath, record);
    return { ...record, id: enrollmentId, documentPath: enrollmentPath, recordSource: 'included_cbt_access' };
}

async function handlePortOnePaymentConfirm(body, firebaseUser, env, corsHeaders) {
    const paymentId = String(body?.paymentId || '').trim();
    const pendingOrder = await getPendingPaymentRecord(env, paymentId);
    const uid = String(body?.uid || pendingOrder?.uid || pendingOrder?.userId || '').trim();
    const courseId = String(body?.courseId || pendingOrder?.courseId || DUI_COURSE_PRODUCT.courseId).trim();
    const productId = String(body?.productId || pendingOrder?.productId || 'basic').trim();
    const categoryId = String(body?.categoryId || pendingOrder?.categoryId || 'dui').trim();
    const amount = typeof body?.amount === 'number' ? body.amount : (typeof pendingOrder?.amount === 'number' ? pendingOrder.amount : undefined);
    const product = getApplicationProductForPayment(productId);
    if (!paymentId || !uid || !courseId || !productId) {
        return json({ message: 'paymentId, uid, courseId, productId가 모두 필요합니다.', code: 'MISSING_FIELDS' }, 400, corsHeaders);
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

    const orderId = paymentId;
    const orderDocPath = firestoreDocumentPath(env, 'payments', orderId);
    let existingPaidSameUser = false;
    const enrollmentId = uid + '_' + courseId;
    const existingOrder = await firestoreGet(env, orderDocPath).catch((error) => error.status === 404 ? null : Promise.reject(error));
    if (existingOrder) {
        const existing = fromFirestoreFields(existingOrder.fields || {});
        const existingUid = existing.uid || existing.userId;
        if (existingUid && existingUid !== uid) {
            return json({ message: '이미 다른 사용자로 처리된 결제번호입니다.', code: 'DUPLICATE_PAYMENT_ID' }, 409, corsHeaders);
        }
        if (existing.paymentStatus === 'paid') {
            existingPaidSameUser = true;
            const existingEnrollment = await firestoreGet(env, firestoreDocumentPath(env, 'enrollments', enrollmentId)).catch((error) => error.status === 404 ? null : Promise.reject(error));
            const enrollment = existingEnrollment ? fromFirestoreFields(existingEnrollment.fields || {}) : null;
            if (enrollment?.paymentStatus === 'paid' && enrollment?.accessStatus === 'active') {
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
    const existingPaymentKey = await firestoreGet(env, paymentKeyPath).catch((error) => error.status === 404 ? null : Promise.reject(error));
    if (existingPaymentKey && !existingPaidSameUser) {
        return json({ message: '이미 승인 처리된 paymentId입니다.', code: 'DUPLICATE_PAYMENT_ID' }, 409, corsHeaders);
    }

    const activeEnrollment = await firestoreGet(env, firestoreDocumentPath(env, 'enrollments', enrollmentId)).catch((error) => error.status === 404 ? null : Promise.reject(error));
    if (activeEnrollment && activeEnrollment.fields?.accessStatus?.stringValue === 'active') {
        const currentExpiresAt = activeEnrollment.fields?.expiresAt?.timestampValue || activeEnrollment.fields?.expiresAt?.stringValue;
        if (currentExpiresAt && new Date(currentExpiresAt).getTime() > Date.now()) {
            return json({ message: '이미 활성화된 수강권이 있어 중복 결제를 제한합니다.', code: 'ACTIVE_ENROLLMENT_EXISTS' }, 409, corsHeaders);
        }
    }

    let approved;
    try {
        approved = await getPortOnePayment(env, paymentId);
        const customData = parsePortOneCustomData(approved.customData);
        const channelType = approved.channel?.type;
        const expectedChannelType = env.PORTONE_EXPECTED_CHANNEL_TYPE || 'LIVE';
        const storeId = approved.storeId || approved.store?.id;
        const configuredStoreId = env.PORTONE_STORE_ID || env.NEXT_PUBLIC_PORTONE_STORE_ID;
        const paidAmount = Number(approved.amount?.total);
        const currency = normalizePortOneCurrency(approved.currency);

        if (approved.status !== 'PAID') throw new Error('결제가 완료된 상태가 아닙니다.');
        if (expectedChannelType && channelType && channelType !== expectedChannelType) throw new Error('포트원 채널이 실연동 채널이 아닙니다.');
        if (configuredStoreId && storeId && storeId !== configuredStoreId) throw new Error('포트원 상점 ID가 일치하지 않습니다.');
        if (!isAllowedOrderNameForProduct(approved.orderName, product)) throw new Error('주문명이 현재 상품과 일치하지 않습니다.');
        if (paidAmount !== product.amount) throw new Error('결제 승인 금액이 상품 금액과 일치하지 않습니다.');
        if (currency !== DUI_COURSE_PRODUCT.currency) throw new Error('결제 통화가 올바르지 않습니다.');
        if (customData.courseId && customData.courseId !== courseId) throw new Error('결제 상품 정보가 일치하지 않습니다.');
        if (customData.productId && customData.productId !== productId) throw new Error('결제 상품 옵션이 일치하지 않습니다.');
        if (customData.categoryId && customData.categoryId !== categoryId) throw new Error('결제 카테고리가 일치하지 않습니다.');
    } catch (error) {
        await savePaymentLog(env, orderId, buildPaymentLogRecord({ type: 'portone_confirm_failed', paymentId, orderId, uid, courseId, productId, amount: product.amount, approved, status: 'failed', error })).catch((logError) => console.error(logError));
        return json({ message: error instanceof Error ? error.message : '포트원 결제 검증 중 오류가 발생했습니다.', code: 'PAYMENT_CONFIRM_FAILED' }, 400, corsHeaders);
    }

    const approvedAt = getPortOnePaidAt(approved);
    const purchasedAt = new Date(approvedAt);
    const expiresAt = new Date(purchasedAt.getTime() + (getCourseProduct(courseId)?.durationDays || DUI_COURSE_PRODUCT.durationDays) * 24 * 60 * 60 * 1000).toISOString();
    const nowIso = new Date().toISOString();
    const receiptUrl = getPortOneReceiptUrl(approved);
    const method = getPortOnePaymentMethod(approved);

    const paymentRecord = {
        paymentId, orderId, paymentKey: paymentId, userId: uid, uid, courseId,
        categoryId, productId, productTitle: product.title,
        courseTitle: product.courseTitle,
        orderName: product.courseTitle,
        amount: product.amount,
        method,
        status: 'paid', paymentStatus: 'paid', paymentProvider: 'portone-kcp-v2',
        receiptUrl,
        kcpTid: getPortOneTid(approved),
        kcpResponseCode: getPortOneResponseCode(approved),
        kcpResponseMessage: getPortOneResponseMessage(approved),
        approvedAt, createdAt: nowIso, updatedAt: nowIso, rawResponse: approved
    };
    const enrollmentRecord = {
        enrollmentId, userId: uid, uid, courseId,
        categoryId, productId, productTitle: product.title, amount: product.amount,
        courseTitle: product.courseTitle,
        paymentId, orderId,
        purchasedAt: purchasedAt.toISOString(), expiresAt,
        paymentStatus: 'paid', accessStatus: 'active', progress: 0,
        completedLessons: 0, totalLessons: product.totalLessons,
        certificateIssued: false, certificateIssuedAt: null,
        createdAt: nowIso, updatedAt: nowIso
    };
    const purchaseRecord = {
        uid, userId: uid, courseId, courseTitle: product.courseTitle,
        categoryId, productId, productTitle: product.title,
        orderId, paymentKey: paymentId, paymentStatus: 'paid', accessStatus: 'active',
        paymentProvider: 'portone-kcp-v2', amount: product.amount,
        method, receiptUrl,
        kcpTid: getPortOneTid(approved),
        kcpResponseCode: getPortOneResponseCode(approved),
        kcpResponseMessage: getPortOneResponseMessage(approved),
        orderedAt: approvedAt, approvedAt, purchasedAt: purchasedAt.toISOString(), expiresAt,
        accessValidDays: getCourseProduct(courseId)?.durationDays || DUI_COURSE_PRODUCT.durationDays, accessValidMonths: 3,
        totalLessons: product.totalLessons, completedLessons: 0,
        certificateIssued: false,
        legalDisclaimerAccepted: Boolean(body.legalDisclaimerAccepted),
        finalReviewResponsibilityAccepted: Boolean(body.finalReviewResponsibilityAccepted),
        rawResponse: approved, updatedAt: nowIso, createdAt: nowIso
    };

    try {
        await firestorePatch(env, orderDocPath, paymentRecord);
        if (body.source === 'portone_webhook') await logWebhookStep(env, 'payment_record_saved', { paymentId, orderId, userId: uid, uid, webhookType: 'Transaction.Paid' });
        await firestorePatch(env, firestoreDocumentPath(env, 'enrollments', enrollmentId), enrollmentRecord);
        if (productId === 'dui-cbt-advanced') {
            await ensureIncludedBasicEnrollment(env, uid, { paymentId, orderId, purchasedAt: purchasedAt.toISOString(), expiresAt, method, receiptUrl, categoryId, source: body.source || 'portone_confirm' });
        }
        if (product.includesCbtCourse) {
            await ensureIncludedCbtEnrollment(env, uid, { paymentId, orderId, purchasedAt: purchasedAt.toISOString(), expiresAt, method, receiptUrl, sourceProductId: productId, sourceProductTitle: product.title, source: body.source || 'portone_confirm' });
        }
        if (body.source === 'portone_webhook') await logWebhookStep(env, 'enrollment_created', { paymentId, orderId, userId: uid, uid, webhookType: 'Transaction.Paid' });
        await firestorePatch(env, firestoreDocumentPath(env, 'purchases', orderId), purchaseRecord);
        await firestorePatch(env, paymentKeyPath, { paymentKey: paymentId, paymentId, orderId, userId: uid, courseId, createdAt: nowIso });
        await firestorePatch(env, firestoreDocumentPath(env, 'refundPolicies', courseId), buildRefundPolicyRecord(nowIso));
        await savePaymentLog(env, orderId, buildPaymentLogRecord({ type: existingPaidSameUser ? 'portone_resync_completed' : 'portone_confirm_completed', paymentId, orderId, uid, courseId, productId, amount: product.amount, approved, approvedAt, status: 'paid' })).catch((logError) => console.error(logError));
    } catch (error) {
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

async function confirmTossPayment(env, payload) {
    const secretKey = env.PAYMENT_SECRET_KEY || env.TOSS_SECRET_KEY;
    if (!secretKey) throw new Error('PAYMENT_SECRET_KEY 또는 TOSS_SECRET_KEY가 설정되지 않았습니다.');
    const response = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
        method: 'POST',
        headers: { Authorization: `Basic ${btoa(`${secretKey}:`)}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || '토스 결제 승인에 실패했습니다.');
    return data;
}

function buildRefundPolicyRecord(nowIso) {
    return {
        courseId: DUI_COURSE_PRODUCT.courseId,
        courseTitle: DUI_COURSE_PRODUCT.courseTitle,
        totalAmount: DUI_COURSE_PRODUCT.price,
        totalLessons: DUI_COURSE_PRODUCT.totalLessons,
        pricePerLesson: DUI_COURSE_PRODUCT.pricePerLesson,
        durationDays: DUI_COURSE_PRODUCT.durationDays,
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

function firestoreDocumentPath(env, collectionName, documentId) {
    const projectId = env.FIREBASE_PROJECT_ID || env.GOOGLE_CLOUD_PROJECT || 'jaeseung-try-2-34973152-e44aa';
    return `projects/${projectId}/databases/(default)/documents/${collectionName}/${documentId}`;
}

async function firestoreGet(env, documentPath) {
    const token = await getGoogleAccessToken(env);
    const response = await fetch(`https://firestore.googleapis.com/v1/${documentPath}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) {
        const error = new Error(`Firestore GET failed: ${response.status}`);
        error.status = response.status;
        throw error;
    }
    return response.json();
}

async function firestorePatch(env, documentPath, data) {
    const token = await getGoogleAccessToken(env);
    const response = await fetch(`https://firestore.googleapis.com/v1/${documentPath}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: toFirestoreFields(data) })
    });
    if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new Error(`Firestore PATCH failed: ${response.status} ${body}`);
    }
    return response.json();
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

async function getGoogleAccessToken(env) {
    const clientEmail = env.FIREBASE_CLIENT_EMAIL || env.GOOGLE_CLIENT_EMAIL;
    const privateKey = normalizeFirebasePrivateKey(env.FIREBASE_PRIVATE_KEY || env.GOOGLE_PRIVATE_KEY || '');
    if (!clientEmail || !privateKey) throw new Error('FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY 서비스 계정 비밀값이 필요합니다.');
    const now = Math.floor(Date.now() / 1000);
    const header = { alg: 'RS256', typ: 'JWT' };
    const claim = { iss: clientEmail, scope: 'https://www.googleapis.com/auth/datastore', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 };
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
    const courseId = String(body?.courseId || DUI_COURSE_PRODUCT.courseId).trim();
    const categoryId = String(body?.categoryId || 'dui').trim();
    const note = String(body?.note || '').trim();
    const product = getApplicationProductForPayment(productId);
    const amount = typeof body?.amount === 'number' ? body.amount : product?.amount;

    if (!uid || !product || courseId !== product.courseId || categoryId !== product.categoryId) {
        return json({ message: '사용자 ID 또는 수강권 상품 정보가 올바르지 않습니다.', code: 'INVALID_REQUEST' }, 400, corsHeaders);
    }

    const enrollmentId = uid + '_' + courseId;
    const existingEnrollment = await firestoreGet(env, firestoreDocumentPath(env, 'enrollments', enrollmentId)).catch((error) => error.status === 404 ? null : Promise.reject(error));
    if (existingEnrollment) {
        const existing = fromFirestoreFields(existingEnrollment.fields || {});
        const existingExpiresAt = existing.expiresAt ? new Date(existing.expiresAt).getTime() : 0;
        if (existing.paymentStatus === 'paid' && existing.accessStatus === 'active' && existingExpiresAt > Date.now()) {
            const duplicateResolution = String(body?.duplicateResolution || 'keep').trim();
            if (duplicateResolution === 'extend') {
                const nowIso = new Date().toISOString();
                const extensionDays = Number(body?.extensionDays || getCourseProduct(courseId)?.durationDays || DUI_COURSE_PRODUCT.durationDays);
                const expiresAt = new Date(existingExpiresAt + Math.max(1, extensionDays) * 24 * 60 * 60 * 1000).toISOString();
                const patch = { expiresAt, updatedAt: nowIso, extendedAt: nowIso, extendedBy: admin.email || admin.uid, adminUpdateReason: note || '중복 수강권 부여 요청에 따른 기간 연장' };
                await firestorePatch(env, firestoreDocumentPath(env, 'enrollments', enrollmentId), patch);
                await saveAdminAuditLog(env, request, admin, 'enrollment.extend', 'enrollments', enrollmentId, existing, patch, note || '중복 수강권 기간 연장');
                return json({ ok: true, message: '기존 수강권 기간을 연장했습니다.', enrollmentId, expiresAt, accessStatus: 'active' }, 200, corsHeaders);
            }
            return json({ ok: false, message: '이미 활성화된 수강권이 있습니다. 기존 수강권 유지, 기간 연장, 교체 중 하나를 선택해 주세요.', code: 'ACTIVE_ENROLLMENT_EXISTS', enrollmentId, orderId: existing.orderId || existing.paymentId || null, expiresAt: existing.expiresAt || null, accessStatus: 'active', choices: ['keep', 'extend', 'replace'] }, 409, corsHeaders);
        }
    }

    const nowIso = new Date().toISOString();
    const expiresAt = new Date(Date.now() + (getCourseProduct(courseId)?.durationDays || DUI_COURSE_PRODUCT.durationDays) * 24 * 60 * 60 * 1000).toISOString();
    const safeUid = uid.replace(/[^a-zA-Z0-9]/g, '').slice(0, 10) || 'user';
    const orderId = 'manual_' + Date.now().toString(36) + '_' + safeUid;

    const paymentRecord = {
        paymentId: orderId,
        orderId,
        paymentKey: orderId,
        userId: uid,
        uid,
        courseId,
        categoryId,
        productId,
        productTitle: product.title,
        courseTitle: product.courseTitle,
        orderName: product.courseTitle,
        amount: amount ?? product.amount,
        method: 'admin_manual',
        status: 'paid',
        paymentStatus: 'paid',
        paymentProvider: 'admin-manual',
        adminGranted: true,
        adminGrantReason: note || '관리자 수동 수강권 지급',
        grantedBy: admin.email || admin.uid,
        approvedAt: nowIso,
        createdAt: nowIso,
        updatedAt: nowIso
    };
    const enrollmentRecord = {
        enrollmentId,
        userId: uid,
        uid,
        courseId,
        categoryId,
        productId,
        productTitle: product.title,
        courseTitle: product.courseTitle,
        paymentId: orderId,
        orderId,
        purchasedAt: nowIso,
        expiresAt,
        paymentStatus: 'paid',
        accessStatus: 'active',
        progress: 0,
        completedLessons: 0,
        totalLessons: product.totalLessons,
        certificateIssued: false,
        certificateIssuedAt: null,
        adminGranted: true,
        adminGrantReason: note || '관리자 수동 수강권 지급',
        grantedBy: admin.email || admin.uid,
        createdAt: nowIso,
        updatedAt: nowIso
    };
    const purchaseRecord = {
        uid,
        userId: uid,
        courseId,
        courseTitle: product.courseTitle,
        categoryId,
        productId,
        productTitle: product.title,
        orderId,
        paymentKey: orderId,
        paymentStatus: 'paid',
        accessStatus: 'active',
        paymentProvider: 'admin-manual',
        amount: amount ?? product.amount,
        method: 'admin_manual',
        orderedAt: nowIso,
        approvedAt: nowIso,
        purchasedAt: nowIso,
        expiresAt,
        accessValidDays: getCourseProduct(courseId)?.durationDays || DUI_COURSE_PRODUCT.durationDays,
        accessValidMonths: 3,
        totalLessons: product.totalLessons,
        completedLessons: 0,
        certificateIssued: false,
        adminGranted: true,
        adminGrantReason: note || '관리자 수동 수강권 지급',
        grantedBy: admin.email || admin.uid,
        createdAt: nowIso,
        updatedAt: nowIso
    };

    try {
        await firestorePatch(env, firestoreDocumentPath(env, 'payments', orderId), paymentRecord);
        await firestorePatch(env, firestoreDocumentPath(env, 'enrollments', enrollmentId), enrollmentRecord);
        await firestorePatch(env, firestoreDocumentPath(env, 'purchases', orderId), purchaseRecord);
        await firestorePatch(env, firestoreDocumentPath(env, 'refundPolicies', courseId), buildRefundPolicyRecord(nowIso));
        await savePaymentLog(env, orderId, {
            type: 'admin_manual_enrollment_granted',
            paymentId: orderId,
            orderId,
            user_id: uid,
            userId: uid,
            uid,
            product_id: productId,
            productId,
            requested_amount: amount ?? product.amount,
            amount: amount ?? product.amount,
            approval_status: 'paid',
            payment_method: 'admin_manual',
            grantedBy: admin.email || admin.uid,
            note: note || null,
            created_at: nowIso,
            createdAt: nowIso
        });
        await saveAdminAuditLog(env, request, admin, 'enrollment.grant', 'enrollments', enrollmentId, null, enrollmentRecord, note || '관리자 수동 수강권 지급');
    } catch (error) {
        await savePaymentLog(env, orderId, {
            type: 'admin_manual_enrollment_failed',
            paymentId: orderId,
            orderId,
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
        orderId,
        enrollmentId,
        courseId,
        productId,
        expiresAt,
        accessStatus: 'active'
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
    const courseId = String(body?.courseId || DUI_COURSE_PRODUCT.courseId).trim();
    const action = String(body?.action || "").trim();
    const reason = String(body?.reason || body?.note || "").trim();
    if (!uid || !courseId || !action || !reason) {
        return json({ message: "uid, courseId, action, reason이 필요합니다.", code: "MISSING_FIELDS" }, 400, corsHeaders);
    }

    const product = getCourseProduct(courseId);
    if (!product) return json({ message: "지원하지 않는 교육과정입니다.", code: "INVALID_COURSE" }, 400, corsHeaders);
    const enrollmentId = uid + "_" + courseId;
    const enrollmentPath = firestoreDocumentPath(env, "enrollments", enrollmentId);
    const existingRaw = await firestoreGet(env, enrollmentPath).catch((error) => error.status === 404 ? null : Promise.reject(error));
    if (!existingRaw) return json({ message: "수강권을 찾을 수 없습니다.", code: "ENROLLMENT_NOT_FOUND" }, 404, corsHeaders);
    const before = fromFirestoreFields(existingRaw.fields || {});
    const nowIso = new Date().toISOString();
    let patch = { updatedAt: nowIso, updatedBy: admin.email || admin.uid, adminUpdateReason: reason };

    if (action === "extend") {
        const baseTime = before.expiresAt ? new Date(before.expiresAt).getTime() : Date.now();
        const extensionDays = Number(body?.extensionDays || 0);
        const explicitExpiresAt = body?.expiresAt ? new Date(String(body.expiresAt)).toISOString() : null;
        const expiresAt = explicitExpiresAt || new Date(Math.max(baseTime, Date.now()) + Math.max(1, extensionDays || 30) * 24 * 60 * 60 * 1000).toISOString();
        patch = { ...patch, expiresAt, accessStatus: "active", enrollmentStatus: "active", extendedAt: nowIso, extendedBy: admin.email || admin.uid };
    } else if (action === "revoke") {
        patch = { ...patch, accessStatus: "cancelled", enrollmentStatus: "cancelled", revokedAt: nowIso, revokedBy: admin.email || admin.uid };
    } else if (action === "complete") {
        patch = { ...patch, progress: 100, completedLessons: product.totalLessons, totalLessons: product.totalLessons, completedAt: body?.completedAt || nowIso, completionForcedBy: admin.email || admin.uid, completionForcedAt: nowIso };
        await firestorePatch(env, firestoreDocumentPath(env, "courseProgress", enrollmentId), {
            uid, userId: uid, courseId, courseTitle: before.courseTitle || product.courseTitle,
            completionRate: 100, completedModuleCount: product.totalLessons, totalModuleCount: product.totalLessons,
            isCompleted: true, completedAt: patch.completedAt, updatedAt: nowIso, adminUpdated: true
        });
    } else if (action === "resetProgress") {
        const certificate = await firestoreGetData(env, "certificates", enrollmentId).catch((error) => error.status === 404 ? null : Promise.reject(error));
        if (certificate?.certificateNo && !body?.force) return json({ message: "발급된 수료증이 있어 진도 초기화를 중단했습니다. 먼저 수료증 상태를 확인하세요.", code: "CERTIFICATE_EXISTS" }, 409, corsHeaders);
        patch = { ...patch, progress: 0, completedLessons: 0, completedAt: null, progressResetBy: admin.email || admin.uid, progressResetAt: nowIso };
        await firestorePatch(env, firestoreDocumentPath(env, "courseProgress", enrollmentId), { completionRate: 0, completedModuleCount: 0, isCompleted: false, completedAt: null, updatedAt: nowIso, adminUpdated: true });
    } else {
        return json({ message: "지원하지 않는 작업입니다.", code: "INVALID_ACTION" }, 400, corsHeaders);
    }

    await firestorePatch(env, enrollmentPath, patch);
    await saveAdminAuditLog(env, request, admin, "enrollment." + action, "enrollments", enrollmentId, before, patch, reason);
    await savePaymentLog(env, enrollmentId, { type: "admin_enrollment_" + action, uid, userId: uid, courseId, beforeValue: before, afterValue: patch, reason, processedBy: admin.email || admin.uid, createdAt: nowIso, created_at: nowIso }).catch((error) => console.error(error));
    return json({ ok: true, enrollmentId, action, updated: patch, message: "수강권 변경사항이 저장되었습니다." }, 200, corsHeaders);
}

async function handleAdminIntegrityCheck(request, env, corsHeaders) {
    let admin;
    try {
        admin = await requireFirebaseAdmin(request, env);
    } catch (error) {
        return json({ message: error.message || "관리자 권한이 없습니다.", code: "ADMIN_FORBIDDEN" }, error.status || 403, corsHeaders);
    }
    const [payments, enrollments, certificates] = await Promise.all([
        firestoreList(env, "payments"),
        firestoreList(env, "enrollments"),
        firestoreList(env, "certificates").catch(() => [])
    ]);
    const enrollmentByPayment = new Map(enrollments.map((row) => [row.paymentId || row.orderId, row]));
    const enrollmentByUserCourse = new Map(enrollments.map((row) => [(row.uid || row.userId) + "_" + row.courseId, row]));
    const certificateByUserCourse = new Map(certificates.map((row) => [(row.uid || row.userId) + "_" + row.courseId, row]));
    const issues = [];
    for (const payment of payments) {
        const status = String(payment.paymentStatus || payment.status || "").toLowerCase();
        const key = payment.paymentId || payment.orderId;
        const userCourseKey = (payment.uid || payment.userId) + "_" + payment.courseId;
        if (status === "paid" && !enrollmentByPayment.get(key) && !enrollmentByUserCourse.get(userCourseKey)) issues.push({ type: "paid_without_enrollment", severity: "high", paymentId: key, uid: payment.uid || payment.userId, courseId: payment.courseId });
        if (["cancelled", "canceled", "refunded"].includes(status) && isFirestoreEnrollmentActiveRecord(enrollmentByPayment.get(key))) issues.push({ type: "cancelled_payment_active_enrollment", severity: "high", paymentId: key, uid: payment.uid || payment.userId, courseId: payment.courseId });
    }
    for (const enrollment of enrollments) {
        const key = enrollment.paymentId || enrollment.orderId;
        if (enrollment.paymentStatus === "paid" && key && !payments.find((payment) => payment.paymentId === key || payment.orderId === key)) issues.push({ type: "enrollment_without_payment", severity: enrollment.adminGranted ? "info" : "medium", enrollmentId: enrollment.id, uid: enrollment.uid || enrollment.userId, courseId: enrollment.courseId });
        if ((Number(enrollment.progress || 0) >= 100 || Number(enrollment.completedLessons || 0) >= Number(enrollment.totalLessons || 0)) && !certificateByUserCourse.get((enrollment.uid || enrollment.userId) + "_" + enrollment.courseId)) issues.push({ type: "completed_without_certificate", severity: "medium", enrollmentId: enrollment.id, uid: enrollment.uid || enrollment.userId, courseId: enrollment.courseId });
    }
    const certificateNos = new Map();
    for (const certificate of certificates) {
        const no = certificate.certificateNo || certificate.issueNumber;
        if (!no) continue;
        if (certificateNos.has(no)) issues.push({ type: "duplicate_certificate_no", severity: "high", certificateNo: no, certificateIds: [certificateNos.get(no), certificate.id] });
        certificateNos.set(no, certificate.id);
    }
    await saveAdminAuditLog(env, request, admin, "integrity.check", "admin", "integrity", null, { issueCount: issues.length }, "관리자 데이터 정합성 점검").catch((error) => console.error(error));
    return json({ ok: true, checkedAt: new Date().toISOString(), counts: { payments: payments.length, enrollments: enrollments.length, certificates: certificates.length }, issues }, 200, corsHeaders);
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
    const courseId = String(body?.courseId || DUI_COURSE_PRODUCT.courseId).trim();
    const product = getCourseProduct(courseId);
    if (!uid || !product) {
        return json({ message: '사용자 ID 또는 교육과정 정보가 올바르지 않습니다.', code: 'INVALID_REQUEST' }, 400, corsHeaders);
    }

    const certificateId = uid + '_' + courseId;
    const existing = await firestoreGetData(env, 'certificates', certificateId).catch((error) => error.status === 404 ? null : Promise.reject(error));
    if (existing?.certificateNo || existing?.issueNumber) {
        await updateCertificateFlags(env, uid, courseId, existing.certificateNo || existing.issueNumber, certificateId, existing.issuedAt || existing.createdAt, true).catch((error) => console.error(error));
        return json({ ok: true, certificateId, certificateNo: existing.certificateNo || existing.issueNumber, alreadyIssued: true, message: '이미 저장된 수료증이 있습니다.' }, 200, corsHeaders);
    }

    const user = await firestoreGetData(env, 'users', uid).catch((error) => error.status === 404 ? null : Promise.reject(error));
    if (!user) return json({ message: '회원 정보를 확인할 수 없습니다.', code: 'USER_NOT_FOUND' }, 400, corsHeaders);

    const enrollment = await getWorkerEnrollmentRecord(env, uid, courseId).catch(() => null);
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
    const certificateNo = await makeCertificateNo(certificateId, issuedAt);
    const completedAt = body?.completedAt || progress?.completedAt || issuedAt;
    const issuerName = '리셋에듀센터';
    const documentType = courseId === CBT_COURSE_PRODUCT.courseId ? 'cbt-completion' : 'completion';
    const certificateRecord = {
        certificateId, certificateNo, issueNumber: certificateNo,
        userId: uid, uid, userName, birthDate, dateOfBirth: birthDate,
        email: user.email || '', phoneNumber: user.phoneNumber || '',
        courseId, courseTitle: product.certificateTitle || product.courseTitle,
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
        issuedByAdmin: true,
        issuedBy: admin.email || admin.uid,
        adminIssueReason: String(body?.note || '관리자 직접 수료증 발급').trim(),
        createdAt: issuedAt, updatedAt: issuedAt
    };

    await firestorePatch(env, firestoreDocumentPath(env, 'certificates', certificateId), certificateRecord);
    await updateCertificateFlags(env, uid, courseId, certificateNo, certificateId, issuedAt, true);
    await savePaymentLog(env, certificateId, {
        type: 'admin_certificate_issued', certificateId, certificateNo, uid, userId: uid,
        courseId, documentType, issuedBy: admin.email || admin.uid,
        created_at: issuedAt, createdAt: issuedAt
    }).catch((logError) => console.error(logError));

    return json({ ok: true, certificateId, certificateNo, alreadyIssued: false, documentType, message: '수료증이 발급 및 저장되었습니다.' }, 200, corsHeaders);
}

async function handleAdminPayments(request, env, corsHeaders) {
    const providedKey = request.headers.get('x-admin-key') || '';
    if (!env.ADMIN_API_KEY || providedKey !== env.ADMIN_API_KEY) {
        return json({ message: '관리자 확인 키가 올바르지 않습니다.', code: 'ADMIN_FORBIDDEN' }, 403, corsHeaders);
    }
    const payments = await firestoreList(env, 'payments');
    const enrollments = await firestoreList(env, 'enrollments');
    const certificates = await firestoreList(env, 'certificates').catch(() => []);
    const users = await firestoreList(env, 'users').catch(() => []);
    const enrollmentByPaymentId = new Map(
        enrollments.map((item) => [item.paymentId || item.orderId, item])
    );
    const certificateByUserCourse = new Map(
        certificates.map((item) => [`${item.userId || item.uid}_${item.courseId}`, item])
    );
    const userById = new Map(users.map((item) => [item.userId || item.uid || item.id || item.email, item]));

    return json({
        items: payments.map((payment) => {
            const userId = payment.userId || payment.uid;
            const enrollment = enrollmentByPaymentId.get(payment.paymentId) || enrollmentByPaymentId.get(payment.orderId) || {};
            const certificate = certificateByUserCourse.get(`${userId}_${payment.courseId || DUI_COURSE_PRODUCT.courseId}`) || {};
            const user = userById.get(userId) || {};
            const completedLessons = Number(enrollment.completedLessons || payment.completedLessons || 0);
            const totalLessons = Number(enrollment.totalLessons || payment.totalLessons || DUI_COURSE_PRODUCT.totalLessons);
            const unusedLessons = Math.max(0, totalLessons - completedLessons);
            const certificateIssued = Boolean(enrollment.certificateIssued || payment.certificateIssued || certificate.certificateNo);
            const refundAmount = certificateIssued || unusedLessons === 0 ? 0 : unusedLessons * DUI_COURSE_PRODUCT.pricePerLesson;
            return {
                orderId: payment.orderId,
                userId,
                userName: certificate.userName || payment.customerName || user.realName || user.fullName || '',
                email: certificate.email || payment.customerEmail || user.email || '',
                birthDate: certificate.birthDate || user.dateOfBirth || user.birthDate || '',
                courseTitle: payment.courseTitle || DUI_COURSE_PRODUCT.courseTitle,
                amount: payment.amount || DUI_COURSE_PRODUCT.price,
                paymentStatus: payment.status || payment.paymentStatus,
                approvedAt: payment.approvedAt || null,
                expiresAt: enrollment.expiresAt || payment.expiresAt || null,
                progress: enrollment.progress || payment.progress || 0,
                completedLessons,
                unusedLessons,
                completedAt: enrollment.completedAt || payment.completedAt || certificate.completedAt || null,
                certificateIssued,
                certificateNo: enrollment.certificateNo || payment.certificateNo || certificate.certificateNo || certificate.issueNumber || '',
                certificateId: enrollment.certificateId || payment.certificateId || certificate.certificateId || '',
                certificateUrl: certificate.certificateId ? `${env.APP_BASE_URL || 'https://resetedu.kr'}/certificate?certificateId=${encodeURIComponent(certificate.certificateId)}` : '',
                estimatedRefundAmount: refundAmount,
                refundReason: certificateIssued ? '수료증이 발급된 과정은 환불이 불가합니다.' : ''
            };
        })
    }, 200, corsHeaders);
}

async function firestoreList(env, collectionName) {
    const projectId = env.FIREBASE_PROJECT_ID || env.GOOGLE_CLOUD_PROJECT || 'jaeseung-try-2-34973152-e44aa';
    const token = await getGoogleAccessToken(env);
    const response = await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collectionName}?pageSize=100`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new Error(`Firestore LIST failed: ${response.status} ${body}`);
    }
    const data = await response.json().catch(() => ({}));
    return (data.documents || []).map((doc) => ({ id: String(doc.name || '').split('/').pop(), ...fromFirestoreFields(doc.fields || {}) }));
}

async function firestoreQuery(env, collectionName, filters) {
    const projectId = env.FIREBASE_PROJECT_ID || env.GOOGLE_CLOUD_PROJECT || 'jaeseung-try-2-34973152-e44aa';
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
        throw new Error(`Firestore QUERY failed: ${response.status} ${body}`);
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
