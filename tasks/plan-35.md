# Plan phase 35: Spec dan persetujuan

Index: [plan.md](plan.md) § Modul `net-worth` · Todo: [todo-35.md](todo-35.md) · Spec: [SPEC-net-worth.md](../SPEC-net-worth.md)

## Tujuan

SPEC-net-worth.md disetujui Yogi, Open questions 1–5 dijawab, dan spec lain yang terdampak konsisten dengannya sebelum ada kode. Phase 36 tidak dimulai tanpa ini.

## Task

- [x] T123: Persetujuan spec dan revisi spec terkait (S, dokumen saja, berhenti untuk Yogi)

## Keputusan

- **T123 adalah gerbang Ask first** (plan.md § Modul `net-worth`, Keputusan perencanaan #1): tabel `net_worth`, constraint `transactions` + view, capability map, keputusan terkunci #8, subtype `gold`.
- **Disetujui Yogi 2026-11-01:** perubahan skema (tabel `net_worth`, constraint `transactions` + view), capability map, keputusan terkunci #8, subtype `gold`, dan menjalankan kedua migrasi di DB bersama setelah SQL `--explain` dibaca. Open questions 1–5 dijawab sesuai usulan spec (#3: kartu Saving dibiarkan).
- Jawaban Open questions dicatat di SPEC-net-worth.md (keputusan terkait dicoret "usulan" → "diputuskan Yogi 2026-11-xx") dan di plan.md § Modul `net-worth` › Open questions, seperti T107.

## Risiko

| Risiko                                              | Dampak | Mitigasi                                                                                 |
| --------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------- |
| Jawaban Open question #1 = "satu akun di beberapa target" | Tinggi | Model data berubah (alokasi). Berhenti dan revisi spec + plan 37 sebelum lanjut         |
| Spec lain tertinggal (transactions, accounts-categories) | Sedang | T123 memperbarui keduanya dalam commit yang sama                                         |

## Checkpoint AH

- [x] Yogi menyetujui SPEC-net-worth.md dan perubahan skema, dan menjawab Open questions 1–5
- [x] SPEC.md, SPEC-transactions.md, SPEC-accounts-categories.md konsisten dengan SPEC-net-worth.md
- [x] `pnpm format:check` hijau
