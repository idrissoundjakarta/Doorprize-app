import type { Metadata } from "next";
import "./globals.css";
import "./show.css";

export const metadata: Metadata = {
  title: "Doorprize (prototipe)",
  description: "Prototipe engine undian doorprize",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
