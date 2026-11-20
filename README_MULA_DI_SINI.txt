SISTEM CARIAN SK SUNGAI TIRAM — VERSI TAPISAN BERWARNA + EMOJI 🩺

BAHARU
- Tapisan kelas, rumah sukan dan jantina; boleh berfungsi tanpa taip nama (pilih sekurang-kurangnya satu tapisan).
- Butang tapisan pantas BIRU/HIJAU/KUNING/MERAH; lencana warna yang konsisten pada kad murid.
- Admin sahaja: tapisan Ada / Tiada Rekod Perubatan serta emoji 🩺 untuk murid yang mempunyai butiran kesihatan tercatat. Tidak memaparkan/menapis rekod perubatan kepada pengguna awam.
- Logo asal SK Sungai Tiram disertakan secara automatik pada Apps Script dan pada PWA GitHub.
- Kekal padanan nama unik dua tab, amaran nama berulang, admin, dan muat turun profil oleh admin.

CARA PALING MUDAH — TIDAK PERLU APP.HTML
1. Buka projek Apps Script yang sedang digunakan.
2. Dalam Code.gs, PADAM semua kod lama dan tampal keseluruhan kandungan fail Code.gs DI ROOT pakej ini.
3. Save. Tiada App.html diperlukan.
4. Project Settings > Script properties: kekalkan ADMIN_USERNAME dan ADMIN_PASSWORD yang telah ditetapkan dahulu.
5. Deploy > Manage deployments > ikon pensel > Version: New version > Deploy.
6. Buka URL Web App yang lama dan tekan Ctrl+Shift+R.

CARA DUA FAIL — JIKA INGIN MUDAH EDIT HTML
1. Gunakan apps_script/Code.gs sebagai Code.gs.
2. Klik + > HTML > masukkan nama App (automatik jadi App.html).
3. Tampal apps_script/App.html. Save dan deploy versi baharu.
4. JANGAN pilih Code.gs dari root jika anda memilih cara dua fail.

GITHUB PAGES
- Fail kemas kini PWA disimpan dalam github/. Muat naik semua fail di dalam folder tersebut ke root repositori.
- URL Apps Script kekal seperti asal; tidak perlu menukar URL.
- GitHub hanya memaparkan Apps Script di dalam iframe. Tapisan sebenar diproses di Code.gs.
- Kemas kini PWA SW cache kepada v2; sesetengah peranti perlu refresh / install semula.

KESELAMATAN
- Jangan terbit atau kongsi pautan CSV yang memuatkan nombor kad pengenalan atau sejarah perubatan.
- Matikan Publish to the web bagi dua tab Google Sheet sedia ada, dan pastikan Sheets tidak dikongsi umum.
- Emoji dan tapisan sejarah perubatan hanya muncul selepas log masuk admin. Ini mengelakkan pendedahan penyakit kanak-kanak kepada awam.
- Jangan simpan ADMIN_PASSWORD dalam GitHub.
- Tukar kata laluan asal kepada kata laluan yang kuat.

APPS SCRIPT WEB APP:
https://script.google.com/macros/s/AKfycby5UJhujNUfQylBXo-slnRuMGB-J24uSIqNQ2CmSHBjD_B7FYx1LTKdhsdqSZSqpxiv/exec
