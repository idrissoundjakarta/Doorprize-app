# Buka Digit: reveal mengikuti cue MC

## Outcome

Operator bisa memilih tempo otomatis atau memberi MC kendali atas jeda antar-digit. Penonton melihat nomor pemenang terungkap sedikit demi sedikit. Pemenang tetap diundi satu kali dari kupon yang memenuhi syarat sebelum reveal dimulai. Klik operator menentukan waktu pengungkapan setiap digit.

## Alur pengguna

1. Saat memilih gaya **Buka digit**, operator bisa memilih **Auto** atau **Manual**. Auto mempertahankan pengalaman sekarang dan menjadi default untuk acara lama. Gaya undian lain tetap memakai perilakunya masing-masing.
2. Saat cue undian dimulai di mode Manual, digit pertama berputar dan operator melihat instruksi **Stop digit 1**. LED menampilkan reveal tanpa kontrol operator atau nama pemenang lengkap.
3. Saat MC bilang “stop”, satu klik tombol atau clicker mengunci satu digit. Angka yang sudah terbuka tetap terlihat, dan digit berikutnya berputar hingga aba-aba selanjutnya. Contoh kupon 347: 3•• → 34• → 347.
4. Setelah digit terakhir dibuka, tampilkan reveal pemenang seperti sekarang. Operator tetap bisa sahkan atau pilih Hangus. Jika hadiah diundi ulang, reveal berikutnya mulai dari digit pertama untuk pemenang baru.

## Patokan lulus

- Manual tetap menunggu cue jika MC mengambil jeda lebih panjang dari durasi animasi Auto. Satu klik sah membuka tepat satu digit; penekanan tertahan atau klik ganda tidak melewati digit secara tidak sengaja.
- Nol di depan tetap tampil. Uji contoh 007 dan kupon dengan panjang berbeda. Nama lengkap dan digit yang tersisa belum muncul di LED sebelum waktunya.
- Pemilihan pemenang, kupon yang memenuhi syarat, pengesahan, Hangus dan undi ulang tetap konsisten; timing operator tidak mengubah hasil undian.
- Auto berjalan seperti sebelumnya. Uji alur operator dan jendela LED terpisah, dengan tombol dan keyboard. Catat terpisah apakah clicker fisik sudah diuji.

Pilihan teknis diserahkan ke Claude Code. Laporkan hasil aktual untuk Auto dan Manual di PR, termasuk bukti LED menunggu cue dan bagian yang belum teruji.