# reference/

Tempat prototipe lama (`prototype-v0.html`) kalau di-upload. Hanya referensi teknik (wheel yang berhenti di pemenang terpilih, ambil palet warna dari gambar, simpan otomatis, confetti dan suara WebAudio). Bukan dasar desain. Jangan bawa kredit/font Soundjakarta, flow tanpa sesi, atau 5 gaya undian sekaligus.

## Catatan teknik dari prototype-v0.html

Yang dipakai ulang (tekniknya, bukan kodenya mentah-mentah):
- Prinsip "animasi berhenti tepat di pemenang yang sudah dipilih lebih dulu" (`spinWheel`, `spinSlot`). Bentuk wheel-nya sendiri tidak dipakai.
- Ambil palet dari gambar (`extractPalette`): gambar dikecilkan ke kanvas ~80px, lalu warna dikelompokkan.
- Confetti dan suara dibuat lewat kode (WebAudio).

Pelajaran yang harus diperbaiki di versi baru:
- Data dan gambar disimpan di `localStorage`, yang kapasitasnya hanya sekitar 5 MB. Prototipe sudah punya pesan "Penyimpanan penuh". Video pasti tidak muat, jadi versi baru memakai IndexedDB/OPFS.
- `rnd(n)` memakai `crypto.getRandomValues` lalu `% n`. Cara ini punya bias kecil (modulo bias). Versi baru memakai *rejection sampling* supaya peluang tiap peserta benar-benar sama.
- Font dimuat dari Google Fonts (butuh internet). Versi baru menyertakan file font di dalam aplikasi supaya bisa offline.
- Ada branding Soundjakarta (judul dan kredit "Powered by"). Jangan dibawa.
