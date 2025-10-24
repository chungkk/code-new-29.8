/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    appDir: false, // Use pages directory
  },
  images: {
    domains: ['localhost'],
    unoptimized: true // For static export compatibility
  },
  // For static export if needed
  trailingSlash: true,
  output: 'export',
  distDir: 'out'
}

module.exports = nextConfig
