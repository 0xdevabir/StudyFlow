import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    typedRoutes: true,
  },
  transpilePackages: ['@studyflow/auth', '@studyflow/db', '@studyflow/shared'],
  eslint: { ignoreDuringBuilds: true }, // we run lint via turbo
  typescript: { ignoreBuildErrors: false },
  poweredByHeader: false,
};

export default nextConfig;