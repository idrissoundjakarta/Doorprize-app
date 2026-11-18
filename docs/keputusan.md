# Arahan kerja: aplikasi doorprize (handoff dari sesi brainstorming)

> Dokumen sumber keputusan proyek, disalin dari handoff sesi brainstorming (18 Nov 2026). Perubahan keputusan dicatat di sini.

## 0. Cara bekerja dengan saya

- Kamu melanjutkan proyek yang sudah dibrainstorm di sesi lain. Semua keputusan sejauh ini ada di dokumen ini. **Jangan ulang brainstorming untuk hal yang sudah diputuskan**, kecuali kamu melihat masalah nyata. Kalau begitu, sampaikan alasannya.
- **Jangan langsung membangun hal besar tanpa persetujuan saya.** Ikuti urutan kerja di bagian 6. Tiap tahap yang ada tanda ✋ menunggu persetujuan saya dulu.
- Pakai bahasa Indonesia santai. Saya desainer, bukan programmer. Jelaskan istilah teknis dengan bahasa sederhana. Kalau ada pilihan, beri rekomendasi beserta trade-off-nya, jangan cuma daftar opsi.
- Pisahkan **fakta** dari **asumsi**. Asumsi ditandai supaya bisa divalidasi ke calon pengguna.
- **Produk ini sepenuhnya terpisah dari Soundjakarta.** Jangan pakai apa pun dari Soundjakarta: aset, warna, font, logo, design system, maupun skill. Kalau ada skill bernama "soundjakarta-…" yang aktif di akun ini, abaikan dan jangan dimuat.

## 1. Latar belakang

- Di event corporate (gathering, gala dinner, family day), undian doorprize bukan sekadar memilih pemenang. Tampilannya juga bagian dari pengalaman acara.
- Tools gratis seperti Wheel of Names terasa terbatas tampilan dan kustomisasinya, dan bisa menampilkan iklan.
- Pernah ada klien yang minta solusi door prize yang lebih menarik. Penawaran vendor waktu itu sekitar Rp3,5 juta untuk aplikasi plus operator. **Ini baru satu data, bukan harga pasar.**

## 2. Arah produk

- **Brand sendiri.** Nama produk belum ditentukan, jadi nama repo `doorprize-app` sementara.
- **Pengguna:** EO atau PIC perusahaan menyiapkan dan menjalankan undian sendiri. Ke depan, produk ini juga bisa dijual sebagai add-on layanan event bersama operator.
- **Model bisnis belum diputuskan.** Hipotesis awalnya: bayar per event untuk PIC corporate, langganan untuk EO/agency, versi gratis dengan watermark untuk akuisisi. Belum perlu dikerjakan di MVP.
- **Fokus saat ini:** engine dan flow show visual. Akun, pembayaran, dan multi-event menyusul.

## 3. Keputusan yang sudah diambil

### 3.1 Engine: cue list + tombol NEXT

- Dari daftar sesi dan hadiah, engine menyusun urutan adegan secara otomatis. Operator cukup menekan **NEXT** (keyboard atau clicker presentasi).
- Tiap adegan bersifat:
  - **Auto:** animasi jalan sendiri lalu lanjut otomatis (contoh: undian berputar).
  - **Hold:** berhenti menunggu operator, karena MC sedang bicara (contoh: showcase hadiah, nama pemenang).
- Prinsipnya: **tempo acara dipegang MC, bukan aplikasi.**
- Rancang engine supaya fitur yang ditunda (batch, eliminasi, claim timer, dll.) bisa ditambahkan belakangan tanpa bongkar ulang.

### 3.2 Sesi sebagai wadah

- Ada tombol **+ Tambah sesi**. Tiap sesi punya nama (misalnya "Sesi 1", "Grand Prize"), daftar hadiah di dalamnya, dan background opsional.
- Alasannya: kalau hadiahnya banyak, doorprize biasanya dibagi beberapa sesi sepanjang acara, supaya penonton nggak bosan dan tetap penasaran sampai akhir.
- **Opener sesi:** kartu judul singkat ("SESI 2") sebelum hadiah pertama di sesi itu.
- **Teaser di looping:** di antara sesi, looping menampilkan "Sesi berikutnya: …" plus foto hadiah unggulannya (bisa dibuat samar).

### 3.3 Flow adegan MVP

```
[Looping + teaser sesi berikutnya]
      │ NEXT
[Opener sesi] ── auto
      │
[Showcase hadiah] ── hold (MC membahas hadiah)
      │ NEXT
[Ready] ── hold (“500 peserta siap diundi”)
      │ NEXT
[Undi] ── auto
      │
[Reveal pemenang] ── hold
      ├─ Hangus (pemenang tidak hadir) → catat → kembali ke [Ready]
      └─ NEXT (sah):
           ├─ hadiah yang sama masih tersisa → langsung ke [Undi] (tanpa showcase ulang)
           ├─ hadiah habis, masih ada hadiah lain di sesi → [Showcase hadiah berikutnya]
           └─ sesi selesai → [Looping]
```

- **Pemenang maju ke panggung** untuk mengambil hadiah.
- **Koreksi wajib ada:** tombol **Hangus → undi ulang** di layar reveal. Pemenang yang hangus tetap tercatat dan dikeluarkan dari undian.
- **Default:** satu orang/nomor hanya bisa menang satu kali.
- **Keadilan:** pemenang dipilih dengan pengacakan kriptografis (misalnya `crypto.getRandomValues`). Animasi hanya cara *menampilkan* hasilnya.

### 3.4 Peserta

- **Yang paling sering dipakai nomor kupon, tapi bisa juga nama.** Nomor tampil sebagai identitas utama. Kalau data nama tersedia, nama tampil di bawah nomor saat reveal.
- **Sumber data:**
  - Generate rentang nomor kupon (misalnya 001–500)
  - Paste dari Excel, atau upload xlsx/csv
- Pilih kolom mana yang jadi Nomor, Nama, dan info tambahan (misalnya divisi).
- Bersihkan data: deteksi duplikat, baris kosong, nama terlalu panjang (otomatis disingkat di layar).

### 3.5 Hadiah

- Nama, jumlah, foto, urutan. Semua hadiah ada di dalam sesi.

### 3.6 Gaya undian MVP (2 gaya)

1. **Buka digit:** nomor terbuka digit demi digit. Kesannya formal, cocok untuk nomor kupon. Ini gaya bawaan.
2. **Slot reel:** gulungan nomor/nama vertikal yang melambat ke pemenang. Kesannya meriah.

### 3.7 Tampilan: 3 layer

```
3. BRAND       logo client, judul acara      ← tetap di semua adegan
2. KONTEN      nomor/nama, hadiah            ← berubah & dianimasikan per adegan
1. BACKGROUND  gambar / video looping        ← bisa beda per acara, sesi, atau adegan
```

- **Pustaka background:** pengguna bisa upload beberapa gambar (JPG/PNG) atau video looping (MP4).
- **Pengaturan bertingkat, supaya orang awam tetap paham:**
  1. **Default acara:** satu background untuk semua. Kalau cuma punya satu aset, berhenti di sini.
  2. **Per sesi (opsional):** misalnya sesi grand prize pakai background khusus.
  3. **Per adegan (opsional):** misalnya looping pakai video tenang, undi/reveal pakai video yang lebih intens.
- **Peredup background** (slider), supaya teks tetap terbaca.
- **Warna tema otomatis** diambil dari background. Untuk video, ambil dari salah satu frame-nya. Tetap bisa diubah manual.
- **Logo** client dan **judul acara**.
- **3 template bawaan berupa background generatif**, yaitu animasi yang digambar oleh kode (cahaya, gradien, partikel halus), lengkap dengan paket warna dan font. Kelebihannya: warnanya bisa ikut brand client, ukuran file hampir nol, dan loop-nya mulus dengan sendirinya. Usulan tema: **Gala Emas** (formal), **Neon Party** (meriah), **Corporate Navy** (bersih).
- **Template video** dibuat terpisah (lihat `docs/arahan-aset-video.md`) dan akan masuk belakangan sebagai template tambahan atau premium.

### 3.8 Operasional

- **Harus bisa jalan offline** saat undian. Internet di venue tidak bisa diandalkan.
- MVP cukup **satu laptop**, layar ditampilkan fullscreen ke LED/proyektor.
- Kontrol pakai **keyboard dan clicker presentasi**. Clicker biasanya mengirim tombol PageDown/PageUp, Panah, atau B.
- **Export daftar pemenang** ke CSV/Excel, termasuk yang hangus.
- Data tersimpan otomatis, jadi kalau aplikasi tertutup atau ter-refresh, posisi show tidak hilang.

## 4. Ditunda (sudah dicatat, jangan dikerjakan di MVP)

- **Batch:** banyak pemenang keluar sekaligus dalam satu papan, untuk hadiah massal. Ini fitur pertama yang ditambahkan setelah MVP kalau ternyata undian terasa lambat saat hadiahnya puluhan.
- **Eliminasi untuk grand prize:** peserta gugur bertahap (semua → 50 → 10 → 3 → 1) dengan jeda MC di tiap tahap.
- **Claim + timer:** "Silakan maju ke panggung" dengan hitung mundur sebelum hangus.
- Hitung mundur 3-2-1 di adegan Ready
- Recap pemenang di akhir sesi
- ~~Layar operator terpisah dari layar output (dua layar)~~ → dipindah ke MVP (lihat bagian 8)
- Aturan kelayakan per hadiah (misalnya grand prize hanya untuk karyawan tetap) dan penguncian data untuk audit
- Gaya undian tambahan (roda, sorot grid, bola 3D, kocokan arisan, kapsul gacha, dll.)
- Mystery prize (pemenang diundi dulu, lalu memilih kotak hadiah)
- Check-in peserta lewat QR, interaksi penonton lewat HP
- Akun, pembayaran, dashboard banyak event, white-label

## 5. Pertanyaan terbuka dan asumsi

- **Pilihan teknologi belum diputuskan.** Syarat offline dan penyimpanan video berukuran besar menentukan apakah cukup aplikasi web/PWA atau perlu aplikasi desktop. Ini dibahas di tahap 2.
- Nama dan identitas visual produk belum ada. Untuk sementara, pakai tampilan netral untuk UI pengaturan.
- **Asumsi:** EO/PIC mau dan mampu menyiapkan undian sendiri tanpa operator.
- **Asumsi:** laptop di venue bisa memutar video 1080p sambil menjalankan animasi undian dengan lancar.
- Rasio layar LED di venue bervariasi. Layout harus tetap aman di layar yang lebih lebar atau lebih sempit dari 16:9.

## 6. Urutan kerja

1. **Siapkan repo:**
   - Simpan isi dokumen ini sebagai `docs/keputusan.md`.
   - Buat `CLAUDE.md` berisi ringkasan proyek dan aturan kerja dari bagian 0.
   - Buat `README.md` singkat.
   - Rencanakan struktur folder untuk aplikasi dan `assets-video/`.
2. **Pilihan teknologi** ✋: usulkan 2–3 opsi dengan trade-off (offline, penyimpanan video, performa animasi, kemudahan dipakai orang awam, kemudahan dikembangkan nanti), lalu beri rekomendasi.
3. **Spesifikasi adegan MVP** ✋: dokumen 1–2 halaman di `docs/spesifikasi-adegan.md`. Untuk tiap adegan, tuliskan:
   - data yang tampil
   - sifatnya (auto/hold) dan transisinya
   - slot visual per layer
   - pola timing (masuk, tahan, keluar)
   - tombol operator yang berlaku
4. **Prototipe engine** ✋: visual seadanya (kotak dan teks), yang penting flow-nya bisa saya coba seperti operator di acara: sesi, NEXT, hold, hangus/undi ulang, langsung undi untuk hadiah yang sama.
5. **Visual dan animasi:** 3 layer, pustaka background bertingkat, warna otomatis, 3 template generatif, 2 gaya undian, animasi tiap adegan.
6. **Uji:** pakai data contoh (misalnya 500 nomor kupon, 3 sesi, 10 hadiah) dan video contoh. Render screenshot tiap adegan, cek keterbacaan di ukuran layar yang berbeda, lalu saya coba sendiri.

## 7. Referensi: prototipe awal (opsional)

Sebelum brainstorming, sempat dibuat prototipe satu file HTML. Kalau saya upload ke repo sebagai `reference/prototype-v0.html`, gunakan hanya sebagai referensi teknik, bukan sebagai dasar desain. Yang sudah terbukti jalan di sana:

- Wheel yang selalu berhenti tepat di pemenang yang sudah dipilih lebih dulu secara acak
- Pengambilan palet warna dari gambar
- Penyimpanan otomatis ke browser
- Confetti dan suara yang dibuat lewat kode (WebAudio)

**Jangan dibawa:** kredit dan font Soundjakarta, flow tanpa sesi, dan 5 gaya undian sekaligus.

## 8. Keputusan lanjutan (18 Nov 2026)

- **Teknologi:** aplikasi web (PWA, bisa di-install dan jalan offline) di Chrome/Edge, dibangun dengan **Next.js** (mode static export). Background dan efek digambar live dengan **WebGL**. Nomor/nama tetap berupa teks HTML yang dianimasikan di atasnya supaya tajam. Bagian penyimpanan dibuat sebagai lapisan terpisah. Font disertakan di dalam aplikasi, tidak dimuat dari internet.
- **MVP tanpa upload background (video maupun gambar).** Tampilan memakai 3 template generatif WebGL. Upload video background menjadi fitur update berikutnya. Alasannya: aplikasi perlu cepat jadi.
- **Yang bisa dikustom di MVP:** daftar peserta, logo klien, foto hadiah, serta **warna dan font** yang dipilih saat setup supaya mendekati KV klien. Font dipilih dari koleksi bawaan (offline). Upload font sendiri ditunda.
- Karena tidak ada upload background, "warna tema otomatis dari background" (3.7) diganti dengan pemilihan warna manual. Opsi tambahan yang diusulkan: upload KV hanya untuk mengambil palet warna (gambarnya tidak ditampilkan).
- **Tidak pakai wheel/roda** sebagai gaya undian, termasuk di daftar gaya tambahan nanti. Gaya undian harus terasa eksklusif dan mahal, layak sebagai aplikasi berbayar.
- **Opsi "pilih sebagai pemenang"** (pemenang ditentukan manual): **ditunda, tidak dikerjakan di MVP.** Engine tetap menyimpan catatan sumber tiap hasil (`acak`/`manual`) supaya bisa ditambahkan nanti.
- **Upload KV untuk ambil palet warna** masuk MVP sebagai **opsi sampingan di setup**. KV hanya dipakai untuk menyarankan palet, tidak ditampilkan di layar show. Pengguna tetap bisa mengubah warna manual.
- **Mode dua layar masuk MVP sebagai mode utama:** jendela operator di laptop, jendela show fullscreen di LED/proyektor. **Mode satu layar jadi cadangan** (panel operator kecil di atas layar show, tombol M).

### Rencana MVP (ringkas)

1. Setup: sesi & hadiah (nama, jumlah, foto, urutan), peserta (generate rentang / paste / upload xlsx-csv, pilih kolom, bersihkan data), brand (logo, judul acara), tampilan (template generatif, warna, font, opsi ambil palet dari KV), gaya & tempo undian.
2. Engine cue list: Looping → Opener → Showcase → Ready → Undi → Reveal, hangus/undi ulang, simpan otomatis.
3. Show: 3 layer (background WebGL, konten HTML, brand), 3 template generatif, 2 gaya undian (Buka digit, Slot reel).
4. Operator: mode dua layar (utama) dan satu layar (cadangan), keyboard & clicker, export pemenang CSV/Excel.
5. Offline (PWA).
