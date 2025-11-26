# Monitoring BBM Bosowa Bandar

Sistem pemantauan dan pencatatan stok bahan bakar untuk tim Bosowa Bandar. Backend memakai NestJS + TypeORM dengan JWT (access & refresh token), frontend memakai Vue 3 + PrimeVue + Pinia. Alur dipisah untuk admin (penambahan stok) dan operasional (pemakaian stok) dengan laporan tren dan riwayat yang bisa diekspor.

## Fitur utama
- Autentikasi JWT + refresh token, guard role-based (`admin`, `operasional`) dan profil pengguna (`/auth/me`).
- Stok & transaksi: kartu ringkasan stok harian, grafik tren stok dan tren in/out, input stok masuk (admin) dan pemakaian (operasional) dengan timezone `Asia/Makassar`.
- Riwayat transaksi: filter tanggal, jenis transaksi, lokasi (`GENSET`, `TUG_ASSIST`), pengguna, pencarian kata kunci, dan ekspor ke Excel.
- Manajemen pengguna: admin dapat membuat/mengubah/menghapus pengguna, menetapkan role, serta mengikat user operasional ke lokasi wajib.
- Swagger API optional (`ENABLE_SWAGGER=true`) di `/api/docs`.

## Tumpukan teknologi
- Backend: NestJS 11, TypeORM, Passport (JWT + Local), PostgreSQL/MySQL, Jest untuk test.
- Frontend: Vue 3 + Vite, PrimeVue + PrimeFlex, Pinia, Vue Router, Axios, Chart.js, xlsx-js-style.

## Struktur proyek
```
backend/   NestJS API + TypeORM migrations
frontend/  Vue 3 SPA (PrimeVue)
```

## Persiapan cepat
1. Pastikan Node.js 18+ dan akses ke database Postgres/MySQL.
2. Salin environment contoh:
   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```
3. Isi `backend/.env` sesuai koneksi DB dan rahasia JWT, lalu isi `frontend/.env` dengan `VITE_API_URL` (misal `http://localhost:3000/api`).

## Variabel lingkungan
**Backend (`backend/.env`):**
- `APP_PORT`, `APP_TIMEZONE` (default `Asia/Makassar`)
- `ENABLE_SWAGGER`, `ENABLE_CORS`, `CORS_ORIGINS`
- DB: `DB_TYPE` (`postgres`/`mysql`), `DATABASE_URL` atau `DB_HOST/DB_PORT/DB_USERNAME/DB_PASSWORD/DB_NAME`, `DB_SSL`, `DB_SYNCHRONIZE` (biarkan `false` di produksi), `DB_LOGGING`
- Auth: `JWT_SECRET`, `JWT_ACCESS_TTL_SECONDS`, `JWT_REFRESH_TTL_SECONDS`
- Seeder: `SEED_DEFAULT_USERS` (`true` untuk membuat akun awal)

**Frontend (`frontend/.env`):**
- `VITE_API_URL` mengarah ke base path API (mis. `http://localhost:3000/api`).

## Menjalankan aplikasi
### Backend (NestJS)
```bash
cd backend
npm install
npm run db:migration:run   # jalankan migrasi skema
npm run start:dev          # dev server di :3000
```

### Frontend (Vite + PrimeVue)
```bash
cd frontend
npm install
npm run dev -- --host      # Vite dev server (default :5173)
```
Login via `/login`, lalu dashboard akan otomatis diarahkan sesuai role.

## Database & migrasi
- Generate migrasi: `npm run db:migration:generate --name=AddNewTable`
- Jalankan migrasi: `npm run db:migration:run`
- Revert: `npm run db:migration:revert`

`DB_SYNCHRONIZE` dimatikan secara default; semua perubahan skema dicatat lewat migrasi di `backend/src/database/migrations`.

## Akun bawaan (jika `SEED_DEFAULT_USERS=true`)
| Role | Email | Password | Catatan |
| --- | --- | --- | --- |
| Admin | `admin@example.com` | `password123` | Bisa kelola user & input stok |
| Operasional | `op@example.com` | `password123` | Hanya pemakaian stok, terikat lokasi |

Segera ubah password setelah deploy.

## Ringkasan endpoint utama
- Auth: `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`
- Users (admin): `GET/POST/PATCH/DELETE /users` untuk CRUD pengguna dan role/lokasi
- Stock: `GET /stock/summary`, `POST /stock/in` (admin), `POST /stock/out` (operasional), `GET /stock/history`, `GET /stock/trend`, `GET /stock/trend/in-out`

## Testing
Backend unit test:
```bash
cd backend
npm test
```

## Build & deploy singkat
- Backend: `npm run build` lalu jalankan `node dist/main`. Gunakan PM2/systemd untuk daemon, dan jalankan `npm run db:migration:run` sebelum start.
- Frontend: `npm run build` menghasilkan `frontend/dist` yang bisa disajikan via Nginx/Apache/hosting statis. Pastikan `VITE_API_URL` mengarah ke domain API Anda.
