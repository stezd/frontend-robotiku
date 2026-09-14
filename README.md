# Robotiku ERP Frontend

Frontend web Robotiku ERP untuk mengelola operasional sekolah, siswa, kelas,
pembayaran, keuangan, presensi, sesi belajar, e-rapor, dan konten publik.
Aplikasi ini dibangun dengan Next.js dan mengonsumsi REST API dari
[`backend-robotiku`](../backend-robotiku/README.md).

## Teknologi

- Next.js 16 dengan React 19 dan TypeScript
- Tailwind CSS 4 dan komponen UI berbasis shadcn/ui
- Axios dan TanStack React Query untuk komunikasi API
- Zustand untuk state management
- Recharts untuk visualisasi data dan React Leaflet untuk peta

## Prasyarat

Pastikan perangkat berikut sudah terpasang:

- Node.js 20.9 atau lebih baru
- npm
- Backend Robotiku yang berjalan secara lokal atau URL API yang dapat diakses

Setup backend, database, dan endpoint API dijelaskan di
[`backend-robotiku/README.md`](../backend-robotiku/README.md).

## Instalasi Lokal

1. Masuk ke direktori frontend dan pasang dependency:

	 ```bash
	 cd frontend-robotiku
	 npm install
	 ```

2. Buat file `.env.local` di root project:

	 ```env
	 NEXT_PUBLIC_API_URL=http://localhost:8000
	 ```

	 Nilai tersebut menunjuk ke server backend. Frontend otomatis menambahkan
	 prefix `/api/v1` saat membuat request.

3. Pastikan backend berjalan pada `http://localhost:8000`, lalu jalankan
	 server development:

	 ```bash
	 npm run dev
	 ```

4. Buka [http://localhost:3000](http://localhost:3000) di browser.

## Perintah yang Tersedia

```bash
npm run dev      # Menjalankan server development
npm run lint     # Menjalankan ESLint
npm run build    # Membuat build production
npm run start    # Menjalankan build production
```

## Contoh Penggunaan API

Helper Axios terpusat tersedia di `lib/api.ts`. Helper ini menggunakan
`NEXT_PUBLIC_API_URL`, menambahkan `/api/v1`, dan meneruskan token login sebagai
Bearer token dari cookie `robotiku_token`.

```tsx
import { api, apiError } from "@/lib/api";

async function loadPrograms() {
	try {
		const response = await api.get("/programs");
		return response.data.data;
	} catch (error) {
		throw new Error(apiError(error, "Gagal memuat program."));
	}
}
```

Endpoint publik backend dapat diuji langsung dengan:

```bash
curl http://localhost:8000/api/v1/programs
```

## Struktur Direktori

```text
app/          Halaman dan route Next.js berdasarkan area pengguna
components/   Shell layout, guard autentikasi, dan komponen UI
lib/          Client API, store, utilitas, dan helper aplikasi
hooks/        Custom React hooks
content/      Konten statis frontend
public/       Asset publik
```

## Branching dan Commit

- `main`: kode siap produksi dan deployment
- `development`: staging utama sebelum masuk ke `main`
- `feature/<nama-fitur>`: pengembangan fitur baru

Gunakan format commit berikut:

```text
<type>(scope): <deskripsi>
```

Contoh:

```text
feat(login): tambah validasi client-side pada autentikasi
```

Type yang digunakan: `feat`, `fix`, `refactor`, `docs`, `style`, `chore`,
`perf`, dan `revert`.

## Lisensi

Proyek Robotiku menggunakan lisensi [MIT](https://opensource.org/licenses/MIT).
Deklarasi lisensi saat ini tersedia pada `backend-robotiku/composer.json`.