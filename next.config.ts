import type { NextConfig } from "next";

const storagePathname = "/storage/v1/object/public/**";
const supabaseHostnames = new Set<string>(["hghitqaybtdunqomptay.supabase.co"]);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (supabaseUrl) {
  try {
    supabaseHostnames.add(new URL(supabaseUrl).hostname);
  } catch {
    // Ignore malformed env values and keep the known-safe hostnames.
  }
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: Array.from(supabaseHostnames).map((hostname) => ({
      protocol: "https",
      hostname,
      port: "",
      pathname: storagePathname,
    })),
  },
  turbopack: {
    root: "C:/projects/lumos-il.co.il",
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options",   value: "nosniff" },
          { key: "X-Frame-Options",           value: "SAMEORIGIN" },
          { key: "X-XSS-Protection",          value: "1; mode=block" },
          { key: "Referrer-Policy",           value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy",        value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      {
        // Static assets — cache 1 year
        source: "/_next/static/(.*)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        // Public images/audio — cache 30 days
        source: "/images/(.*)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=2592000, stale-while-revalidate=86400" },
        ],
      },
    ];
  },
};

export default nextConfig;
