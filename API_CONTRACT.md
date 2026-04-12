# API Contract — Aplikasi Pencatatan Gaji Karyawan

## 1. Tujuan Dokumen

Dokumen ini mendefinisikan kontrak API backend untuk aplikasi pencatatan gaji karyawan agar:

* AI Agent backend tahu endpoint apa yang harus dibangun,
* AI Agent mobile/UI bisa mengerjakan layar dan state management secara paralel,
* struktur request/response konsisten,
* business rule penting tidak tercecer.

Dokumen ini sengaja dibuat **operasional**, bukan sekadar daftar endpoint mentah. Fokusnya adalah sinkronisasi kerja antar agent dan mengurangi miskomunikasi antar backend dan UI.

---

## 2. Prinsip Desain API

## 2.1. Prinsip umum

* Backend adalah **source of truth** final untuk payment dan locking.
* Mobile boleh menyimpan data offline, tapi saat sinkronisasi server berhak menolak perubahan yang melanggar business rule.
* Semua response memakai wrapper yang konsisten.
* Semua error penting harus punya `code` yang stabil agar UI bisa menangani state dengan benar.
* Format tanggal memakai ISO 8601 bila datetime, dan `YYYY-MM-DD` untuk tanggal bisnis.
* Monetary amount dikirim sebagai **integer dalam rupiah**, bukan float, untuk menghindari bug pembulatan.

### Contoh

* `70000` berarti Rp70.000
* bukan `70000.50`

---

## 2.2. Base URL

```txt
/api/mobile
```

---

## 2.3. Authentication

Gunakan bearer token.

```http
Authorization: Bearer {token}
```

---

## 2.4. Response envelope standar

### Success response

```json
{
  "success": true,
  "message": "Data berhasil diambil",
  "data": {},
  "meta": null
}
```

### Error response

```json
{
  "success": false,
  "message": "Data tidak dapat diubah karena sudah dibayar",
  "error": {
    "code": "DAILY_WAGE_LOCKED",
    "details": null,
    "fields": null
  }
}
```

---

## 2.5. Pagination format

```json
{
  "success": true,
  "message": "Data berhasil diambil",
  "data": [ ... ],
  "meta": {
    "current_page": 1,
    "per_page": 10,
    "total": 32,
    "last_page": 4
  }
}
```

---

## 3. Error Codes yang Harus Stabil

UI agent harus mengandalkan `error.code`, bukan parsing message bebas.

| Code                      | Makna                                                          |
| ------------------------- | -------------------------------------------------------------- |
| UNAUTHORIZED              | Token tidak valid / belum login                                |
| VALIDATION_ERROR          | Request tidak valid                                            |
| EMPLOYEE_NOT_FOUND        | Karyawan tidak ditemukan                                       |
| EMPLOYEE_INACTIVE         | Karyawan nonaktif                                              |
| WEEK_PERIOD_NOT_FOUND     | Minggu tidak ditemukan                                         |
| DAILY_WAGE_NOT_FOUND      | Catatan gaji harian tidak ditemukan                            |
| DAILY_WAGE_DUPLICATE      | Sudah ada gaji untuk employee dan tanggal itu                  |
| DAILY_WAGE_LOCKED         | Catatan gaji tidak bisa diubah karena sudah dibayar / terkunci |
| WEEK_ALREADY_FULLY_PAID   | Minggu sudah fully paid                                        |
| PAYMENT_ALREADY_COMPLETED | Pembayaran sudah pernah dilakukan                              |
| SYNC_CONFLICT             | Data lokal bentrok dengan status terbaru di server             |
| FORBIDDEN_ACTION          | Aksi tidak diizinkan                                           |
| INTERNAL_SERVER_ERROR     | Error tak terduga                                              |

---

## 4. Resource Utama

Resource inti yang harus di-cover API:

* auth
* me/session
* dashboard
* employees
* week-periods
* daily-wages
* weekly-payments
* reports
* sync

---

# 5. AUTH API

## 5.1. Login

### Endpoint

```http
POST /api/mobile/auth/login
```

### Request

```json
{
  "email": "owner@warungsoto.com",
  "password": "secret123",
  "device_name": "redmi-note-owner"
}
```

### Validation

* `email`: required, email
* `password`: required, string
* `device_name`: required, string

### Success Response

```json
{
  "success": true,
  "message": "Login berhasil",
  "data": {
    "token": "plain-text-token-or-sanctum-token",
    "user": {
      "id": 1,
      "name": "Owner Soto",
      "email": "owner@warungsoto.com"
    }
  },
  "meta": null
}
```

### Error Response

```json
{
  "success": false,
  "message": "Email atau password salah",
  "error": {
    "code": "UNAUTHORIZED",
    "details": null,
    "fields": null
  }
}
```

---

## 5.2. Logout

### Endpoint

```http
POST /api/mobile/auth/logout
```

### Headers

* Authorization Bearer Token

### Success Response

```json
{
  "success": true,
  "message": "Logout berhasil",
  "data": null,
  "meta": null
}
```

---

## 5.3. Get Current User

### Endpoint

```http
GET /api/mobile/me
```

### Success Response

```json
{
  "success": true,
  "message": "Profil user berhasil diambil",
  "data": {
    "id": 1,
    "name": "Owner Soto",
    "email": "owner@warungsoto.com"
  },
  "meta": null
}
```

---

# 6. DASHBOARD API

## 6.1. Dashboard Summary

Endpoint ini untuk kebutuhan layar beranda. Jangan paksa UI memanggil banyak endpoint kecil hanya untuk dashboard.

### Endpoint

```http
GET /api/mobile/dashboard
```

### Success Response

```json
{
  "success": true,
  "message": "Dashboard berhasil diambil",
  "data": {
    "today_date": "2026-04-12",
    "owner_name": "Pak Bahtiar",
    "active_employee_count": 6,
    "today_filled_count": 4,
    "today_unfilled_count": 2,
    "current_week": {
      "id": 3,
      "start_date": "2026-04-06",
      "end_date": "2026-04-12",
      "status": "partial_paid",
      "is_locked": false,
      "total_amount": 2140000,
      "paid_employee_count": 2,
      "unpaid_employee_count": 4
    },
    "sync_info": {
      "server_time": "2026-04-12T08:10:00Z",
      "recommended_pull_after": true
    },
    "quick_actions": {
      "can_input_today_wage": true,
      "can_process_payment": true,
      "can_export_current_week_pdf": true
    }
  },
  "meta": null
}
```

`owner_name` dipakai untuk sapaan di beranda. Jika modul gaji/pembayaran belum aktif penuh, nilai summary terkait (`total_amount`, `paid_employee_count`, `today_filled_count`) boleh `0` namun shape response harus tetap sama.

---

# 7. EMPLOYEES API

## 7.1. List Employees

### Endpoint

```http
GET /api/mobile/employees
```

### Query Params

* `status=active|inactive|all` default `active`
* `page=1`
* `per_page=20`
* `search=asep`

### Example

```http
GET /api/mobile/employees?status=active&search=bud&page=1&per_page=20
```

### Success Response

```json
{
  "success": true,
  "message": "Daftar karyawan berhasil diambil",
  "data": [
    {
      "id": 1,
      "name": "Budi",
      "phone_number": "08123456789",
      "notes": null,
      "is_active": true,
      "created_at": "2026-04-01T10:00:00Z",
      "updated_at": "2026-04-01T10:00:00Z"
    }
  ],
  "meta": {
    "current_page": 1,
    "per_page": 20,
    "total": 1,
    "last_page": 1
  }
}
```

---

## 7.2. Create Employee

### Endpoint

```http
POST /api/mobile/employees
```

### Request

```json
{
  "name": "Asep",
  "phone_number": "081298765432",
  "notes": "Shift pagi"
}
```

### Validation

* `name`: required, string, max:255
* `phone_number`: nullable, string, max:30
* `notes`: nullable, string

### Success Response

```json
{
  "success": true,
  "message": "Karyawan berhasil ditambahkan",
  "data": {
    "id": 7,
    "name": "Asep",
    "phone_number": "081298765432",
    "notes": "Shift pagi",
    "is_active": true,
    "created_at": "2026-04-12T08:20:00Z",
    "updated_at": "2026-04-12T08:20:00Z"
  },
  "meta": null
}
```

---

## 7.3. Get Employee Detail

### Endpoint

```http
GET /api/mobile/employees/{employeeId}
```

### Success Response

```json
{
  "success": true,
  "message": "Detail karyawan berhasil diambil",
  "data": {
    "id": 1,
    "name": "Budi",
    "phone_number": "08123456789",
    "notes": null,
    "is_active": true,
    "created_at": "2026-04-01T10:00:00Z",
    "updated_at": "2026-04-01T10:00:00Z"
  },
  "meta": null
}
```

---

## 7.4. Update Employee

### Endpoint

```http
PUT /api/mobile/employees/{employeeId}
```

### Request

```json
{
  "name": "Budi Santoso",
  "phone_number": "08123456789",
  "notes": "Sering shift malam"
}
```

### Success Response

```json
{
  "success": true,
  "message": "Data karyawan berhasil diperbarui",
  "data": {
    "id": 1,
    "name": "Budi Santoso",
    "phone_number": "08123456789",
    "notes": "Sering shift malam",
    "is_active": true,
    "created_at": "2026-04-01T10:00:00Z",
    "updated_at": "2026-04-12T08:25:00Z"
  },
  "meta": null
}
```

---

## 7.5. Deactivate Employee

### Endpoint

```http
PATCH /api/mobile/employees/{employeeId}/deactivate
```

### Request

Tidak ada body.

### Success Response

```json
{
  "success": true,
  "message": "Karyawan berhasil dinonaktifkan",
  "data": {
    "id": 1,
    "is_active": false
  },
  "meta": null
}
```

---

## 7.6. Activate Employee

### Endpoint

```http
PATCH /api/mobile/employees/{employeeId}/activate
```

### Success Response

```json
{
  "success": true,
  "message": "Karyawan berhasil diaktifkan",
  "data": {
    "id": 1,
    "is_active": true
  },
  "meta": null
}
```

---

# 8. WEEK PERIODS API

## 8.1. Get Current Week

### Endpoint

```http
GET /api/mobile/week-periods/current
```

### Success Response

```json
{
  "success": true,
  "message": "Minggu berjalan berhasil diambil",
  "data": {
    "id": 3,
    "start_date": "2026-04-06",
    "end_date": "2026-04-12",
    "status": "open",
    "is_locked": false,
    "locked_at": null,
    "summary": {
      "employee_count": 6,
      "filled_wage_count": 21,
      "total_amount": 2140000,
      "paid_employee_count": 0,
      "unpaid_employee_count": 6
    }
  },
  "meta": null
}
```

---

## 8.2. List Week Periods / History

### Endpoint

```http
GET /api/mobile/week-periods
```

### Query Params

* `page=1`
* `per_page=10`
* `status=open|partial_paid|fully_paid`

### Success Response

```json
{
  "success": true,
  "message": "Riwayat minggu berhasil diambil",
  "data": [
    {
      "id": 3,
      "start_date": "2026-04-06",
      "end_date": "2026-04-12",
      "status": "partial_paid",
      "is_locked": false,
      "locked_at": null,
      "summary": {
        "employee_count": 6,
        "total_amount": 2140000,
        "paid_employee_count": 2,
        "unpaid_employee_count": 4
      }
    }
  ],
  "meta": {
    "current_page": 1,
    "per_page": 10,
    "total": 1,
    "last_page": 1
  }
}
```

---

## 8.3. Week Detail

Ini endpoint penting untuk halaman detail minggu dan review pembayaran.

### Endpoint

```http
GET /api/mobile/week-periods/{weekPeriodId}
```

### Success Response

```json
{
  "success": true,
  "message": "Detail minggu berhasil diambil",
  "data": {
    "id": 3,
    "start_date": "2026-04-06",
    "end_date": "2026-04-12",
    "status": "partial_paid",
    "is_locked": false,
    "locked_at": null,
    "summary": {
      "employee_count": 6,
      "filled_wage_count": 21,
      "total_amount": 2140000,
      "paid_employee_count": 2,
      "unpaid_employee_count": 4
    },
    "employees": [
      {
        "employee_id": 1,
        "employee_name": "Budi",
        "total_amount": 420000,
        "filled_days": 6,
        "payment_status": "paid",
        "paid_at": "2026-04-12T07:00:00Z",
        "is_locked": true
      },
      {
        "employee_id": 2,
        "employee_name": "Asep",
        "total_amount": 380000,
        "filled_days": 5,
        "payment_status": "unpaid",
        "paid_at": null,
        "is_locked": false
      }
    ]
  },
  "meta": null
}
```

---

# 9. DAILY WAGES API

## 9.1. Get Daily Wages by Date

Endpoint ini dipakai layar “Gaji Hari Ini” atau edit per tanggal.

### Endpoint

```http
GET /api/mobile/daily-wages
```

### Query Params

* `date=2026-04-12` required

### Success Response

```json
{
  "success": true,
  "message": "Data gaji harian berhasil diambil",
  "data": {
    "date": "2026-04-12",
    "week_period": {
      "id": 3,
      "start_date": "2026-04-06",
      "end_date": "2026-04-12",
      "status": "open",
      "is_locked": false
    },
    "employees": [
      {
        "employee_id": 1,
        "employee_name": "Budi",
        "daily_wage": {
          "id": 11,
          "amount": 70000,
          "notes": null,
          "is_paid": false,
          "is_locked": false,
          "wage_date": "2026-04-12",
          "updated_at": "2026-04-12T08:15:00Z"
        }
      },
      {
        "employee_id": 2,
        "employee_name": "Asep",
        "daily_wage": null
      }
    ]
  },
  "meta": null
}
```

### Kenapa bentuk response seperti ini?

Supaya UI langsung bisa render semua karyawan aktif, termasuk yang belum punya input hari itu. Jangan bikin UI harus merge manual antara employee list dan wage list kalau bisa backend bantu bentukin data.

---

## 9.2. Create Daily Wage

### Endpoint

```http
POST /api/mobile/daily-wages
```

### Request

```json
{
  "employee_id": 2,
  "wage_date": "2026-04-12",
  "amount": 80000,
  "notes": "Ramai hari Minggu",
  "client_uuid": "4cb7f1f8-4d26-4ad0-9636-3c377d62d011"
}
```

### Validation

* `employee_id`: required, exists:employees,id
* `wage_date`: required, date format Y-m-d
* `amount`: required, integer, min:0
* `notes`: nullable, string
* `client_uuid`: nullable, uuid

### Success Response

```json
{
  "success": true,
  "message": "Gaji harian berhasil disimpan",
  "data": {
    "id": 12,
    "employee_id": 2,
    "employee_name": "Asep",
    "week_period_id": 3,
    "wage_date": "2026-04-12",
    "amount": 80000,
    "notes": "Ramai hari Minggu",
    "is_paid": false,
    "is_locked": false,
    "paid_at": null,
    "client_uuid": "4cb7f1f8-4d26-4ad0-9636-3c377d62d011",
    "created_at": "2026-04-12T08:30:00Z",
    "updated_at": "2026-04-12T08:30:00Z"
  },
  "meta": null
}
```

### Error Response — duplicate

```json
{
  "success": false,
  "message": "Gaji harian untuk karyawan dan tanggal tersebut sudah ada",
  "error": {
    "code": "DAILY_WAGE_DUPLICATE",
    "details": null,
    "fields": {
      "employee_id": ["sudah memiliki gaji pada tanggal tersebut"],
      "wage_date": ["sudah digunakan"]
    }
  }
}
```

---

## 9.3. Update Daily Wage

### Endpoint

```http
PUT /api/mobile/daily-wages/{dailyWageId}
```

### Request

```json
{
  "amount": 85000,
  "notes": "Koreksi nominal"
}
```

### Success Response

```json
{
  "success": true,
  "message": "Gaji harian berhasil diperbarui",
  "data": {
    "id": 12,
    "employee_id": 2,
    "employee_name": "Asep",
    "week_period_id": 3,
    "wage_date": "2026-04-12",
    "amount": 85000,
    "notes": "Koreksi nominal",
    "is_paid": false,
    "is_locked": false,
    "paid_at": null,
    "updated_at": "2026-04-12T08:45:00Z"
  },
  "meta": null
}
```

### Error Response — locked

```json
{
  "success": false,
  "message": "Gaji harian tidak dapat diubah karena sudah dibayar",
  "error": {
    "code": "DAILY_WAGE_LOCKED",
    "details": {
      "week_period_id": 2,
      "paid_at": "2026-04-05T12:00:00Z"
    },
    "fields": null
  }
}
```

---

## 9.4. Get Daily Wage Detail

### Endpoint

```http
GET /api/mobile/daily-wages/{dailyWageId}
```

### Success Response

```json
{
  "success": true,
  "message": "Detail gaji harian berhasil diambil",
  "data": {
    "id": 12,
    "employee_id": 2,
    "employee_name": "Asep",
    "week_period_id": 3,
    "wage_date": "2026-04-12",
    "amount": 85000,
    "notes": "Koreksi nominal",
    "is_paid": false,
    "is_locked": false,
    "paid_at": null,
    "created_at": "2026-04-12T08:30:00Z",
    "updated_at": "2026-04-12T08:45:00Z"
  },
  "meta": null
}
```

---

## 9.5. Daily Wage History

Untuk layar histori / pencarian catatan.

### Endpoint

```http
GET /api/mobile/daily-wages/history
```

### Query Params

* `employee_id` optional
* `start_date` optional
* `end_date` optional
* `week_period_id` optional
* `page=1`
* `per_page=20`

### Success Response

```json
{
  "success": true,
  "message": "Riwayat gaji harian berhasil diambil",
  "data": [
    {
      "id": 12,
      "employee_id": 2,
      "employee_name": "Asep",
      "week_period_id": 3,
      "wage_date": "2026-04-12",
      "amount": 85000,
      "is_paid": false,
      "is_locked": false,
      "updated_at": "2026-04-12T08:45:00Z"
    }
  ],
  "meta": {
    "current_page": 1,
    "per_page": 20,
    "total": 1,
    "last_page": 1
  }
}
```

---

# 10. WEEKLY PAYMENTS API

## 10.1. Pay One Employee for One Week

### Endpoint

```http
POST /api/mobile/weekly-payments/employee
```

### Request

```json
{
  "week_period_id": 3,
  "employee_id": 2,
  "notes": "Dibayar tunai"
}
```

### Behavior

Backend harus:

1. validasi week ada,
2. validasi employee ada,
3. hitung total unpaid daily wages employee pada week itu,
4. buat `weekly_payment`,
5. tandai `daily_wages` terkait sebagai paid + locked,
6. update status week menjadi `partial_paid` atau `fully_paid`.

### Success Response

```json
{
  "success": true,
  "message": "Pembayaran karyawan berhasil diproses",
  "data": {
    "payment_id": 5,
    "week_period_id": 3,
    "employee_id": 2,
    "employee_name": "Asep",
    "payment_scope": "employee",
    "total_amount": 430000,
    "paid_at": "2026-04-12T09:00:00Z",
    "week_status_after_payment": "partial_paid"
  },
  "meta": null
}
```

### Error Response — already paid

```json
{
  "success": false,
  "message": "Karyawan ini sudah dibayar untuk minggu tersebut",
  "error": {
    "code": "PAYMENT_ALREADY_COMPLETED",
    "details": {
      "week_period_id": 3,
      "employee_id": 2
    },
    "fields": null
  }
}
```

---

## 10.2. Pay All Employees for One Week

### Endpoint

```http
POST /api/mobile/weekly-payments/all
```

### Request

```json
{
  "week_period_id": 3,
  "notes": "Pembayaran akhir minggu"
}
```

### Behavior

Backend harus:

1. ambil semua unpaid daily wages pada week itu,
2. buat satu payment event scope `all`,
3. tandai semua daily wages unpaid pada week itu jadi paid,
4. set week status menjadi `fully_paid`,
5. set `locked_at` week bila semua selesai.

### Success Response

```json
{
  "success": true,
  "message": "Pembayaran semua karyawan berhasil diproses",
  "data": {
    "payment_id": 6,
    "week_period_id": 3,
    "payment_scope": "all",
    "total_amount": 2140000,
    "paid_employee_count": 6,
    "paid_at": "2026-04-12T09:15:00Z",
    "week_status_after_payment": "fully_paid"
  },
  "meta": null
}
```

---

## 10.3. List Payments by Week

### Endpoint

```http
GET /api/mobile/weekly-payments
```

### Query Params

* `week_period_id` optional
* `page=1`
* `per_page=20`

### Success Response

```json
{
  "success": true,
  "message": "Riwayat pembayaran berhasil diambil",
  "data": [
    {
      "id": 5,
      "week_period_id": 3,
      "employee_id": 2,
      "employee_name": "Asep",
      "payment_scope": "employee",
      "total_amount": 430000,
      "paid_at": "2026-04-12T09:00:00Z",
      "notes": "Dibayar tunai"
    },
    {
      "id": 6,
      "week_period_id": 3,
      "employee_id": null,
      "employee_name": null,
      "payment_scope": "all",
      "total_amount": 2140000,
      "paid_at": "2026-04-12T09:15:00Z",
      "notes": "Pembayaran akhir minggu"
    }
  ],
  "meta": {
    "current_page": 1,
    "per_page": 20,
    "total": 2,
    "last_page": 1
  }
}
```

---

## 10.4. Payment Detail

### Endpoint

```http
GET /api/mobile/weekly-payments/{paymentId}
```

### Success Response

```json
{
  "success": true,
  "message": "Detail pembayaran berhasil diambil",
  "data": {
    "id": 5,
    "week_period_id": 3,
    "week_range": {
      "start_date": "2026-04-06",
      "end_date": "2026-04-12"
    },
    "employee_id": 2,
    "employee_name": "Asep",
    "payment_scope": "employee",
    "total_amount": 430000,
    "paid_at": "2026-04-12T09:00:00Z",
    "notes": "Dibayar tunai",
    "daily_wages": [
      {
        "id": 12,
        "wage_date": "2026-04-12",
        "amount": 85000
      }
    ]
  },
  "meta": null
}
```

---

# 11. REPORTS API

## 11.1. Export Weekly PDF

Karena target akhirnya UI mobile butuh trigger export/report, backend harus expose endpoint yang jelas.

### Endpoint

```http
GET /api/mobile/reports/weekly-summary-pdf
```

### Query Params

* `week_period_id` required

### Behavior

Response bisa salah satu dari dua pendekatan:

1. langsung stream/download PDF, atau
2. return URL file hasil generate.

Untuk sinkronisasi antar agent, saya sarankan return metadata file supaya UI lebih fleksibel.

### Success Response

```json
{
  "success": true,
  "message": "PDF berhasil dibuat",
  "data": {
    "file_name": "ringkasan-gaji-2026-04-06_2026-04-12.pdf",
    "download_url": "https://example.com/storage/reports/ringkasan-gaji-2026-04-06_2026-04-12.pdf",
    "expires_at": "2026-04-12T10:30:00Z"
  },
  "meta": null
}
```

### Catatan desain

Jangan buat UI menebak-nebak apakah endpoint return binary atau JSON. Tetapkan satu pendekatan dari awal. Untuk agent paralel, format JSON + `download_url` lebih aman.

---

# 12. SYNC API

Ini bagian yang paling rawan disalahpahami. Untuk MVP sebenarnya bisa hidup tanpa endpoint sync khusus, karena mobile bisa pakai endpoint normal satu per satu. Tapi karena Anda ingin agent paralel dan offline-first sudah masuk requirement, saya sarankan siapkan kontrak minimal sync dari sekarang.

---

## 12.1. Push Local Changes

### Endpoint

```http
POST /api/mobile/sync/push
```

### Tujuan

Mobile mengirim sekumpulan perubahan lokal yang belum tersinkron.

### Request

```json
{
  "device_id": "redmi-note-owner",
  "changes": [
    {
      "entity": "daily_wage",
      "action": "create",
      "client_uuid": "4cb7f1f8-4d26-4ad0-9636-3c377d62d011",
      "payload": {
        "employee_id": 2,
        "wage_date": "2026-04-12",
        "amount": 80000,
        "notes": "Ramai hari Minggu"
      }
    },
    {
      "entity": "daily_wage",
      "action": "update",
      "server_id": 12,
      "payload": {
        "amount": 85000,
        "notes": "Koreksi nominal"
      }
    }
  ]
}
```

### Success Response

```json
{
  "success": true,
  "message": "Sinkronisasi push selesai",
  "data": {
    "processed": 2,
    "results": [
      {
        "client_uuid": "4cb7f1f8-4d26-4ad0-9636-3c377d62d011",
        "status": "success",
        "entity": "daily_wage",
        "action": "create",
        "server_id": 12,
        "error": null
      },
      {
        "server_id": 12,
        "status": "success",
        "entity": "daily_wage",
        "action": "update",
        "error": null
      }
    ]
  },
  "meta": null
}
```

### Partial Conflict Response

Push sync **tidak boleh gagal total** hanya karena satu item konflik. Harus per item.

```json
{
  "success": true,
  "message": "Sinkronisasi push selesai dengan beberapa konflik",
  "data": {
    "processed": 2,
    "results": [
      {
        "client_uuid": "4cb7f1f8-4d26-4ad0-9636-3c377d62d011",
        "status": "success",
        "entity": "daily_wage",
        "action": "create",
        "server_id": 12,
        "error": null
      },
      {
        "server_id": 13,
        "status": "conflict",
        "entity": "daily_wage",
        "action": "update",
        "error": {
          "code": "SYNC_CONFLICT",
          "message": "Data tidak dapat diperbarui karena minggu sudah dibayar"
        }
      }
    ]
  },
  "meta": null
}
```

---

## 12.2. Pull Server Changes

### Endpoint

```http
GET /api/mobile/sync/pull
```

### Query Params

* `updated_since=2026-04-12T08:00:00Z` required

### Success Response

```json
{
  "success": true,
  "message": "Sinkronisasi pull berhasil",
  "data": {
    "server_time": "2026-04-12T09:20:00Z",
    "employees": [
      {
        "id": 1,
        "name": "Budi",
        "phone_number": "08123456789",
        "notes": null,
        "is_active": true,
        "updated_at": "2026-04-12T08:00:00Z"
      }
    ],
    "week_periods": [
      {
        "id": 3,
        "start_date": "2026-04-06",
        "end_date": "2026-04-12",
        "status": "fully_paid",
        "locked_at": "2026-04-12T09:15:00Z",
        "updated_at": "2026-04-12T09:15:00Z"
      }
    ],
    "daily_wages": [
      {
        "id": 12,
        "employee_id": 2,
        "week_period_id": 3,
        "wage_date": "2026-04-12",
        "amount": 85000,
        "notes": "Koreksi nominal",
        "is_paid": true,
        "paid_at": "2026-04-12T09:15:00Z",
        "is_locked": true,
        "updated_at": "2026-04-12T09:15:00Z"
      }
    ],
    "weekly_payments": [
      {
        "id": 6,
        "week_period_id": 3,
        "employee_id": null,
        "payment_scope": "all",
        "total_amount": 2140000,
        "paid_at": "2026-04-12T09:15:00Z",
        "updated_at": "2026-04-12T09:15:00Z"
      }
    ]
  },
  "meta": null
}
```

---

# 13. DTO / Shape Penting yang Harus Konsisten

Ini bagian yang sering diremehkan. Endpoint banyak boleh, tapi kalau shape-nya liar, UI agent akan frustrasi.

## 13.1. Employee Item

```json
{
  "id": 1,
  "name": "Budi",
  "phone_number": "08123456789",
  "notes": null,
  "is_active": true,
  "created_at": "2026-04-01T10:00:00Z",
  "updated_at": "2026-04-01T10:00:00Z"
}
```

## 13.2. Week Period Summary

```json
{
  "id": 3,
  "start_date": "2026-04-06",
  "end_date": "2026-04-12",
  "status": "partial_paid",
  "is_locked": false,
  "locked_at": null,
  "summary": {
    "employee_count": 6,
    "filled_wage_count": 21,
    "total_amount": 2140000,
    "paid_employee_count": 2,
    "unpaid_employee_count": 4
  }
}
```

## 13.3. Daily Wage Item

```json
{
  "id": 12,
  "employee_id": 2,
  "employee_name": "Asep",
  "week_period_id": 3,
  "wage_date": "2026-04-12",
  "amount": 85000,
  "notes": "Koreksi nominal",
  "is_paid": false,
  "is_locked": false,
  "paid_at": null,
  "updated_at": "2026-04-12T08:45:00Z"
}
```

## 13.4. Weekly Payment Item

```json
{
  "id": 5,
  "week_period_id": 3,
  "employee_id": 2,
  "employee_name": "Asep",
  "payment_scope": "employee",
  "total_amount": 430000,
  "paid_at": "2026-04-12T09:00:00Z",
  "notes": "Dibayar tunai"
}
```

---

# 14. Status Enum yang Harus Disepakati

Ini harus disepakati dari awal. Jangan backend dan UI bikin versi masing-masing.

## 14.1. Week status

```txt
open
partial_paid
fully_paid
```

## 14.2. Payment scope

```txt
employee
all
```

## 14.3. Sync result status

```txt
success
failed
conflict
```

---

# 15. Mapping Endpoint ke Screen Mobile

Biar agent UI tidak ngawang.

| Screen                | Endpoint utama                                     |
| --------------------- | -------------------------------------------------- |
| Login                 | POST /auth/login                                   |
| Dashboard             | GET /dashboard                                     |
| List Karyawan         | GET /employees                                     |
| Tambah Karyawan       | POST /employees                                    |
| Edit Karyawan         | GET /employees/{id}, PUT /employees/{id}           |
| Gaji Hari Ini         | GET /daily-wages?date=YYYY-MM-DD                   |
| Simpan Gaji Harian    | POST /daily-wages                                  |
| Edit Gaji Harian      | PUT /daily-wages/{id}                              |
| Pembayaran Minggu Ini | GET /week-periods/current, GET /week-periods/{id}  |
| Bayar per Karyawan    | POST /weekly-payments/employee                     |
| Bayar Semua           | POST /weekly-payments/all                          |
| Riwayat Mingguan      | GET /week-periods                                  |
| Detail Minggu         | GET /week-periods/{id}                             |
| Riwayat Pembayaran    | GET /weekly-payments?week_period_id=...            |
| Export PDF            | GET /reports/weekly-summary-pdf?week_period_id=... |
| Sinkronisasi          | POST /sync/push, GET /sync/pull                    |

---

# 16. Catatan Implementasi untuk AI Agent Backend

## 16.1. Jangan taruh semua logic di controller

Minimal pecah ke service seperti:

* AuthService
* EmployeeService
* WeekPeriodService
* DailyWageService
* WeeklyPaymentService
* ReportService
* SyncService

## 16.2. Locking wajib di backend

UI boleh disable tombol, tapi backend tetap harus memvalidasi.

## 16.3. Unique constraint wajib di database

`unique(employee_id, wage_date)`

## 16.4. Amount wajib integer rupiah

Jangan pakai float.

## 16.5. Sync conflict harus per item

Jangan gagal total untuk satu batch jika satu item konflik.

---

# 17. Catatan Implementasi untuk AI Agent UI / Mobile

## 17.1. Jangan asumsi semua create langsung sukses server

Karena offline-first, UI harus siap dengan state:

* local pending
* synced
* failed
* conflict

## 17.2. Gunakan `error.code`

Jangan andalkan `message` untuk logic utama.

## 17.3. Untuk layar Gaji Hari Ini

Response sudah berbentuk employee list + daily wage nullable. UI tidak perlu merge resource terpisah jika memakai endpoint ini.

## 17.4. Untuk layar pembayaran

Gunakan week detail sebagai sumber utama, bukan hitung manual di client.

---

# 18. Devil’s Advocate: apa yang berpotensi bikin agent salah arah?

## Salah arah 1

Backend bikin endpoint terlalu generic tapi UI harus melakukan banyak merge manual.

**Dampak:** UI makin rumit, bug state makin banyak.

**Solusi:** endpoint dashboard dan daily wages by date dibuat sesuai kebutuhan layar.

## Salah arah 2

UI menganggap kalau record lokal tersimpan berarti server pasti menerima.

**Dampak:** user merasa data aman padahal konflik.

**Solusi:** bedakan state local vs synced.

## Salah arah 3

Backend cuma return message tanpa error code stabil.

**Dampak:** UI agent tidak bisa handle kasus locked, duplicate, conflict dengan benar.

## Salah arah 4

PDF endpoint tidak disepakati formatnya dari awal.

**Dampak:** UI dan backend jalan sendiri-sendiri.

---

# 19. Rekomendasi Final

API contract minimum yang harus benar-benar dibangun dulu agar backend dan UI bisa jalan paralel:

## Wajib fase awal

* POST /auth/login
* POST /auth/logout
* GET /me
* GET /dashboard
* GET /employees
* POST /employees
* GET /employees/{id}
* PUT /employees/{id}
* PATCH /employees/{id}/deactivate
* PATCH /employees/{id}/activate
* GET /week-periods/current
* GET /week-periods
* GET /week-periods/{id}
* GET /daily-wages?date=
* POST /daily-wages
* PUT /daily-wages/{id}
* GET /daily-wages/{id}
* GET /daily-wages/history
* POST /weekly-payments/employee
* POST /weekly-payments/all
* GET /weekly-payments
* GET /weekly-payments/{id}
* GET /reports/weekly-summary-pdf?week_period_id=

## Fase offline-first lanjutan

* POST /sync/push
* GET /sync/pull

---

# 20. Next Deliverable yang Paling Masuk Akal

Setelah API Contract ini, dokumen yang paling bernilai untuk dibuat adalah:

1. **OpenAPI-style spec / Swagger-ready version**
2. **Laravel request-response DTO list**
3. **Task breakdown backend per endpoint**
4. **Task breakdown mobile per screen + state**
5. **Sync sequence diagram**
