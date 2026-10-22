import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { accounts, categories, transactions } from "@/db/schema";
import type { Transaction } from "@/lib/schemas/transaction";
import { createTestUsers } from "../setup/db";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

const { auth } = await import("@/lib/auth");
const collection = await import("@/app/api/transactions/route");
const mockedAuth = vi.mocked(auth as unknown as () => Promise<unknown>);

const noParams = { params: Promise.resolve({}) };

function signInAs(userId: string | null) {
  mockedAuth.mockResolvedValue(userId ? { user: { id: userId } } : null);
}

function list(query = "") {
  return collection.GET(new Request(`http://localhost/api/transactions${query}`), noParams);
}

type Page = { items: Transaction[]; nextCursor: string | null };

async function collect(limit: number) {
  const pages: Page[] = [];
  let cursor: string | null = null;
  do {
    const qs: string = `?limit=${limit}${cursor ? `&cursor=${cursor}` : ""}`;
    const res: Response = await list(qs);
    expect(res.status).toBe(200);
    const page = (await res.json()) as Page;
    pages.push(page);
    cursor = page.nextCursor;
  } while (cursor);
  return pages;
}

const at = (iso: string) => sql`${iso}::timestamptz`;

let userA: string;
let userB: string;
let userC: string;
let cleanup: () => PromiseLike<unknown>;
let accountA: string;
let accountB: string;
let categoryA: string;
let categoryB: string;
// Expected order: date desc, created_at desc, id desc.
const expected: string[] = [];
let deletedId: string;
let spend1: string;
let accountXId: string;
let accountYId: string;
let rowC: Record<string, string>;

beforeAll(async () => {
  const created = await createTestUsers(3);
  [userA, userB, userC] = created.ids;
  cleanup = created.cleanup;

  const rows = await db
    .insert(accounts)
    .values([
      { userId: userA, name: "a", type: "transaction" },
      { userId: userB, name: "b", type: "transaction" },
      { userId: userC, name: "x", type: "transaction" },
      { userId: userC, name: "y", type: "transaction" },
    ])
    .returning({ id: accounts.id, name: accounts.name });
  accountA = rows.find((r) => r.name === "a")!.id;
  accountB = rows.find((r) => r.name === "b")!.id;
  const idOf = (rows_: { id: string; name: string }[], name: string) => rows_.find((r) => r.name === name)!.id;
  const accountX = idOf(rows, "x");
  const accountY = idOf(rows, "y");

  const categoryRows = await db
    .insert(categories)
    .values([
      { userId: userA, name: "a", kind: "income" },
      { userId: userB, name: "b", kind: "income" },
      { userId: userC, name: "inc", kind: "income" },
      { userId: userC, name: "spend1", kind: "spending", spendingType: "needs" },
      { userId: userC, name: "spend2", kind: "spending", spendingType: "wants" },
    ])
    .returning({ id: categories.id, name: categories.name });
  categoryA = categoryRows.find((r) => r.name === "a")!.id;
  categoryB = categoryRows.find((r) => r.name === "b")!.id;
  const inc = idOf(categoryRows, "inc");
  spend1 = idOf(categoryRows, "spend1");
  const spend2 = idOf(categoryRows, "spend2");
  accountXId = accountX;
  accountYId = accountY;

  const c = { userId: userC, accountId: accountX };
  const filterRows = await db
    .insert(transactions)
    .values([
      { ...c, type: "income", amount: 100, date: "2026-10-05", categoryId: inc, description: "r1" },
      { ...c, type: "expense", amount: 200, date: "2026-10-10", categoryId: spend1, description: "r2" },
      { ...c, accountId: accountY, type: "expense", amount: 300, date: "2026-10-15", categoryId: spend2, description: "r3" },
      { ...c, type: "transfer", amount: 400, date: "2026-10-10", toAccountId: accountY, description: "r4" },
      { ...c, type: "adjustment", amount: -500, date: "2026-09-01", description: "r5" },
    ])
    .returning({ id: transactions.id, description: transactions.description });
  rowC = Object.fromEntries(filterRows.map((r) => [r.description, r.id]));

  const base = { categoryId: categoryA, userId: userA, type: "income", amount: 1000, accountId: accountA };
  const inserted = await db
    .insert(transactions)
    .values([
      { ...base, date: "2026-10-02", createdAt: at("2026-10-02T01:00:00.000000Z"), description: "newest day" },
      // Same date, created_at differing only in microseconds: ms-truncated cursors skip or repeat one.
      { ...base, date: "2026-10-01", createdAt: at("2026-10-01T05:00:00.000002Z"), description: "us2" },
      { ...base, date: "2026-10-01", createdAt: at("2026-10-01T05:00:00.000001Z"), description: "us1" },
      { ...base, date: "2026-10-01", createdAt: at("2026-10-01T04:00:00.000000Z"), description: "earlier" },
      { ...base, date: "2026-09-30", createdAt: at("2026-09-30T23:00:00.000000Z"), description: "oldest" },
      {
        ...base,
        date: "2026-10-02",
        createdAt: at("2026-10-02T09:00:00.000000Z"),
        deletedAt: new Date(),
        description: "deleted",
      },
      { userId: userB, type: "income", amount: 5, date: "2026-10-02", accountId: accountB, categoryId: categoryB, description: "foreign" },
    ])
    .returning({ id: transactions.id, description: transactions.description });
  const byDescription = Object.fromEntries(inserted.map((r) => [r.description, r.id]));
  expected.push(...["newest day", "us2", "us1", "earlier", "oldest"].map((d) => byDescription[d]));
  deletedId = byDescription.deleted;
});

afterAll(async () => {
  await cleanup();
});

describe("GET /api/transactions", () => {
  it("lists in date desc, created_at desc order and skips soft-deleted rows", async () => {
    signInAs(userA);
    const page = (await (await list()).json()) as Page;
    expect(page.items.map((t) => t.id)).toEqual(expected);
    expect(page.items.map((t) => t.id)).not.toContain(deletedId);
    expect(page.nextCursor).toBeNull();
  });

  it.each([1, 2])("pages through every row exactly once with limit=%i", async (limit) => {
    signInAs(userA);
    const pages = await collect(limit);
    expect(pages.flatMap((p) => p.items.map((t) => t.id))).toEqual(expected);
    expect(pages.at(-1)!.nextCursor).toBeNull();
    expect(pages.slice(0, -1).every((p) => p.nextCursor)).toBe(true);
  });

  it("returns an id-only shape with deletedAt null", async () => {
    signInAs(userA);
    const [first] = ((await (await list("?limit=1")).json()) as Page).items;
    expect(first).toMatchObject({ type: "income", amount: 1000, date: "2026-10-02", accountId: accountA, deletedAt: null });
  });

  it("rejects limit 0 and 101 with fields.limit", async () => {
    signInAs(userA);
    for (const limit of ["0", "101"]) {
      const res = await list(`?limit=${limit}`);
      expect(res.status).toBe(400);
      expect((await res.json()).error.fields.limit).toBeDefined();
    }
  });

  it.each(["garbage", Buffer.from("[1]").toString("base64url")])("rejects cursor %s with INVALID_CURSOR", async (cursor) => {
    signInAs(userA);
    const res = await list(`?cursor=${cursor}`);
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("INVALID_CURSOR");
  });

  it("never returns another user's rows", async () => {
    signInAs(userB);
    const page = (await (await list()).json()) as Page;
    expect(page.items).toHaveLength(1);
    expect(page.items[0].description).toBe("foreign");
  });

  it("returns 401 without a session", async () => {
    signInAs(null);
    expect((await list()).status).toBe(401);
  });
});

describe("GET /api/transactions filters", () => {
  async function ids(query: string) {
    const res = await list(query);
    expect(res.status).toBe(200);
    return new Set(((await res.json()) as Page).items.map((t) => t.id));
  }
  const rows = (...names: string[]) => new Set(names.map((n) => rowC[n]));

  it("filters by type", async () => {
    signInAs(userC);
    expect(await ids("?type=expense")).toEqual(rows("r2", "r3"));
    expect(await ids("?type=adjustment")).toEqual(rows("r5"));
  });

  it("filters by category", async () => {
    signInAs(userC);
    expect(await ids(`?categoryId=${spend1}`)).toEqual(rows("r2"));
  });

  it("includes both ends of from/to", async () => {
    signInAs(userC);
    expect(await ids("?from=2026-10-10&to=2026-10-15")).toEqual(rows("r2", "r3", "r4"));
    expect(await ids("?from=2026-10-10&to=2026-10-10")).toEqual(rows("r2", "r4"));
    expect(await ids("?to=2026-09-30")).toEqual(rows("r5"));
    expect(await ids("?from=2026-10-11")).toEqual(rows("r3"));
  });

  it("matches a transfer on both its source and destination account", async () => {
    signInAs(userC);
    expect(await ids(`?accountId=${accountXId}`)).toEqual(rows("r1", "r2", "r4", "r5"));
    expect(await ids(`?accountId=${accountYId}`)).toEqual(rows("r3", "r4"));
  });

  it("combines filters", async () => {
    signInAs(userC);
    expect(await ids(`?type=expense&accountId=${accountYId}&from=2026-10-01&to=2026-10-31`)).toEqual(rows("r3"));
    expect(await ids(`?type=income&accountId=${accountYId}`)).toEqual(new Set());
  });

  it("keeps later pages inside the filtered set", async () => {
    signInAs(userC);
    const seen: string[] = [];
    let cursor: string | null = null;
    do {
      const res: Response = await list(`?type=expense&limit=1${cursor ? `&cursor=${cursor}` : ""}`);
      const page = (await res.json()) as Page;
      seen.push(...page.items.map((t) => t.id));
      cursor = page.nextCursor;
    } while (cursor);
    expect(new Set(seen)).toEqual(rows("r2", "r3"));
    expect(seen).toHaveLength(2);
  });

  it.each([
    ["from after to", "?from=2026-10-10&to=2026-10-01", "from"],
    ["unknown type", "?type=foo", "type"],
    ["non-uuid account", "?accountId=abc", "accountId"],
    ["non-uuid category", "?categoryId=abc", "categoryId"],
    ["bad date", "?from=2026-13-01", "from"],
  ])("rejects %s with fields", async (_, query, field) => {
    signInAs(userC);
    const res = await list(query);
    expect(res.status).toBe(400);
    expect((await res.json()).error.fields[field]).toBeDefined();
  });

  it("ignores unknown params", async () => {
    signInAs(userC);
    expect((await ids("?foo=bar")).size).toBe(5);
  });

  it("returns an empty list, not 404, for another user's account or category", async () => {
    signInAs(userC);
    expect(await ids(`?accountId=${accountA}`)).toEqual(new Set());
    expect(await ids(`?categoryId=${categoryA}`)).toEqual(new Set());
  });

  it("never exposes user C's rows to another user through a filter", async () => {
    signInAs(userA);
    expect(await ids(`?accountId=${accountXId}`)).toEqual(new Set());
    expect(await ids(`?categoryId=${spend1}`)).toEqual(new Set());
  });
});
