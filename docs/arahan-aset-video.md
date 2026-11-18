# Arahan kerja: aset video untuk aplikasi doorprize

> Tempel seluruh isi dokumen ini sebagai pesan pertama di sesi Claude Code baru pada repo `doorprize-app`, khusus untuk mengerjakan aset video. Pekerjaan aplikasi berjalan di sesi lain pada repo yang sama.

## Konteks

Saya sedang mengembangkan **aplikasi undian doorprize untuk event** (gathering corporate, gala dinner, family day). Aplikasi ini menggantikan tools seperti Wheel of Names dengan tampilan yang lebih berkelas, untuk ditayangkan di layar LED atau proyektor saat acara.

- Produk ini punya **brand sendiri** (nama belum ditentukan) dan **sepenuhnya terpisah dari Soundjakarta**. Jangan pakai apa pun dari Soundjakarta: aset, warna, font, logo, supergraphic, design system, maupun skill. Kalau ada skill bernama "soundjakarta-…" yang aktif di akun ini, **abaikan dan jangan dimuat**.
- Tugas sesi ini: **membuat aset video** untuk template aplikasi. **Jangan mengubah kode aplikasi.**
- Aplikasi MVP memakai 3 template **generatif** (dibuat lewat kode) dulu. Video dari sesi ini akan masuk belakangan sebagai template tambahan/premium.
- Pakai bahasa Indonesia santai. Saya desainer, jadi jelaskan istilah teknis dengan sederhana.

### Lokasi kerja di repo

Semua pekerjaan sesi ini ada di folder **`assets-video/`** dalam repo `doorprize-app`. Usulan struktur:

```
assets-video/README.md       ← ringkasan isi + cara render ulang
assets-video/brief/          ← dokumen arahan ini
assets-video/source/         ← file project/kode animasi (sumber yang bisa dirender ulang)
assets-video/styleframes/    ← style frame untuk persetujuan
assets-video/previews/       ← contact sheet & preview uji keterbacaan (ukuran kecil)
assets-video/renders/        ← file final MP4/PNG
```

Video final berukuran besar (±15 file × 15–25 MB). **Jangan commit file video biasa ke git.** Pakai Git LFS untuk `assets-video/renders/`, atau simpan render final di luar git (misalnya Google Drive) dan commit hanya sumber + preview kecil. Tanyakan ke saya mana yang dipilih sebelum commit video pertama.

### Cara aplikasi menyusun layar

Tiap layar terdiri dari 3 layer:

```
3. BRAND       logo client, judul acara      ← diisi aplikasi
2. KONTEN      nomor kupon / nama, hadiah    ← diisi & dianimasikan aplikasi
1. BACKGROUND  video / gambar                ← INI yang dibuat di sesi ini
```

Karena itu, **video tidak boleh berisi teks, angka, atau logo apa pun.**

### Flow show di aplikasi (untuk konteks penggunaan video)

```
Looping → Opener sesi → Showcase hadiah → Ready → Undi → Reveal pemenang → kembali ke Looping
```

- **Looping:** tayang lama, bisa 10–30 menit di antara sesi.
- **Opener sesi:** kartu judul singkat ("SESI 2", "GRAND PRIZE").
- **Showcase / Ready:** MC membahas hadiah dan membangun suasana.
- **Undi / Reveal:** momen paling tegang dan meriah.

## Yang perlu dibuat

### A. 3 template background

Tiap template berisi:

| File | Durasi | Dipakai di adegan | Karakter |
|---|---|---|---|
| Video **Tenang** | 15 detik, loop | Looping, opener, showcase, ready | Gerak pelan, elegan, enak ditonton lama |
| Video **Intens** | 8–10 detik, loop | Undi, reveal | Lebih cepat dan "panas", tapi tengah layar tetap terbaca |
| Gambar **statis** (PNG) | – | Cadangan untuk laptop lemah | Satu frame terbaik dari video Tenang |

Usulan tema (boleh diusulkan alternatif lain):

1. **Gala Emas** (formal): dasar hitam/arang, aksen emas, bokeh cahaya lembut, sapuan cahaya pelan.
2. **Neon Party** (meriah): dasar ungu tua/navy, berkas cahaya magenta dan cyan, haze, garis laser.
3. **Corporate Navy** (bersih dan profesional): dasar navy, aksen putih/perak, garis geometris, grid halus.

### B. Bumper (tidak looping)

| File | Durasi | Catatan |
|---|---|---|
| **Opener sesi** (1 per template) | 3–4 detik | Area tengah disiapkan untuk teks "SESI 2" yang ditempel aplikasi. Akhiri dengan transisi halus ke suasana video Tenang. |
| **Opener grand prize** (1 per template) | 5–6 detik | Lebih dramatis, misalnya lampu sorot menyapu lalu cahaya terkumpul di tengah. |

## Spesifikasi teknis

- **1920×1080, 30fps, MP4 (H.264, yuv420p), tanpa audio.**
- Target ukuran file: sekitar **15–25 MB** per video 15 detik (bitrate ±8–10 Mbps).
- **Loop mulus:** frame terakhir harus menyambung ke frame pertama. Uji dengan memutar video dua kali berturut-turut; sambungannya tidak boleh terlihat.
- **Area tengah lebih kalem.** Kira-kira 60% lebar × 50% tinggi di tengah layar adalah tempat nomor dan nama pemenang. Area ini harus cukup tenang dan gelap supaya teks besar terbaca jelas. Detail yang ramai ditaruh di pinggir.
- **Aman dipotong.** Layar LED di venue bisa lebih lebar atau lebih sempit dari 16:9, dan aplikasi akan memotong video supaya memenuhi layar. Jangan taruh elemen penting dalam 10% dari tepi.
- **Tanpa kedipan keras.** Maksimal 3 kilatan per detik, tanpa efek strobo. Ini supaya aman ditonton dan tidak bersaing dengan animasi undian.
- **Tanpa teks, angka, logo, atau watermark.**

## Penamaan file

```
gala-emas_tenang_15s.mp4
gala-emas_intens_10s.mp4
gala-emas_still.png
gala-emas_opener-sesi_4s.mp4
gala-emas_opener-grand_6s.mp4
```

Gunakan pola yang sama untuk `neon-party` dan `corporate-navy`.

## Cara kerja yang saya minta

1. **Tanya dulu** kalau ada yang belum jelas, lalu usulkan arah visual tiap tema secara singkat.
2. **Buat style frame (gambar diam) per template dulu** untuk saya setujui, sebelum dianimasikan.
3. Setelah disetujui, buat videonya. Mulai dari **1 template sampai lengkap** (Tenang, Intens, still, 2 opener) sebagai patokan, baru lanjut ke 2 template lainnya.
4. Sertakan **preview uji keterbacaan**: video dengan teks dummy besar di tengah (misalnya nomor "0427" dan nama "ANDI PRATAMA"). Ini hanya untuk preview, jangan dimasukkan ke file final.
5. Sertakan **contact sheet** beberapa frame per video.

## QA sebelum diserahkan

- [ ] Tidak ada teks, angka, atau logo di dalam video
- [ ] Loop mulus (diputar 2× berturut-turut, sambungan tidak terlihat)
- [ ] Teks dummy di tengah terbaca jelas, termasuk saat video Intens
- [ ] Elemen penting tidak dalam 10% dari tepi
- [ ] Tidak ada kedipan lebih dari 3× per detik
- [ ] Format dan ukuran sesuai spesifikasi, penamaan file benar

## Yang perlu dilaporkan di akhir

Untuk tiap template:

- Daftar file final
- **Palet warna (hex):** dasar, utama, kedua, aksen, teks. Aplikasi memakai palet ini untuk warna teks dan elemen UI di atas video.
- **Rekomendasi font** judul dan isi (Google Fonts), karena aplikasi memakai font dari situ
- Catatan khusus, misalnya bagian layar yang sebaiknya dihindari teks
