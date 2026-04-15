import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Optimize on-demand entries to reduce listener buildup
  onDemandEntries: {
    maxInactiveAge: 60 * 1000,
    pagesBufferLength: 5,
  },
  // Large limit for Server Actions; Route Handlers are not capped here (host/runtime limits apply).
  experimental: {
    serverActions: {
      bodySizeLimit: "1gb",
    },
  },
};

export default nextConfig;
