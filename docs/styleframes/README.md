# Style frame (tahap 5, menunggu persetujuan)

Gambar diam untuk menyetujui arah visual sebelum dianimasikan. Hasil render ada di `render/`.

- `styleframes.html`: sumber semua frame (1920×1080). Background di sini tiruan statis dari background generatif WebGL.
- `render.js`: render ulang ke `render/*.jpg` (`node render.js` dari folder ini).
- Palet layar LED adalah contoh palet yang diambil dari KV (fiktif): A gelap/emas, B terang, C korporat biru.
- UI operator & setup: dasar putih/abu + Lunar Shadow (referensi), aksen identitas champagne & rose, warna fungsi terpisah. Lihat `ui-sistem-warna.html` (u0–u3) dan `palet-identitas.html`.
- Font: Cormorant Garamond (judul) + Manrope (nomor & nama), lisensi OFL, disertakan di `fonts/`.

| Frame | Isi |
|---|---|
| f01–f04 | Looping, Opener, Showcase, Ready |
| f05–f09 | 5 gaya undian: Buka digit, Slot reel, Amplop emas, Debu emas, Sorot cahaya |
| f10–f12 | Reveal + confetti dengan 3 contoh palet KV |
| u0–u3 | UI: sistem warna, Operator, Setup Peserta, Setup Sesi + dialog hangus |

f13–f14 (UI versi gading) sudah diganti oleh u0–u3.
