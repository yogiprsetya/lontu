import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { accounts, categories, transactions } from "@/db/schema";
import type { Transaction } from "@/lib/schemas/transaction";
import { createTestUsers } from "../setup/db";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

const { auth } = await import("@/lib/auth");
const exportRoute = await import("@/app/api/transactions/export/route");
const listRoute = await import("@/app/api/transactions/route");
const mockedAuth = vi.mocked(auth as unknown as () => Promise<unknown>);

const noParams = { params: Promise.resolve({}) };
const BOM = "﻿";
const HEADER = "Tanggal,Jenis,Jumlah,Akun,Akun Tujuan,Kategori,Needs/Wants,Deskripsi";

function signInAs(userId: string | null) {
  mockedAuth.mockResolvedValue(userId ? { user: { id: userId } } : null);
}

function exportCsv(query = "") {
  return exportRoute.GET(new Request(`http://localhost/api/transactions/export${query}`), noParams);
}

// Response.text() drops a leading BOM, so check the raw bytes.
async function readCsv(res: Response) {
  const bytes = new Uint8Array(await res.arrayBuffer());
  expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
  return new TextDecoder("utf-8", { ignoreBOM: true }).decode(bytes).slice(BOM.length);
}

async function csvText(query = "") {
  const res = await exportCsv(query);
  expect(res.status).toBe(200);
  return readCsv(res);
}

async function csvLines(query = "") {
  return (await csvText(query)).split("\r\n");
}

let userA: string;
let userB: string;
let cleanup: () => PromiseLike<unknown>;

beforeAll(async () => {
  const created = await createTestUsers(2);
  [userA, userB] = created.ids;
  cleanup = created.cleanup;

  const accountRows = await db
    .insert(accounts)
    .values([
      { userId: userA, name: "BCA", type: "transaction" },
      { userId: userA, name: "Dompet Lama", type: "transaction", archivedAt: new Date() },
      { userId: userB, name: "Rahasia B", type: "transaction" },
    ])
    .returning({ id: accounts.id, name: accounts.name });
  const acc = Object.fromEntries(accountRows.map((r) => [r.name, r.id]));

  const categoryRows = await db
    .insert(categories)
    .values([
      { userId: userA, name: "Makan", kind: "spending", spendingType: "needs" },
      {
        userId: userA,
        name: "Hobi Lama",
        kind: "spending",
        spendingType: "wants",
        archivedAt: new Date(),
      },
      { userId: userA, name: "Gaji", kind: "income" },
      { userId: userB, name: "Rahasia Kategori", kind: "spending", spendingType: "needs" },
    ])
    .returning({ id: categories.id, name: categories.name });
  const cat = Object.fromEntries(categoryRows.map((r) => [r.name, r.id]));

  const a = { userId: userA, accountId: acc.BCA };
  await db.insert(transactions).values([
    {
      ...a,
      type: "income",
      amount: 5_000_000,
      date: "2026-10-25",
      categoryId: cat.Gaji,
      description: "Gaji Oktober",
    },
    {
      ...a,
      type: "expense",
      amount: 25_000,
      date: "2026-10-10",
      categoryId: cat.Makan,
      description: "=1+1",
    },
    {
      ...a,
      type: "expense",
      amount: 12_000,
      date: "2026-10-10",
      categoryId: cat.Makan,
      description: 'Nasi, "padang"\nextra',
    },
    {
      ...a,
      accountId: acc["Dompet Lama"],
      type: "expense",
      amount: 9_000,
      date: "2026-09-30",
      categoryId: cat["Hobi Lama"],
      description: "-1",
    },
    {
      ...a,
      type: "transfer",
      amount: 100_000,
      date: "2026-10-05",
      toAccountId: acc["Dompet Lama"],
    },
    { ...a, type: "adjustment", amount: -50_000, date: "2026-10-01" },
    {
      ...a,
      type: "expense",
      amount: 777,
      date: "2026-10-02",
      categoryId: cat.Makan,
      description: "dihapus",
      deletedAt: new Date(),
    },
    {
      userId: userB,
      accountId: acc["Rahasia B"],
      type: "expense",
      amount: 1,
      date: "2026-10-10",
      categoryId: cat["Rahasia Kategori"],
      description: "milik B",
    },
  ]);
});

afterAll(async () => {
  await cleanup();
});

describe("GET /api/transactions/export", () => {
  it("returns text/csv with a BOM, header and attachment filename for the period", async () => {
    signInAs(userA);
    const res = await exportCsv("?from=2026-10-01&to=2026-10-31");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/csv; charset=utf-8");
    expect(res.headers.get("content-disposition")).toBe(
      'attachment; filename="lontu-transaksi-2026-10.csv"',
    );
    expect((await readCsv(res)).startsWith(`${HEADER}\r\n`)).toBe(true);
  });

  it("names the file 'semua' without a range", async () => {
    signInAs(userA);
    expect((await exportCsv()).headers.get("content-disposition")).toBe(
      'attachment; filename="lontu-transaksi-semua.csv"',
    );
  });

  it("has the same rows in the same order as the list under the same filter", async () => {
    signInAs(userA);
    const query = "?from=2026-10-01&to=2026-10-31";
    const listed = (
      (
        await (
          await listRoute.GET(
            new Request(`http://localhost/api/transactions${query}&limit=100`),
            noParams,
          )
        ).json()
      ).items as Transaction[]
    ).map((t) => t.date);
    const lines = (await csvLines(query)).slice(1).join("\r\n");
    // Multi-line cell aside, data rows begin with their date in list order.
    const rowDates = lines.match(/^\d{4}-\d{2}-\d{2}(?=,)/gm);
    expect(rowDates).toEqual(listed);
  });

  it("fills archived account and category names, spending type and Indonesian type labels", async () => {
    signInAs(userA);
    const text = await csvText();
    expect(text).toContain("2026-09-30,Expense,9000,Dompet Lama,,Hobi Lama,Wants,'-1");
    expect(text).toContain("2026-10-25,Income,5000000,BCA,,Gaji,,Gaji Oktober");
    expect(text).toContain("2026-10-05,Transfer,100000,BCA,Dompet Lama,,,");
    expect(text).toContain("2026-10-01,Penyesuaian,-50000,BCA,,,,");
  });

  it("guards formula text but not numbers, and escapes commas, quotes and newlines", async () => {
    signInAs(userA);
    const text = await csvText();
    expect(text).toContain(",'=1+1");
    expect(text).toContain(",-50000,");
    expect(text).toContain('"Nasi, ""padang""\nextra"');
  });

  it("skips soft-deleted rows", async () => {
    signInAs(userA);
    expect(await csvText()).not.toContain("dihapus");
  });

  it("applies the list filters", async () => {
    signInAs(userA);
    const lines = await csvLines("?type=transfer");
    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain("Transfer");
  });

  it("ignores cursor and limit", async () => {
    signInAs(userA);
    const all = await csvLines();
    expect(await csvLines("?limit=1&cursor=junk")).toEqual(all);
  });

  it("returns 400 for invalid filters", async () => {
    signInAs(userA);
    for (const query of ["?type=foo", "?from=2026-10-10&to=2026-10-01", "?accountId=abc"]) {
      expect((await exportCsv(query)).status).toBe(400);
    }
  });

  it("never includes another user's data", async () => {
    signInAs(userB);
    const text = await csvText();
    expect(text).toContain("Rahasia B");
    for (const secret of ["BCA", "Gaji", "Dompet Lama", "Makan"])
      expect(text).not.toContain(secret);

    signInAs(userA);
    const mine = await csvText();
    expect(mine).not.toContain("Rahasia");
    expect(mine).not.toContain("milik B");
  });

  it("returns 401 without a session", async () => {
    signInAs(null);
    expect((await exportCsv()).status).toBe(401);
  });
});
