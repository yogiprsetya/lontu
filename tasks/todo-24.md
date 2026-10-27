# Todo phase 24: Proyeksi gajian

Plan: [plan-24.md](plan-24.md) · Index: [plan.md](plan.md) · Spec: [SPEC-recurring.md](../SPEC-recurring.md)

Gerbang setiap task: `pnpm lint && pnpm typecheck && pnpm test`, lalu satu commit conventional. Task UI juga butuh `pnpm build` dan cek manual di 360×800 dan 1024.

---

### T87: `paydayForecast` murni + `spendable` + `forecast` di `GET`

**Description:** `lib/payday-forecast.ts` murni: `paydayForecast({ rules, spendable, today })` → `PaydayForecast`. Tanpa aturan gajian aktif → `no_payday`; gajian `nextDueDate <= today` → `payday_due`; selain itu `payday = nextDueDate` gajian, `daysLeft` = selisih hari dari string, `items` = setiap kejadian aturan `expense | saving` (mulai `nextDueDate`, lalu `advanceDate` berulang) selama `< payday`, urut `dueDate` lalu nama; `committed` = jumlah `items`; `free = spendable − committed`. Income non-gajian diabaikan. `lib/server/queries/recurring-overview.ts`: query `spendable` (`sum(balance)` dari `account_balances` join `accounts`, `archived_at is null`, `type = 'transaction'`, `subtype is distinct from 'credit_card'`) dan isi `forecast` menggantikan placeholder T78. Tes merah lebih dulu.

**Acceptance criteria:**

- [x] Skenario spec: `today = 2026-11-13`, gajian tanggal 25 (`2026-11-25`), Netflix tanggal 5 terlambat (`2026-11-05`), sewa tanggal 1 (`2026-12-01`), setoran tabungan tanggal 20, saldo debit 3.000.000 + e-wallet 200.000 + kartu kredit −500.000 + investasi 10.000.000 + debit terarsip 999 → `status "ok"`, `daysLeft 12`, `spendable 3200000`, `items` = Netflix + setoran (sewa tidak), `committed` = jumlahnya, `free = spendable − committed`
- [x] Gajian `nextDueDate <= today` → `payday_due` dengan `ruleId` dan `dueDate`. Tanpa aturan gajian aktif → `no_payday`. Aturan gajian terarsip tidak dihitung
- [x] Aturan yang jatuh tepat di hari gajian **tidak** ikut (`< payday`). Aturan tertinggal 3 bulan menyumbang 3 `ForecastItem` jika semuanya sebelum gajian. `free` negatif saat `committed > spendable`
- [x] Invarian: `spendable` = jumlah `balance` dari `GET /api/accounts` untuk akun yang memenuhi keputusan #4. Isolasi: saldo dan aturan user A tidak pernah masuk proyeksi B
- [x] `GET /api/recurring` mengembalikan `forecast` yang sama dengan `paydayForecast` untuk data yang sama. `rules` dan `due` tidak berubah dari T78

**Verification:**

- [x] `pnpm vitest run tests/unit/payday-forecast.spec.ts tests/api/recurring-overview.spec.ts` hijau

**Dependencies:** T78 (dan T86 selesai, supaya phase berurutan)

**Files likely touched:** `lib/payday-forecast.ts`, `lib/server/queries/recurring-overview.ts`, `tests/unit/payday-forecast.spec.ts`, `tests/api/recurring-overview.spec.ts`

**Estimated scope:** M

---

### T88: Kartu gajian di dashboard

**Description:** `components/recurring/payday-card.tsx`, dipasang di `components/dashboard/dashboard-view.tsx` (di atas atau di bawah kartu saldo sesuai [DESIGN.md](../DESIGN.md)). `status "ok"`: "12 hari lagi gajian (25 Nov)", baris Terikat dan Bebas, rincian `items` yang bisa dibuka (nama, tanggal, nominal, tautan ke `/recurring`). `free < 0` → "Kurang Rp…" dengan teks, bukan hanya warna. `payday_due` → "Gaji belum dicatat" + tombol Catat (membuka `TransactionForm` dengan prop `recurring`, sama dengan T86). `no_payday` dengan aturan lain → "Tandai aturan gaji untuk melihat proyeksi" + tautan `/recurring`; tanpa aturan sama sekali → "Atur gajian & tagihan tetap" ke `/recurring`. Skeleton bertinggi tetap. `hideAmounts` dipatuhi. Ukur `/dashboard` sebelum dan sesudah.

**Acceptance criteria:**

- [ ] Data uji T87 → kartu menampilkan hari tersisa, terikat, dan bebas yang sama dengan respons API. Rincian bisa dibuka dan menampilkan setiap kejadian
- [ ] Gaji jatuh tempo → "Gaji belum dicatat"; Catat dari kartu menulis transaksi dan kartu beralih ke proyeksi siklus berikutnya tanpa reload
- [ ] Tanpa aturan gaji → ajakan menandai; tanpa aturan sama sekali → ajakan ke `/recurring`. Tidak ada kartu kosong tanpa teks
- [ ] `free` negatif tampil sebagai "Kurang Rp…" dan terbaca tanpa warna. `hideAmounts` menyamarkan semua nominal
- [ ] 360 px tanpa horizontal scroll, target ≥ 44 px, kontras ≥ 4.5:1, light dan dark, tanpa CLS saat memuat

**Verification:**

- [ ] Manual 360×800 dan 1024, light dan dark
- [ ] `pnpm build` hijau, ukuran dicatat di plan-24 § Catatan ukuran

**Dependencies:** T87

**Files likely touched:** `components/recurring/payday-card.tsx`, `components/dashboard/dashboard-view.tsx`

**Estimated scope:** M

---

### T89: Penyelesaian modul

**Description:** Isi tabel Catatan ukuran di `plan-24.md` (sebelum modul, T86, T88) untuk `/dashboard` dan `/recurring`. Jalankan Lighthouse mobile dan axe pada `/dashboard` dan `/recurring`, bandingkan dengan baseline sebelum modul. Lengkapi checklist manual di spec § Acceptance criteria (UI) yang belum tercentang, perbarui status modul di `plan.md`, dan catat temuan yang belum selesai seperti pola Temuan verifikasi T76.

**Acceptance criteria:**

- [ ] Tabel Catatan ukuran terisi. Tambahan JS first load `/dashboard` < 5 KB gzip; jika lebih, catat penyebabnya dan ajukan keputusan (Ask first), jangan diamkan
- [ ] Lighthouse Performance mobile dan Aksesibilitas tidak turun dari baseline sebelum modul. Axe tanpa pelanggaran baru di `/dashboard` dan `/recurring`
- [ ] Semua butir UI di spec § Acceptance criteria tercentang atau tercatat sebagai temuan dengan alasan
- [ ] Status modul `recurring` di `plan.md` diperbarui

**Verification:**

- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` hijau
- [ ] Lighthouse + axe dijalankan dan hasilnya dicatat

**Dependencies:** T88

**Files likely touched:** `tasks/plan-24.md`, `tasks/plan.md`, `SPEC-recurring.md`

**Estimated scope:** S

---

### Checkpoint W (modul selesai)

- [ ] Gerbang penuh hijau
- [ ] Angka "bebas" cocok dengan hitungan tangan Yogi (selisih ≤ 10%)
- [ ] Ketiga status kartu sudah dicek manual di 360×800 dan 1024
- [ ] Ukuran dan NFR tercatat
- [ ] Review dengan Yogi. Setelah dua siklus gajian, ukur asumsi "kotak Jatuh tempo cukup tanpa push" dan "nominal tetap benar-benar tetap"
