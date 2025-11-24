'use client';

import React, { useState } from 'react';
import QRCode from 'qrcode';
import Image from 'next/image';
import { useTheme } from '@/hooks/useTheme';

type ShortenResp = { slug: string; url: string; shortUrl: string; qrUrl?: string; qrDataUrl?: string };

// Read from environment variable at build time
const PASSWORD_REQUIRED = !!(process.env.NEXT_PUBLIC_PASSWORD_REQUIRED === 'true' || process.env.PASSWORD || process.env.DWZ_PASSWORD);
const ANNOUNCEMENT = (() => {
    const encoded = process.env.NEXT_PUBLIC_ANNOUNCEMENT_ENCODED;
    const raw = process.env.NEXT_PUBLIC_ANNOUNCEMENT;
    if (encoded) {
        try {
            return decodeURIComponent(encoded);
        } catch {
            return encoded;
        }
    }
    return raw || '';
})();

async function apiShorten(url: string, slug?: string, password?: string): Promise<ShortenResp> {
    const res = await fetch('/api/shorten', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url, slug, password }),
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
    const { theme, switchTheme } = useTheme();
    const [url, setUrl] = useState('');
    const [slug, setSlug] = useState('');
    const [password, setPassword] = useState('');
    const [creating, setCreating] = useState(false);
    const [created, setCreated] = useState<ShortenResp | null>(null);
    const [err, setErr] = useState<string | null>(null);

    const [showAnnouncement, setShowAnnouncement] = useState(!!ANNOUNCEMENT);
    const [isAnnouncementVisible, setIsAnnouncementVisible] = useState(!!ANNOUNCEMENT);

    const [qSlug, setQSlug] = useState('');
    const [resolved, setResolved] = useState<string | null>(null);
    const [qErr, setQErr] = useState<string | null>(null);
    // ensure a definite string for Image src (empty string when none) so it's not undefined
    const qrSrc = created ? (created.qrDataUrl || created.qrUrl || '') : '';

    // Auto hide announcement after 3 seconds
    React.useEffect(() => {
        if (showAnnouncement) {
            const timer = setTimeout(() => {
                setIsAnnouncementVisible(false);
                // Wait for animation to complete before removing from DOM
                setTimeout(() => {
                    setShowAnnouncement(false);
                }, 300); // Match the transition duration
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [showAnnouncement]);

    const handleCloseAnnouncement = () => {
        setIsAnnouncementVisible(false);
        setTimeout(() => {
            setShowAnnouncement(false);
        }, 300);
    };

    const onCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);
        setErr(null);
        setCreated(null);
        try {
            const data = await apiShorten(url, slug || undefined, password || undefined);
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
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 p-6 relative transition-colors">
            {/* Announcement Toast */}
            {showAnnouncement && ANNOUNCEMENT && (
                <div className={`fixed top-6 right-6 max-w-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white rounded-lg shadow-lg p-4 z-20 transition-all duration-300 ease-in-out ${isAnnouncementVisible
                        ? 'opacity-100 translate-x-0'
                        : 'opacity-0 translate-x-full'
                    }`}>
                    <div className="flex items-start gap-3">
                        <div className="flex-1 text-sm [&_a]:text-blue-600 [&_a]:dark:text-blue-400 [&_a]:underline [&_a]:hover:text-blue-500 [&_a]:dark:hover:text-blue-300" dangerouslySetInnerHTML={{ __html: ANNOUNCEMENT }} />
                        <button
                            onClick={handleCloseAnnouncement}
                            className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors flex-shrink-0"
                            aria-label="关闭公告"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}

            {/* GitHub Icon */}
            <a
                href="https://github.com/lm379/dwz"
                target="_blank"
                rel="noopener noreferrer"
                className="fixed top-0 right-0 z-10 github-corner"
                aria-label="GitHub"
            >
                <svg className="w-20 h-20" viewBox="0 0 250 250" aria-hidden="true">
                    <path d="M0,0 L115,115 L130,115 L142,142 L250,250 L250,0 Z" className="fill-blue-600 dark:fill-gray-800"></path>
                    <path d="M128.3,109.0 C113.8,99.7 119.0,89.6 119.0,89.6 C122.0,82.7 120.5,78.6 120.5,78.6 C119.2,72.0 123.4,76.3 123.4,76.3 C127.3,80.9 125.5,87.3 125.5,87.3 C122.9,97.6 130.6,101.9 134.4,103.2" className="fill-white dark:fill-white octo-arm"></path>
                    <path d="M115.0,115.0 C114.9,115.1 118.7,116.5 119.8,115.4 L133.7,101.6 C136.9,99.2 139.9,98.4 142.2,98.6 C133.8,88.0 127.5,74.4 143.8,58.0 C148.5,53.4 154.0,51.2 159.7,51.0 C160.3,49.4 163.2,43.6 171.4,40.1 C171.4,40.1 176.1,42.5 178.8,56.2 C183.1,58.6 187.2,61.8 190.9,65.4 C194.5,69.0 197.7,73.2 200.1,77.6 C213.8,80.2 216.3,84.9 216.3,84.9 C212.7,93.1 206.9,96.0 205.4,96.6 C205.1,102.4 203.0,107.8 198.3,112.5 C181.9,128.9 168.3,122.5 157.7,114.1 C157.9,116.9 156.7,120.9 152.7,124.9 L141.0,136.5 C139.8,137.7 141.6,141.9 141.8,141.8 Z" className="fill-white dark:fill-white octo-body"></path>
                </svg>
            </a>

            <div className="w-full max-w-2xl space-y-8">
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6 shadow-sm transition-colors relative">
                    <div className="flex items-center justify-between mb-4">
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">短网址生成器</h1>
                        <button
                            onClick={() => {
                                switchTheme(theme === 'light' ? 'dark' : 'light');
                            }}
                            className="p-2 rounded-lg bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
                            aria-label="切换主题"
                            title={theme === 'light' ? '切换到深色模式' : '切换到浅色模式'}
                        >
                            {theme === 'light' ? (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                                </svg>
                            ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                                </svg>
                            )}
                        </button>
                    </div>
                    <form onSubmit={onCreate} className="space-y-4">
                        <div>
                            <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">原始 URL</label>
                            <input
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                placeholder="https://example.com/very/long/path"
                                className="w-full rounded-md bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white p-2 outline-none border border-gray-300 dark:border-gray-700 focus:border-blue-500 transition-colors"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">自定义别名 (可选)</label>
                            <input
                                value={slug}
                                onChange={(e) => setSlug(e.target.value)}
                                placeholder="如 my-link (3-64位字母数字_-)"
                                className="w-full rounded-md bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white p-2 outline-none border border-gray-300 dark:border-gray-700 focus:border-blue-500 transition-colors"
                            />
                        </div>
                        {PASSWORD_REQUIRED && (
                            <div>
                                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">密码</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="输入密码"
                                    className="w-full rounded-md bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white p-2 outline-none border border-gray-300 dark:border-gray-700 focus:border-blue-500 transition-colors"
                                />
                            </div>
                        )}
                        <button
                            type="submit"
                            disabled={creating}
                            className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 transition-colors"
                        >
                            {creating ? '创建中...' : '创建短链'}
                        </button>
                    </form>
                    {err && <p className="text-red-500 dark:text-red-400 mt-3">{err}</p>}
                    {created && (
                        <div className="mt-4 text-gray-800 dark:text-gray-200">
                            <div>短链：
                                <a className="text-blue-600 dark:text-blue-400 hover:underline" href={created.shortUrl} target="_blank" rel="noreferrer">
                                    {created.shortUrl}
                                </a>
                            </div>
                            <div>原始：{created.url}</div>
                            {qrSrc && (
                                <div className="mt-3">
                                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">短链二维码</div>
                                    <Image
                                        src={qrSrc}
                                        alt="QR code"
                                        width={250}
                                        height={250}
                                        className="border border-gray-300 dark:border-gray-700 rounded-md"
                                        unoptimized
                                    />
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6 shadow-sm transition-colors">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">还原短链</h2>
                    <form onSubmit={onResolve} className="space-y-4">
                        <div>
                            <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">短链别名或完整短链 URL</label>
                            <input
                                value={qSlug}
                                onChange={(e) => setQSlug(e.target.value)}
                                placeholder="如 abc123 或 my-link"
                                className="w-full rounded-md bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white p-2 outline-none border border-gray-300 dark:border-gray-700 focus:border-blue-500 transition-colors"
                            />
                        </div>
                        <button
                            type="submit"
                            className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-500 transition-colors"
                        >
                            查询原始 URL
                        </button>
                    </form>
                    {qErr && <p className="text-red-500 dark:text-red-400 mt-3">{qErr}</p>}
                    {resolved && (
                        <div className="mt-3 text-gray-800 dark:text-gray-200 break-all">原始 URL：{resolved}</div>
                    )}
                </div>
            </div>
        </div>
    );
}
