import { randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { budgets, categories } from "@/db/schema";
import type { Budget } from "@/lib/schemas/budget";
import { createTestUsers } from "../setup/db";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

const { auth } = await import("@/lib/auth");
const route = await import("@/app/api/budgets/route");
const mockedAuth = vi.mocked(auth as unknown as () => Promise<unknown>);

const noParams = { params: Promise.resolve({}) };

function signInAs(userId: string | null) {
  mockedAuth.mockResolvedValue(userId ? { user: { id: userId } } : null);
}

function put(body: unknown) {
  return route.PUT(
    new Request("http://localhost/api/budgets", {
      method: "PUT",
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
    noParams,
  );
}

let userA: string;
let userB: string;
let cleanup: () => PromiseLike<unknown>;
let cat: Record<string, string>;
let catB: string;

function rowsOf(userId: string) {
  return db.select().from(budgets).where(eq(budgets.userId, userId));
}

beforeAll(async () => {
  const created = await createTestUsers(2);
  [userA, userB] = created.ids;
  cleanup = created.cleanup;

  const rows = await db
    .insert(categories)
    .values([
      { userId: userA, name: "Makan", kind: "spending", spendingType: "needs" },
      { userId: userA, name: "Hiburan", kind: "spending", spendingType: "wants" },
      { userId: userA, name: "Transport", kind: "spending", spendingType: "needs" },
      { userId: userA, name: "Lama", kind: "spending", spendingType: "needs", archivedAt: new Date() },
      { userId: userA, name: "Gaji", kind: "income" },
      { userId: userA, name: "Tabungan", kind: "saving" },
      { userId: userB, name: "Makan", kind: "spending", spendingType: "needs" },
    ])
    .returning({ id: categories.id, name: categories.name, userId: categories.userId });
  cat = Object.fromEntries(rows.filter((r) => r.userId === userA).map((r) => [r.name, r.id]));
  catB = rows.find((r) => r.userId === userB)!.id;
});

afterAll(async () => {
  await cleanup();
});

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-23T05:00:00Z"));
  return () => vi.useRealTimers();
});

describe("PUT /api/budgets", () => {
  it("creates a budget and returns it with its period", async () => {
    signInAs(userA);
    const res = await put({ period: "2026-10", items: [{ categoryId: cat.Makan, amount: 1_500_000 }] });
    expect(res.status).toBe(200);
    const [budget] = (await res.json()) as Budget[];
    expect(budget).toEqual({
      id: expect.any(String),
      categoryId: cat.Makan,
      period: "2026-10",
      amount: 1_500_000,
      createdAt: expect.any(String),
      deletedAt: null,
    });
  });

  it("updates the same row on a second PUT", async () => {
    signInAs(userA);
    const [first] = (await (await put({ period: "2026-10", items: [{ categoryId: cat.Makan, amount: 1_500_000 }] })).json()) as Budget[];
    const [second] = (await (await put({ period: "2026-10", items: [{ categoryId: cat.Makan, amount: 1_200_000 }] })).json()) as Budget[];
    expect(second.id).toBe(first.id);
    expect(second.amount).toBe(1_200_000);
    const rows = await db
      .select()
      .from(budgets)
      .where(and(eq(budgets.userId, userA), eq(budgets.categoryId, cat.Makan), eq(budgets.month, 10)));
    expect(rows).toHaveLength(1);
  });

  it("revives a soft-deleted row with the same id and created_at", async () => {
    signInAs(userA);
    const [created] = (await (await put({ period: "2026-09", items: [{ categoryId: cat.Hiburan, amount: 300_000 }] })).json()) as Budget[];
    await db.update(budgets).set({ deletedAt: new Date() }).where(eq(budgets.id, created.id));

    const [revived] = (await (await put({ period: "2026-09", items: [{ categoryId: cat.Hiburan, amount: 250_000 }] })).json()) as Budget[];
    expect(revived).toEqual({ ...created, amount: 250_000, deletedAt: null });
  });

  it("returns budgets in the order of items", async () => {
    signInAs(userA);
    const items = [
      { categoryId: cat.Transport, amount: 400_000 },
      { categoryId: cat.Makan, amount: 0 },
      { categoryId: cat.Hiburan, amount: 1e12 },
    ];
    const body = (await (await put({ period: "2026-08", items })).json()) as Budget[];
    expect(body.map((b) => [b.categoryId, b.amount])).toEqual(items.map((i) => [i.categoryId, i.amount]));
  });

  it("accepts next month", async () => {
    signInAs(userA);
    expect((await put({ period: "2026-11", items: [{ categoryId: cat.Makan, amount: 1 }] })).status).toBe(200);
  });

  it.each(["Gaji", "Tabungan", "Lama", "foreign", "unknown"])(
    "rejects a %s category under fields.items and writes nothing",
    async (name) => {
      signInAs(userA);
      const bad = name === "foreign" ? catB : name === "unknown" ? randomUUID() : cat[name];
      const res = await put({
        period: "2026-07",
        items: [
          { categoryId: cat.Makan, amount: 100_000 },
          { categoryId: bad, amount: 100_000 },
        ],
      });
      expect(res.status).toBe(400);
      expect((await res.json()).error.fields).toEqual({ items: ["Kategori tidak valid"] });
      const july = await db
        .select()
        .from(budgets)
        .where(and(inArray(budgets.userId, [userA, userB]), eq(budgets.month, 7)));
      expect(july).toEqual([]);
    },
  );

  it.each([
    [{ period: "2026-13", items: [{ categoryId: randomUUID(), amount: 1 }] }, "period"],
    [{ period: "2026-12", items: [{ categoryId: randomUUID(), amount: 1 }] }, "period"],
    [{ period: "2026-10", items: [] }, "items"],
    [{ period: "2026-10", items: [{ categoryId: randomUUID(), amount: -1 }] }, "items"],
  ])("rejects an invalid body %j", async (body, field) => {
    signInAs(userA);
    const res = await put(body);
    expect(res.status).toBe(400);
    expect((await res.json()).error.fields[field]).toBeDefined();
  });

  it("rejects a userId in the body", async () => {
    signInAs(userA);
    const res = await put({ period: "2026-10", userId: userB, items: [{ categoryId: cat.Makan, amount: 1 }] });
    expect(res.status).toBe(400);
  });

  it("rejects a body that is not JSON", async () => {
    signInAs(userA);
    const res = await put("{");
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("INVALID_JSON");
  });

  it("does not let user B budget user A's category", async () => {
    signInAs(userB);
    const res = await put({ period: "2026-10", items: [{ categoryId: cat.Makan, amount: 1 }] });
    expect(res.status).toBe(400);
    expect(await rowsOf(userB)).toEqual([]);
  });

  it("returns 401 without a session", async () => {
    signInAs(null);
    const res = await put({ period: "2026-10", items: [{ categoryId: cat.Makan, amount: 1 }] });
    expect(res.status).toBe(401);
  });
});
