export default {
    async fetch(request, env) {
        return handleRequest(request, env);
    }
};

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

function buildCorsHeaders(request, env) {
    const headers = new Headers();
    const origin = request.headers.get('Origin');
    let allowedOrigin = '';

    try {
        allowedOrigin = env.APP_BASE_URL ? new URL(env.APP_BASE_URL).origin : '';
    } catch {
        allowedOrigin = '';
    }

    if (origin && allowedOrigin && origin === allowedOrigin) {
        headers.set('Access-Control-Allow-Origin', origin);
        headers.set('Access-Control-Allow-Credentials', 'true');
        headers.set('Vary', 'Origin');
    }

    headers.set('Access-Control-Allow-Headers', 'Content-Type');
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
