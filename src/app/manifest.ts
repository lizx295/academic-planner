import type { MetadataRoute } from "next";

/**
 * Manifest de la PWA. Next.js lo sirve en /manifest.webmanifest.
 * Permite instalar la app en iPhone, iPad y Android.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Academic Planner · ESPOL",
    short_name: "Planner",
    description:
      "Tu semestre en un solo lugar: materias, horarios, faltas, tareas, notas y Aula Virtual ESPOL.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#fbf6f2",
    theme_color: "#f6d9df",
    lang: "es-EC",
    dir: "ltr",
    categories: ["education", "productivity"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Captura rápida",
        short_name: "Captura",
        description: "Apunta una tarea, nota o examen en segundos.",
        url: "/capture",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Calendario",
        short_name: "Calendario",
        description: "Clases, entregas y evaluaciones del semestre.",
        url: "/calendar",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
    ],
  };
}
