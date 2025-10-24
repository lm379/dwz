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

export async function onRequest(context: { request: Request; env: Env; params: { slug?: string } }): Promise<Response> {
    const { env, params } = context;
    const { kv, bindingName } = resolveKV(env);

    if (!kv) {
        return new Response(JSON.stringify({ error: `KV binding '${bindingName}' is not configured. You can set env.DWZ_KV_BINDING to another binding name.` }), {
            status: 500,
            headers: { 'content-type': 'application/json; charset=utf-8' },
        });
    }

    const slug = (params?.slug || '').trim();
    if (!slug) {
        return new Response('Bad Request', { status: 400 });
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
