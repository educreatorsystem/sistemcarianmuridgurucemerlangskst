SK SUNGAI TIRAM — VERSI CETAK & REKOD PERUBATAN (20 NOV 2026)

PERUBAHAN
1. Lencana sekolah asal terus kelihatan pada awal halaman, tanpa login atau muat naik.
2. Fungsi muat naik lencana dipadam sepenuhnya daripada frontend dan backend.
3. No. K/P: hanya muncul apabila log masuk admin sah; tidak dihantar kepada pengguna biasa.
4. Rekod perubatan dan emoji 🩺: kelihatan kepada pengguna biasa, kerana pengguna ialah guru.
5. Tapisan: Tahun, Kelas, Jantina, Rumah Sukan, dan Ada/Tiada Rekod Perubatan, serta carian nama.
6. CETAK SENARAI / PDF: mencetak SEMUA rekod sepadan, bukan 40 kad pertama; nombor KP hanya masuk cetakan admin.
7. CETAK PROFIL: pada setiap kad individu, termasuk tanpa admin (tanpa nombor KP).
8. Label “Tiada rekod perubatan” bukannya mendakwa “murid sihat”.

CARA PALING MUDAH: 1 FAIL CODE.GS
1. Buka projek Apps Script yang digunakan pada masa ini.
2. Gantikan SEMUA isi Code.gs dengan fail Code.gs di root ZIP ini (bukan apps_script/Code.gs).
3. Klik Save.
4. Project Settings > Script properties: ADMIN_USERNAME dan ADMIN_PASSWORD sedia ada boleh dikekalkan.
5. Deploy > Manage deployments > Edit > New version > Deploy.
6. Buka URL Web App asal, refresh paksa CTRL+SHIFT+R.
7. Fail App.html yang tinggal dari versi lama boleh dipadam; versi satu fail TIDAK menggunakannya.

PILIHAN KOD DUA FAIL
- Gunakan apps_script/Code.gs sebagai Code.gs.
- Buat fail HTML bernama App dalam Apps Script dan tampal apps_script/App.html.
- Simpan & deploy New Version. Jangan campurkan Code.gs satu fail dengan Code.gs dua fail.

GITHUB PAGES / PWA
- Kandungan folder github/ boleh dimuat naik ke root repositori GitHub.
- URL Web App kekal sama.
- GitHub Pages PUBLIC tidak menyekat capaian orang luar! GitHub hanya menjadi pembungkus iframe.
- Lihat cadangan keselamatan di bawah sebelum menerbitkan kepada guru.

AMARAN KESELAMATAN DATA (WAJIB)
- Tanpa login admin, data perubatan kini boleh dibaca oleh sesiapa yang BERJAYA mengakses Web App.
- Menyebarkan pautan hanya dalam group guru TIDAK menjadikan pautan sebagai portal tertutup.
- Jika sekolah menggunakan akaun Google Workspace domain, deploy Apps Script dengan akses HANYA pengguna organisasi / domain sekolah. Jika tetapan organisasi tiada, jangan terbit rekod perubatan melalui pautan awam; gunakan platform yang memerlukan log masuk guru.
- Sesetengah pelayar menyekat iframe Google Apps Script yang memerlukan autentikasi; jika paparan GitHub tidak berfungsi, buka Web App terus selepas log masuk akaun guru.
- Nyahterbit dua CSV melalui File > Share > Publish to web (Stop publishing) dan pastikan Sheet hanya dikongsi kepada pihak yang dibenarkan. CSV diterbitkan secara awam akan memintas semua kawalan portal.
- Jangan simpan kata laluan admin atau export perubatan murid di GitHub. Tukar kata laluan kepada kata laluan baharu yang kuat.
- Cetakan dan PDF adalah sensitif; simpan di tempat selamat dan jangan edarkan sewenang-wenangnya.

UJIAN
- Sahkan logo kelihatan sebelum login; fungsi upload tiada.
- Taip nama murid; perubatan terpapar, No. K/P tiada.
- Tapisan “Ada rekod perubatan”, klik Cetak Senarai/PDF.
- Pilih Kelas sahaja dan cetak; bilangan baris cetak hendaklah sama dengan jumlah padanan walaupun >40.
- Login admin kemudian cetak; No. K/P dipaparkan hanya jika admin telah disahkan oleh pelayan.
- Logout: No. K/P tidak lagi terpapar atau dicetak.

URL WEB APP:
https://script.google.com/macros/s/AKfycby5UJhujNUfQylBXo-slnRuMGB-J24uSIqNQ2CmSHBjD_B7FYx1LTKdhsdqSZSqpxiv/exec
