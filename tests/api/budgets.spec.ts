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
const item = await import("@/app/api/budgets/[id]/route");
const restoreRoute = await import("@/app/api/budgets/[id]/restore/route");
const { budgetUsage } = await import("@/lib/server/queries/budget-usage");
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

function del(id: string) {
  return item.DELETE(new Request(`http://localhost/api/budgets/${id}`, { method: "DELETE" }), {
    params: Promise.resolve({ id }),
  });
}

function restore(id: string) {
  return restoreRoute.POST(
    new Request(`http://localhost/api/budgets/${id}/restore`, { method: "POST" }),
    {
      params: Promise.resolve({ id }),
    },
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
      {
        userId: userA,
        name: "Lama",
        kind: "spending",
        spendingType: "needs",
        archivedAt: new Date(),
      },
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
    const res = await put({
      period: "2026-10",
      items: [{ categoryId: cat.Makan, amount: 1_500_000 }],
    });
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
    const [first] = (await (
      await put({ period: "2026-10", items: [{ categoryId: cat.Makan, amount: 1_500_000 }] })
    ).json()) as Budget[];
    const [second] = (await (
      await put({ period: "2026-10", items: [{ categoryId: cat.Makan, amount: 1_200_000 }] })
    ).json()) as Budget[];
    expect(second.id).toBe(first.id);
    expect(second.amount).toBe(1_200_000);
    const rows = await db
      .select()
      .from(budgets)
      .where(
        and(eq(budgets.userId, userA), eq(budgets.categoryId, cat.Makan), eq(budgets.month, 10)),
      );
    expect(rows).toHaveLength(1);
  });

  it("revives a soft-deleted row with the same id and created_at", async () => {
    signInAs(userA);
    const [created] = (await (
      await put({ period: "2026-09", items: [{ categoryId: cat.Hiburan, amount: 300_000 }] })
    ).json()) as Budget[];
    await db.update(budgets).set({ deletedAt: new Date() }).where(eq(budgets.id, created.id));

    const [revived] = (await (
      await put({ period: "2026-09", items: [{ categoryId: cat.Hiburan, amount: 250_000 }] })
    ).json()) as Budget[];
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
    expect(body.map((b) => [b.categoryId, b.amount])).toEqual(
      items.map((i) => [i.categoryId, i.amount]),
    );
  });

  it("accepts next month", async () => {
    signInAs(userA);
    expect(
      (await put({ period: "2026-11", items: [{ categoryId: cat.Makan, amount: 1 }] })).status,
    ).toBe(200);
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
    const res = await put({
      period: "2026-10",
      userId: userB,
      items: [{ categoryId: cat.Makan, amount: 1 }],
    });
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

describe("DELETE /api/budgets/[id] and restore", () => {
  async function createBudget(month: string, categoryId: string, amount = 100_000) {
    signInAs(userA);
    const [budget] = (await (
      await put({ period: month, items: [{ categoryId, amount }] })
    ).json()) as Budget[];
    return budget;
  }

  it("soft-deletes, keeps the row, and turns the usage item back to none", async () => {
    const budget = await createBudget("2026-06", cat.Transport);
    const res = await del(budget.id);
    expect(res.status).toBe(200);
    const deleted = (await res.json()) as Budget;
    expect(deleted).toEqual({ ...budget, deletedAt: expect.any(String) });

    const [row] = await db.select().from(budgets).where(eq(budgets.id, budget.id));
    expect(row.deletedAt).not.toBeNull();
    const usage = await budgetUsage(userA, "2026-06");
    expect(usage.items.find((i) => i.categoryId === cat.Transport)).toMatchObject({
      budgetId: null,
      budget: null,
      status: "none",
    });
  });

  it("is idempotent: deleting again keeps the first deleted_at", async () => {
    const budget = await createBudget("2026-05", cat.Transport);
    const first = (await (await del(budget.id)).json()) as Budget;
    const second = (await (await del(budget.id)).json()) as Budget;
    expect(second.deletedAt).toBe(first.deletedAt);
  });

  it("restores, idempotently", async () => {
    const budget = await createBudget("2026-04", cat.Transport);
    await del(budget.id);
    expect(await (await restore(budget.id)).json()).toEqual(budget);
    expect(await (await restore(budget.id)).json()).toEqual(budget);
  });

  it("restores a budget whose category was archived since", async () => {
    const [extra] = await db
      .insert(categories)
      .values({ userId: userA, name: "Sementara", kind: "spending", spendingType: "wants" })
      .returning({ id: categories.id });
    const budget = await createBudget("2026-03", extra.id);
    await del(budget.id);
    await db.update(categories).set({ archivedAt: new Date() }).where(eq(categories.id, extra.id));

    const res = await restore(budget.id);
    expect(res.status).toBe(200);
    expect(((await res.json()) as Budget).deletedAt).toBeNull();
  });

  it.each(["not-a-uuid", randomUUID()])("returns 404 BUDGET_NOT_FOUND for id %s", async (id) => {
    signInAs(userA);
    for (const res of [await del(id), await restore(id)]) {
      expect(res.status).toBe(404);
      expect((await res.json()).error.code).toBe("BUDGET_NOT_FOUND");
    }
  });

  it("returns 404 to user B for user A's budget and leaves it alone", async () => {
    const budget = await createBudget("2026-02", cat.Transport);
    signInAs(userB);
    expect((await del(budget.id)).status).toBe(404);
    expect((await restore(budget.id)).status).toBe(404);
    const [row] = await db.select().from(budgets).where(eq(budgets.id, budget.id));
    expect(row.deletedAt).toBeNull();
  });

  it("returns 401 without a session", async () => {
    signInAs(null);
    expect((await del(randomUUID())).status).toBe(401);
    expect((await restore(randomUUID())).status).toBe(401);
  });
});
