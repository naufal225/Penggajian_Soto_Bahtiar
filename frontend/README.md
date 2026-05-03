# Frontend Penggajian Soto Bahtiar

Project ini diset untuk jalan di **Expo Go** (bukan development build native).

## Jalankan Project

```bash
npm install
npm run start
```

Pilihan cepat:

```bash
npm run android
npm run ios
npm run web
```

## Akses dari Browser (Web)

Jalankan:

```bash
npm run web
```

Lalu buka:

- `http://localhost:8082` (browser di laptop/PC yang sama)

Jika ingin akses dari device lain di jaringan yang sama (LAN):

```bash
npm run web:lan
```

Gunakan URL LAN yang ditampilkan Expo (contoh `http://192.168.1.10:8082`).

## Konfigurasi API untuk Web

File `.env`:

```env
EXPO_PUBLIC_API_BASE_URL=http://localhost:8000/api/mobile
```

Catatan:

- Jika frontend web dibuka dari device lain (LAN), `localhost` akan mengarah ke device itu sendiri.
- Untuk mode LAN, ganti ke IP server backend, contoh:

```env
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.10:8000/api/mobile
```

## Catatan Penting

- Jika terminal Expo pernah berada di mode development build, tekan `s` untuk kembali ke Expo Go.
- Kalau cache bermasalah, jalankan:

```bash
npx expo start --go -c
```
