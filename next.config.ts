import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Menos módulos que compilar y mejor tree-shaking en desarrollo y build.
  experimental: {
    optimizePackageImports: ["lucide-react", "date-fns"],
  },
};

export default nextConfig;
