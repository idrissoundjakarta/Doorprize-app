# Style frame (tahap 5, menunggu persetujuan)

Gambar diam untuk menyetujui arah visual sebelum dianimasikan. Hasil render ada di `render/`.

- `styleframes.html`: sumber semua frame (1920×1080). Background di sini tiruan statis dari background generatif WebGL.
- `render.js`: render ulang ke `render/*.jpg` (`node render.js` dari folder ini).
- Palet layar LED adalah contoh palet yang diambil dari KV (fiktif): A gelap/emas, B terang, C korporat biru.
- UI operator & setup memakai tema gading.
- Font: Cormorant Garamond (judul) + Manrope (nomor & nama), lisensi OFL, disertakan di `fonts/`.

| Frame | Isi |
|---|---|
| f01–f04 | Looping, Opener, Showcase, Ready |
| f05–f09 | 5 gaya undian: Buka digit, Slot reel, Amplop emas, Debu emas, Sorot cahaya |
| f10–f12 | Reveal + confetti dengan 3 contoh palet KV |
| f13–f14 | UI Setup (langkah Tampilan) & UI Operator |
