import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Die Seed-Datei und Geodaten werden von Server-Code (Import) gelesen.
  outputFileTracingIncludes: {
    "/admin/**": ["./data/**/*"],
  },
  serverExternalPackages: ["pg"],
  async rewrites() {
    return [
      // SEO-URL /rohmilch-in-berlin -> interne Route /stadt/berlin
      { source: "/rohmilch-in-:city", destination: "/stadt/:city" },
    ];
  },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'; connect-src 'self' https:" },
        ],
      },
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "geolocation=(self), camera=(), microphone=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
