import type { NextConfig } from "next";
import "./src/env"; // validates env vars at build time

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000"],
    },
    instrumentationHook: true,
  },
};

export default nextConfig;
