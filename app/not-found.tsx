import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 p-6 transition-colors">
      <div className="text-center space-y-6 max-w-md">
        <div className="space-y-2">
          <h1 className="text-9xl font-bold text-blue-600 dark:text-blue-400">404</h1>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">页面未找到</h2>
          <p className="text-gray-600 dark:text-gray-400">
            抱歉，您访问的页面不存在或已被移除。
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/"
            className="px-6 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-colors font-medium"
          >
            返回首页
          </Link>
          <a
            href="https://github.com/lm379/dwz"
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 rounded-lg bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors font-medium"
          >
            Github
          </a>
        </div>

        <div className="pt-8">
          <svg
            className="w-64 h-64 mx-auto text-gray-300 dark:text-gray-700"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
