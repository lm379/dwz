import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "短网址生成器",
  description: "A URL shortener powered by EdgeOne Pages Functions.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const icp = process.env.NEXT_PUBLIC_ICP || process.env.ICP || process.env.BEIAN;
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const theme = localStorage.getItem('theme');
                if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark');
                }
              })();
            `,
          }}
        />
      </head>
      <body className={`${inter.className} bg-white dark:bg-gray-950 transition-colors`}>
        <div className="min-h-screen flex flex-col">
          <main className="flex-1">
            <div className="mx-auto w-full max-w-2xl px-6">
              {children}
            </div>
          </main>
          <footer className="w-full py-6 text-sm text-gray-600 dark:text-gray-400 transition-colors">
            <div className="mx-auto w-full max-w-2xl px-6 text-center space-y-4">
              {/* Sponsor Section */}
              <div className="space-y-3">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  本项目的 CDN 加速和安全保护由
                  <a
                    href="https://edgeone.ai/?from=github"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 ml-1"
                  >
                    腾讯 EdgeOne
                  </a>
                  {' '}赞助
                </p>
                <a
                  href="https://edgeone.ai/?from=github"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block"
                  aria-label="EdgeOne"
                >
                  <img
                    src="https://edgeone.ai/media/34fe3a45-492d-4ea4-ae5d-ea1087ca7b4b.png"
                    alt="EdgeOne"
                    className="h-8 w-auto opacity-80 hover:opacity-100 transition-opacity mx-auto"
                  />
                </a>
              </div>
              {/* ICP Section */}
              {icp && (
                <div>
                  <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer" className="hover:underline">
                    {icp}
                  </a>
                </div>
              )}
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
