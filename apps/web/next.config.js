/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  transpilePackages: ['@aigentic/workflow-engine'],
  env: {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'http://localhost:3000',
    NEXT_PUBLIC_MULTI_TENANT: process.env.NEXT_PUBLIC_MULTI_TENANT || 'false',
    ENABLE_AUTO_PUBLISH: process.env.ENABLE_AUTO_PUBLISH || 'false',
  },
};

module.exports = nextConfig; 