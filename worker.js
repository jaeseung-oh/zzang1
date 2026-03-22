export default {
    async fetch(request, env) {
        return handleRequest(request, env);
    }
};

async function handleRequest(request, env) {
    const url = new URL(request.url);
    const corsHeaders = buildCorsHeaders(request, env);

    if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders });
    }

    try {
        if (url.pathname === '/api/auth/kakao/start' && request.method === 'GET') {
            return startKakaoLogin(request, env);
        }

        if (url.pathname === '/api/auth/kakao/callback' && request.method === 'GET') {
            return handleKakaoCallback(request, env);
        }

        if (url.pathname === '/api/me' && request.method === 'GET') {
            return handleCurrentUser(request, env, corsHeaders);
        }

        if (url.pathname === '/api/logout' && (request.method === 'POST' || request.method === 'GET')) {
            return handleLogout(request, env, corsHeaders);
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
    const allowedOrigin = env.APP_BASE_URL || '';
    const origin = request.headers.get('Origin');

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

async function makeSessionValue(user, secret) {
    const payload = {
        sub: String(user.id),
        nickname: user.properties?.nickname || '카카오 사용자',
        profileImage: user.properties?.profile_image || '',
        thumbnailImage: user.properties?.thumbnail_image || '',
        iat: Date.now()
    };
    const encodedPayload = toBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
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

async function startKakaoLogin(request, env) {
    assertRequiredEnv(env);

    const url = new URL(request.url);
    const next = sanitizeNextUrl(url.searchParams.get('next'), env.APP_BASE_URL);
    const mode = url.searchParams.get('mode') === 'signup' ? 'signup' : 'login';
    const state = crypto.randomUUID();

    const authorizeUrl = new URL('https://kauth.kakao.com/oauth/authorize');
    authorizeUrl.searchParams.set('client_id', env.KAKAO_REST_API_KEY);
    authorizeUrl.searchParams.set('redirect_uri', env.KAKAO_REDIRECT_URI);
    authorizeUrl.searchParams.set('response_type', 'code');
    authorizeUrl.searchParams.set('scope', 'profile_nickname,profile_image');
    authorizeUrl.searchParams.set('state', state);

    const headers = new Headers();
    appendSetCookies(headers, [
        makeCookie('kakao_oauth_state', state, { maxAge: 600, sameSite: 'Lax' }),
        makeCookie('kakao_oauth_next', next, { maxAge: 600, sameSite: 'Lax' }),
        makeCookie('kakao_oauth_mode', mode, { maxAge: 600, sameSite: 'Lax' })
    ]);

    return redirect(authorizeUrl.toString(), headers);
}

async function handleKakaoCallback(request, env) {
    assertRequiredEnv(env);

    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const oauthError = url.searchParams.get('error');
    const oauthErrorDescription = url.searchParams.get('error_description');
    const savedState = getCookie(request, 'kakao_oauth_state');
    const next = sanitizeNextUrl(getCookie(request, 'kakao_oauth_next'), env.APP_BASE_URL);
    const mode = getCookie(request, 'kakao_oauth_mode') === 'signup' ? 'signup' : 'login';

    const clearCookies = [
        makeCookie('kakao_oauth_state', '', { maxAge: 0, sameSite: 'Lax' }),
        makeCookie('kakao_oauth_next', '', { maxAge: 0, sameSite: 'Lax' }),
        makeCookie('kakao_oauth_mode', '', { maxAge: 0, sameSite: 'Lax' })
    ];

    if (oauthError) {
        const errorUrl = withParams(next, { auth_error: oauthErrorDescription || oauthError, mode });
        const headers = new Headers();
        appendSetCookies(headers, clearCookies);
        return redirect(errorUrl, headers);
    }

    if (!code) {
        const errorUrl = withParams(next, { auth_error: 'missing_code', mode });
        const headers = new Headers();
        appendSetCookies(headers, clearCookies);
        return redirect(errorUrl, headers);
    }

    if (!state || !savedState || state !== savedState) {
        const errorUrl = withParams(next, { auth_error: 'invalid_state', mode });
        const headers = new Headers();
        appendSetCookies(headers, clearCookies);
        return redirect(errorUrl, headers);
    }

    const token = await exchangeCodeForToken(code, env);
    const user = await fetchKakaoUser(token.access_token);
    const sessionValue = await makeSessionValue(user, env.SESSION_SECRET);

    const headers = new Headers();
    appendSetCookies(headers, [
        ...clearCookies,
        makeCookie('app_session', sessionValue, { maxAge: 60 * 60 * 24 * 30, sameSite: 'None' })
    ]);

    return redirect(withParams(next, { login: 'success', mode }), headers);
}

async function exchangeCodeForToken(code, env) {
    const body = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: env.KAKAO_REST_API_KEY,
        redirect_uri: env.KAKAO_REDIRECT_URI,
        code
    });

    if (env.KAKAO_CLIENT_SECRET) {
        body.set('client_secret', env.KAKAO_CLIENT_SECRET);
    }

    const response = await fetch('https://kauth.kakao.com/oauth/token', {
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

async function fetchKakaoUser(accessToken) {
    const response = await fetch('https://kapi.kakao.com/v2/user/me', {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${accessToken}`
        }
    });

    const text = await response.text();
    if (!response.ok) {
        throw new Error(`Kakao user request failed: ${response.status} ${text}`);
    }

    return JSON.parse(text);
}

async function handleCurrentUser(request, env, corsHeaders) {
    assertRequiredEnv(env);
    const sessionValue = getCookie(request, 'app_session');
    const session = await verifySessionValue(sessionValue, env.SESSION_SECRET);
    return json({ user: session }, 200, corsHeaders);
}

async function handleLogout(request, env, corsHeaders) {
    assertRequiredEnv(env);

    if (request.method === 'GET') {
        const next = sanitizeNextUrl(new URL(request.url).searchParams.get('next'), env.APP_BASE_URL);
        const headers = new Headers();
        appendSetCookies(headers, makeCookie('app_session', '', { maxAge: 0, sameSite: 'None' }));
        return redirect(withParams(next, { logged_out: '1' }), headers);
    }

    const headers = new Headers(corsHeaders);
    appendSetCookies(headers, makeCookie('app_session', '', { maxAge: 0, sameSite: 'None' }));
    return json({ ok: true }, 200, headers);
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

function assertRequiredEnv(env) {
    const required = ['KAKAO_REST_API_KEY', 'KAKAO_REDIRECT_URI', 'APP_BASE_URL', 'SESSION_SECRET'];
    const missing = required.filter((key) => !env[key]);
    if (missing.length > 0) {
        throw new Error(`Missing worker environment variables: ${missing.join(', ')}`);
    }
}
