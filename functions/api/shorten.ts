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
                const shortUrlExisting = `${originExisting}/${existingSlug}`;
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
        const shortUrl = `${origin}/${slug}`;

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
