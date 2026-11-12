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
