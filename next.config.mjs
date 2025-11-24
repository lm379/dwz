/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  eslint: {
    // Disable the warning about using <img> tag in static export mode
    ignoreDuringBuilds: false,
  },
  // Configure to allow <img> tags without warnings
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
