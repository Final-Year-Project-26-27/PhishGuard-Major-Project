import type { NextConfig } from "next";
import withPWA from "next-pwa";

const nextConfig: NextConfig = {
  output: "export", // 👈 Required for static export (Chrome extension compatibility)
  trailingSlash: true, // 👈 Ensures exported URLs work properly
  typescript: {
    ignoreBuildErrors: true, // Optional: Ignores TS errors during build
  },
  eslint: {
    ignoreDuringBuilds: true, // Optional: Ignores lint errors during build
  },
};

export default withPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development", // Only enable in production
})(nextConfig);
