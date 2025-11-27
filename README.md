# Monitoring BBM Bosowa Bandar

Sistem pemantauan dan pencatatan stok bahan bakar untuk tim Bosowa Bandar. Backend memakai NestJS + TypeORM dengan JWT (access & refresh token), frontend memakai Vue 3 + PrimeVue + Pinia. Alur dipisah untuk admin (penambahan stok) dan operasional (pemakaian stok) dengan laporan tren dan riwayat yang bisa diekspor.

## Ringkasan arsitektur & infrastruktur
- **Client (SPA)**: Vue 3 + Vite menyajikan dashboard, autentikasi JWT tersimpan di client (local storage) lalu disuntik ke header `Authorization` via Axios interceptor.
- **API**: NestJS 11 dengan modul auth (JWT + refresh), modul user (role-based guard), modul stok & histori. Menggunakan TypeORM untuk akses DB dan migrasi skema.
- **Database**: PostgreSQL atau MySQL. Seluruh perubahan skema dicatat sebagai migrasi (`backend/src/database/migrations`); seeder opsional (`SEED_DEFAULT_USERS=true`) untuk membuat akun awal.
- **Dokumentasi API**: Swagger opsional di `/api/docs` (aktifkan `ENABLE_SWAGGER=true`).
- **Deployment tipikal**: Nginx/Apache sebagai reverse proxy; proses backend dijalankan dengan PM2/systemd (`node dist/main`), frontend dibangun menjadi aset statis `frontend/dist` lalu disajikan oleh web server yang sama atau CDN. Variabel lingkungan di-inject melalui file `.env` masing-masing.

## Fitur utama
- Autentikasi JWT + refresh token, guard role-based (`admin`, `operasional`) dan profil pengguna (`/auth/me`).
- Stok & transaksi: kartu ringkasan stok harian, grafik tren stok dan tren in/out, input stok masuk (admin) dan pemakaian (operasional) dengan timezone `Asia/Makassar`.
- Riwayat transaksi: filter tanggal, jenis transaksi, lokasi (`GENSET`, `TUG_ASSIST`), pengguna, pencarian kata kunci, dan ekspor ke Excel.
- Manajemen pengguna: admin dapat membuat/mengubah/menghapus pengguna, menetapkan role, serta mengikat user operasional ke lokasi wajib.
- Swagger API optional (`ENABLE_SWAGGER=true`) di `/api/docs`.

## Dependensi utama & kegunaannya
**Backend (NestJS):**
- `@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express`: kerangka NestJS utama.
- `@nestjs/jwt`, `passport`, `passport-jwt`, `passport-local`: autentikasi JWT + refresh dan login berbasis email/password.
- `@nestjs/typeorm`, `typeorm`, `pg`, `mysql2`: ORM dan driver Postgres/MySQL dengan dukungan migrasi.
- `class-validator`, `class-transformer`: validasi & transformasi DTO request/response.
- `bcrypt`: hashing password.
- `@nestjs/swagger`: dokumentasi otomatis Swagger (opsional via env).
- Testing: `jest`, `@nestjs/testing`, `supertest` untuk unit & e2e.

**Frontend (Vue 3):**
- `vue`, `vue-router`, `pinia`: kerangka SPA, routing, state management (auth/token).
- `primevue`, `@primeuix/themes`, `primeflex`, `primeicons`: komponen UI, tema Lara, utilitas layout.
- `axios`: HTTP client dengan interceptor token.
- `chart.js`: grafik tren stok dan in/out.
- `xlsx-js-style`: ekspor riwayat transaksi ke Excel.
- `jwt-decode`: membaca payload JWT untuk role/expired.
- Build tools: Vite, TypeScript, `vue-tsc`.

## Vue Router & alur proteksi
- Lokasi router: `frontend/src/router/index.ts`.
- Rute publik: `/` (home), `/login`.
- Rute admin: `/dashboard/admin`, `/dashboard/admin/users` dengan `meta.requiresAuth=true` dan `allowedRoles=['admin']`.
- Rute operasional: `/dashboard/operasional` dengan `allowedRoles=['operasional']`.
- Guard `beforeEach` membaca token/user dari Pinia (`useAuthStore`), sinkron ke `localStorage`, lalu:
  - Jika `requiresAuth` tapi belum login → redirect ke `/login?redirect=<tujuan>`.
  - Jika role tidak cocok → arahkan ke dashboard sesuai role; jika tidak ada role valid, logout dan kembali ke login.
- Tambah rute terlindungi baru dengan `meta: { requiresAuth: true, allowedRoles: [...] }` supaya tervalidasi guard.

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

## E2E
- Backend e2e menggunakan Jest + Supertest (`backend/test/app.e2e-spec.ts`) untuk mem-boot `AppModule` penuh lalu memanggil endpoint HTTP.
- Menjalankan e2e:
  ```bash
  cd backend
  npm install
  npm run test:e2e
  ```
- Tambahkan skenario baru dengan membuat file `*.e2e-spec.ts` di `backend/test/` (mis. login, guard role, transaksi stok) dan gunakan `supertest(app.getHttpServer())` untuk menembak API.

## Flowchart (alur utama)
```mermaid
flowchart LR
  A[User: Admin/Operasional]
  B[Vue 3 SPA\nPrimeVue + Pinia]
  C[Axios Interceptor\nTambah Header Bearer]
  D[/auth/login/]
  E[/stock/in & /stock/out/]
  F[/stock/history & /stock/trend/]
  G[NestJS API]
  H[Auth Guard JWT\n+ Role Guard]
  I[Service Layer]
  J[TypeORM Repo]
  K[(PostgreSQL/MySQL)]
  L[Swagger /api/docs\n(opsional)]
  M[Export Excel\n(xlsx-js-style)]

  A --> B
  B --> C
  C --> D
  C --> E
  C --> F
  D --> G
  E --> G
  F --> G
  G --> H
  H --> I
  I --> J
  J --> K
  G --> L
  B --> M
```

## Build & deploy singkat
- Backend: `npm run build` lalu jalankan `node dist/main`. Gunakan PM2/systemd untuk daemon, dan jalankan `npm run db:migration:run` sebelum start.
- Frontend: `npm run build` menghasilkan `frontend/dist` yang bisa disajikan via Nginx/Apache/hosting statis. Pastikan `VITE_API_URL` mengarah ke domain API Anda.
