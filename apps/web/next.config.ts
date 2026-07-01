import type { NextConfig } from 'next';

/**
 * Next.js config for `apps/web`.
 *
 * Workspace packages (`@studyflow/*`) emit `.js` import specifiers for
 * TypeScript ESM output (consumed by `apps/api` at runtime). Webpack
 * doesn't resolve those automatically, so we tell it to map `.js` → `.ts`
 * for the transpiled packages only.
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  // typedRoutes left off — login redirects use dynamic ?from=… which the
  // static type-checker can't validate. We rely on runtime routing instead.
  transpilePackages: ['@studyflow/auth', '@studyflow/db', '@studyflow/shared'],
  poweredByHeader: false,
  // We run lint via Turbo; keeping `next build` focused on the bundle.
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: false },

  webpack(config) {
    // Treat `.js` imports inside workspace packages as `.ts` sources.
    // TypeScript writes `.js` for ESM compatibility but we ship `.ts` here.
    config.module.rules.push({
      test: /\.js$/,
      include: /node_modules\/@studyflow/,
      use: {
        loader: 'next-swc-loader',
        options: { isServer: false },
      },
    });
    config.resolve.extensionAlias = {
      ...(config.resolve.extensionAlias ?? {}),
      '.js': ['.ts', '.tsx', '.js'],
      '.mjs': ['.mts', '.mjs'],
    };
    return config;
  },
};

export default nextConfig;