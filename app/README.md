# app/ (aplikasi doorprize)

Next.js (static export) + TypeScript. Saat ini: **prototipe engine** (tahap 4), visual masih seadanya.

```
src/engine/      engine cue list (tanpa tampilan): tipe data, aturan adegan, pengacak, data contoh, uji
src/lib/         penyimpanan, jalur operator ↔ show, tombol keyboard/clicker, export CSV
src/components/  ShowView (3 layer), DrawAnim (gaya undian), Operator, Setup
src/app/         halaman: / = jendela operator, /show/ = jendela show
```

Perintah (dari folder `app/`):

- `npm run dev`: jalankan lokal di http://localhost:3000
- `npx vitest run`: uji engine
- `npm run build`: hasil statis di `out/`

Untuk dicoba lewat link: build statis bisa diterbitkan ke GitHub Pages (`NEXT_BASE_PATH=/<nama-repo>`), menunggu persetujuan.
