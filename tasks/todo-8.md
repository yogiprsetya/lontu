# Todo phase 8: Catat transaksi

Plan: [plan-8.md](plan-8.md) · Index: [plan.md](plan.md) · Spec: [SPEC-transactions.md](../SPEC-transactions.md)

Gerbang setiap task: `pnpm lint && pnpm typecheck && pnpm test`, lalu satu commit conventional. Task UI juga butuh `pnpm build` dan cek manual di 360×800 dan 1024.

---

### T22: `POST /api/transactions` income/expense/saving

**Description:** `lib/schemas/transaction.ts`: tipe `Transaction`, `transactionCreateSchema` (`discriminatedUnion("type")` dengan `z.strictObject`, tiga tipe dulu), aturan `amount` (`z.int()` 1..1e12), `date` (`z.iso.date()` + 2000-01-01 ≤ date ≤ hari ini Jakarta, "hari ini" dibaca saat parse, tes memakai fake timer), `description` (trim, maks 200, kosong → `null`). `lib/api/errors.ts`: `fieldError(field, message)` dan `transactionNotFound()`. `lib/server/transactions.ts`: `createTransaction(userId, input)` memeriksa akun dan kategori lewat `findOwnedAccounts`/`findOwnedCategory` (milik user, aktif, `kind` = `CATEGORY_KIND_FOR[type]`), insert, lalu mengembalikan `Transaction`. `app/api/transactions/route.ts` `POST` → 201 `{ transaction, fee: null }`. Tes ditulis lebih dulu.

**Acceptance criteria:**

- [x] `POST` expense 25.000 pada akun bersaldo 100.000 → 201, `GET /api/accounts` menunjukkan `balance = 75000`. Income menambah, saving mengurangi
- [x] `amount` 0, −1, 1.5, `"100"`, > 1e12 → 400 `fields.amount`. `date` salah format, sebelum 2000-01-01, atau besok (Jakarta) → 400 `fields.date`. `description` 201 karakter → 400, `""` → `null`. `type: "adjustment"` dan (sementara) `type: "transfer"` → 400. Field tak dikenal (`userId`, `fee`) → 400
- [x] Referensi: akun/kategori milik user lain, tidak ada, atau terarsip → 400 pada `fields.accountId`/`fields.categoryId` dengan pesan yang sama untuk asing dan tidak ada. Expense dengan kategori income → 400 `fields.categoryId`. Income tanpa kategori → 400
- [x] Tanpa session → 401 `UNAUTHORIZED`. Body bukan JSON → 400 `INVALID_JSON`

**Verification:**

- [x] `pnpm vitest run tests/unit/transaction-schema.spec.ts tests/api/transactions.spec.ts` hijau (tes API memakai user `test-<uuid>` dan memanggil `POST(req, ctx)` langsung)
- [x] `pnpm build` hijau

**Dependencies:** None (accounts-categories selesai)

**Files likely touched:** `lib/schemas/transaction.ts`, `lib/api/errors.ts`, `lib/server/transactions.ts`, `app/api/transactions/route.ts`, `tests/unit/transaction-schema.spec.ts`, `tests/api/transactions.spec.ts`

**Estimated scope:** M (6 file, dua di antaranya tes)

---

### T23: `POST` transfer + biaya admin atomik

**Description:** Tambah anggota `transfer` ke `transactionCreateSchema`: `toAccountId`, `fee?: { amount, categoryId }`, dan `refine` `toAccountId ≠ accountId` (path `toAccountId`). `createTransaction` untuk transfer memeriksa kedua akun (aktif, milik user) dan, jika ada `fee`, kategori `kind = spending`; semua pemeriksaan selesai sebelum insert pertama. Transfer dan baris biaya (`type = expense`, `account_id` = sumber, `date` sama, `description = "Biaya admin transfer"`) ditulis dalam satu `db.transaction`. Respons `{ transaction, fee }`. Galat `fee.*` dilaporkan di `fields.fee`.

**Acceptance criteria:**

- [x] Transfer 10.000 A → B: A turun 10.000, B naik 10.000, `categoryId = null`, `fee = null`. `toAccountId = accountId` → 400 `fields.toAccountId`. Transfer dengan `categoryId` di body → 400
- [x] Transfer + `fee { amount: 2500, categoryId: <spending> }` → dua baris, A turun 12.500, respons `fee` terisi dengan `description = "Biaya admin transfer"`
- [x] `fee.categoryId` berkategori income, `fee.amount = 0`, atau akun tujuan terarsip/asing → 400 dan **tidak ada baris** tertulis (hitung baris user sebelum dan sesudah)
- [x] Akun sumber atau tujuan milik user lain → 400 pada `fields.accountId`/`fields.toAccountId`

**Verification:**

- [x] `pnpm vitest run tests/unit/transaction-schema.spec.ts tests/api/transactions.spec.ts` hijau
- [x] Tes T22 yang menolak `type: "transfer"` diganti dengan skenario di atas

**Dependencies:** T22

**Files likely touched:** `lib/schemas/transaction.ts`, `lib/server/transactions.ts`, `tests/unit/transaction-schema.spec.ts`, `tests/api/transactions.spec.ts`

**Estimated scope:** M (4 file)

---

### T24: Form income/expense/saving di `/add/[type]`

**Description:** `hooks/use-transactions.ts`: `isTransactionsKey` (cocok `/api/transactions…` **dan** `$inf$/api/transactions…`), `revalidateTransactions()`, `createTransaction(input)` (`sendJSON`, lalu `revalidateTransactions()` + `revalidateAccounts()`). `components/forms/account-picker.tsx` (akun aktif, satu akun → terpilih otomatis, empty state dengan tombol "Tambah akun" → `useUIStore().open("manageAccounts")`) dan `category-picker.tsx` (hanya `kind` yang cocok lewat `CATEGORY_KIND_FOR`, expense dikelompokkan Needs/Wants, empty state "Tambah kategori" → `open("manageCategories", { kind })`). `components/forms/transaction-form.tsx` (react-hook-form + schema, `MoneyInput` tanpa ±, `<input type="date">` native default `todayInJakarta()` dengan `max` hari ini, deskripsi opsional, `applyServerErrors`, tombol nonaktif + spinner). `app/(app)/add/[type]/page.tsx` merender form untuk `income|expense|saving`; `transfer` tetap placeholder sampai T26. Sukses → toast + `router.push("/transactions")`.

**Acceptance criteria:**

- [x] - → Expense di 360 px → isi nominal, akun, kategori → Simpan → toast, mendarat di `/transactions`. Saldo akun di Kelola akun sudah berubah tanpa reload
- [x] Picker kategori hanya memuat `kind` yang cocok dengan tipe (expense: grup Needs dan Wants). Tanpa akun atau kategori yang cocok → empty state, tombol membuka modal Kelola, dan isian form tidak hilang
- [x] Error validasi dari server tampil di field yang sesuai. Satu akun aktif → terpilih otomatis. Tanggal default hari ini (Jakarta) dan tidak bisa melewati hari ini
- [x] Input 16 px, target sentuh ≥ 44 px, tanpa horizontal scroll di 360 px

**Verification:**

- [x] `tests/unit/use-transactions.spec.ts`: `isTransactionsKey` benar untuk `/api/transactions`, `/api/transactions?type=expense`, `/api/transactions/totals?…`, `$inf$/api/transactions?…`, dan salah untuk `/api/accounts`, `["/api/transactions"]`, `undefined`
- [x] `pnpm build` hijau. Manual 360×800 dan 1024 (alur penuh, termasuk dark mode)

**Catatan:** Diverifikasi headless (Playwright + Chrome, `next start`, user `test-<uuid>`): 360 → satu akun terpilih otomatis, tanggal default dan `max` hari ini (Jakarta), submit kosong → pesan field tanpa request, picker expense hanya berisi grup Needs/Wants, simpan 25.000 → toast, mendarat di `/transactions`, saldo di view 75.000. Akun diarsipkan setelah halaman dimuat → pesan server "Akun sudah diarsipkan" di field akun. Tanpa kategori income → empty state membuka Kelola kategori di tab Income, nominal tetap terisi setelah modal ditutup. Tanpa horizontal scroll, input 16 px, target ≥ 44 px di 360 dan 1024 dark. Saldo dicek lewat view, bukan dengan membuka modal Kelola akun (`createTransaction` memanggil `revalidateAccounts`). Schema dipecah menjadi `simpleCreateSchema`/`transferCreateSchema` supaya tiap form memakai schema-nya sendiri.

**Temuan untuk T28:** SWR 2.5.1 `mutate(filter)` melewati key `$inf$` dan memanggil filter dengan key halaman (`_k`). Me-mutate key halaman tidak memicu revalidasi `useSWRInfinite`. `isTransactionsKey` tetap mencocokkan kedua bentuk sesuai rencana, tetapi T28 perlu memakai `mutate` dari `useSWRInfinite` atau `unstable_serialize` (fallback di risiko modul).

**Dependencies:** T22

**Files likely touched:** `hooks/use-transactions.ts`, `components/forms/account-picker.tsx`, `components/forms/category-picker.tsx`, `components/forms/transaction-form.tsx`, `app/(app)/add/[type]/page.tsx`, `tests/unit/use-transactions.spec.ts`

**Estimated scope:** M (6 file)

---

### T25: Peringatan saldo kurang

**Description:** `lib/transaction-balance.ts`: `balanceAfter({ balance, subtype, effect, previousEffect = 0 })` mengembalikan `{ after, short }`, dengan `after = balance − previousEffect + effect` dan `short = after < 0 && subtype !== "credit_card"`. `effect` adalah perubahan bertanda pada akun (expense/saving/transfer sumber: negatif). Hubungkan ke `transaction-form.tsx`: teks peringatan di bawah picker akun ("Saldo {akun} Rp… tidak cukup, akan menjadi −Rp…"), mengikuti `hideAmounts`. Tombol Simpan tetap aktif.

**Acceptance criteria:**

- [x] Expense/saving yang melebihi saldo akun (bukan `credit_card`) → peringatan tampil, Simpan tetap bisa ditekan dan tersimpan. Income dan akun `credit_card` tidak memicu peringatan
- [x] `balanceAfter` memperhitungkan `previousEffect` (mode edit): saldo DB 70.000 sesudah expense lama 30.000, diubah menjadi 90.000 → `after = 10000`, `short = false`
- [x] Dengan `hideAmounts` aktif, peringatan tidak menampilkan nominal

**Verification:**

- [x] `tests/unit/transaction-balance.spec.ts` hijau (kasus: tepat nol bukan kurang, negatif, `credit_card`, `previousEffect`, efek positif)
- [x] Manual: expense melebihi saldo di 360 px

**Catatan:** `short` juga mensyaratkan `effect < 0`, karena rumus di deskripsi akan memperingatkan income ke akun yang sudah minus, padahal AC melarang income memicu peringatan. Peringatan dipasang sebagai `hint` di field akun, jadi ikut `aria-describedby` picker, berwarna `text-expense`. Diverifikasi headless di 360: tepat nol → tanpa peringatan, 150.000 dari 100.000 → "Saldo BCA Rp100.000 tidak cukup, akan menjadi -Rp50.000.", akun `credit_card` → tanpa peringatan, `hideAmounts` → "Saldo BCA tidak cukup.", Simpan tetap jalan (saldo −50.000), income ke akun minus → tanpa peringatan.

**Dependencies:** T24

**Files likely touched:** `lib/transaction-balance.ts`, `tests/unit/transaction-balance.spec.ts`, `components/forms/transaction-form.tsx`

**Estimated scope:** S

---

### T26: Form transfer + biaya admin

**Description:** Tambah komponen shadcn `checkbox` lewat CLI. `components/forms/transfer-form.tsx`: akun sumber, akun tujuan (tanpa akun sumber), nominal, tanggal, deskripsi, checkbox "Biaya admin" yang membuka nominal + picker kategori spending (wajib saat dicentang, galat dari `fields.fee` tampil di blok ini). Peringatan saldo memakai `balanceAfter` dengan `effect = −(nominal + fee)`. `add/[type]/page.tsx` merender form ini untuk `transfer`. Toast "Transfer dan biaya admin tersimpan" bila ada fee.

**Acceptance criteria:**

- [x] Transfer A → B tersimpan: saldo A turun, B naik, tanpa tanda kategori. Akun tujuan tidak memuat akun sumber, dan mengganti sumber menghapus pilihan tujuan yang sama
- [x] Centang "Biaya admin" tanpa nominal atau kategori → pesan di blok itu, tanpa request. Dengan keduanya → dua baris tertulis, saldo A turun nominal + fee
- [x] Peringatan saldo menghitung nominal + fee. Tanpa akun cukup (kurang dari dua akun aktif) → empty state dengan tombol "Tambah akun"
- [x] Tombol Simpan sticky di atas bottom nav, 360 px tanpa horizontal scroll (keyboard virtual belum dicek di ponsel)

**Verification:**

- [x] `tests/unit/transaction-balance.spec.ts` diperluas untuk efek transfer + fee
- [x] `pnpm build` hijau. Manual 360×800 dan 1024 (headless). Keyboard virtual perlu dicek di ponsel

**Catatan:** Diverifikasi headless di 360 dan 1024 dark: satu akun → empty state membuka Kelola akun; tujuan tidak memuat akun asal, mengganti asal ke akun tujuan mengosongkan tujuan; centang Biaya admin tanpa isi → "Pilih kategori" dan pesan nominal di blok biaya tanpa request; peringatan menghitung 90.000 + 15.000 dari 100.000 ("akan menjadi -Rp5.000"); simpan → toast "Transfer dan biaya admin tersimpan", dua baris (transfer tanpa kategori + expense "Biaya admin transfer"), saldo BCA −5.000 dan GoPay +90.000; baris checkbox 44 px. Form ini halaman, bukan drawer, jadi Simpan dibuat `sticky` di atas bottom nav (`StickySubmit`, dipakai juga oleh form T24). Nilai biaya disimpan selama checkbox mati dan baru divalidasi/dikirim saat dicentang (resolver membuang `fee`). Galat server `fields.fee` tampil sebagai satu pesan di bawah blok biaya. Tes `balanceAfter` untuk transfer + fee langsung hijau karena fungsinya sudah menangani efek gabungan. Hook peringatan dipindah ke `components/forms/balance-warning.tsx`.

**Dependencies:** T23, T25

**Files likely touched:** `components/ui/checkbox.tsx` (CLI), `components/forms/transfer-form.tsx`, `app/(app)/add/[type]/page.tsx`, `tests/unit/transaction-balance.spec.ts`

**Estimated scope:** M (4 file)

---

### Checkpoint G

- [x] Gerbang penuh hijau: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
- [x] Acceptance criteria pembuatan di SPEC-transactions.md tercentang (API baris 200–204, UI error/empty state). Butir yang juga butuh daftar/edit menunggu phase 9–11
- [x] Manual (headless): empat tipe tercatat dari 360×800, saldo benar, biaya admin menghasilkan dua baris
- [x] Review dengan Yogi sebelum phase 9
