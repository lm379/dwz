type KVNamespace = {
    get(key: string): Promise<string | null>;
    put(key: string, value: string): Promise<void>;
};

type Env = Record<string, unknown>;

function resolveKV(env: Env): { kv?: KVNamespace; bindingName: string } {
    const bindingName = (env?.DWZ_KV_BINDING as string) || 'dwz_kv';
    const g = globalThis as any;
    const kv: KVNamespace | undefined = (g?.[bindingName] as KVNamespace | undefined) ?? ((env as any)?.[bindingName] as KVNamespace | undefined);
    return { kv, bindingName };
}

function readApiToken(env: Env): string | undefined {
    const g = globalThis as any;
    const p = (typeof process !== 'undefined' ? (process as any).env : undefined) || {};
    return (
        (env as any)?.NEXT_PUBLIC_API_TOKEN ||
        (env as any)?.API_TOKEN ||
        (env as any)?.DWZ_API_TOKEN ||
        p?.NEXT_PUBLIC_API_TOKEN ||
        p?.API_TOKEN ||
        p?.DWZ_API_TOKEN ||
        g?.NEXT_PUBLIC_API_TOKEN ||
        g?.API_TOKEN ||
        g?.DWZ_API_TOKEN
    );
}

function readDisableFlag(env: Env): boolean {
    const g = globalThis as any;
    const p = (typeof process !== 'undefined' ? (process as any).env : undefined) || {};
    const raw = (
        (env as any)?.NEXT_PUBLIC_DISABLE_API_TOKEN_CHECK ||
        (env as any)?.DISABLE_API_TOKEN_CHECK ||
        p?.NEXT_PUBLIC_DISABLE_API_TOKEN_CHECK ||
        p?.DISABLE_API_TOKEN_CHECK ||
        g?.NEXT_PUBLIC_DISABLE_API_TOKEN_CHECK ||
        g?.DISABLE_API_TOKEN_CHECK ||
        ''
    );
    const v = String(raw).trim().toLowerCase();
    return v === '1' || v === 'true' || v === 'yes';
}

function isLocalDev(req: Request): boolean {
    const host = (req.headers.get('host') || '').toLowerCase();
    return /^localhost(:\d+)?$/.test(host) || /^127\.0\.0\.1(:\d+)?$/.test(host);
}

export async function onRequest(context: { request: Request; env: Env }): Promise<Response> {
    const { request, env } = context;
    const { kv, bindingName } = resolveKV(env);

    if (!kv) {
        return new Response(JSON.stringify({ error: `KV binding '${bindingName}' is not configured. You can set env.DWZ_KV_BINDING to another binding name.` }), {
            status: 500,
            headers: { 'content-type': 'application/json; charset=utf-8' },
        });
    }

    if (request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
            status: 405,
            headers: { 'content-type': 'application/json; charset=utf-8' },
        });
    }

    let body: any;
    try {
        body = await request.json();
    } catch {
        return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
            status: 400,
            headers: { 'content-type': 'application/json; charset=utf-8' },
        });
    }

    // Token check: only enforce when env token is set. Allow same-origin web UI without token.
    const tokenEnv = readApiToken(env);
    const disableCheck = readDisableFlag(env);
    const localDev = isLocalDev(request);
    if (tokenEnv && !disableCheck && !localDev) {
        const tokenReq = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
            || (request.headers.get('x-api-token') || '');

        // Resolve request origin (scheme + host)
        let reqOrigin: string;
        try { reqOrigin = new URL(request.url).origin; }
        catch {
            const host = request.headers.get('host') || 'localhost';
            const proto = request.headers.get('x-forwarded-proto') || 'http';
            reqOrigin = `${proto}://${host}`;
        }

        // Prefer Origin header, fallback to Referer
        const originHeader = request.headers.get('origin') || '';
        let originHeaderOrigin = '';
        try { originHeaderOrigin = originHeader ? new URL(originHeader).origin : ''; } catch {}

        const refererHeader = request.headers.get('referer') || '';
        let refererHeaderOrigin = '';
        try { refererHeaderOrigin = refererHeader ? new URL(refererHeader).origin : ''; } catch {}

        const candidateOrigin = originHeaderOrigin || refererHeaderOrigin;
        const isSameOrigin = candidateOrigin && candidateOrigin === reqOrigin;

        if (!isSameOrigin && (!tokenReq || tokenReq !== tokenEnv)) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { 'content-type': 'application/json; charset=utf-8' },
            });
        }
    }

    const inputUrl = (body?.url || '').trim();
    let slug: string = (body?.slug || '').trim();

    if (!inputUrl) {
        return new Response(JSON.stringify({ error: 'Missing required field: url' }), {
            status: 400,
            headers: { 'content-type': 'application/json; charset=utf-8' },
        });
    }

    try {
        let normalizedUrl = inputUrl;
        try {
            new URL(normalizedUrl);
        } catch {
            normalizedUrl = `http://${normalizedUrl}`;
        }
        const urlObj = new URL(normalizedUrl);
        if (!urlObj.protocol.startsWith('http')) {
            return new Response(JSON.stringify({ error: 'Only http/https URLs are supported' }), {
                status: 400,
                headers: { 'content-type': 'application/json; charset=utf-8' },
            });
        }

        const base62 = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const genSlug = (len = 7) => Array.from({ length: len }, () => base62[Math.floor(Math.random() * base62.length)]).join('');

        const reverseKey = `u:${urlObj.toString()}`;
        {
            const existingSlug = await kv.get(reverseKey);
            if (existingSlug) {
                // Return existing mapping directly (idempotent)
                let originExisting: string;
                try {
                    originExisting = new URL(request.url).origin;
                } catch {
                    const host = request.headers.get('host') || 'localhost';
                    const proto = request.headers.get('x-forwarded-proto') || 'http';
                    originExisting = `${proto}://${host}`;
                }
                const shortUrlExisting = `${originExisting}/s/${existingSlug}`;
                return new Response(
                    JSON.stringify({ slug: existingSlug, url: urlObj.toString(), shortUrl: shortUrlExisting }),
                    { status: 200, headers: { 'content-type': 'application/json; charset=utf-8' } }
                );
            }
        }

        let attempts = 0;
        const maxAttempts = 5;
        while (!slug) {
            const candidate = genSlug();
            const exists = await kv.get(`s:${candidate}`);
            if (!exists) {
                slug = candidate;
                break;
            }
            attempts += 1;
            if (attempts >= maxAttempts) break;
        }

        if (!slug) {
            return new Response(JSON.stringify({ error: 'Failed to generate unique slug, please retry.' }), {
                status: 500,
                headers: { 'content-type': 'application/json; charset=utf-8' },
            });
        }

        if (!/^[0-9a-zA-Z_-]{3,64}$/.test(slug)) {
            return new Response(
                JSON.stringify({ error: 'Invalid slug. Use 3-64 chars: 0-9, a-z, A-Z, _ or -' }),
                { status: 400, headers: { 'content-type': 'application/json; charset=utf-8' } }
            );
        }

        const existing = await kv.get(`s:${slug}`);
        if (existing && existing !== urlObj.toString()) {
            return new Response(
                JSON.stringify({ error: 'Slug already in use' }),
                { status: 409, headers: { 'content-type': 'application/json; charset=utf-8' } }
            );
        }

        await kv.put(`s:${slug}`, urlObj.toString());
        await kv.put(reverseKey, slug);

        let origin: string;
        try {
            origin = new URL(request.url).origin;
        } catch {
            const host = request.headers.get('host') || 'localhost';
            const proto = request.headers.get('x-forwarded-proto') || 'http';
            origin = `${proto}://${host}`;
        }
        const shortUrl = `${origin}/s/${slug}`;

        return new Response(
            JSON.stringify({ slug, url: urlObj.toString(), shortUrl }),
            { status: existing ? 200 : 201, headers: { 'content-type': 'application/json; charset=utf-8' } }
        );
    } catch (err: any) {
        return new Response(
            JSON.stringify({ error: 'Unexpected error', detail: String(err?.message ?? err) }),
            { status: 500, headers: { 'content-type': 'application/json; charset=utf-8' } }
        );
    }
}
