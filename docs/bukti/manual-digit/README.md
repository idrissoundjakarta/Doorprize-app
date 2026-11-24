# Bukti uji: Buka digit Manual

Diambil dari uji otomatis di browser (Chromium headless, dua jendela: operator + layar LED 1280×720), data contoh 500 kupon.

| File | Isi |
|---|---|
| `0-setup.jpg` | Setup → Gaya undian: pilihan Auto / Manual |
| `1-led-menunggu-digit1.jpg` | LED 7,9 dtk setelah undi dimulai (lebih lama dari Auto 6 dtk): digit 1 masih berputar, digit lain tertutup (•) |
| `2-operator-stop-digit1.jpg` | Operator: tombol "Stop digit 1", status MANUAL, daftar pemenang "Sedang diundi…" (identitas belum tampil) |
| `3-led-1-digit.jpg` | Setelah PageDown ditahan di jendela LED (1 keydown + 2 repeat): hanya 1 digit terbuka |
| `4-led-2-digit.jpg` | Setelah 3 klik sekaligus di tombol operator: hanya 1 digit tambahan |
| `5-led-semua-digit.jpg` | Digit terakhir terbuka, ditahan ±1 dtk |
| `6-led-reveal.jpg` | Layar pemenang seperti biasa |
| `7-led-undi-ulang.jpg` | Setelah Hangus → undi ulang: mulai lagi dari digit 1, pemenang baru |
