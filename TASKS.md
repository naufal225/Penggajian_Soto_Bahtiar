# TASKS.md — Eksekusi Aplikasi Penggajian Soto Bahtiar

## 0. Instruksi Wajib untuk AI Agent

SEBELUM MEMULAI:

WAJIB membaca dan memahami:

* AGENTS.md
* API_CONTRACT.md
* PRD.md
* ERD.md
* CONTEXT.md
* Folder: UI_Frontend_Design

SETIAP PROGRESS:

* Update CONTEXT.md (apa yang sudah dikerjakan, keputusan penting, masalah)

FLOW KERJA WAJIB:

1. Buat Implementation Plan
2. Tunggu approval
3. Implementasi
4. Testing manual
5. Dokumentasi
6. Update CONTEXT.md
7. Dari folder PENGGAJIAN_SOTO_BAHTIAR lakukan commit dan push sesuai perubahan yang dilakukan

---

# 1. PRIORITAS GLOBAL

Urutan pengerjaan:

1. Database
2. Backend API
3. Frontend UI
4. Offline Sync
5. PDF Report

---

# 2. BACKEND TASKS (Laravel)

## 2.1 Setup Awal

* Setup Laravel API
* Setup Sanctum
* Setup struktur folder:

  * Controllers
  * Services
  * Repositories
  * DTO

---

## 2.2 Database (Migration + Model)

Implement berdasarkan ERD:

### Tables:

* users
* employees
* week_periods
* daily_wages
* weekly_payments

### WAJIB:

* unique(employee_id, wage_date)
* soft delete employees
* index untuk performa

---

## 2.3 Core Services

Buat service berikut:

* AuthService
* EmployeeService
* WeekPeriodService
* DailyWageService
* WeeklyPaymentService
* ReportService
* SyncService

---

## 2.4 AUTH API

* POST /auth/login
* POST /auth/logout
* GET /me

TEST:

* Login success
* Login error

---

## 2.5 EMPLOYEE API

Implement:

* GET /employees
* POST /employees
* GET /employees/{id}
* PUT /employees/{id}
* PATCH /employees/{id}/deactivate
* PATCH /employees/{id}/activate

TEST:

* CRUD lengkap
* soft delete

---

## 2.6 WEEK PERIOD API

Implement:

* GET /week-periods/current
* GET /week-periods
* GET /week-periods/{id}

LOGIC:

* auto generate week jika belum ada

---

## 2.7 DAILY WAGE API

Implement:

* GET /daily-wages?date=
* POST /daily-wages
* PUT /daily-wages/{id}
* GET /daily-wages/{id}

LOGIC WAJIB:

* tidak boleh duplicate
* tidak boleh edit jika sudah dibayar

---

## 2.8 WEEKLY PAYMENT API

Implement:

* POST /weekly-payments/employee
* POST /weekly-payments/all

LOGIC:

* mark daily_wages sebagai paid
* lock data

---

## 2.9 DASHBOARD API

Implement:

* GET /dashboard

OUTPUT WAJIB:

* total minggu
* jumlah karyawan
* status pembayaran

---

## 2.10 REPORT API

Implement:

* GET /reports/weekly-summary-pdf

OUTPUT:

* file_url

---

## 2.11 SYNC API

Implement:

* POST /sync/push
* GET /sync/pull

LOGIC:

* partial success
* conflict handling

---

## 2.12 VALIDASI & OPTIMASI

WAJIB:

* hindari N+1
* gunakan eager loading
* validasi semua input

---

# 3. FRONTEND TASKS (React Native Expo)

## 3.1 Setup Awal

* Setup Expo project
* Setup folder:

  * screens
  * components
  * viewmodels
  * services
  * realm

---

## 3.2 Implement Screen (Dari UI_Frontend_Design)

### AUTH

* Login Screen

### DASHBOARD

* Dashboard Screen

### GAJI

* Gaji Screen
* Modal Input Gaji

### KARYAWAN

* List Karyawan
* Tambah Karyawan
* Detail Karyawan
* Edit Karyawan

### LAINNYA

* Riwayat Gaji

---

## 3.3 API Integration

* Integrasi semua endpoint
* Handle error.code

---

## 3.4 STATE MANAGEMENT (MVVM)

Setiap screen:

* ViewModel
* Loading state
* Error state
* Data state

---

## 3.5 OFFLINE FIRST (REALM)

Implement:

* simpan data lokal
* queue perubahan
* sync saat online

State:

* pending
* synced
* failed
* conflict

---

## 3.6 SYNC ENGINE

* push perubahan ke backend
* pull data terbaru
* handle conflict

---

## 3.7 UI RULES

WAJIB:

* tidak ada text teknis
* font tidak terlalu besar
* tombol besar
* spacing rapi

---

# 4. INTEGRATION RULE

Jika frontend butuh data tapi API belum ada:

WAJIB:

1. Tambahkan di backend (service/controller)
2. Update API_CONTRACT.md
3. Update CONTEXT.md

Jika perubahan besar:

* buat migration baru
* buat service baru

---

# 5. TESTING CHECKLIST

## Backend

* Semua endpoint berjalan
* Validasi aman
* Data tidak corrupt

## Frontend

* Semua screen tampil
* Tidak crash
* Offline tetap jalan

## Sync

* Offline → online aman
* Tidak ada data hilang

---

# 6. DEFINITION OF DONE

Selesai jika:

* Semua fitur berjalan
* Offline-first stabil
* Tidak ada data hilang
* UI usable untuk orang tua
* Sudah dites manual

---

# 7. UPDATE CONTEXT

Setiap selesai task:

Tambahkan ke CONTEXT.md:

* Task selesai
* Masalah ditemukan
* Solusi
* Keputusan penting

---

# END
