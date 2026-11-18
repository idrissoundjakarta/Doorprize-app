# Spesifikasi adegan MVP

> Status: **draf, menunggu persetujuan** (tahap 3 ✋). Dasar: `docs/keputusan.md` bagian 3 dan 8.
> Angka durasi adalah titik awal. Nanti disetel ulang setelah dicoba.

## A. Aturan umum

**Layer (dari bawah ke atas)**

| Layer | Isi | Catatan |
|---|---|---|
| 1. Background | Template generatif WebGL (Gala Emas / Neon Party / Corporate Navy) | Punya 2 mode: **tenang** dan **intens**. Pergantian mode berupa transisi halus (±1,5 dtk), bukan potongan. |
| 2. Konten | Nomor, nama, hadiah, judul sesi | Berupa teks HTML supaya tajam. Selalu berada di **area aman tengah** (±60% lebar × 50% tinggi). |
| 3. Brand | Logo klien (kiri atas) + judul acara | Tampil di semua adegan. Di Undi dan Reveal ukurannya mengecil ±70% supaya tidak bersaing dengan konten. |

- Tidak ada elemen penting dalam 10% dari tepi layar. Layout menyesuaikan diri di layar yang lebih lebar atau lebih sempit dari 16:9.
- Warna dan font dari setup berlaku di semua adegan.
- **Simpan otomatis di setiap perpindahan adegan.** Kalau aplikasi ter-refresh, show kembali ke adegan terakhir.

**Tombol operator (berlaku di semua adegan kecuali disebut lain)**

| Tombol | Fungsi |
|---|---|
| **NEXT**: PageDown, →, ↓, Spasi, Enter | Lanjut ke adegan berikutnya (hanya di adegan *hold*) |
| **BACK**: PageUp, ←, ↑ | Mundur satu adegan *hold*, hanya sebelum undian dimulai. Contoh: Ready → Showcase. Tidak berlaku di Undi dan Reveal. |
| **B** atau **.** (tombol "layar hitam" di clicker) | Sembunyikan konten. Hanya background + brand yang tampil. Tekan lagi untuk kembali. |
| **H** | Hangus, hanya di Reveal. Harus ditekan **2× dalam 3 detik**. |
| **F** | Fullscreen |
| **M** | Buka/tutup panel operator |

- **Anti dobel-tekan:** NEXT diabaikan selama 0,8 dtk setelah pindah adegan. Clicker sering terpencet dua kali.
- Adegan **auto** tidak bisa di-NEXT, supaya ketegangan undian tidak terlewat tanpa sengaja.

## B. Adegan

### 1. Looping (hold)
- **Data:** judul acara, "Sesi berikutnya: **{nama sesi}**", foto hadiah unggulan sesi itu (opsi: disamarkan), jumlah hadiah di sesi tersebut.
- Sebelum sesi pertama, teaser menampilkan sesi 1. **Setelah sesi terakhir:** adegan penutup ("Terima kasih"), tanpa teaser dan tanpa NEXT.
- **Background:** tenang.
- **Timing:** masuk dengan fade 1 dtk, tahan tanpa batas waktu, keluar 0,6 dtk. Teaser bergerak sangat pelan supaya enak ditonton 10–30 menit.
- **NEXT** → Opener sesi.

### 2. Opener sesi (auto, ±3 dtk)
- **Data:** "SESI {n}" + nama sesi (misalnya "GRAND PRIZE").
- **Background:** tenang, dengan aksen cahaya singkat.
- **Timing:** masuk 0,8 dtk (judul membesar pelan dari blur), tahan 1,6 dtk, keluar 0,6 dtk.
- Lanjut otomatis → Showcase hadiah pertama di sesi itu.

### 3. Showcase hadiah (hold)
- **Data:** foto hadiah, nama hadiah, jumlah pemenang ("3 pemenang"), posisi hadiah ("Hadiah 2 dari 4").
- **Background:** tenang.
- **Timing:** foto masuk 0,8 dtk, lalu nama menyusul 0,3 dtk kemudian. Tahan sampai NEXT. Keluar 0,5 dtk.
- **NEXT** → Ready.

### 4. Ready (hold)
- **Data:** "**{jumlah}** peserta siap diundi" (dihitung dari peserta yang masih berhak), nama hadiah dalam ukuran kecil, "Pemenang ke-{x} dari {y}".
- **Background:** tenang, mulai "bernapas" sedikit lebih cepat sebagai tanda akan dimulai.
- **Timing:** masuk 0,6 dtk, angka jumlah peserta menghitung naik ±1 dtk, tahan sampai NEXT.
- Kalau peserta yang berhak sudah habis, tampil "Peserta habis", NEXT tidak berfungsi, dan ada peringatan di panel operator.
- **NEXT** → Undi. **BACK** → Showcase.

### 5. Undi (auto, 4–8 dtk)
- **Pemenang sudah dipilih dan disimpan saat adegan ini dimulai** (pengacakan kriptografis). Animasi hanya menampilkannya. Kalau aplikasi ter-refresh di tengah undian, show langsung lanjut ke Reveal dengan pemenang yang sama. Tidak ada undian ulang diam-diam.
- **Gaya:** Buka digit (bawaan) atau Slot reel. Gaya dipilih per acara, dan bisa diganti per hadiah.
- **Tempo:** Cepat (4 dtk) / Normal (6 dtk) / Dramatis (8 dtk).
- **Background:** transisi ke intens.
- Lanjut otomatis → Reveal.

### 6. Reveal pemenang (hold)
- **Data:** **nomor** besar, **nama** di bawahnya (kalau ada), info tambahan kecil (misalnya divisi), nama hadiah.
- **Efek:** kilau cahaya + confetti + suara. Maksimal 3 kilatan per detik.
- **Background:** intens, lalu turun perlahan ke setengah intens supaya MC bisa bicara.
- **Timing:** hit 0,3 dtk, nama menyusul 0,4 dtk, tahan sampai NEXT.
- **NEXT (sah)**:
  - Hadiah yang sama masih tersisa → langsung **Undi** (tanpa Showcase dan Ready).
  - Hadiah habis, masih ada hadiah lain di sesi → **Showcase** hadiah berikutnya.
  - Sesi selesai → **Looping** (teaser sesi berikutnya).
- **H ×2 (Hangus):** pemenang dicatat "hangus", dikeluarkan dari undian, lalu kembali ke **Ready**. Jumlah peserta di Ready ikut berkurang.

## C. Panel operator (tombol M)

- Isinya: adegan sekarang dan berikutnya, daftar pemenang dan hangus, lompat ke sesi/hadiah tertentu, export CSV/Excel.
- ⚠️ **Risiko:** MVP hanya satu layar, jadi panel ini **ikut tampil di LED**. Karena itu panel dibuat kecil dan ringkas, dan sebaiknya dibuka hanya saat layar di-*blank* (B). Solusi penuhnya adalah dua layar (sudah masuk daftar ditunda).

## D. Disiapkan di engine, belum tampil di MVP

- Tiap hasil undian menyimpan catatan **sumber** (`acak` / `manual`) dan **status** (`sah` / `hangus`). Ini untuk fitur "pilih sebagai pemenang" yang masih dibahas.
- Adegan disusun sebagai daftar langkah (cue list), sehingga Batch, Eliminasi, Claim timer, Hitung mundur, dan Recap bisa ditambahkan sebagai jenis adegan baru tanpa mengubah adegan yang sudah ada.

## E. Asumsi yang perlu divalidasi

- Durasi undian 4–8 dtk terasa pas: tidak terlalu lama untuk 10+ hadiah, tapi cukup tegang.
- Operator rela menekan H dua kali untuk hangus (aman, tapi sedikit lebih lambat).
- Clicker yang umum di pasaran mengirim tombol PageDown/PageUp dan B/titik.
