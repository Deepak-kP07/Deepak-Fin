const withSerwist = require('@serwist/next').default({
  swSrc: 'app/sw.js',
  swDest: 'public/sw.js',
  // Disabled in dev so the service worker never shadows Next's own HMR/dev-server fetches —
  // it only ever runs against a real production build.
  disable: process.env.NODE_ENV === 'development',
})

const nextConfig = {
  output: 'standalone',
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: 'avatars.githubusercontent.com', pathname: '/**' },
    ],
  },
  webpack(config, { dev }) {
    if (dev) {
      // Reduce CPU/memory from file watching
      config.watchOptions = {
        poll: 2000, // check every 2 seconds
        aggregateTimeout: 300, // wait before rebuilding
        ignored: ['**/node_modules'],
      };
    }
    return config;
  },
  onDemandEntries: {
    maxInactiveAge: 10000,
    pagesBufferLength: 2,
  },
  async redirects() {
    // personalfin.site → www.personalfin.site, done here rather than as a Vercel domain redirect
    // because Android App Links verification refuses to follow redirects: the bare domain must
    // serve /.well-known/assetlinks.json itself (with a 200) for the app to claim its links.
    return [
      {
        source: '/:path((?!\\.well-known/).*)',
        has: [{ type: 'host', value: 'personalfin.site' }],
        destination: 'https://www.personalfin.site/:path',
        permanent: true,
      },
    ];
  },
  async headers() {
    // Clickjacking protection for every page — no reason for any site to frame this app.
    // CORS for /api is already handled per-request in app/api/[[...path]]/route.js
    // (handleCORS), so it isn't duplicated here.
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'self';" },
        ],
      },
    ];
  },
};

module.exports = withSerwist(nextConfig);
