import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { AppShell } from "@/components/layout/AppShell";
import { InlineScript } from "@/components/providers/InlineScript";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// La app muestra textos según la fecha/hora actuales (saludos, calendario,
// "vence hoy", semana en curso...). Render dinámico por request para que el
// HTML del server coincida con el del cliente y no haya fallos de
// hidratación (#418) por HTML estática congelada en el build.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    default: "Academic Planner",
    template: "%s · Academic Planner",
  },
  description:
    "Centro académico personal: materias, horarios, asistencia, tareas, evaluaciones, calendario y workspace.",
  applicationName: "Academic Planner",
  generator: "Next.js",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f6f8" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0c11" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
    >
      <head>
        {/* Aplica el tema guardado antes de la hidratación para evitar parpadeo. */}
        <InlineScript
          html={`(function(){try{var s=localStorage.getItem('academic-planner-store');var t=s?JSON.parse(s).state.theme:null;var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);}catch(e){}})()`}
        />
      </head>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
