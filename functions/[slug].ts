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

function resolveAssets(env: Env): { assets?: { fetch: (req: Request) => Promise<Response> }; bindingName: string } {
    const bindingName = 'ASSETS';
    const g = globalThis as any;
    const assets = (g?.[bindingName] as any) ?? ((env as any)?.[bindingName] as any);
    return { assets, bindingName };
}

export async function onRequest(context: { request: Request; env: Env; params: { slug?: string } }): Promise<Response> {
    const { request, env, params } = context;
    const { kv, bindingName } = resolveKV(env);

    if (!kv) {
        return new Response(JSON.stringify({ error: `KV binding '${bindingName}' is not configured. You can set env.DWZ_KV_BINDING to another binding name.` }), {
            status: 500,
            headers: { 'content-type': 'application/json; charset=utf-8' },
        });
    }

    const slug = (params?.slug || '').trim();
    const pathname = (() => { try { return new URL(request.url).pathname; } catch { return '/'; } })();
    const isStatic = pathname.startsWith('/_next/') || pathname === '/favicon.ico' || pathname === '/robots.txt' || pathname === '/sitemap.xml';

    if (!slug || isStatic) {
        // Prioritize ASSETS for static/Next resources, then fall back to default fetch
        const { assets } = resolveAssets(env);
        if (assets && typeof assets.fetch === 'function') {
            try {
                return await assets.fetch(request);
            } catch {}
        }
        try {
            return await fetch(request);
        } catch {
            return new Response('Not Found', { status: 404 });
        }
    }

    try {
        const target = await kv.get(`s:${slug}`);
        if (!target) {
            return new Response('Not Found', { status: 404 });
        }

        const counterKey = `c:${slug}`;
        try {
            const c = Number(await kv.get(counterKey)) || 0;
            await kv.put(counterKey, String(c + 1));
        } catch { }

        return Response.redirect(target, 302);
    } catch {
        return new Response('Internal Server Error', { status: 500 });
    }
}
