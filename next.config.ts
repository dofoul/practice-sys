import type { NextConfig } from "next";
import "./src/env"; // validates env vars at build time

const nextConfig: NextConfig = {
  // "standalone" is for Docker only — remove it for Vercel
  experimental: {
    serverActions: {
      allowedOrigins: process.env.VERCEL_URL
        ? [process.env.VERCEL_URL, "localhost:3000"]
        : ["localhost:3000"],
    },
  },
};

export default nextConfig;
