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
};

export default nextConfig;
