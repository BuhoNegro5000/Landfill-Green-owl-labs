import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Green Owl Landfill 3D — Laboratorio de diseño y simulación",
  description:
    "Laboratorio de ingeniería ambiental para el diseño, simulación y documentación de rellenos sanitarios. Cálculos locales, trazabilidad metodológica y modelo 3D.",
  applicationName: "Green Owl Landfill 3D",
  authors: [{ name: "Green Owl Labs" }],
  keywords: ["relleno sanitario", "landfill", "lixiviados", "biogás", "ingeniería ambiental", "Green Owl Labs"],
  robots: { index: false, follow: false },
  icons: {
    icon: [{ url: "/favicon.png", type: "image/png", sizes: "64x64" }],
    apple: [{ url: "/favicon.png", type: "image/png", sizes: "64x64" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#04170f",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
