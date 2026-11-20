# SISTEM CARIAN MURID SK SUNGAI TIRAM — PWA

Tema: Midnight Navy × Metallic Gold. Sistem GitHub Pages ialah PWA; bahagian dinamik dipaparkan daripada Google Apps Script (`HtmlService`) dalam iframe. Reka bentuk utama, carian dan pentadbiran terletak dalam fail `appscript/App.html`.

## 1. Fail dalam pakej

```text
SKST_Carian_Murid_PWA/
├── appscript/
│   ├── Code.gs                ← Google Apps Script (backend, pemadanan, log masuk)
│   └── App.html               ← Paparan sebenar sistem
├── github/
│   ├── index.html             ← Laman utama GitHub PWA (URL Apps Script siap diisi)
│   ├── manifest.webmanifest   ← Manifest PWA
│   ├── sw.js                  ← Service worker (cache rangka aplikasi sahaja)
│   └── assets/
│       ├── icon-192.png
│       └── icon-512.png
└── README_MULA_DI_SINI.md
```

## 2. Kemas kini Google Apps Script

1. Buka projek Apps Script asal yang mempunyai URL deploy yang diberikan.
2. Dalam editor, gantikan keseluruhan kandungan `Code.gs` dengan fail `appscript/Code.gs`.
3. Klik **+ > HTML** di bahagian Files. Namakan fail **App** (nama akhir `App.html`). Salin kandungan `appscript/App.html` ke fail tersebut.
4. Pergi ke **Project Settings** (ikon gear) > **Script properties** > **Add script property**. Tambah:
   - Property: `ADMIN_USERNAME` — Value: `admin`
   - Property: `ADMIN_PASSWORD` — Value: **kata laluan admin yang anda berikan dalam perbualan**. **JANGAN tulis kata laluan dalam fail GitHub.** Tukar kepada kata laluan baharu sebelum sistem digunakan secara meluas.
5. Klik **Deploy > Manage deployments > Edit** pada deployment web app sedia ada. Pilih **New version**, kemudian **Deploy**. Ini penting untuk mengekalkan URL `/exec` yang sudah dimasukkan ke dalam GitHub.
6. Pastikan `Execute as: Me` (pemilik Google Sheet) dan `Who has access: Anyone` **hanya jika** sistem perlu digunakan umum. Untuk penggunaan terhad, pertimbangkan akses organisasi dan ujinya; sesetengah jenis kebenaran mungkin tidak berfungsi jika di-embed dalam GitHub Pages.
7. Benarkan permintaan kebenaran untuk membaca Google Sheets. Buka URL web app secara langsung dan uji nama murid serta log masuk admin.

URL Apps Script semasa:
https://script.google.com/macros/s/AKfycby5UJhujNUfQylBXo-slnRuMGB-J24uSIqNQ2CmSHBjD_B7FYx1LTKdhsdqSZSqpxiv/exec

ID Google Sheet yang disambung melalui `SpreadsheetApp.openById`:
`1xMsTSwR7p6IMZiehyn4vL962kKh4PcchtPmzzpnMAV8`

Nama tab dan kolum yang diperlukan (baris pertama ialah header):
- `KELAS DAN NAMA MURID`: `KELAS`, `NAMA MURID`, `JANTINA`, `SEJARAH PERUBATAN`.
- `NAMA MURID, RUMAH SUKAN DAN NO K/P`: `NAMA MURID`, `RUMAH SUKAN`, `NO K/P`.

## 3. Terbitkan di GitHub Pages

1. Buat repositori GitHub baharu, contoh `carian-murid-skst`.
2. Upload **semua isi dalam folder `github`** ke *root* repositori (jangan upload folder `appscript` atau README yang mengandungi prosedur pentadbir ke folder laman awam, kecuali anda mahu menerbitkannya sebagai sumber).
3. Semak `index.html`, `manifest.webmanifest`, `sw.js` dan folder `assets/` berada pada root repositori.
4. Pergi ke **Settings > Pages > Build and deployment**, pilih **Deploy from a branch**, Branch `main`, Folder `/ (root)`, dan Save.
5. Buka pautan GitHub Pages yang terhasil. Jika laman kosong, uji URL Apps Script secara langsung; semak `doGet()` memanggil `.setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)` dan versi baharu telah dideploy.

## 4. Pemasangan PWA

- **Android Chrome:** buka URL GitHub Pages, pilih menu **Install app / Add to Home screen**.
- **Komputer Chrome/Edge:** buka URL GitHub Pages, klik ikon **Install** pada bar alamat jika disediakan.
- **iPhone Safari:** buka URL GitHub Pages, **Share > Add to Home Screen**.
- PWA memerlukan internet untuk carian. Ia **tidak** memuat turun rekod KP/perubatan untuk kegunaan luar talian.

## 5. Polisi privasi / keselamatan — SANGAT PENTING

- **Unpublish kedua-dua URL CSV** yang sebelum ini diterbitkan sebagai `pub?gid=...&output=csv`: URL CSV awam membenarkan orang lain mengakses keseluruhan nombor KP dan rekod sejarah perubatan tanpa log masuk. Sembunyikan maklumat pada portal **TIDAK** melindungi CSV yang sudah diterbitkan. Selepas nyahterbit, backend masih boleh membaca melalui `SpreadsheetApp.openById` sebagai pemilik.
- Pastikan Google Sheet **bukan** dikongsi sebagai `Anyone with the link`. Hadkan kebenaran kepada individu yang diberi kuasa.
- Sesi admin (6 jam) dikeluarkan di pelayan dan disimpan sementara dalam tab pelayar; kata laluan disemak dalam Script Properties. Jangan berikan akses editor ke projek Apps Script kepada orang awam.
- Nama yang sama muncul lebih daripada sekali dalam mana-mana tab tidak digabungkan: `Nama berulang` perlu dibetulkan dalam Google Sheet dahulu.
- Sistem tidak menyimpan hasil carian atau butiran perubatan dalam service worker. Fail CSV hanya terhasil apabila admin sendiri menekan butang muat turun.
- Jika digunakan pada komputer bersama, log keluar sebelum meninggalkan sistem. Gunakan kata laluan unik yang lebih kukuh daripada kata laluan asal.
- Penggunaan data murid mesti tertakluk kepada dasar perlindungan data dan garis panduan sekolah/KPM yang berkenaan.

## 6. Cara menguji

1. Uji carian tiga huruf atau lebih: keputusan awam hanya Nama, Kelas, Jantina dan Rumah Sukan.
2. Cuba cari murid yang tiada di tab kedua; ia akan ditanda `Belum dipadankan`.
3. Admin: log masuk dengan kelayakan yang ditetapkan pada Script Properties. Selepas log masuk, No. KP, Sejarah Perubatan, statistik kelas dan rumah sukan kelihatan.
4. Cari No. KP dalam mod admin (sekurang-kurangnya 5 digit).
5. Admin boleh cetak satu rekod atau eksport CSV satu rekod dari hasil carian.
6. Uji log keluar; rekod sensitif sepatutnya terus hilang daripada paparan.
7. Uji PWA, butang Install, dan keadaan tanpa internet (sistem akan memaklumkan perlunya internet).

## 7. Nota had pelaksanaan

- `iframe` memerlukan versi GAS Web App terkini dan mungkin terhad oleh tetapan domain/sekuriti sesetengah pelayar. Jika berlaku masalah, buka URL Apps Script secara langsung (butang disediakan pada skrin permulaan).
- Jika browser menyekat storan pihak ketiga, sesi admin mungkin tidak kekal selepas refresh dalam `iframe`; gunakan URL Apps Script secara langsung untuk log masuk apabila perlu.
- Semua carian mengambil data terkini daripada Google Sheet melalui Apps Script. Bagi ribuan murid, setiap permintaan mungkin mengambil masa bergantung pada prestasi Google.
- Reka bentuk dibuat semula berdasarkan fungsi yang diminta. Laman rujukan Canva tidak dapat diambil sepenuhnya untuk pemeriksaan susun atur pixel-by-pixel.
