import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Academic Planner",
    short_name: "Planner",
    description: "Agenda académica conectada con Canvas LMS.",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f6f8",
    theme_color: "#4f43e8",
    lang: "es-EC",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
