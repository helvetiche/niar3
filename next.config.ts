import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Optimize on-demand entries to reduce listener buildup
  onDemandEntries: {
    maxInactiveAge: 60 * 1000,
    pagesBufferLength: 5,
  },
  // Increase body size limit for file uploads
  experimental: {
    serverActions: {
      bodySizeLimit: "100mb",
    },
  },
};

export default nextConfig;
