import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fail the build loudly if NEXT_PUBLIC_API_URL is missing
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? '',
  },
};

export default nextConfig;
