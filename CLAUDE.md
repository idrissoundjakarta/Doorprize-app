# CLAUDE.md

## Proyek

Aplikasi undian doorprize untuk event corporate (gathering, gala dinner, family day). Undian ditampilkan sebagai "show" visual di LED/proyektor. Operator (EO atau PIC perusahaan) cukup menekan **NEXT**, dan tempo acara tetap dipegang MC.

- Nama produk belum ada. `doorprize-app` hanya nama sementara.
- Fokus MVP: **engine cue list + flow show visual**. Akun, pembayaran, dan multi-event belum dikerjakan.
- Sumber kebenaran semua keputusan: [`docs/keputusan.md`](docs/keputusan.md). Baca dulu sebelum bekerja.

## Aturan kerja

- **Jangan ulang brainstorming** untuk hal yang sudah diputuskan di `docs/keputusan.md`. Kalau melihat masalah nyata, sampaikan alasannya.
- **Jangan membangun hal besar tanpa persetujuan.** Ikuti urutan kerja di `docs/keputusan.md` bagian 6. Tahap bertanda ✋ menunggu persetujuan dulu.
- Pakai **bahasa Indonesia santai**. Pengguna adalah desainer, bukan programmer: jelaskan istilah teknis dengan bahasa sederhana. Kalau ada pilihan, beri **rekomendasi beserta trade-off**, jangan cuma daftar opsi.
- Pisahkan **fakta** dari **asumsi**. Tandai asumsi supaya bisa divalidasi ke calon pengguna.
- **Terpisah total dari Soundjakarta.** Jangan pakai aset, warna, font, logo, design system, maupun skill Soundjakarta. Skill bernama `soundjakarta-…` diabaikan dan tidak dimuat.

## Prinsip teknis yang sudah disepakati

- Pemenang dipilih dengan pengacakan kriptografis (`crypto.getRandomValues`). Animasi hanya menampilkan hasil yang sudah dipilih.
- Satu peserta hanya bisa menang sekali (default). Pemenang hangus tetap tercatat dan keluar dari undian.
- Harus jalan **offline** saat undian, dan state show tersimpan otomatis (aman dari refresh/tertutup).
- Kontrol lewat keyboard dan clicker presentasi (PageDown/PageUp, panah, B).
- Engine dirancang supaya fitur yang ditunda (batch, eliminasi, claim timer, dll.) bisa ditambah tanpa bongkar ulang.
- Layout aman di rasio layar selain 16:9.

## Struktur repo

```
docs/            keputusan, spesifikasi, catatan teknis
assets-video/    template video background (dikerjakan terpisah, lihat README di dalamnya)
reference/       prototipe lama, hanya referensi teknik (bukan dasar desain)
app/             kode aplikasi (dibuat setelah pilihan teknologi disetujui)
```
