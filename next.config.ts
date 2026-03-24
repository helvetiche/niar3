import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Optimize on-demand entries to reduce listener buildup
  onDemandEntries: {
    maxInactiveAge: 60 * 1000,
    pagesBufferLength: 5,
  },
};

export default nextConfig;
