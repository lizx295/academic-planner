import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { AppShell } from "@/components/layout/AppShell";
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
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: ["/icons/favicon-32.png"],
  },
  appleWebApp: {
    capable: true,
    title: "Academic Planner",
    statusBarStyle: "default",
  },
  formatDetection: { telephone: false },
  openGraph: {
    type: "website",
    title: "Academic Planner · ESPOL",
    description:
      "Materias, horarios, faltas, tareas, notas y Aula Virtual ESPOL sincronizados entre tu laptop y tu teléfono.",
    siteName: "Academic Planner",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
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
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=localStorage.getItem('academic-planner-store');var t=s?JSON.parse(s).state.theme:null;var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);}catch(e){}})()`,
          }}
        />
      </head>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}