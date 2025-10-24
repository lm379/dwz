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
    <html lang="zh-CN">
      <body className={`${inter.className} bg-gray-950`}>
        <div className="min-h-screen flex flex-col">
          <main className="flex-1">
            <div className="mx-auto w-full max-w-2xl px-6">
              {children}
            </div>
          </main>
          {icp ? (
            <footer className="w-full py-6 text-sm text-gray-400">
              <div className="mx-auto w-full max-w-2xl px-6 text-center">
                <a href="https://beian.miit.gov.cn/" target="_blank" rel="noreferrer" className="hover:underline">
                  {icp}
                </a>
              </div>
            </footer>
          ) : null}
        </div>
      </body>
    </html>
  );
}
