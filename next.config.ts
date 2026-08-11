import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Excel на 10k+ адресов + HTML письма легко > 1 MB (дефолт Next)
      bodySizeLimit: "20mb",
    },
  },
};

export default nextConfig;
