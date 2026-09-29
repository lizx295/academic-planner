import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@academic-planner/core"],
  // "standalone" se habilita solo cuando se construye la imagen de Docker
  // (ver Dockerfile). Para desarrollo local se usa el servidor por defecto.
  output: process.env.APP_STANDALONE === "true" ? "standalone" : undefined,

  // Limpio de experimentos; Turbopack es el bundler por defecto en Next 16.
};

export default nextConfig;
