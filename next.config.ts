import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Allow very large multipart uploads to pass through proxy without truncation.
    // Next.js proxy defaults to 10MB buffering, which can break FormData parsing.
    proxyClientMaxBodySize: "2gb",
  },
};

export default nextConfig;
