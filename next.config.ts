import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Excel + HTML; без next.config в образе Docker сбрасывается на 1 MB
      bodySizeLimit: "20mb",
    },
  },
};

export default nextConfig;
