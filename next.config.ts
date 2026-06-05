import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["playwright", "playwright-core", "cheerio", "@sparticuz/chromium"],
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
