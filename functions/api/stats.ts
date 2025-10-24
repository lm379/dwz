type KVNamespace = {
    get(key: string): Promise<string | null>;
};

type Env = Record<string, unknown>;

function resolveKV(env: Env): { kv?: KVNamespace; bindingName: string } {
    const bindingName = (env?.DWZ_KV_BINDING as string) || 'dwz_kv';
    const g = (globalThis as any) ?? {};
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
    const slug = (urlObj.searchParams.get('slug') || '').trim();

    if (!slug) {
        return new Response(JSON.stringify({ error: 'Missing slug' }), {
            status: 400,
            headers: { 'content-type': 'application/json; charset=utf-8' },
        });
    }

    try {
        const url = await kv.get(`s:${slug}`);
        if (!url) {
            return new Response(JSON.stringify({ error: 'Not Found' }), {
                status: 404,
                headers: { 'content-type': 'application/json; charset=utf-8' },
            });
        }

        const visitsStr = await kv.get(`c:${slug}`);
        const visits = Number(visitsStr || '0') || 0;

        return new Response(
            JSON.stringify({ slug, url, visits }),
            { status: 200, headers: { 'content-type': 'application/json; charset=utf-8' } }
        );
    } catch (err: any) {
        return new Response(
            JSON.stringify({ error: 'Unexpected error', detail: String(err?.message ?? err) }),
            { status: 500, headers: { 'content-type': 'application/json; charset=utf-8' } }
        );
    }
}
