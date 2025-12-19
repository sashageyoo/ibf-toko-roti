# Indonesia Bakery Family – Sistem Manajemen Inventaris & Bahan Baku

Sistem manajemen inventaris dan produksi real-time untuk toko roti IBF Bakery.  
Dibangun dengan **Next.js 16**, **Convex**, dan **Tailwind CSS**.

---

## Fitur Utama

- 📦 **Master Data** – Bahan baku, produk jadi, supplier  
- 🏭 **Inventaris** – Pelacakan batch, logika FEFO, notifikasi stok rendah  
- 📋 **Resep (BOM)** – Dukungan kuantitas pecahan  
- ⚙️ **Perencanaan Produksi** – Perhitungan MRP, jadwal produksi  
- 🔐 **Autentikasi** – Akses berbasis peran (Admin, Gudang, Produksi)  
- ⚡ **Real-time** – Didukung Convex

---

## Tech Stack

| Layer       | Teknologi |
|-------------|-----------|
| Runtime     | [Bun](https://bun.sh) |
| Framework   | [Next.js 16](https://nextjs.org) (App Router) |
| Database    | [Convex](https://convex.dev) |
| UI          | [shadcn/ui](https://ui.shadcn.com) + [Tailwind CSS](https://tailwindcss.com) |
| Ikon        | [Lucide React](https://lucide.dev) |

---

## Prasyarat

- [Bun](https://bun.sh) v1.0+
- [Convex CLI](https://docs.convex.dev/quickstart) (`npx`)

---

## Mulai Cepat

### 1. Instal dependensi
```bash
bun install

### 2. Jalankan backend Convex (di terminal terpisah)


```bash
npx convex dev
```

### 3. Buat seed akun admin pertama

Run the seed command to create the first admin user:

```bash
npx convex run seed:seedAdmin
```

**Kredensial bawaan:**
- Username: `admin`
- Password: `admin123`

> ⚠️ **Important:**  Ubah password setelah login pertama!

### 4. Jalankan semua layanan dev

```bash
bun run dev:all
```

Buka di browser [http://localhost:3000](http://localhost:3000) 

## Struktur Proyek

```
├── app/
│   ├── (dashboard)/        # Protected routes (with sidebar)
│   │   ├── page.tsx        # Dashboard
│   │   ├── inventory/      # Inventory management
│   │   ├── items/          # Items CRUD
│   │   ├── recipes/        # BOM management
│   │   ├── production/     # Production runs
│   │   ├── suppliers/      # Supplier management
│   │   └── users/          # User management (admin only)
│   ├── login/              # Login page (public)
│   └── api/auth/           # Auth API routes
├── components/
│   ├── ui/                 # shadcn/ui components
│   ├── app-sidebar.tsx     # Navigation sidebar
│   ├── auth-provider.tsx   # Auth context
│   └── user-menu.tsx       # User dropdown
├── convex/
│   ├── schema.ts           # Database schema
│   ├── auth.ts             # Auth queries
│   ├── users.ts            # User CRUD
│   ├── items.ts            # Items CRUD
│   ├── batches.ts          # Inventory batches
│   ├── boms.ts             # Recipe/BOM management
│   ├── production.ts       # Production runs
│   └── seed.ts             # Initial data seeding
├── lib/
│   └── auth.ts             # JWT session utilities
└── proxy.ts                # Route protection middleware
```

## User Roles

| Role | Access |
|------|--------|
| **Admin** | Semua fitur + kelola pengguna |
| **Warehouse** | Inventaris, bahan, supplier |
| **Production** | Resep & jadwal produksi |

## Environment Variables

bua file `.env.local` :

```env
# Convex
CONVEX_DEPLOYMENT=your-deployment-name
NEXT_PUBLIC_CONVEX_URL=http://127.0.0.1:3210

# Auth
JWT_SECRET=your-super-secret-key-change-in-production
```

## Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Start Next.js development server |
| `bun run build` | Build for production |
| `bun run start` | Start production server |
| `bun run lint` | Run ESLint |
| `bun run dev:all` | Run all dev services concurrently |
| `npx convex dev` | Start Convex dev server |
| `npx convex run seed:seedAdmin` | Seed initial admin |

## Deploy

### Vercel + Convex Cloud

1. Deploy ke [Convex Cloud](https://dashboard.convex.dev)
2. Deploy ke [Vercel](https://vercel.com)
3. Setel variabel lingkungan di Vercel
4. Jalankan seed di lingkungan produksi convex

