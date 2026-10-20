# Todo phase 6: API kategori & kontrak lintas modul

Plan: [plan-6.md](plan-6.md) · Index: [plan.md](plan.md) · Spec: [SPEC-accounts-categories.md](../SPEC-accounts-categories.md)

Gerbang setiap task: `pnpm lint && pnpm typecheck && pnpm test`, lalu satu commit conventional.

---

### T14: `GET`/`POST /api/categories`

**Description:** `lib/schemas/category.ts` berisi enum kind/spendingType, `categoryCreateSchema` (discriminated union), `categoryRenameSchema`, tipe `Category`, dan `CATEGORY_KIND_FOR` (`income→income`, `saving→saving`, `expense→spending`). Route `GET` (urutan spec, `?include=archived`) dan `POST` (409 `CATEGORY_NAME_TAKEN`) di `app/api/categories/route.ts`. Ekspor ulang `DEFAULT_CATEGORIES` boleh memakai tipe dari schema ini.

**Acceptance criteria:**
- [x] `POST` spending tanpa `spendingType`, income dengan `spendingType`, atau `kind` tidak dikenal → 400 dengan `fields`. Valid → 201 `Category`
- [x] Nama sama di kind berbeda → 201. Di kind sama (beda huruf besar/kecil, termasuk terarsip) → 409. `GET` mengembalikan urutan income → saving → spending(needs → wants) → nama
- [x] Isolasi: `GET` user B tidak berisi kategori A. Tanpa session → 401

**Verification:**
- [x] `tests/unit/category-schema.spec.ts` dan `tests/api/categories.spec.ts` (bagian GET/POST) hijau
- [x] `pnpm build` hijau

**Dependencies:** T11 (kategori default ada di fixture urutan), T12 (`isUniqueViolation`, pola route)

**Files likely touched:** `lib/schemas/category.ts`, `app/api/categories/route.ts`, `lib/default-categories.ts`, `tests/unit/category-schema.spec.ts`, `tests/api/categories.spec.ts`

**Estimated scope:** M

---

### T15: Rename, arsip, dan restore kategori

**Description:** `PATCH` (hanya `name`, `z.strictObject`) dan `DELETE` (arsip) di `app/api/categories/[id]/route.ts`, `POST` restore di `.../restore/route.ts`. Bentrok nama saat rename → 409 lewat `isUniqueViolation`.

**Acceptance criteria:**
- [x] `PATCH { kind: "income" }` atau `{ spendingType: "wants" }` → 400. `{ name: "Makan Siang" }` → 200, dan transaksi expense yang mereferensikannya tetap menunjuk `category_id` yang sama
- [x] Rename ke nama yang sudah ada di kind yang sama → 409. Arsip/restore idempoten, baris tidak pernah terhapus
- [x] Id bukan UUID, tidak ada, atau milik user B → 404 `CATEGORY_NOT_FOUND`

**Verification:**
- [x] `tests/api/categories.spec.ts` (bagian PATCH/DELETE/restore + isolasi) hijau

**Dependencies:** T14

**Files likely touched:** `app/api/categories/[id]/route.ts`, `app/api/categories/[id]/restore/route.ts`, `tests/api/categories.spec.ts`

**Estimated scope:** S

---

### T16: Helper kepemilikan `lib/server/ownership.ts`

**Description:** `findOwnedAccounts(userId, ids)` dan `findOwnedCategory(userId, id)` sesuai signature di spec. Keduanya `import "server-only"` dan mengembalikan baris aktif maupun terarsip. Tidak ada route baru. Helper ini dipakai modul `transactions`.

**Acceptance criteria:**
- [x] `findOwnedAccounts(A, [akunA1, akunA2, akunB1, uuidAcak])` → hanya A1 dan A2, termasuk `archivedAt` jika terarsip. `ids` kosong → `[]` tanpa query
- [x] `findOwnedCategory(A, kategoriB)` → `undefined`. `findOwnedCategory(A, kategoriA)` → `{ id, kind, archivedAt }`

**Verification:**
- [x] `tests/api/ownership.spec.ts` hijau

**Dependencies:** T12, T14 (tipe `CategoryKind`)

**Files likely touched:** `lib/server/ownership.ts`, `tests/api/ownership.spec.ts`

**Estimated scope:** S

---

### Checkpoint E: setelah T14–T16

- [x] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` hijau
- [x] Acceptance criteria API di SPEC-accounts-categories.md tercentang
- [ ] Review dengan Yogi sebelum phase 7
