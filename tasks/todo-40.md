# Todo phase 40: Histori nilai aset

Plan: [plan-40.md](plan-40.md) · Index: [plan.md](plan.md) · Spec: [SPEC-asset-history.md](../SPEC-asset-history.md)

Gerbang setiap task: `pnpm lint && pnpm typecheck && pnpm test`, lalu satu commit conventional. Task UI juga `pnpm build` dan cek manual di 360×800 dan 1024.

---

### T139: Query `assetHistory`

**Description:** Tipe `AssetHistory*` dan `ASSET_HISTORY_RANGES` di `lib/schemas/asset-history.ts`, `withChanges(opening, points)` di `lib/asset-history.ts`, dan `assetHistory(userId, { range, accountId, today })` di `lib/server/queries/asset-history.ts` dengan bentuk SQL di plan-40 § Keputusan. Mengembalikan `null` untuk `accountId` yang bukan akun aset aktif milik user. Dites dengan baris yang ditulis langsung ke DB, sebelum route ada.

**Acceptance criteria:**

- [x] Skenario dasar SPEC § Acceptance criteria: tabel gabungan `range=12` (lima bulan, `opening` 0), RD Saham per akun, `range=6` dengan `today = 2027-01-15` (`opening` = Jul), `range=all` = `range=12`
- [x] Akun backdate (dibuat 2026-11-01, transfer 2026-09-10) mulai Sep bernilai 3.000.000; revaluasi terhapus tidak dihitung; akun terarsip tidak ikut gabungan dan `accountId`-nya → `null`; BCA, id acak, akun user lain → `null`; user tanpa aset → `months: []`
- [x] Invarian: bulan terakhir = jumlah `assetValuations` (gabungan dan per akun), `value = contributed + marketGain` setiap bulan, gabungan = jumlah per akun

**Verification:**

- [x] Merah dulu: `pnpm vitest run tests/unit/asset-history.spec.ts tests/api/asset-history.spec.ts` gagal sebelum implementasi
- [x] `pnpm lint && pnpm typecheck && pnpm test` hijau

**Dependencies:** commit `docs(asset-history)` spec + plan

**Files likely touched:** `lib/schemas/asset-history.ts`, `lib/asset-history.ts`, `lib/server/queries/asset-history.ts`, `tests/unit/asset-history.spec.ts`, `tests/api/asset-history.spec.ts`

**Estimated scope:** M

---

### T140: Route `GET /api/valuations/history`

**Description:** `assetHistoryQuerySchema` (`range` enum default `"12"`, `accountId` `z.uuid()` opsional) di-parse dari `Object.fromEntries(searchParams)` seperti `app/api/dashboard/route.ts`. Route memanggil `assetHistory` dengan `todayInJakarta()` dan memetakan `null` ke `accountNotFound()`.

**Acceptance criteria:**

- [x] Tanpa query → 200 dengan `range "12"`, `accountId null`; `range=24` → 400 `fields.range`; `accountId=abc` → 400 `fields.accountId`
- [x] `accountId` BCA, akun terarsip, id acak, atau akun aset user lain → 404 `ACCOUNT_NOT_FOUND`; histori gabungan user B tidak berubah oleh data user A
- [x] Tanpa session → 401 `UNAUTHORIZED`

**Verification:**

- [x] Merah dulu: `pnpm vitest run tests/unit/asset-history-schema.spec.ts tests/api/asset-history.spec.ts`
- [x] `pnpm lint && pnpm typecheck && pnpm test` hijau
- [x] Checkpoint AM (plan-40)

**Dependencies:** T139

**Files likely touched:** `lib/schemas/asset-history.ts`, `app/api/valuations/history/route.ts`, `tests/unit/asset-history-schema.spec.ts`, `tests/api/asset-history.spec.ts`

**Estimated scope:** S

---

### T141: Section Histori nilai: ringkasan dan tabel

**Description:** `assetHistorySummary` dan `summarySentence` di `lib/asset-history.ts`. `useAssetHistory({ range, accountId })` + `assetHistoryKey()` di `hooks/use-asset-history.ts`. `components/goals/asset-history.tsx`: section `surface` dengan `SectionTitle` "Histori nilai", kalimat ringkasan, dan tabel Bulan · Setoran · Pasar · Nilai (terbaru di atas, label "berjalan", angka singkatan di bawah `sm`, `hideAmounts`), skeleton, dan `LoadError`. Untuk sementara tetap 12 bulan gabungan. `GoalsView` merendernya di bawah `AssetValues` jika ada aset.

**Acceptance criteria:**

- [x] `summarySentence`: naik, turun, tetap, pasar negatif "−Rp…", nominal tersembunyi; `assetHistorySummary` kosong → `null`
- [x] `assetHistoryKey()` cocok dengan `isResourceKey("valuations", …)`, jadi ikut `affectedBy("transactions")` dan `affectedBy("accounts")`
- [ ] (cek di browser boleh tertunda) Section tampil di bawah "Nilai aset", empat kolom muat di 360 px, check-in baru memperbarui baris bulan berjalan tanpa reload · tertunda: sesi tanpa browser

**Verification:**

- [x] Merah dulu: `pnpm vitest run tests/unit/asset-history.spec.ts tests/unit/cache-invalidation.spec.ts`
- [x] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` hijau
- [ ] Manual: `/net-worth` di 360×800 dan 1024, dengan `hideAmounts` aktif dan tidak · tertunda: sesi tanpa browser

**Dependencies:** T140

**Files likely touched:** `lib/asset-history.ts`, `hooks/use-asset-history.ts`, `components/goals/asset-history.tsx`, `components/goals/goals-view.tsx`, `tests/unit/asset-history.spec.ts`, `tests/unit/cache-invalidation.spec.ts`

**Estimated scope:** M

---

### T142: Kontrol rentang dan akun

**Description:** Di `asset-history.tsx`: `ToggleGroup` "6 bln" / "12 bln" / "Semua" (default 12) dan, jika ada ≥ 2 akun aset, `Select` "Akun" berisi "Semua aset" + akun aset dengan urutan `useValuations()` dan nama dari `useAccounts`. State lokal `useState`. `accountId` yang tidak lagi ada di daftar aset dianggap "Semua aset".

**Acceptance criteria:**

- [x] Ganti rentang atau akun → ringkasan dan tabel berubah bersama (satu request per kombinasi, di-cache SWR) · dari kode, belum dicek di browser
- [x] Filter akun tidak tampil dengan satu akun aset; akun yang dipilih lalu diarsipkan kembali ke "Semua aset" tanpa error 404 di layar · dari kode, belum dicek di browser
- [x] Setiap kontrol ≥ 44 px dan berlabel untuk screen reader · dari kode, belum dicek di browser

**Verification:**

- [x] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` hijau
- [ ] Manual: ketiga rentang × gabungan/per akun di 360×800; mode pesawat → kombinasi yang pernah dibuka tampil dari cache, yang belum → error + "Coba lagi" · tertunda: sesi tanpa browser

**Dependencies:** T141

**Files likely touched:** `components/goals/asset-history.tsx`

**Estimated scope:** S

---

### T143: Grafik Nilai vs Disetor

**Description:** `components/goals/asset-history-chart.tsx` (default export, dimuat `next/dynamic` di belakang skeleton setinggi grafik): `LineChart` lewat shadcn chart, Nilai garis penuh `--chart-1`, Disetor garis putus-putus `--muted-foreground`, legenda teks, sumbu X `formatBucket(…, "tick")`, sumbu Y `abbreviateIDR` dengan domain dari data, tooltip bulan + Nilai/Disetor/Pasar `formatIDR`, `aria-hidden`. `hideAmounts` menyembunyikan sumbu Y dan tooltip. `months.length = 1` → "Grafik muncul setelah ada data dua bulan."

**Acceptance criteria:**

- [ ] Grafik tampil di antara ringkasan dan tabel dengan data ≥ 2 bulan; satu bulan → teks pengganti
- [ ] Recharts tidak ada di chunk first load `/net-worth`; ukuran sebelum/sesudah dicatat di plan.md
- [ ] (cek di browser boleh tertunda) Nilai dan Disetor bisa dibedakan tanpa warna; perubahan ratusan ribu terlihat di atas basis puluhan juta

**Verification:**

- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` hijau
- [ ] Ukuran: metode Catatan ukuran dashboard (chunk JS yang dirujuk HTML prerender, gzip level 9)
- [ ] Manual: 360×800 dan 1024, terang/gelap, `hideAmounts`

**Dependencies:** T141

**Files likely touched:** `components/goals/asset-history-chart.tsx`, `components/goals/asset-history.tsx`, `tasks/plan.md`

**Estimated scope:** S

---

### T144: Verifikasi dan status

**Description:** Jalankan Checkpoint AN. Centang butir SPEC-asset-history § Acceptance criteria (API lewat tes, UI manual atau "tertunda: sesi tanpa browser"). Perbarui Status SPEC-asset-history dan baris `asset-history` di plan.md, lalu catat temuan dan jumlah tes akhir. Perbaikan yang ditemukan menjadi commit `fix` terpisah dengan tes yang mereproduksi.

**Acceptance criteria:**

- [ ] Setiap butir di SPEC-asset-history § Acceptance criteria dicentang atau ditandai tertunda dengan alasan
- [ ] Temuan verifikasi T144 ditulis di plan.md (tes lama yang tersentuh, keputusan saat build, yang belum dicek)
- [ ] SPEC-asset-history.md Status dan plan.md baris `asset-history` menyebut T139–T144

**Verification:**

- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` hijau; jumlah tes dicatat
- [ ] Review bersama Yogi

**Dependencies:** T142, T143

**Files likely touched:** `SPEC-asset-history.md`, `tasks/plan.md`, `tasks/plan-40.md`

**Estimated scope:** S
