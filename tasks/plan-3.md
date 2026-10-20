# Plan phase 3: UI shell

Index: [plan.md](plan.md) · Todo: [todo-3.md](todo-3.md) · Spec: [SPEC-foundation.md](../SPEC-foundation.md) §5–§6

## Tujuan

Pengguna yang login melihat app shell responsif: bottom nav di mobile, sidebar di desktop, tombol + ke empat form, halaman placeholder, dark mode, `ResponsiveModal`, dan manifest yang installable.

## Task

- [ ] T5: Providers, root layout, token warna, store Zustand (M)
- [ ] T6: App shell responsif dan halaman placeholder (M)
- [ ] T7: `ResponsiveModal` (S)
- [ ] T8: Manifest dan ikon PWA (S)

Urutan: T5 → T6 → (T7, T8). T5 hanya bergantung pada T1, jadi bisa dikerjakan paralel dengan phase 1–2. T6 butuh T3 untuk session dan logout.

## Keputusan

- **Session dibaca di balik `<Suspense>`.** Dengan `cacheComponents`, layout `(app)` tidak boleh membaca session di static shell. Ikuti `node_modules/next/dist/docs/01-app/02-guides/authentication-with-cache-components.md`.
- Zustand hanya untuk state UI (`period`, `modal`, `hideAmounts`). Data server tidak disalin ke store.
- Komponen shadcn ditambah lewat CLI, tidak ditulis manual.

## Risiko

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Layout `(app)` memicu error "uncached data outside Suspense" saat build | Sedang | Bungkus bagian yang membaca session di `<Suspense>`. `pnpm build` menjadi verifikasi T6 |
| Kontras token `--income`/`--expense`/`--budget`/`--transfer` gagal 4.5:1 di salah satu tema | Rendah | Cek setiap pasangan warna dengan checker kontras di T5 |

## Pertanyaan

- **Open question #4 (ikon maskable):** buat dari ikon 512 dengan padding safe zone, atau tunda? Dibutuhkan untuk T8.
- **Open question #5 (font):** pertahankan Inter saja, atau ketiga font? Dibutuhkan untuk T5.

## Checkpoint C

- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` hijau
- [ ] Shell benar di 360 px dan 1024 px, dark mode bertahan setelah reload
- [ ] Lighthouse: manifest installable
- [ ] Review dengan Yogi
