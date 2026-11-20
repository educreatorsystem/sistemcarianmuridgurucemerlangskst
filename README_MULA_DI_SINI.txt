SISTEM CARIAN MAKLUMAT MURID SK SUNGAI TIRAM
VERSI ANDROID / TABLET / LOGO PWA – 20 NOVEMBER 2026

PERUBAHAN
1. Pelawat Android/tablet tidak lagi menggunakan iframe ke Apps Script. Pautan GitHub membuka Web App sebagai halaman utama supaya log masuk Google dan paparan lebih serasi. Dalam PWA terpasang, ketuk “Buka Sistem Carian”.
2. Desktop masih boleh guna iframe, dengan butang alternatif “Buka laman terus” jika iframe disekat.
3. Loading GitHub dan loading dalam Web App kini menggunakan logo rasmi SK Sungai Tiram tanpa tulisan/logo gantian “SKST”.
4. Ikon PWA 192px dan 512px, ikon maskable, favicon, apple-touch-icon menggunakan lencana rasmi.
5. Service Worker v4 mengosongkan cache versi lama dan tidak menyimpan data murid, K/P atau kesihatan.
6. Rekod kesihatan dapat dilihat oleh pengguna Web App, nombor K/P hanya selepas log masuk admin, cetakan mengikut tapisan masih dikekalkan.

CARA PASANG (PILIH SALAH SATU BAGI APPS SCRIPT)
A. PALING MUDAH - SATU FAIL:
  - Buka Google Apps Script sedia ada.
  - Gantikan seluruh kandungan Code.gs dengan fail Code.gs di folder utama ZIP ini.
  - Jangan jalankan loginAdmin melalui butang Run; gunakan laman web untuk log masuk.
  - Pastikan Script Properties ADMIN_USERNAME / ADMIN_PASSWORD sedia ada tidak dipadam.
  - Deploy > Manage deployments > Edit > New version > Deploy. Kekalkan URL /exec.

B. ALTERNATIF - DUA FAIL:
  - Salin apps_script/Code.gs ke Code.gs dan apps_script/App.html ke fail HTML bernama App.
  - Deploy semula versi baharu.
  - Jangan gunakan cara A dan B serentak.

KEMASKINI GITHUB PAGES
  - Muat naik SEMUA kandungan folder github ke root repositori: index.html, sw.js, manifest.webmanifest, favicon.ico dan folder assets.
  - Pastikan GitHub Pages menggunakan branch dan folder yang sama seperti sebelumnya.
  - Refresh Chrome dan jika masih nampak versi lama, padam data laman atau nyahpasang shortcut/PWA lama kemudian pasang semula.
  - Telefon Android: gunakan Chrome atau Edge terkini. Elak pelayar terbina dalam WhatsApp/Telegram/Facebook.
  - Jika PWA dilancarkan dari ikon, ketuk “Buka Sistem Carian”. Ini membuka Apps Script sebagai laman utama di pelayar kerana integrasi iframe tidak stabil di sesetengah Android.

FAVICON GOOGLE APPS SCRIPT /exec (PILIHAN)
  - Lencana secara automatik digunakan untuk laman GitHub, skrin loading dan ikon PWA.
  - Google Apps Script mengabaikan favicon dalam HTML. Untuk tab /exec, selepas menerbitkan laman GitHub dan mempunyai URL awam sebenar, tambah Script Property SITE_FAVICON_URL = HTTPS URL kepada assets/favicon-48.png milik repositori anda.
  - Contoh format (GANTIKAN nama akaun dan repositori sebenar): https://<akaun>.github.io/<repo>/assets/favicon-48.png
  - Jangan tulis URL contoh itu bulat-bulat. Tanpa tetapan ini, laman tetap berfungsi.

KESELAMATAN DATA (PENTING)
  - Github Pages TIDAK mengehadkan akses kepada guru; URL Apps Script boleh diakses terus jika deploy kepada Anyone.
  - Oleh sebab sejarah perubatan ditampilkan sebelum admin login, hadkan capaian Web App kepada akaun guru/domain sekolah di Google Workspace atau gunakan mekanisme pengesahan guru khusus.
  - Nyahterbit CSV awam yang memuatkan nombor kad pengenalan dan sejarah perubatan.
  - Tiada data murid disimpan dalam cache PWA/service worker.
  - Data diuji secara statik/simulasi; pengujian Google sebenar perlu dilakukan selepas deploy.
