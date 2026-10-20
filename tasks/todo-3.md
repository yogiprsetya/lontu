# Todo phase 3: UI shell

Plan: [plan-3.md](plan-3.md) · Index: [plan.md](plan.md) · Spec: [SPEC-foundation.md](../SPEC-foundation.md)

Gerbang setiap task: `pnpm lint && pnpm typecheck && pnpm test`, lalu satu commit conventional.

---

### T5: Providers, root layout, token warna, store Zustand

**Description:** `app/providers.tsx` (SWRConfig dengan `fetcher`, ThemeProvider default `system`, Toaster), `lib/fetcher.ts` + `ApiError`, root layout (`lang="id"`, metadata "Lontu", `viewport.themeColor`, `tabular-nums`), token `--income`/`--expense`/`--budget`/`--transfer` di `globals.css`, serta `stores/period.ts` dan `stores/ui.ts`. Komponen shadcn yang dibutuhkan (`sonner`, dll.) ditambah lewat CLI.

**Acceptance criteria:**
- [x] `fetcher` melempar `ApiError { status, code, message, fields }` untuk respons non-2xx dengan format error seragam
- [~] Dark mode mengikuti sistem, bisa diubah manual, dan bertahan setelah reload. Setiap token warna lolos 4.5:1 terhadap background di light dan dark
- [x] `usePeriodStore` default ke bulan berjalan di Asia/Jakarta. `useUIStore` hanya mem-`persist` `hideAmounts`

**Verification:**
- [x] `tests/unit/fetcher.spec.ts`, `tests/unit/period-store.spec.ts`, `tests/unit/ui-store.spec.ts`, `tests/unit/color-tokens.spec.ts` (termasuk tanggal di batas tengah malam UTC vs WIB) hijau
- [ ] Manual: ganti tema, reload, tema bertahan (menunggu toggle tema di Settings, T6). Kontras dicek otomatis oleh `color-tokens.spec.ts` (terendah 5,17:1)
- [x] `pnpm build` hijau

**Dependencies:** T1

**Files likely touched:** `app/providers.tsx`, `app/layout.tsx`, `app/globals.css`, `lib/fetcher.ts`, `stores/period.ts`, `stores/ui.ts`, `components/ui/sonner.tsx`, tes

**Estimated scope:** M

---

### T6: App shell responsif dan halaman placeholder

**Description:** `app/(app)/layout.tsx` dengan BottomNav 5 slot (Dashboard, Transactions, +, Budget, More) di bawah `lg` dan Sidebar di `lg` ke atas. Tombol + membuka menu Income/Expense/Saving/Transfer ke `/add/[type]`. More berisi Settings dan Logout. Halaman dashboard, transactions, expenses, budget, settings, dan `add/[type]` berupa placeholder dengan judul dan empty state. Bagian yang membaca session dibungkus `<Suspense>`.

**Acceptance criteria:**
- [ ] Di 360 px: bottom nav 5 slot, setiap target ≥ 44×44 px, padding `env(safe-area-inset-bottom)`, tanpa horizontal scroll
- [ ] Di 1024 px: sidebar tampil, bottom nav tersembunyi
- [ ] Menu + menuju keempat `/add/[type]`. Type di luar empat itu → 404. Logout mengakhiri session dan kembali ke `/login`

**Verification:**
- [ ] `pnpm build` hijau tanpa error "uncached data outside Suspense"
- [ ] Manual di DevTools: 360 px dan 1024 px, navigasi keyboard di nav dan menu +
- [ ] `pnpm lint && pnpm typecheck` hijau

**Dependencies:** T3, T5

**Files likely touched:** `app/(app)/layout.tsx`, `components/layout/bottom-nav.tsx`, `components/layout/sidebar.tsx`, `components/layout/add-menu.tsx`, `app/(app)/{dashboard,transactions,expenses,budget,settings}/page.tsx`, `app/(app)/add/[type]/page.tsx`, `app/page.tsx`

**Estimated scope:** M (banyak file, tetapi halaman placeholder berukuran kecil)

---

### T7: `ResponsiveModal`

**Description:** Komponen `components/layout/responsive-modal.tsx` yang merender Drawer di bawah `lg` dan Dialog di `lg` ke atas, dengan satu API (`open`, `onOpenChange`, `title`, `description`, `children`, `footer`). Tambah `drawer` dan `dialog` lewat shadcn CLI.

**Acceptance criteria:**
- [ ] Di 360 px tampil sebagai Drawer, di 1024 px sebagai Dialog, tanpa mount ganda
- [ ] Fokus terkunci di dalam modal, Escape menutup, fokus kembali ke pemicu
- [ ] Judul terhubung ke `aria-labelledby`

**Verification:**
- [ ] Manual: buka dari halaman placeholder Settings di dua lebar layar
- [ ] `pnpm lint && pnpm typecheck && pnpm build` hijau

**Dependencies:** T6

**Files likely touched:** `components/layout/responsive-modal.tsx`, `components/ui/drawer.tsx`, `components/ui/dialog.tsx`, `hooks/use-media-query.ts`

**Estimated scope:** S

---

### T8: Manifest dan ikon PWA

**Description:** Pulihkan ikon dari commit `c9de1eb`, tambah ikon maskable (Open question #4), dan tulis `app/manifest.ts` dengan `display: "standalone"`, `start_url: "/dashboard"`, dan shortcut "Tambah Expense" → `/add/expense`.

**Acceptance criteria:**
- [ ] `/manifest.webmanifest` bisa diakses tanpa login (tidak dialihkan proxy)
- [ ] Manifest memuat ikon 192, 512, dan maskable, serta shortcut "Tambah Expense"
- [ ] Lighthouse menyatakan manifest installable

**Verification:**
- [ ] `tests/unit/manifest.test.ts` (field wajib, ikon, shortcut) hijau
- [ ] Manual: Lighthouse di `pnpm build && pnpm start`

**Dependencies:** T3 (matcher proxy), T5 (`themeColor`)

**Files likely touched:** `app/manifest.ts`, `public/icons/*`, `tests/unit/manifest.test.ts`

**Estimated scope:** S

---

### Checkpoint C: setelah T5–T8
- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` hijau
- [ ] Shell, modal, tema, dan manifest diperiksa manual
- [ ] Review dengan Yogi
