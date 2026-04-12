# AGENTS.md — Aplikasi Penggajian Soto Bahtiar

## 0. Tujuan Dokumen

Dokumen ini adalah kontrak kerja untuk AI Agent yang mengerjakan **backend (Laravel)** dan **mobile (React Native Expo)** secara paralel. Fokus: cepat, tepat, tidak over-engineer, dan aman terhadap aturan bisnis.

Agent WAJIB mengikuti alur kerja, batasan, dan quality bar di dokumen ini.

---

## 1. Konteks Produk

* **Nama**: Aplikasi Penggajian Soto Bahtiar
* **Deskripsi**: Aplikasi mobile offline-first untuk mencatat gaji harian karyawan dan pembayaran mingguan.
* **User utama**: Owner warung (usia 50–60+, non-teknis, sibuk).
* **Platform**:

  * Backend: Laravel API (Sanctum)
  * Mobile: React Native (Expo), MVVM

---

## 2. Tujuan Bisnis (Prioritas)

Urutan prioritas implementasi:

1. Pencatatan gaji harian
2. Rekap & pembayaran mingguan
3. Riwayat mingguan
4. Offline-first (WAJIB dari awal)
5. Export PDF

**Kegagalan fatal (HARUS DIHINDARI):**

* Data gaji hilang
* Data minggu yang sudah dibayar masih bisa diedit
* Sync tidak bekerja saat offline/online berganti
* PDF salah total

---

## 3. Scope & Batasan

### In Scope (MVP)

* Auth (login/logout)
* CRUD karyawan (soft delete via nonaktif)
* Input & edit gaji harian (minggu berjalan)
* Pembayaran mingguan (per karyawan & semua)
* Lock data setelah dibayar
* Riwayat mingguan
* PDF mingguan
* Offline-first + sync

### Out of Scope

* Multi role
* Slip gaji formal
* Attendance
* Notifikasi
* Print bluetooth
* Export Excel

---

## 4. Aturan Bisnis (WAJIB DIPATUHI)

* Minggu bersifat **fleksibel** (tidak fixed hari). Tetap gunakan `week_periods` sebagai agregasi.
* Satu karyawan **maksimal 1 gaji per hari**.
* Hari tanpa input = **belum dicatat** (bukan 0).
* Nominal **boleh 0**.
* Owner boleh edit **minggu berjalan saja**.
* Jika karyawan sudah dibayar pada minggu itu → **record karyawan minggu itu LOCKED**.
* Mendukung **undo pembayaran** oleh owner (perbaikan typo).
* Audit (created_by, updated_by) **WAJIB ADA**.

---

## 5. Offline-First (WAJIB)

### Prinsip

* Mobile adalah **first writer** saat offline.
* Local state **boleh override server** saat reconnect.
* User HARUS tahu status sync.

### Local DB

* Gunakan **Realm**.

### State per record

* pending
* synced
* failed
* conflict

### Konflik

* Prioritas: **local menang** (sesuai kebutuhan bisnis keluarga).
* Namun backend tetap validasi lock.

### UI status wajib ada:

* "Tersimpan di HP"
* "Belum terkirim"
* "Sinkron berhasil"
* "Terjadi masalah"

---

## 6. UI/UX Rules (STRICT)

* Bahasa: **100% Indonesia**
* DILARANG istilah teknis
* Layout:

  * tombol besar
  * font besar
  * minim teks
* 1 layar = 1 tujuan
* Istilah wajib:

  * Gaji Hari Ini
  * Sudah Dibayar
  * Riwayat Mingguan
  * Riwayat Bulan Ini
  * Gaji Dibayar

---

## 7. Arsitektur

### Backend (Laravel)

* API Only
* Auth: Sanctum
* Pattern: **Repository Pattern**
* Layer:

  * Controller → Service → Repository → Model
* DTO wajib untuk request/response

### Mobile (React Native)

* Expo
* Architecture: **MVVM**
* Struktur:

  * Screen
  * ViewModel
  * Components (terpisah)
  * Styles (terpisah)
  * Realm DB

---

## 8. Cara Kerja Agent (MANDATORY FLOW)

Agent TIDAK BOLEH langsung coding.

### Flow wajib:

1. Buat **Implementation Plan**
2. Tunggu approval
3. Revisi jika diminta
4. Implementasi
5. Testing manual (Postman / UI)
6. Daftar risiko
7. Dokumentasi

Jika melanggar flow ini → dianggap gagal.

---

## 9. Quality Bar

### Backend selesai jika:

* Endpoint berjalan
* Validasi lengkap
* Business rule aman
* Tidak ada query N+1
* Tidak ada query tidak perlu
* Sudah dites manual (Postman)
* Menyediakan step testing

### Mobile selesai jika:

* UI tampil
* Offline bekerja
* State lengkap:

  * loading
  * data
  * error
  * empty
* Sync berjalan

### Testing

* Manual checklist WAJIB

---

## 10. Larangan Keras

Agent DILARANG:

* Over-engineering
* Membuat abstraction tidak perlu
* Menggunakan float untuk uang
* Menaruh logic di controller
* Membuat UI kompleks
* Menggunakan istilah teknis di UI
* Query berat tanpa alasan

---

## 11. Prioritas Development

Urutan kerja:

1. Database
2. API
3. Mobile UI
4. Offline Sync
5. PDF

---

## 12. Prinsip Pengambilan Keputusan

Jika ragu:

* Pilih solusi paling **sederhana**
* Pilih solusi paling **cepat dipakai user**
* Hindari fleksibilitas berlebihan
* Utamakan **kejelasan dan stabilitas data**

---

## 13. Sikap Agent

Agent harus:

* Kritis
* Menantang asumsi
* Memberi trade-off
* Minim overengineering
* Fokus hasil nyata

---

## 14. Definition of Done (Global)

Fitur dianggap selesai jika:

* Bisa dipakai user tanpa bantuan
* Tidak melanggar aturan bisnis
* Tidak menyebabkan kehilangan data
* Offline & online sama-sama aman
* Sudah diverifikasi manual

---

## 15. Catatan Penting

Aplikasi ini **bukan software HR enterprise**.

Ini adalah:

> alat operasional sederhana untuk usaha keluarga

Jika desain mulai terasa seperti sistem perusahaan besar → berarti sudah salah arah.

---

## 16. Next Execution

Agent setelah membaca ini harus:

1. Breakdown task dari API Contract
2. Mulai dari AUTH endpoint
3. Kirim Implementation Plan
4. Tunggu approval

---

**End of AGENTS.md**
