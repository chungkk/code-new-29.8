/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['localhost'],
  },
  // Removed 'output: export' to enable API routes for authentication
  // trailingSlash: true,  // Commented out to fix Vercel API routes
  async rewrites() {
    return [
      {
        source: '/index.html',
        destination: '/',
      },
      {
        source: '/dashboard.html',
        destination: '/dashboard',
      },
      {
        source: '/auth/login.html',
        destination: '/auth/login',
      },
      {
        source: '/auth/register.html',
        destination: '/auth/register',
      },
      {
        source: '/admin/dashboard.html',
        destination: '/admin/dashboard',
      },
    ];
  },
}

module.exports = nextConfig
