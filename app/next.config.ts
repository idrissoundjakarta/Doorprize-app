import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hasil build berupa file statis (tanpa server), supaya bisa jalan offline.
  output: "export",
  trailingSlash: true,
  // Untuk GitHub Pages (situs ada di /<nama-repo>/). Kosong saat dijalankan lokal.
  basePath: process.env.NEXT_BASE_PATH || "",
};

export default nextConfig;
