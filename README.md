# doorprize-app (nama sementara)

Aplikasi undian doorprize untuk event corporate (gathering, gala dinner, family day). Undian tampil sebagai *show* di LED/proyektor. Operator menyiapkan acara, peserta, sesi dan hadiah, lalu menjalankan undian cukup dengan tombol **NEXT** (keyboard atau clicker presentasi). Tempo acara tetap dipegang MC.

- **Coba prototipe:** https://idrissoundjakarta.github.io/Doorprize-app/ (Chrome/Edge di laptop, atau Chrome/Safari di HP)
- **Status:** MVP dalam pengerjaan. Engine, flow show, visual & animasi, setup, operator, dan Mode HP sudah jalan. Belum: offline penuh (PWA).

## Cara mencoba (5 menit)

1. Buka link prototipe, pilih **Coba dengan data contoh** (500 kupon, 3 sesi, 10 hadiah) atau **Buat acara baru**.
2. Klik **Buka layar LED** (izinkan pop-up). Kalau ada layar kedua, seret jendela itu ke sana lalu tekan **F**. Klik sekali di jendela show supaya suara aktif.
3. Tekan **PageDown / Spasi** untuk lanjut. Di layar pemenang, tombol **Hangus** mengundi ulang.
4. Tab **Setup**: ganti logo, ambil warna dari KV, pilih font, upload Excel peserta, foto hadiah, dan 5 gaya undian.
5. Mau latihan dulu? Tekan **Mulai gladi**. Hasil gladi tidak dihitung dan otomatis dihapus saat menekan **Selesai gladi**.

**Dari HP:** buka link yang sama, isi Setup, lalu tekan **Tampilkan show di HP ini**. Putar HP mendatar. Tap layar = lanjut, tahan = menu operator (hangus, layar hitam, keluar). Sambungkan HP ke LED lewat kabel USB-C→HDMI atau screen mirroring. Di iPhone, pakai *Bagikan → Tambahkan ke Layar Utama* supaya tampil layar penuh.

Semua data tersimpan di browser masing-masing. Tidak ada server dan tidak ada akun.

## Untuk reviewer

| Yang ingin dilihat | Buka |
|---|---|
| Semua keputusan produk & alasannya | [`docs/keputusan.md`](docs/keputusan.md) |
| Alur adegan, tombol, timing | [`docs/spesifikasi-adegan.md`](docs/spesifikasi-adegan.md) |
| Style frame layar show & UI | [`docs/styleframes/`](docs/styleframes/) (gambar di `render/`) |
| Sistem warna UI | [`docs/styleframes/render/u0-sistem-warna.jpg`](docs/styleframes/render/u0-sistem-warna.jpg) |
| Kode aplikasi | [`app/`](app/) (lihat [`app/README.md`](app/README.md)) |
| Arahan aset video (dikerjakan terpisah) | [`docs/arahan-aset-video.md`](docs/arahan-aset-video.md) |

Komentar dan usulan paling mudah lewat **Issues** (satu masalah = satu issue) atau komentar di **Pull Request**.

## Struktur

| Folder | Isi |
|---|---|
| `docs/` | Keputusan, spesifikasi adegan, style frame |
| `app/` | Aplikasi web (Next.js + WebGL), jalan sebagai file statis |
| `assets-video/` | Template video background (dikerjakan terpisah) |
| `reference/` | Prototipe lama, hanya referensi teknik |

## Untuk developer

```bash
cd app
npm install
npm run dev        # http://localhost:3000
npx vitest run     # uji engine
npm run build      # hasil statis di app/out
```

Setiap push ke `main` (dan branch kerja) otomatis diterbitkan ke GitHub Pages lewat `.github/workflows/pages.yml`. Aturan kerja proyek ada di [`CLAUDE.md`](CLAUDE.md).
