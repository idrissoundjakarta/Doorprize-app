# assets-video/

Template video background (MP4 looping) yang dibuat terpisah dari aplikasi. Nantinya masuk sebagai template tambahan atau premium, di luar 3 template generatif bawaan.

Arahan pembuatannya ada di `docs/arahan-aset-video.md` (belum ada di repo).

Usulan struktur per template:

```
assets-video/
  <nama-template>/
    looping.mp4      video tenang untuk adegan looping
    intens.mp4       video untuk undi/reveal (opsional)
    poster.jpg       frame diam untuk pratinjau & ambil warna tema
    info.md          tema, palet warna, durasi loop, sumber/lisensi
```

Catatan: file video besar sebaiknya tidak di-commit langsung ke git biasa. Cara penyimpanannya (Git LFS, penyimpanan terpisah, dll.) diputuskan bersama pilihan teknologi.
