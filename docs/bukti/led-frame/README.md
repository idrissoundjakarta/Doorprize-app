# Bukti uji: Frame LED

Uji otomatis di browser (Chromium headless), dua jendela (operator + jendela LED), data contoh. Jendela LED 32:9 diuji pada 1920×540 (skala 50% dari 3840×1080) karena mesin uji tanpa layar fisik.

| File | Isi |
|---|---|
| `a-1920x1080.jpg` | 16:9: show memenuhi kanvas, tanpa frame |
| `b-3840x1080-frame-bawaan.jpg` | 32:9: show 1920×1080 di tengah, frame bawaan 960 px kiri & kanan (garis merah = batas show) |
| `c-1440x1080-sempit.jpg` | 4:3 (lebih sempit dari 16:9): show 1440×810 utuh, frame 135 px atas & bawah |
| `template-3840x1080.jpg` | Template unduhan: area show tertutup + ukuran area desain |
| `e-upload-salah-ukuran.jpg` | Upload 3000×1000 ke layar 3840×1080: ditolak dengan ukuran yang dibutuhkan, frame bawaan tetap |
| `f-frame-custom.jpg` | Upload `contoh-frame-custom-3840x1080.png` (ukuran cocok): langsung tampil di pratinjau |
| `g-led-32x9-frame-custom-reveal.jpg` | Jendela LED 32:9 setelah satu putaran undi (keyboard di jendela LED): frame custom + layar pemenang |
| `h-operator.jpg` | Jendela operator dengan pratinjau LED |
| `i-resolusi-berubah.jpg` | Resolusi diganti ke 2880×1080: frame custom tidak cocok → frame bawaan + peringatan |
| `j-operator-peringatan-rasio.jpg` | Rasio jendela LED berbeda dari setup: peringatan di operator |
| `k-setelah-reload.jpg` | Kembali ke 3840×1080 + reload: frame custom aktif lagi |
| `l-led-4x3.jpg` | Jendela LED 4:3: frame atas & bawah |
