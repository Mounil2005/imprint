import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["playwright", "playwright-core", "cheerio"],
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
