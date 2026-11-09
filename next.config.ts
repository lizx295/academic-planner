import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // "standalone" se habilita solo cuando se construye la imagen de Docker
  // (ver Dockerfile). Para desarrollo local se usa el servidor por defecto.
  output: process.env.APP_STANDALONE === "true" ? "standalone" : undefined,

  // Menos módulos que compilar y mejor tree-shaking en desarrollo y build.
  experimental: {
    optimizePackageImports: ["lucide-react", "date-fns"],
  },
};

export default nextConfig;