'use client';

import React, { useState } from 'react';
import QRCode from 'qrcode';

type ShortenResp = { slug: string; url: string; shortUrl: string; qrUrl?: string; qrDataUrl?: string };

async function apiShorten(url: string, slug?: string): Promise<ShortenResp> {
    const res = await fetch('/api/shorten', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url, slug }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || 'Request failed');
    return data;
}

function extractSlug(input: string): string {
    const raw = input.trim();
    if (!raw) return '';
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(raw)) {
        try {
            const u = new URL(raw);
            // Handle /s/slug format
            const parts = u.pathname.replace(/^\//, '').split('/');
            if (parts[0] === 's' && parts[1]) {
                return parts[1].trim();
            }
            return (parts[0] || '').trim();
        } catch {
            return '';
        }
    }
    if (raw.includes('/')) {
        // Handle /s/slug or just slug
        const parts = raw.replace(/^\//, '').split('/');
        if (parts[0] === 's' && parts[1]) {
            return parts[1].trim();
        }
        return parts[0].trim();
    }
    return raw;
}

async function apiResolve(input: string): Promise<{ slug: string; url: string }> {
    const s = extractSlug(input);
    if (!s) throw new Error('请输入有效的短链或别名');
    const res = await fetch(`/api/resolve?slug=${encodeURIComponent(s)}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || 'Request failed');
    return data;
}

export default function Shortener() {
    const [url, setUrl] = useState('');
    const [slug, setSlug] = useState('');
    const [creating, setCreating] = useState(false);
    const [created, setCreated] = useState<ShortenResp | null>(null);
    const [err, setErr] = useState<string | null>(null);

    const [qSlug, setQSlug] = useState('');
    const [resolved, setResolved] = useState<string | null>(null);
    const [qErr, setQErr] = useState<string | null>(null);

    const onCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);
        setErr(null);
        setCreated(null);
        try {
            const data = await apiShorten(url, slug || undefined);
            // if server didn't return a qrDataUrl, generate on client using 'qrcode'
            if (!data.qrDataUrl) {
                try {
                    const svg = await QRCode.toString(data.shortUrl, { type: 'svg', margin: 1, width: 200 });
                    const encoded = 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
                    data.qrDataUrl = encoded;
                } catch (err) {
                    // ignore QR generation error, keep server qrUrl if any
                }
            }
            setCreated(data);
        } catch (e: any) {
            setErr(e.message);
        } finally {
            setCreating(false);
        }
    };

    const onResolve = async (e: React.FormEvent) => {
        e.preventDefault();
        setQErr(null);
        setResolved(null);
        try {
            const data = await apiResolve(qSlug);
            setResolved(data.url);
        } catch (e: any) {
            setQErr(e.message);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-950 p-6">
            <div className="w-full max-w-2xl space-y-8">
                <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
                    <h1 className="text-2xl font-bold text-white mb-4">短网址生成器</h1>
                    <form onSubmit={onCreate} className="space-y-4">
                        <div>
                            <label className="block text-sm text-gray-300 mb-1">原始 URL</label>
                            <input
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                placeholder="https://example.com/very/long/path"
                                className="w-full rounded-md bg-gray-800 text-white p-2 outline-none border border-gray-700 focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-300 mb-1">自定义别名 (可选)</label>
                            <input
                                value={slug}
                                onChange={(e) => setSlug(e.target.value)}
                                placeholder="如 my-link (3-64位字母数字_-)"
                                className="w-full rounded-md bg-gray-800 text-white p-2 outline-none border border-gray-700 focus:border-blue-500"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={creating}
                            className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50"
                        >
                            {creating ? '创建中...' : '创建短链'}
                        </button>
                    </form>
                    {err && <p className="text-red-400 mt-3">{err}</p>}
                    {created && (
                        <div className="mt-4 text-gray-200">
                            <div>短链：
                                <a className="text-blue-400 hover:underline" href={created.shortUrl} target="_blank" rel="noreferrer">
                                    {created.shortUrl}
                                </a>
                            </div>
                            <div>原始：{created.url}</div>
                            {(created.qrDataUrl || created.qrUrl) && (
                                <div className="mt-3">
                                    <div className="text-sm text-gray-400 mb-2">二维码（长按或右键图片可保存）</div>
                                    <img src={created.qrDataUrl || created.qrUrl} alt="QR code" width={200} height={200} className="border border-gray-700 rounded-md" />
                                    <div className="mt-2">
                                        <a href={created.qrDataUrl || created.qrUrl} target="_blank" rel="noreferrer" className="text-sm text-blue-400 hover:underline">在新标签打开图片以保存</a>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
                    <h2 className="text-xl font-semibold text-white mb-4">还原短链</h2>
                    <form onSubmit={onResolve} className="space-y-4">
                        <div>
                            <label className="block text-sm text-gray-300 mb-1">短链别名</label>
                            <input
                                value={qSlug}
                                onChange={(e) => setQSlug(e.target.value)}
                                placeholder="如 abc123 或 my-link"
                                className="w-full rounded-md bg-gray-800 text-white p-2 outline-none border border-gray-700 focus:border-blue-500"
                            />
                        </div>
                        <button
                            type="submit"
                            className="px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-500"
                        >
                            查询原始 URL
                        </button>
                    </form>
                    {qErr && <p className="text-red-400 mt-3">{qErr}</p>}
                    {resolved && (
                        <div className="mt-3 text-gray-200 break-all">原始 URL：{resolved}</div>
                    )}
                </div>
            </div>
        </div>
    );
}
