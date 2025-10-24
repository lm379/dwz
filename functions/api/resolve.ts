type KVNamespace = {
    get(key: string): Promise<string | null>;
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

    if (request.method !== 'GET') {
        return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
            status: 405,
            headers: { 'content-type': 'application/json; charset=utf-8' },
        });
    }

    let urlObj: URL;
    try {
        urlObj = new URL(request.url);
    } catch {
        const host = request.headers.get('host') || 'localhost';
        const proto = request.headers.get('x-forwarded-proto') || 'http';
        urlObj = new URL(`${proto}://${host}${request.url}`);
    }
    const raw = (urlObj.searchParams.get('slug') || urlObj.searchParams.get('url') || '').trim();

    if (!raw) {
        return new Response(JSON.stringify({ error: 'Missing slug or url' }), {
            status: 400,
            headers: { 'content-type': 'application/json; charset=utf-8' },
        });
    }

    // Support either a plain slug or a full short URL
    let slug = raw;
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(raw)) {
        try {
            const u = new URL(raw);
            // Handle /s/slug format
            const parts = u.pathname.replace(/^\//, '').split('/');
            if (parts[0] === 's' && parts[1]) {
                slug = parts[1];
            } else {
                slug = parts[0] || '';
            }
        } catch {
            return new Response(JSON.stringify({ error: 'Invalid url parameter' }), {
                status: 400,
                headers: { 'content-type': 'application/json; charset=utf-8' },
            });
        }
    } else if (raw.includes('/')) {
        // If a path is accidentally passed, take the first or second segment
        const parts = raw.replace(/^\//, '').split('/');
        if (parts[0] === 's' && parts[1]) {
            slug = parts[1];
        } else {
            slug = parts[0];
        }
    }

    if (!slug) {
        return new Response(JSON.stringify({ error: 'Invalid slug' }), {
            status: 400,
            headers: { 'content-type': 'application/json; charset=utf-8' },
        });
    }

    try {
        const target = await kv.get(`s:${slug}`);
        if (!target) {
            return new Response(JSON.stringify({ error: 'Not Found' }), {
                status: 404,
                headers: { 'content-type': 'application/json; charset=utf-8' },
            });
        }

        return new Response(
            JSON.stringify({ slug, url: target }),
            { status: 200, headers: { 'content-type': 'application/json; charset=utf-8' } }
        );
    } catch (err: any) {
        return new Response(
            JSON.stringify({ error: 'Unexpected error', detail: String(err?.message ?? err) }),
            { status: 500, headers: { 'content-type': 'application/json; charset=utf-8' } }
        );
    }
}
