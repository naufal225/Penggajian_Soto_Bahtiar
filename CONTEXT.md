# CONTEXT UPDATE

## Tanggal
- 12 April 2026

## Task yang Selesai
- Implement login end-to-end:
  - Backend: `POST /api/mobile/auth/login` dengan Sanctum token.
  - Frontend: layar login + integrasi API + state `loading/error/success`.
  - Session persistence: token disimpan aman dan tetap ada setelah app restart.
  - Session bootstrap: app cek token saat startup, lalu langsung ke dashboard jika token tersedia.

## Endpoint Selesai
- `POST /api/mobile/auth/login`
  - Request:
    - `email` (required, email)
    - `password` (required, string)
    - `device_name` (required, string)
  - Success:
    - `success: true`
    - `message: "Login berhasil"`
    - `data.token`
    - `data.user { id, name, email }`
    - `meta: null`
  - Error:
    - `UNAUTHORIZED` (401)
    - `VALIDATION_ERROR` (422)
    - `INTERNAL_SERVER_ERROR` (500 untuk unexpected error di path `api/mobile/*`)

## Struktur Frontend yang Ditambahkan
- `app/index.tsx`:
  - bootstrap session check (cek token dulu, redirect ke login/dashboard).
- `app/login.tsx`:
  - route login.
- `screens/login/LoginScreen.tsx`:
  - screen login.
- `components/login/LoginForm.tsx`:
  - komponen form login.
- `screens/login/LoginScreen.styles.ts`:
  - style terpisah.
- `viewmodels/useLoginViewModel.ts`:
  - state handling login dan mapping error code.
- `services/api/http-client.ts`:
  - helper HTTP client + error class.
- `services/api/auth-api.ts`:
  - request login API.
- `services/storage/session-storage.ts`:
  - simpan/ambil/hapus token via SecureStore.
- `frontend/.env.example`:
  - contoh `EXPO_PUBLIC_API_BASE_URL`.

## Perubahan Backend Penting
- Sanctum di-install dan asset dipublish (config + migration personal access token).
- API route diaktifkan via `bootstrap/app.php` + `routes/api.php`.
- Layer login mengikuti pattern:
  - Controller -> Service -> Repository -> Model
  - DTO request/response ditambahkan untuk auth login.
- Response wrapper standar ditambahkan di `App\Support\ApiResponse`.
- Handler validasi dan internal error untuk mobile API ditambahkan agar format error konsisten.

## Testing yang Dilakukan
- Backend automated test (`php artisan test`):
  - login success
  - login unauthorized
  - login validation error
  - status: semua test PASS.
- Frontend checks:
  - `npm run lint` PASS.
  - `npx tsc --noEmit` PASS.

## Masalah yang Ditemukan
- Network sandbox awal menolak install package (`composer` dan `expo install`) sehingga butuh rerun command dengan izin escalated.
- Warning PHP terkait import `Throwable` di `bootstrap/app.php` sempat muncul dan sudah diperbaiki.
- Satu error TypeScript generic constraint muncul di HTTP client, sudah diperbaiki.

## Keputusan Teknis
- Base URL frontend wajib dari `EXPO_PUBLIC_API_BASE_URL` (tanpa hardcode host).
- Mapping error UI berbasis `error.code` backend (bukan parsing message).
- Session check fase ini memakai keberadaan token lokal (belum memanggil endpoint `/me`).

---

## Update Fitur: Kelola Data Karyawan (CRUD)

### Endpoint Selesai
- `GET /api/mobile/employees`
- `POST /api/mobile/employees`
- `GET /api/mobile/employees/{employeeId}`
- `PUT /api/mobile/employees/{employeeId}`
- `PATCH /api/mobile/employees/{employeeId}/deactivate`
- `PATCH /api/mobile/employees/{employeeId}/activate`

Semua endpoint employee:
- memakai middleware `auth:sanctum`,
- memakai response envelope standar,
- memakai error code stabil untuk kasus not found (`EMPLOYEE_NOT_FOUND`) dan validasi (`VALIDATION_ERROR`).

### Struktur Backend yang Ditambahkan
- Migration:
  - tabel `employees` dengan field inti (`name`, `phone_number`, `notes`, `is_active`) + audit (`created_by_user_id`, `updated_by_user_id`) + `deleted_at`.
- Model:
  - `Employee` + relasi ke user pembuat/pengubah.
- Layer:
  - `EmployeeController` -> `EmployeeService` -> `EmployeeRepository`.
- DTO:
  - `EmployeeDataDTO`
  - `EmployeeListQueryDTO`
  - `EmployeeResponseDTO`
- Request validation:
  - `ListEmployeeRequest`
  - `StoreEmployeeRequest`
  - `UpdateEmployeeRequest`
- Test backend:
  - `EmployeeCrudTest` untuk create/list/update/deactivate/activate/search/not-found (detail/update/activate/deactivate).

### Struktur Frontend yang Ditambahkan
- Screen:
  - `EmployeeListScreen`
  - `EmployeeFormScreen` (dipakai untuk tambah + edit)
  - `EmployeeDetailScreen`
- Route:
  - Tab `employees`
  - `/employees/create`
  - `/employees/[id]`
  - `/employees/[id]/edit`
- ViewModel (MVVM):
  - `useEmployeeListViewModel`
  - `useEmployeeFormViewModel`
  - `useEmployeeDetailViewModel`
- Service API:
  - `employee-api.ts`
  - `http-client.ts` diperluas untuk `GET/POST/PUT/PATCH` + auth header bearer.
- Cache offline:
  - SQLite cache untuk list employee (`employee-cache.ts`).

### Masalah yang Ditemukan
- Instalasi `expo-sqlite` sempat gagal di sandbox karena akses network, lalu berhasil setelah izin escalated.
- Perluasan HTTP client diperlukan karena sebelumnya hanya mendukung POST (fitur auth login saja).

### Keputusan Teknis Tambahan
- Default filter list employee: `active`.
- Search list employee mendukung nama dan nomor HP.
- Untuk fase ini, offline hanya untuk baca list dari cache SQLite saat koneksi gagal.
- TODO penting:
  - CRUD offline queue (create/update/activate/deactivate saat offline) **belum** diimplementasikan.
