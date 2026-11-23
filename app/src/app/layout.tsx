import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./show.css";

export const metadata: Metadata = {
  title: "Doorprize",
  description: "Undian doorprize untuk event: setup & jalankan show dari laptop atau HP",
  manifest: "manifest.webmanifest",
  appleWebApp: { capable: true, title: "Doorprize", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#282828",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
