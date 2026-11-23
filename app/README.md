# app/ (aplikasi doorprize)

Next.js (static export) + TypeScript. Saat ini: **tahap 5, visual & animasi** (background WebGL, 5 gaya undian, confetti & suara, UI setup/operator baru).

```
src/engine/      engine cue list (tanpa tampilan): tipe data, aturan adegan, pengacak, data contoh, uji
src/show/        tampilan show: ShowView (3 layer), Background (WebGL), DrawStyles (5 gaya), Confetti, sound (WebAudio), presets
src/lib/         penyimpanan (IndexedDB), jalur operator ↔ show, tombol, export, import Excel/CSV, palet dari KV, gambar
src/components/  Operator, Setup (5 langkah), komponen UI (dialog, toast, toggle)
src/app/         halaman: / = jendela operator, /show/ = jendela show; globals.css (UI), show.css (layar show)
public/fonts/    font yang disertakan (OFL), supaya jalan offline
```

Perintah (dari folder `app/`):

- `npm run dev`: jalankan lokal di http://localhost:3000
- `npx vitest run`: uji engine
- `npm run build`: hasil statis di `out/`

Setiap push ke branch kerja otomatis terbit ke GitHub Pages (`.github/workflows/pages.yml`): https://idrissoundjakarta.github.io/Doorprize-app/

Catatan: library `xlsx` 0.18.5 (npm) punya celah yang diketahui saat membaca file yang sengaja dirusak. Risikonya rendah karena file yang dibaca adalah milik pengguna sendiri, di laptopnya sendiri. Ganti ke rilis SheetJS terbaru (dari cdn.sheetjs.com) saat jaringan memungkinkan.
