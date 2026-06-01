# 🍵 Teh Poci POS

**Aplikasi Kasir Digital untuk Usaha Minuman Teh Poci**

[![Firebase](https://img.shields.io/badge/Firebase-Firestore%20%7C%20Auth%20%7C%20Hosting-orange?logo=firebase)](https://firebase.google.com)
[![React](https://img.shields.io/badge/React-19-blue?logo=react)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-6-purple?logo=vite)](https://vitejs.dev)
[![PWA](https://img.shields.io/badge/PWA-Ready-green?logo=googlechrome)](https://web.dev/progressive-web-apps/)
[![Version](https://img.shields.io/badge/Versi-2.0-brightgreen)](#changelog)

> Mobile-first POS (Point of Sale) berbasis web yang bisa diinstall sebagai PWA di HP kasir. Dirancang khusus untuk usaha minuman skala kecil-menengah.

---

## 📱 Demo

🌐 **Live App:** [https://tehpoci-pos.web.app](https://tehpoci-pos.web.app)

---

## ✨ Fitur Utama

### Untuk Kasir
- 🔐 Login Email + Password + PIN harian
- 📱 Antarmuka mobile-first, tombol besar, mudah dioperasikan
- 🛒 Keranjang belanja dengan varian produk (Besar/Sedang/Kecil) — modal tetap terbuka, +/– per varian
- 💵 6 metode bayar: **Tunai, QRIS, GoPay, OVO, Dana, Transfer Bank**
- 💰 Perhitungan kembalian otomatis + tombol nominal cepat
- 🧾 Cetak struk termal 80mm
- ⏰ Sistem shift harian (buka & tutup kas)
- 📶 Deteksi offline — transaksi diblokir saat tidak ada koneksi
- 💾 Login cepat — email kasir tersimpan otomatis di browser

### Untuk Owner
- 📊 Dashboard laporan: penjualan hari ini, laba kotor, grafik 7 hari
- 🏆 Produk terlaris hari ini (ranking otomatis)
- 📅 Export laporan CSV dengan rentang tanggal custom (dari–sampai)
- 👥 Manajemen kasir: tambah/edit/hapus akun
- 📦 Manajemen produk: foto, varian, HPP, status aktif/nonaktif
- 🔑 Manajemen owner: tambah/cabut akses Google login
- 🗑️ Reset data transaksi dengan konfirmasi berlapis (Super Owner only)

---

## 🛠️ Teknologi

| Layer | Teknologi |
|---|---|
| Frontend | React 19 + Vite 6 |
| Styling | Tailwind CSS v4 |
| State Management | Zustand |
| Database | Firebase Firestore |
| Auth | Firebase Authentication |
| File Storage | Firebase Storage |
| Hosting | Firebase Hosting |
| PWA | vite-plugin-pwa + Workbox |
| Print | react-to-print |

---

## 🗂️ Struktur Project

```
tehpoci_New/
├── public/                   # PWA icons, manifest
├── src/
│   ├── components/
│   │   ├── dashboard/
│   │   │   ├── ProductForm.jsx     # Form tambah/edit produk
│   │   │   ├── UserForm.jsx        # Form tambah/edit kasir
│   │   │   ├── StatCard.jsx        # Kartu statistik
│   │   │   └── RevenueChart.jsx    # Grafik batang 7 hari
│   │   └── pos/
│   │       ├── CartDrawer.jsx      # Keranjang belanja (sticky bottom)
│   │       ├── CheckoutModal.jsx   # Modal pembayaran
│   │       ├── ProductCard.jsx     # Kartu produk di grid POS
│   │       ├── ReceiptModal.jsx    # Struk + tombol cetak
│   │       ├── ShiftCloseModal.jsx # Modal tutup shift
│   │       ├── ShiftOpenModal.jsx  # Modal buka shift
│   │       └── VariantModal.jsx    # Pilih varian produk
│   ├── hooks/
│   │   ├── useAuth.js              # Firebase auth listener + bootstrap
│   │   └── useNetworkStatus.js     # Deteksi online/offline
│   ├── lib/
│   │   ├── firebase.js             # Inisialisasi Firebase
│   │   └── firestoreHelpers.js     # Fungsi Firestore (shift, transaksi, produk)
│   ├── pages/
│   │   ├── DashboardPage.jsx       # Dashboard Owner (3 tab)
│   │   ├── LoginPage.jsx           # Halaman login
│   │   ├── PinLockPage.jsx         # Layar PIN kasir
│   │   └── PosPage.jsx             # Halaman POS kasir
│   ├── store/
│   │   ├── authStore.js            # State auth (user, profile, PIN)
│   │   └── posStore.js             # State POS (cart, shift)
│   └── utils/
│       └── currency.js             # Format Rupiah
├── firestore.rules                 # Security rules Firestore
├── storage.rules                   # Security rules Storage
├── firebase.json                   # Konfigurasi Firebase
├── DOKUMENTASI.md                  # Dokumentasi lengkap (Bahasa Indonesia)
└── .env                            # Env vars Firebase (tidak di-commit)
```

---

## ⚙️ Setup & Instalasi

### Prasyarat
- Node.js 18+
- Akun Firebase
- Firebase CLI: `npm install -g firebase-tools`

### 1. Clone & Install

```bash
git clone https://github.com/bangjamz/tehpoci_New.git
cd tehpoci_New
npm install
```

### 2. Konfigurasi Firebase

Buat file `.env` di root project:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### 3. Setup Firebase Console

Di [console.firebase.google.com](https://console.firebase.google.com):

| Layanan | Yang Perlu Diaktifkan |
|---|---|
| Authentication | Google Sign-in + Email/Password |
| Firestore | Buat database, region `asia-southeast2` (Jakarta) |
| Storage | Aktifkan untuk upload foto produk |
| Hosting | Aktifkan untuk deploy |

### 4. Deploy Firestore Rules

```bash
firebase login
firebase deploy --only firestore:rules,storage
```

### 5. Jalankan Lokal

```bash
npm run dev
```

Buka `http://localhost:5173` — login dengan akun Google Super Owner untuk setup pertama.

---

## 🚀 Deploy

```bash
# Build production
npm run build

# Deploy ke Firebase Hosting
firebase deploy --only hosting
```

App akan live di `https://<project-id>.web.app`

---

## 👤 Role & Akses

| Role | Login | Akses |
|---|---|---|
| **Super Owner** | Google (email utama) | Dashboard penuh + reset data |
| **Owner Tambahan** | Google (ditambahkan Super Owner) | Dashboard penuh kecuali reset data |
| **Kasir** | Email + Password + PIN | Halaman POS saja |

---

## 🔄 Alur Penggunaan

### Owner
```
Login Google → Dashboard
├── Tab Ringkasan     → Lihat laporan hari ini & grafik 7 hari
├── Tab Produk        → Kelola menu/produk
└── Tab Administrator
    ├── Kasir         → Tambah/edit/hapus akun kasir
    ├── Owner         → Tambah/cabut akses Google login
    ├── Laporan       → Export CSV rentang tanggal
    └── Zona Berbahaya → Reset data (Super Owner only)
```

### Kasir
```
Login Email+Password → PIN Screen → POS
├── Buka Shift (isi kas awal)
├── Pilih produk → Keranjang → Bayar → Struk
└── Tutup Shift (hitung kas akhir, catat selisih)
    └── Selesai Kerja / Keluar
```

---

## 🗄️ Struktur Data Firestore

```
/products/{productId}
  name, category, price, cost_price, has_variants,
  variants[], image_url, is_active, stock_item, stock_count

/users/{uid}
  uid, email, display_name, role (OWNER/CASHIER),
  is_active, pin_hash, pin_length, assigned_store

/config/authorized_owners
  emails[]

/stores/branch_01/shifts/{shiftId}
  cashier_uid, cashier_name, initial_cash, expected_cash,
  actual_cash, variance, status (OPEN/CLOSED), start_time, end_time

/stores/branch_01/transactions/{txId}
  shift_id, cashier_uid, cashier_name, items[],
  total_amount, total_cost, gross_profit,
  payment_method, timestamp
```

---

## 🌐 Custom Domain

### Opsi A — Via Firebase Console (Termudah)
1. Firebase Console → Hosting → **Add custom domain**
2. Masukkan domain (misal `pos.tehpoci.com`)
3. Tambahkan DNS records yang diberikan Firebase ke provider domain
4. SSL otomatis aktif dalam beberapa menit

### Opsi B — Nginx Reverse Proxy di VPS
```nginx
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
Lalu jalankan: `certbot --nginx -d pos.domainmu.com`

---

## 📋 Changelog

### v2.0 — Juni 2026
- Login kasir: email tersimpan otomatis, login cepat via chips
- Dashboard: restrukturisasi → Ringkasan, Produk, Administrator
- Ringkasan: grafik batang 7 hari + produk terlaris + riwayat hari ini
- Administrator: kasir, owner, laporan, zona berbahaya dalam satu tab
- Laporan: date range picker (dari–sampai) + preview + export CSV
- Export CSV: BOM UTF-8 supaya terbaca benar di Excel & Google Sheets
- Hapus kasir: tombol delete di daftar kasir
- Edit kasir: email read-only dengan penjelasan
- Zona Berbahaya: hanya Super Owner yang bisa lihat & akses
- Varian: modal tetap terbuka, +/– per varian tanpa ulang buka
- Metode bayar: Tunai, QRIS, GoPay, OVO, Dana, Transfer Bank
- Struk termal: fix ukuran cetak 80mm
- PIN screen: dots dinamis (4/6 digit) + tombol Ganti Akun
- Buat kasir: secondary Firebase app — Owner tidak ter-logout
- Tutup shift: bisa input Rp 0 (nombok penuh)
- Selesai shift: tombol Keluar di modal Buka Shift

### v1.0 — Februari 2026
- Rilis awal: auth, shift, transaksi, produk, struk, PWA

---

## 📄 Lisensi

Private — untuk penggunaan internal Teh Poci.

---

*Dibuat dengan ❤️ untuk Teh Poci · [tehpoci-pos.web.app](https://tehpoci-pos.web.app)*
