# Product Requirements Document (PRD)

## Aplikasi Pencatatan Gaji Karyawan

## 1. Ringkasan Produk

Aplikasi ini adalah sistem pencatatan gaji harian sederhana untuk Warung Soto Seger Boyolali Bumi Sani Permai. Saat ini proses penggajian dilakukan manual di buku tulis. Nominal gaji karyawan ditentukan per hari dan nilainya tidak tetap, tergantung kondisi operasional warung. Pembayaran dilakukan setiap akhir minggu.

Aplikasi akan membantu owner untuk:

* menambahkan dan mengelola data karyawan,
* mencatat nominal gaji harian tiap karyawan,
* mengedit data gaji selama minggu berjalan,
* menandai gaji sudah dibayar di akhir minggu,
* mengunci data minggu yang sudah dibayar,
* mengekspor rekap pencatatan dan pembayaran gaji ke PDF.

Aplikasi dibangun dengan:

* **Backend:** Laravel
* **Mobile App:** React Native
* **Mode Operasi:** Offline-first dengan sinkronisasi ke server saat online

---

## 2. Latar Belakang Masalah

Proses saat ini masih manual menggunakan buku tulis. Dampaknya:

* rawan salah catat,
* sulit mengoreksi data dengan rapi,
* sulit melihat total gaji mingguan per karyawan,
* histori pembayaran tidak terstruktur,
* rekap PDF tidak tersedia,
* jika buku hilang/rusak, data berisiko hilang.

Kebutuhan bisnis sebenarnya sederhana: owner ingin cara yang cepat, mudah, fleksibel, dan tidak bikin ribet untuk mencatat gaji harian dan pembayaran mingguan.

---

## 3. Tujuan Produk

### 3.1 Tujuan Utama

Menyediakan aplikasi mobile yang intuitif dan cepat dipakai owner untuk mencatat, mengoreksi, membayar, dan merekap gaji harian karyawan secara mingguan.

### 3.2 Tujuan Bisnis

* Menggantikan pencatatan manual di buku tulis
* Mengurangi human error pencatatan
* Memudahkan rekap dan histori pembayaran
* Menyediakan bukti/arsip pembayaran dalam bentuk PDF
* Tetap bisa digunakan walau koneksi internet tidak stabil

### 3.3 Tujuan Pengalaman Pengguna

* Owner bisa input gaji harian dalam waktu singkat
* Owner tidak perlu memahami istilah teknis
* Owner tetap bisa bekerja saat offline
* Tampilan sederhana, tombol besar, alur jelas, minim langkah

---

## 4. Ruang Lingkup Produk

### 4.1 In Scope (Masuk MVP)

* Login owner
* CRUD karyawan (tambah, lihat, edit, nonaktifkan)
* Input gaji harian per karyawan
* Edit gaji harian selama minggu berjalan dan belum dibayar
* Lihat ringkasan gaji minggu berjalan
* Pembayaran gaji mingguan per karyawan atau semua karyawan
* Lock data yang sudah dibayar
* Riwayat pembayaran mingguan
* Export PDF ringkasan minggu
* Offline-first pada mobile app
* Sinkronisasi data lokal ke server saat online

### 4.2 Out of Scope (Belum Masuk)

* Multi role user
* Approval workflow
* Integrasi absensi otomatis
* Perhitungan tunjangan/potongan kompleks
* Slip gaji formal per karyawan
* Integrasi printer thermal/bluetooth
* Multi-owner collaborative editing kompleks
* Notifikasi push

---

## 5. Profil Pengguna

## 5.1 Primary User

**Owner warung / ibu rumah tangga usia 53 tahun**

Karakteristik:

* Sibuk menjalankan operasional warung
* Tidak ingin proses panjang dan rumit
* Tidak nyaman dengan UI yang terlalu padat atau banyak istilah teknis
* Lebih cocok dengan alur yang mirip kebiasaan pencatatan manual
* Butuh kecepatan dan kejelasan

### 5.2 Implikasi ke Desain

* Gunakan bahasa sederhana dan operasional
* Hindari istilah teknis internal sistem
* Tombol besar dan jelas
* Setiap layar punya satu tujuan utama
* Minim input yang tidak perlu
* Error message harus mudah dipahami

---

## 6. Problem Statement

Bagaimana membuat aplikasi mobile pencatatan gaji harian yang:

1. mudah dipakai owner non-teknis,
2. fleksibel untuk edit selama minggu berjalan,
3. aman agar data minggu yang sudah dibayar tidak bisa diubah,
4. tetap bisa dipakai tanpa internet,
5. dapat menghasilkan rekap PDF untuk arsip?

---

## 7. Asumsi dan Aturan Bisnis

1. Sistem hanya memiliki **1 role**, yaitu owner.
2. Gaji ditetapkan **per hari** dan nominalnya **tidak tetap**.
3. Satu karyawan hanya boleh memiliki **1 catatan gaji per tanggal**.
4. Pembayaran dilakukan **per minggu**.
5. Owner boleh mengedit gaji hari ini dan hari-hari sebelumnya selama:

   * masih dalam minggu yang belum dibayar, dan
   * data karyawan/minggu tersebut belum ditandai dibayar.
6. Data yang sudah dibayar **tidak bisa diedit**.
7. Pembayaran bisa dilakukan:

   * per karyawan untuk satu minggu, atau
   * semua karyawan sekaligus untuk satu minggu.
8. Aplikasi mobile harus tetap bisa dipakai saat offline.
9. Saat online, data lokal harus disinkronkan ke server.
10. Server adalah sumber kebenaran utama untuk status final pembayaran dan lock data.

---

## 8. User Flow Utama

### 8.1 Setup Awal

1. Owner login
2. Owner menambahkan data karyawan

### 8.2 Operasional Harian

1. Owner membuka halaman “Gaji Hari Ini”
2. Owner melihat daftar karyawan aktif
3. Owner mengisi nominal gaji hari ini untuk masing-masing karyawan
4. Sistem menyimpan data (online ke server / offline ke local DB)

### 8.3 Koreksi Data

1. Owner membuka tanggal tertentu dalam minggu berjalan
2. Owner mengubah nominal gaji karyawan
3. Sistem memvalidasi bahwa data belum dibayar
4. Jika belum dibayar, perubahan disimpan

### 8.4 Pembayaran Mingguan

1. Owner membuka halaman “Pembayaran Minggu Ini”
2. Owner melihat total gaji masing-masing karyawan
3. Owner menandai “Sudah Dibayar” per karyawan atau semua
4. Sistem mengunci record terkait
5. Sistem memperbarui status minggu

### 8.5 Riwayat dan PDF

1. Owner membuka riwayat minggu sebelumnya
2. Owner memilih minggu tertentu
3. Owner melihat detail ringkasan
4. Owner mengekspor file PDF

---

## 9. Daftar Halaman dan Kebutuhan UI/UX

## 9.1 Login

### Tujuan

Masuk ke aplikasi.

### Komponen

* Logo/nama aplikasi
* Input username/email/nomor HP
* Input password
* Tombol “Masuk”
* Checkbox “Ingat saya” (opsional)

### UX Notes

* Satu CTA utama
* Error message sederhana: “Password salah”

## 9.2 Dashboard / Beranda

### Tujuan

Memberi orientasi cepat dan akses ke aksi utama.

### Komponen

* Tanggal hari ini
* Status sinkronisasi
* Tombol besar:

  * Gaji Hari Ini
  * Pembayaran Minggu Ini
  * Data Karyawan
* Ringkasan kecil:

  * jumlah karyawan aktif
  * total sementara minggu ini
  * jumlah data belum tersinkron

### UX Notes

* Jangan pakai chart yang tidak perlu
* Fokus ke “apa yang harus dilakukan sekarang”

## 9.3 Data Karyawan

### Tujuan

Kelola data karyawan.

### Komponen

* List karyawan
* Tombol Tambah Karyawan
* Edit karyawan
* Nonaktifkan karyawan

### Field Karyawan

* Nama
* Nomor HP (opsional)
* Catatan (opsional)
* Status aktif/nonaktif

## 9.4 Gaji Hari Ini / Input Gaji Harian

### Tujuan

Input cepat nominal gaji harian semua karyawan.

### Komponen

* Pilih tanggal (default: hari ini)
* Daftar karyawan aktif
* Input nominal per karyawan
* Tombol nominal cepat (opsional): 50000, 70000, 100000, custom
* Status tiap item:

  * belum diisi
  * tersimpan
  * disimpan offline
  * gagal sync

### UX Notes

* Ini layar paling penting
* Hindari banyak pindah halaman
* Gunakan card/list langsung untuk semua karyawan
* Tampilkan jika tanggal sudah terkunci

## 9.5 Edit Gaji Harian

### Tujuan

Koreksi nominal untuk hari tertentu.

### Komponen

* Nama karyawan
* Tanggal
* Nominal
* Catatan opsional
* Status lock / editable

## 9.6 Pembayaran Mingguan

### Tujuan

Review dan finalisasi pembayaran minggu berjalan.

### Komponen

* Rentang minggu
* Status minggu
* Daftar karyawan:

  * nama
  * total minggu ini
  * jumlah hari terisi
  * status pembayaran
  * tombol “Sudah Dibayar”
* Tombol “Bayar Semua”
* Tombol “Export PDF”

### UX Notes

* Harus sangat jelas mana yang sudah dibayar dan belum
* Setelah dibayar, tombol edit hilang/disable

## 9.7 Riwayat Mingguan

### Tujuan

Lihat histori pencatatan dan pembayaran.

### Komponen

* Daftar minggu sebelumnya
* Total pembayaran
* Jumlah karyawan
* Status lunas / sebagian / belum lunas
* Tombol detail
* Tombol export PDF

## 9.8 Status Sinkronisasi (Opsional tapi Direkomendasikan)

### Tujuan

Menjelaskan kondisi offline-first secara sederhana.

### Komponen

* Status koneksi
* Data belum terkirim
* Waktu sync terakhir
* Tombol “Sinkronkan Sekarang”
* List error sync jika ada

---

## 10. Functional Requirements

## 10.1 Authentication

* Owner dapat login menggunakan kredensial terdaftar
* Owner dapat logout
* Session login tersimpan aman di perangkat

## 10.2 Employee Management

* Owner dapat menambahkan karyawan
* Owner dapat melihat daftar karyawan
* Owner dapat mengubah data karyawan
* Owner dapat menonaktifkan karyawan
* Karyawan nonaktif tidak muncul di input gaji baru
* Riwayat karyawan nonaktif tetap tersedia

## 10.3 Daily Wage Recording

* Owner dapat membuat catatan gaji harian untuk karyawan
* Sistem memastikan satu karyawan hanya memiliki satu catatan per tanggal
* Owner dapat mengedit catatan gaji yang belum dibayar
* Owner tidak dapat mengedit catatan gaji yang sudah dibayar
* Owner dapat melihat daftar catatan berdasarkan tanggal / minggu

## 10.4 Weekly Payment

* Sistem menampilkan total gaji mingguan per karyawan
* Owner dapat menandai gaji mingguan seorang karyawan sebagai sudah dibayar
* Owner dapat menandai semua karyawan dalam minggu tertentu sebagai sudah dibayar
* Saat dibayar, sistem mengunci catatan terkait
* Sistem mengubah status minggu menjadi:

  * open
  * partial_paid
  * fully_paid

## 10.5 History & Reporting

* Owner dapat melihat riwayat mingguan
* Owner dapat membuka detail minggu tertentu
* Owner dapat mengekspor rekap mingguan ke PDF

## 10.6 Offline-first & Synchronization

* Saat offline, input disimpan ke database lokal mobile
* Setiap perubahan lokal masuk ke antrian sinkronisasi
* Saat online, aplikasi otomatis / manual mengirim data ke server
* Jika sinkronisasi gagal, status ditandai dan bisa dicoba ulang
* Jika server menolak perubahan karena data sudah terkunci, aplikasi menampilkan konflik dengan jelas

---

## 11. Non-Functional Requirements

## 11.1 Usability

* UI harus bisa dipahami tanpa training panjang
* Aksi utama dapat dicapai dalam maksimal 1–2 tap dari dashboard
* Form pendek dan fokus

## 11.2 Performance

* Dashboard dan halaman input gaji harus terbuka cepat
* Input harian harus terasa ringan walau banyak karyawan
* Sinkronisasi dilakukan efisien dan tidak mengganggu input user

## 11.3 Reliability

* Data offline tidak boleh hilang saat aplikasi ditutup
* Retry sync harus tersedia
* Sistem harus mencegah duplikasi data

## 11.4 Security

* Login wajib untuk akses data
* Password disimpan secara aman di server
* Token/session mobile disimpan aman
* API harus memvalidasi otorisasi

## 11.5 Data Integrity

* Data yang sudah dibayar harus terkunci
* Satu karyawan satu catatan per tanggal
* Server harus menolak edit data locked

---

## 12. Detail Offline-first

## 12.1 Prinsip

* Mobile menyimpan data ke local database terlebih dahulu
* Server menjadi source of truth untuk final status payment/lock

## 12.2 Data yang Disimpan Lokal

* session login
* daftar karyawan
* week periods
* daily wages
* payment status
* sync queue

## 12.3 Strategi Sinkronisasi

* Create/update disimpan lokal dengan status pending
* Saat online, app memproses queue
* Jika berhasil, status synced
* Jika gagal, status failed dan bisa retry

## 12.4 Konflik Data

Jika device offline mengedit data yang ternyata sudah dibayar di server:

* server menolak perubahan,
* app menandai item konflik,
* user diberi pesan bahwa data tidak bisa diubah karena sudah dibayar.

## 12.5 Idempotency

Untuk mencegah duplikasi create saat retry, mobile disarankan mengirim **client UUID** untuk record baru.

---

## 13. Data Model / Skema Database

## 13.1 users

* id
* name
* email
* password
* created_at
* updated_at

## 13.2 employees

* id
* name
* phone_number nullable
* notes nullable
* is_active boolean
* created_by_user_id
* created_at
* updated_at
* deleted_at nullable

## 13.3 week_periods

* id
* start_date
* end_date
* status enum(open, partial_paid, fully_paid)
* locked_at nullable
* created_at
* updated_at

## 13.4 daily_wages

* id
* employee_id
* week_period_id
* wage_date
* amount
* notes nullable
* is_paid boolean
* paid_at nullable
* paid_weekly_payment_id nullable
* created_by_user_id
* updated_by_user_id nullable
* client_uuid nullable unique
* created_at
* updated_at

### Constraint

* unique(employee_id, wage_date)

## 13.5 weekly_payments

* id
* week_period_id
* employee_id nullable
* payment_scope enum(employee, all)
* total_amount
* paid_at
* created_by_user_id
* notes nullable
* created_at
* updated_at

## 13.6 mobile_sync_histories (opsional)

* id
* device_id
* action_type
* entity_type
* entity_local_id nullable
* entity_server_id nullable
* sync_status enum(success, failed)
* error_message nullable
* synced_at nullable
* created_at

---

## 14. API Scope Tingkat Tinggi

### Authentication

* POST /api/login
* POST /api/logout

### Employees

* GET /api/employees
* POST /api/employees
* PUT /api/employees/{id}
* PATCH /api/employees/{id}/deactivate

### Week Periods

* GET /api/week-periods/current
* GET /api/week-periods
* GET /api/week-periods/{id}

### Daily Wages

* GET /api/daily-wages?date=&week_id=
* POST /api/daily-wages
* PUT /api/daily-wages/{id}
* GET /api/daily-wages/history

### Weekly Payments

* POST /api/weekly-payments/employee
* POST /api/weekly-payments/all
* GET /api/weekly-payments?week_id=

### Sync

* POST /api/mobile-sync/push (opsional fase lanjutan)
* GET /api/mobile-sync/pull?updated_since=... (opsional fase lanjutan)

---

## 15. Validasi dan Business Rules Teknis

1. Tidak boleh membuat daily wage untuk employee yang tidak ada.
2. Tidak boleh membuat 2 daily wage untuk employee dan tanggal yang sama.
3. Tidak boleh edit daily wage yang sudah dibayar.
4. Tidak boleh edit data pada minggu yang fully_paid.
5. Jika employee sudah dibayar untuk minggu itu, record daily wage employee tersebut pada minggu tersebut harus locked.
6. Karyawan nonaktif tidak boleh dipakai untuk input baru.
7. Export PDF hanya untuk minggu yang valid dan tersedia.
8. Saat sync, server harus memvalidasi lock status sebelum menerima update.

---

## 16. Metrik Keberhasilan

### Product Success Metrics

* Waktu input gaji harian lebih cepat dibanding buku tulis
* Tidak ada duplikasi catatan gaji per hari
* Owner dapat menyelesaikan pembayaran mingguan tanpa bantuan teknis
* Data tetap aman saat offline lalu tersinkron saat online
* Rekap PDF dapat dihasilkan dengan benar

### Operational Metrics

* Jumlah sync gagal rendah
* Konflik data jarang terjadi
* Error edit data locked dapat ditangani dengan jelas

---

## 17. Risiko dan Mitigasi

## Risiko 1: Offline-first membuat konflik data

**Mitigasi:** server menjadi sumber kebenaran untuk lock; tampilkan konflik secara eksplisit di mobile.

## Risiko 2: UI terlalu rumit untuk owner

**Mitigasi:** fokus ke tombol besar, bahasa sederhana, satu layar satu tujuan.

## Risiko 3: Flow pembayaran ambigu

**Mitigasi:** tetapkan aturan jelas bahwa pembayaran bisa per employee per week atau semua employee per week, dan lock mengikuti pembayaran tersebut.

## Risiko 4: Retry sync membuat data ganda

**Mitigasi:** gunakan client UUID dan idempotent handling di backend.

## Risiko 5: PDF offline tidak konsisten dengan server

**Mitigasi:** prioritaskan PDF server-generated saat online; jika offline nanti didukung, tandai sebagai draft.

---

## 18. Roadmap Implementasi yang Direkomendasikan

## Fase 1 — Pondasi Backend

* migration database
* model dan relasi
* business rule lock & payment
* CRUD employees
* CRUD daily wages
* weekly payment logic
* server PDF export

## Fase 2 — Mobile Online Core Flow

* login
* dashboard
* data karyawan
* input gaji harian
* pembayaran mingguan
* riwayat minggu
* export PDF online

## Fase 3 — Offline-first

* local database SQLite
* sync queue
* pending sync status
* retry mechanism
* last sync status

## Fase 4 — Hardening

* conflict handling
* idempotency via client UUID
* sync performance improvement
* UX polish untuk user non-teknis

---

## 19. Keputusan Produk yang Direkomendasikan

1. **Jangan bikin payroll kompleks.** Fokus pada pencatatan gaji harian + pembayaran mingguan.
2. **Jangan langsung over-engineer sync.** Matangkan flow bisnis dulu, lalu tambahkan offline-first dengan benar.
3. **Dashboard harus berfungsi sebagai pusat aksi, bukan pusat analitik.**
4. **Locking harus dipaksa di backend, bukan hanya di UI.**
5. **Desain harus mengikuti kebiasaan buku tulis, bukan memaksa user belajar sistem kantor besar.**

---

## 20. Ringkasan Eksekutif

Aplikasi ini adalah sistem pencatatan gaji harian sederhana yang dirancang untuk owner warung yang sibuk dan non-teknis. Fokus utamanya adalah kemudahan input, fleksibilitas edit selama minggu berjalan, kepastian lock setelah pembayaran, dan kemampuan tetap beroperasi saat offline. Keberhasilan produk ditentukan bukan oleh kompleksitas fitur, tetapi oleh seberapa cepat, aman, dan intuitif aplikasi ini mendukung operasional penggajian mingguan di dunia nyata.
