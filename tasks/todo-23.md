# Todo phase 23: Catat dan Lewati

Plan: [plan-23.md](plan-23.md) · Index: [plan.md](plan.md) · Spec: [SPEC-recurring.md](../SPEC-recurring.md)

Gerbang setiap task: `pnpm lint && pnpm typecheck && pnpm test`, lalu satu commit conventional. Task UI juga butuh `pnpm build` dan cek manual di 360×800 dan 1024.

---

### T83: Executor opsional di jalur insert transaksi

**Description:** `insertSimple` di `lib/server/transactions.ts` menerima executor (tipe dari `db.transaction` callback) dengan default `db`, dan diekspor untuk dipakai `lib/server/recurring.ts`. `findReplay` juga menerima executor opsional. `createTransaction` dan kontrak `POST /api/transactions` tidak berubah. Tidak ada tes transaksi yang diedit.

**Acceptance criteria:**

- [ ] Seluruh `tests/api/transactions*.spec.ts` dan `tests/unit/transaction*.spec.ts` hijau **tanpa satu pun diedit** (termasuk idempotency dari modul pwa-offline)
- [ ] `insertSimple(executor, …)` menulis lewat executor yang diberikan: dites dengan `db.transaction` yang di-rollback sehingga tidak ada baris tersisa
- [ ] Diff hanya menyentuh tanda tangan fungsi, pemanggilnya, dan satu tes baru. Perilaku `IdConflict` dan `onConflictDoNothing` tidak berubah

**Verification:**

- [ ] `pnpm vitest run tests/api tests/unit` hijau (seluruh suite, bukan hanya berkas baru)

**Dependencies:** None (boleh dikerjakan paralel dengan phase 22)

**Files likely touched:** `lib/server/transactions.ts`, `tests/api/transactions-executor.spec.ts`

**Estimated scope:** S

---

### T84: `POST /api/recurring/[id]/advance`

**Description:** `advanceRule(userId, id, body, today)` di `lib/server/recurring.ts`, satu transaksi DB dengan urutan: replay (`post` dengan `id` yang sudah tersimpan dan aturan sudah melewati `occurrenceDate` → 200 replay; `id` milik user lain atau baris tidak cocok → 409 `TRANSACTION_ID_TAKEN`) → validasi referensi transaksi (akun/kategori milik user, aktif, `kind = CATEGORY_KIND_FOR[rule.type]`) → `update recurring_rules set next_due_date = advanceDate(day_of_month, occurrence_date), updated_at = now() where id and user_id and archived_at is null and next_due_date = occurrence_date returning` (nol baris → 409 `OCCURRENCE_STALE`) → insert transaksi lewat `insertSimple` dengan executor yang sama. `type` transaksi dari aturan, bukan body. Route `app/api/recurring/[id]/advance/route.ts`. `lib/api/errors.ts`: `occurrenceStale()`. Tes merah lebih dulu.

**Acceptance criteria:**

- [ ] `{ action: "post", occurrenceDate: nextDueDate, id, amount, date, accountId, categoryId, description }` → 200 `{ rule, transaction }`, transaksi bertipe aturan, `nextDueDate` maju satu bulan, saldo akun berubah
- [ ] Request yang sama diulang → 200 replay dengan transaksi yang sama, tanpa baris baru, `nextDueDate` tidak maju dua kali. Dua request paralel dengan `id` berbeda (`Promise.all`) → tepat satu 200, satu 409 `OCCURRENCE_STALE`, satu transaksi
- [ ] `{ action: "skip", occurrenceDate }` → 200 `transaction: null`, tidak ada transaksi, `nextDueDate` maju
- [ ] `occurrenceDate` ≠ `nextDueDate` (lebih awal atau lebih lambat) → 409, tidak ada perubahan. `occurrenceDate` di masa depan yang sama dengan `nextDueDate` → 200 (keputusan #10)
- [ ] Kategori `kind` salah, akun terarsip, akun/kategori milik B, `date` masa depan, `amount` 0 → 400 dengan `fields`, dan **`nextDueDate` tidak berubah** serta tidak ada transaksi
- [ ] `id` yang dipakai transaksi user B → 409 `TRANSACTION_ID_TAKEN` tanpa membocorkan isinya. Aturan terarsip → 404. Isolasi: B mendapat 404 untuk `advance` aturan A. Tanpa session → 401
- [ ] Aturan tertinggal 3 bulan: `skip` pertama memajukan satu bulan dan aturan masih di `due`

**Verification:**

- [ ] `pnpm vitest run tests/api/recurring-advance.spec.ts` hijau
- [ ] `pnpm vitest run tests/api` hijau (tidak ada regresi transaksi)

**Dependencies:** T83, T79

**Files likely touched:** `lib/server/recurring.ts`, `app/api/recurring/[id]/advance/route.ts`, `lib/api/errors.ts`, `tests/api/recurring-advance.spec.ts`

**Estimated scope:** M

---

### T85: `advanceRule` di hook + prop `recurring` di `TransactionForm`

**Description:** `hooks/use-recurring.ts`: `advanceRule(ruleId, body)` → `sendJSON`, lalu `invalidate("transactions")` untuk `post` dan `invalidate("recurring")` untuk `skip`; melempar `ApiError` dan mengenali 409 `OCCURRENCE_STALE`. `components/forms/transaction-form.tsx`: prop opsional `recurring={{ rule, occurrenceDate, onDone }}`. Jika ada: default dari aturan (nominal, akun, kategori, deskripsi = nama aturan, tanggal = `occurrenceDate` atau hari ini jika `occurrenceDate` di masa depan), tipe dikunci, `id` transaksi dibuat sekali per form, submit memanggil `advanceRule` bukan `createTransaction`, peringatan saldo tetap jalan, sukses → toast "{nama} dicatat" + `onDone`, 409 `OCCURRENCE_STALE` → toast "Kejadian ini sudah ditangani" + `onDone` + revalidasi. Jalur tanpa prop (termasuk antrean offline modul pwa-offline) tidak berubah.

**Acceptance criteria:**

- [ ] Tes unit: body `post` yang dikirim berisi `id` yang sama pada dua submit dari satu instance form, dan `date` = `occurrenceDate` untuk kejadian terlambat, hari ini untuk kejadian masa depan
- [ ] `advanceRule` memanggil `invalidate("transactions")` untuk `post` dan `invalidate("recurring")` untuk `skip` (mock `mutate`)
- [ ] Semua tes `use-transactions` dan form yang ada tetap hijau; jalur create normal (online dan offline) tidak berubah
- [ ] 409 `OCCURRENCE_STALE` ditangani sebagai toast + tutup, bukan galat field

**Verification:**

- [ ] `pnpm vitest run tests/unit/use-recurring.spec.ts tests/unit/use-transactions.spec.ts` hijau
- [ ] `pnpm build` hijau

**Dependencies:** T84

**Files likely touched:** `hooks/use-recurring.ts`, `components/forms/transaction-form.tsx`, `tests/unit/use-recurring.spec.ts`

**Estimated scope:** M

---

### T86: Kotak Jatuh tempo di dashboard

**Description:** `components/recurring/due-inbox.tsx`: judul "Jatuh tempo", satu baris per aturan di `due` (nama, nominal, "hari ini" / "terlambat 3 hari" sebagai teks), tombol **Catat** (≥ 44 px) membuka `TransactionForm` dengan prop `recurring` di `ResponsiveModal`, dan **Lewati** dengan teks bantuan "Sudah dicatat manual atau tidak terjadi bulan ini" → `advanceRule` + toast tanpa undo. Dipasang di `components/dashboard/dashboard-view.tsx`; tidak dirender jika `due` kosong. Tombol nonaktif saat offline (`useOnlineStatus`) dengan teks "Butuh koneksi". `hideAmounts` dipatuhi. Baris juga tersedia di `/recurring` lewat menu baris (Catat, Lewati). Ukur `/dashboard` sebelum dan sesudah.

**Acceptance criteria:**

- [ ] Tagihan jatuh tempo muncul di dashboard. Catat → form terisi → Simpan → transaksi ada di `/transactions`, saldo dan daftar berubah tanpa reload, baris hilang
- [ ] Lewati → baris hilang, tidak ada transaksi, toast muncul
- [ ] Tap Simpan dua kali cepat → satu transaksi (cek di `/transactions`)
- [ ] `due` kosong → kotak tidak dirender dan tidak menyisakan ruang kosong. Mode pesawat → tombol nonaktif dengan teks "Butuh koneksi"
- [ ] 360 px tanpa horizontal scroll, target ≥ 44 px, status terlambat terbaca tanpa warna, `hideAmounts` menyamarkan nominal
- [ ] Tambahan JS first load `/dashboard` < 3 KB gzip, dicatat di plan-24 § Catatan ukuran

**Verification:**

- [ ] Manual 360×800 dan 1024, light dan dark, plus satu putaran dengan jaringan di-throttle
- [ ] `pnpm build` hijau, ukuran dicatat

**Dependencies:** T85

**Files likely touched:** `components/recurring/due-inbox.tsx`, `components/dashboard/dashboard-view.tsx`, `components/recurring/rule-row.tsx`, `components/recurring/recurring-view.tsx`

**Estimated scope:** M

---

### Checkpoint V

- [ ] Gerbang penuh hijau, termasuk seluruh `tests/api/transactions*.spec.ts` tanpa diedit
- [ ] Alur jatuh tempo → Catat → transaksi + saldo berubah, dan Lewati, sudah dicek di 360×800 dan 1024
- [ ] Tap ganda, mode pesawat, dan aturan tertinggal 3 bulan sudah dicek manual
- [ ] Review dengan Yogi
