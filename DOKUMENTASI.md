# Teh Poci POS — Dokumentasi Aplikasi
**Versi 2.0** · Terakhir diperbarui: Juni 2026

---

## Daftar Isi
1. [Gambaran Umum](#gambaran-umum)
2. [Teknologi](#teknologi)
3. [Struktur Role & Akses](#struktur-role--akses)
4. [Alur Login](#alur-login)
5. [Fitur Kasir (POS)](#fitur-kasir-pos)
6. [Fitur Owner (Dashboard)](#fitur-owner-dashboard)
7. [Setup Awal](#setup-awal)
8. [Deploy](#deploy)
9. [Custom Domain](#custom-domain)
10. [Changelog](#changelog)

---

## Gambaran Umum

Teh Poci POS adalah aplikasi kasir digital berbasis web (PWA) untuk usaha minuman Teh Poci. Dirancang khusus untuk penggunaan di HP kasir (mobile-first), mendukung varian produk, pencatatan shift, dan laporan harian/mingguan.

**Fitur utama:**
- Login Owner via Google, Kasir via Email+Password+PIN
- Buka/tutup shift dengan pencatatan kas awal & akhir
- Keranjang belanja dengan varian produk (Besar/Sedang/Kecil)
- 6 metode pembayaran: Tunai, QRIS, GoPay, OVO, Dana, Transfer Bank
- Perhitungan kembalian otomatis
- Cetak struk termal (80mm)
- Dashboard laporan harian + grafik 7 hari
- Export laporan CSV dengan rentang tanggal custom
- Manajemen produk, kasir, dan owner dari Dashboard

---

## Teknologi

| Komponen | Teknologi |
|---|---|
| Frontend | React + Vite |
| Styling | Tailwind CSS |
| Database | Firebase Firestore |
| Auth | Firebase Authentication |
| Storage | Firebase Storage (foto produk) |
| State | Zustand |
| PWA | vite-plugin-pwa + Workbox |
| Print | react-to-print |
| Hosting | Firebase Hosting |

---

## Struktur Role & Akses

### Super Owner
- Email: `indrajamz@gmail.com` (hardcoded, tidak bisa dihapus)
- Akses penuh termasuk **Hapus Semua Data Transaksi** (hanya Super Owner)
- Login via Google

### Owner Tambahan
- Ditambahkan oleh Super Owner di tab Administrator
- Akses Dashboard penuh kecuali Zona Berbahaya (reset data)
- Login via Google

### Kasir
- Dibuat oleh Owner di Dashboard → Administrator → Manajemen Kasir
- Login via Email + Password
- Wajib masukkan PIN setiap hari sebelum mulai shift
- Tidak punya akses Dashboard

---

## Alur Login

### Owner
1. Buka aplikasi → klik **Owner (Google)**
2. Pilih akun Google yang terdaftar → masuk langsung ke Dashboard

### Kasir
1. Buka aplikasi → klik **Kasir (Email & Password)**
2. Email tersimpan otomatis untuk login berikutnya (muncul sebagai chips, bisa diklik)
3. Masukkan email + password → masuk ke layar PIN
4. Ketik PIN 4–6 digit → masuk ke halaman POS
5. Tombol **Ganti Akun** tersedia di layar PIN jika salah masuk

---

## Fitur Kasir (POS)

### Shift
- Saat pertama login hari itu: wajib **Buka Shift** (isi modal awal kas)
- Tombol **Tutup Shift** ada di pojok kanan atas header
- Setelah tutup shift: muncul layar "Buka Shift" lagi dengan tombol **Selesai Kerja / Keluar**
- Variance (selisih kas) dicatat otomatis, termasuk kasus nombok (uang fisik < sistem)

### Transaksi
1. Ketuk produk → langsung masuk keranjang (produk tanpa varian)
2. Produk dengan varian (misal Es Teh Poci) → modal varian muncul
   - Pilih Besar/Sedang/Kecil dengan tombol + / –
   - Modal tetap terbuka sampai ketuk **Selesai**
3. Ketuk bar hijau di bawah → tampilkan keranjang
4. Atur quantity di keranjang dengan tombol besar + / –
5. Ketuk **Bayar →** → pilih metode → konfirmasi → struk muncul

### Struk
- Ketuk **Cetak Struk** → browser cetak ke printer termal 80mm
- Pastikan printer termal terhubung dan driver/app printer aktif di HP

---

## Fitur Owner (Dashboard)

### Tab Ringkasan
- Stat cards: penjualan hari ini, laba kotor, jumlah transaksi, produk aktif
- Grafik batang 7 hari terakhir
- Produk terlaris hari ini (ranking otomatis)
- Riwayat transaksi hari ini (15 terbaru)

### Tab Produk
- Tambah/edit/hapus produk
- Produk bisa punya varian (contoh: ukuran) atau tanpa varian
- Upload foto produk (maks 2MB)
- Toggle aktif/nonaktif per produk
- Opsi batasi stok harian (untuk menu spesial terbatas)

### Tab Administrator

**Manajemen Kasir:**
- Tambah kasir baru (buat akun email+password+PIN)
- Edit nama, PIN, status aktif/nonaktif kasir
- Hapus kasir (akun tidak bisa login lagi)
- *Email kasir tidak bisa diubah — hapus dan buat ulang jika perlu ganti email*

**Akun Owner:**
- Tambah/hapus email Google yang boleh login sebagai Owner

**Laporan & Export CSV:**
1. Pilih tanggal **Dari** dan **Sampai**
2. Klik **Muat Laporan** → tampil ringkasan + tabel transaksi
3. Klik **Export CSV** → file `.csv` terunduh otomatis
4. Buka di Google Sheets: File → Import → pilih file CSV

**Zona Berbahaya** *(hanya Super Owner)*:
- Hapus semua data transaksi dan shift
- Wajib ketik kata `HAPUS` untuk konfirmasi
- Tidak bisa dibatalkan — export CSV dulu sebelum reset

---

## Setup Awal

### 1. Firebase Console
Buat project di [console.firebase.google.com](https://console.firebase.google.com):

- **Authentication**: aktifkan Google + Email/Password
- **Firestore**: buat database (mode production), region `asia-southeast2`
- **Storage**: aktifkan untuk upload foto produk
- **Hosting**: aktifkan untuk deploy

### 2. File `.env`
Salin `.env.example` ke `.env` dan isi dengan config Firebase:
```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

### 3. Firestore Rules
Deploy rules dari file `firestore.rules`:
```bash
firebase deploy --only firestore:rules
```

### 4. Login Pertama
Login dengan akun Google `indrajamz@gmail.com` → akun Owner otomatis terbuat + store `branch_01` dibuat.

### 5. Tambah Produk
Di tab **Produk** → klik **✨ Tambah 6 Produk Contoh** untuk mulai, atau tambah manual.

### 6. Buat Akun Kasir
Di tab **Administrator → Manajemen Kasir** → Tambah Kasir → isi nama, email, password, PIN.

---

## Deploy

### Firebase Hosting (Gratis)

```bash
# Install Firebase CLI (sekali saja)
npm install -g firebase-tools

# Login
firebase login

# Init hosting (sekali saja, pilih project yang sudah ada)
firebase init hosting
# → Public directory: dist
# → Single-page app: Yes
# → Overwrite index.html: No

# Build + deploy
npm run build
firebase deploy --only hosting
```

Setelah deploy, app tersedia di:
`https://<project-id>.web.app`

---

## Custom Domain

### Opsi A: Domain via Firebase (Gratis, Paling Mudah)

1. Firebase Console → Hosting → **Add custom domain**
2. Masukkan domain kamu (misal `pos.tehpoci.com`)
3. Firebase beri 2 record DNS:
   - Satu TXT record untuk verifikasi
   - Satu A record untuk routing
4. Tambahkan record tersebut di panel DNS domainmu
5. Tunggu propagasi DNS (biasanya 5–30 menit, maks 48 jam)
6. SSL otomatis aktif

### Opsi B: Subdomain di VPS Sendiri (Nginx Reverse Proxy)

Karena kamu sudah punya VPS dan domain, kamu bisa arahkan subdomain ke Firebase Hosting lewat Nginx:

**1. Di DNS provider, buat record:**
```
Type: CNAME
Name: pos (atau subdomain lain)
Value: <project-id>.web.app
```

**2. Di VPS, install certbot + nginx, lalu buat config:**
```nginx
server {
    listen 80;
    server_name pos.domainmu.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name pos.domainmu.com;

    ssl_certificate     /etc/letsencrypt/live/pos.domainmu.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/pos.domainmu.com/privkey.pem;

    location / {
        proxy_pass https://<project-id>.web.app;
        proxy_set_header Host <project-id>.web.app;
        proxy_ssl_server_name on;
    }
}
```

**3. Issue SSL dengan Certbot:**
```bash
certbot --nginx -d pos.domainmu.com
```

> **Catatan:** Opsi B sedikit lebih kompleks tapi memberikan kontrol penuh. Opsi A lebih mudah dan SSL otomatis diurus Firebase.

---

## Changelog

### v2.0 (Juni 2026)
- Login kasir: simpan email terakhir, muncul sebagai chips untuk login cepat
- Tab baru: **Administrator** (gabung Kasir + Owner + Laporan + Zona Berbahaya)
- Tab Ringkasan: grafik 7 hari, produk terlaris, hanya info hari ini
- Laporan: filter rentang tanggal custom (dari–sampai), preview tabel, export CSV
- Export CSV: BOM UTF-8 supaya terbaca benar di Excel
- Hapus Kasir: tombol delete di daftar kasir (hapus profil Firestore)
- Edit Kasir: email ditampilkan read-only (Firebase limitation)
- Zona Berbahaya: hanya Super Owner (indrajamz@gmail.com) yang bisa lihat & akses
- Reset data: konfirmasi ketik kata `HAPUS` + notifikasi sukses
- Varian produk: modal tetap terbuka, +/- per varian tanpa perlu buka ulang
- Metode bayar: Tunai, QRIS, GoPay, OVO, Dana, Transfer Bank
- Struk termal: fix ukuran 80mm, tidak lagi cetak di A4
- PIN screen: jumlah titik dinamis (4 atau 6 sesuai PIN), tombol Ganti Akun
- Buat kasir: gunakan secondary Firebase app, Owner tidak ter-logout
- Tutup shift: bisa input nominal 0 (kasus nombok penuh)
- Shift modal: tombol Selesai Kerja/Keluar setelah tutup shift

### v1.0 (Februari 2026)
- Rilis awal: auth, shift, transaksi, produk, struk, PWA
