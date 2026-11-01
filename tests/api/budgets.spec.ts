import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { budgets, categories } from "@/db/schema";
import type { BudgetVersion } from "@/lib/schemas/budget";
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

function post(body: unknown) {
  return route.POST(
    new Request("http://localhost/api/budgets", {
      method: "POST",
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
    noParams,
  );
}

function patch(id: string, body: unknown) {
  return item.PATCH(
    new Request(`http://localhost/api/budgets/${id}`, {
      method: "PATCH",
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
    { params: Promise.resolve({ id }) },
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
    { params: Promise.resolve({ id }) },
  );
}

type ErrorBody = { error: { code: string; message: string; fields?: Record<string, string[]> } };

let userA: string;
let userB: string;
let cleanup: () => PromiseLike<unknown>;
let cat: Record<string, string>;
let catB: string;

function versionsOf(userId: string) {
  return db.select().from(budgets).where(eq(budgets.userId, userId));
}

const jajanHiburan = () => ({
  name: "Jajan & Hiburan",
  spendingType: "wants",
  amount: 800_000,
  categoryIds: [cat.Jajan, cat.Hiburan],
});

beforeAll(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-15T05:00:00Z"));
  const created = await createTestUsers(2);
  [userA, userB] = created.ids;
  cleanup = created.cleanup;

  const rows = await db
    .insert(categories)
    .values([
      { userId: userA, name: "Makan", kind: "spending", spendingType: "needs" },
      { userId: userA, name: "Jajan", kind: "spending", spendingType: "wants" },
      { userId: userA, name: "Hiburan", kind: "spending", spendingType: "wants" },
      { userId: userA, name: "Hobi", kind: "spending", spendingType: "wants" },
      {
        userId: userA,
        name: "Lama",
        kind: "spending",
        spendingType: "wants",
        archivedAt: new Date(),
      },
      { userId: userA, name: "Gaji", kind: "income" },
      { userId: userA, name: "Tabungan", kind: "saving" },
      { userId: userB, name: "Jajan", kind: "spending", spendingType: "wants" },
    ])
    .returning({ id: categories.id, name: categories.name, userId: categories.userId });
  cat = Object.fromEntries(rows.filter((r) => r.userId === userA).map((r) => [r.name, r.id]));
  catB = rows.find((r) => r.userId === userB)!.id;
});

beforeEach(async () => {
  await db.delete(budgets).where(eq(budgets.userId, userA));
  await db.delete(budgets).where(eq(budgets.userId, userB));
});

afterAll(async () => {
  vi.useRealTimers();
  await cleanup();
});

describe("/api/budgets", () => {
  it("only takes POST: the per-category GET and PUT are gone (Next answers 405)", () => {
    expect(Object.keys(route)).toEqual(["POST"]);
  });
});

describe("POST /api/budgets", () => {
  it("creates a budget in the current month that earlier months do not show", async () => {
    signInAs(userA);
    const res = await post(jajanHiburan());
    expect(res.status).toBe(201);
    const body = (await res.json()) as BudgetVersion;
    expect(body).toEqual({
      id: expect.any(String),
      name: "Jajan & Hiburan",
      spendingType: "wants",
      amount: 800_000,
      categoryIds: [cat.Jajan, cat.Hiburan],
      period: "2026-10",
      deletedAt: null,
    });
    expect((await budgetUsage(userA, "2026-10")).items.map((i) => i.budgetId)).toEqual([body.id]);
    expect((await budgetUsage(userA, "2026-09")).items).toEqual([]);
  });

  it("trims the name", async () => {
    signInAs(userA);
    const res = await post({ ...jajanHiburan(), name: "  Jajan  " });
    expect(((await res.json()) as BudgetVersion).name).toBe("Jajan");
  });

  it.each(["Makan", "Gaji", "Tabungan", "Lama", "foreign", "unknown"])(
    "rejects category %s as invalid and writes nothing",
    async (name) => {
      signInAs(userA);
      const id = name === "foreign" ? catB : name === "unknown" ? randomUUID() : cat[name];
      const res = await post({ ...jajanHiburan(), categoryIds: [cat.Jajan, id] });
      expect(res.status).toBe(400);
      const body = (await res.json()) as ErrorBody;
      expect(body.error.fields).toEqual({ categoryIds: ["Kategori tidak valid"] });
      expect(await versionsOf(userA)).toEqual([]);
    },
  );

  it("rejects a category another budget uses this month", async () => {
    signInAs(userA);
    await post(jajanHiburan());
    const res = await post({ ...jajanHiburan(), name: "Hobi", categoryIds: [cat.Hobi, cat.Jajan] });
    expect(res.status).toBe(400);
    const body = (await res.json()) as ErrorBody;
    expect(body.error.fields).toEqual({ categoryIds: ["Kategori sudah dipakai budget lain"] });
    expect(await versionsOf(userA)).toHaveLength(1);
  });

  it("rejects a name another shown budget has, ignoring case", async () => {
    signInAs(userA);
    await post(jajanHiburan());
    const res = await post({ ...jajanHiburan(), name: "JAJAN & hiburan", categoryIds: [cat.Hobi] });
    expect(res.status).toBe(409);
    expect(((await res.json()) as ErrorBody).error.code).toBe("BUDGET_NAME_TAKEN");
  });

  it("frees the name and categories of a budget that has ended", async () => {
    signInAs(userA);
    await db.insert(budgets).values({
      userId: userA,
      budgetId: randomUUID(),
      name: "Jajan & Hiburan",
      spendingType: "wants",
      year: 2026,
      month: 10,
      amount: 1,
      categoryIds: [cat.Jajan],
      deletedAt: new Date(),
    });
    expect((await post(jajanHiburan())).status).toBe(201);
  });

  it("lets two users use the same name", async () => {
    signInAs(userA);
    await post(jajanHiburan());
    signInAs(userB);
    expect((await post({ ...jajanHiburan(), categoryIds: [catB] })).status).toBe(201);
  });

  it("lets exactly one of two parallel requests claim a category", async () => {
    signInAs(userA);
    const results = await Promise.all([
      post({ ...jajanHiburan(), name: "Satu", categoryIds: [cat.Jajan] }),
      post({ ...jajanHiburan(), name: "Dua", categoryIds: [cat.Jajan, cat.Hobi] }),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 400]);
    expect(await versionsOf(userA)).toHaveLength(1);
  });

  it.each([
    { name: "" },
    { name: "x".repeat(51) },
    { amount: -1 },
    { amount: 1.5 },
    { amount: "100" },
    { amount: 1e12 + 1 },
    { categoryIds: [] },
    { categoryIds: ["not-a-uuid"] },
    { spendingType: "saving" },
    { spendingType: undefined },
    { userId: "test-x" },
    { period: "2026-11" },
  ])("rejects an invalid body %j", async (patch) => {
    signInAs(userA);
    const res = await post({ ...jajanHiburan(), ...patch });
    expect(res.status).toBe(400);
    expect(((await res.json()) as ErrorBody).error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects the same category twice", async () => {
    signInAs(userA);
    const res = await post({ ...jajanHiburan(), categoryIds: [cat.Jajan, cat.Jajan] });
    expect(res.status).toBe(400);
  });

  it("rejects a body that is not JSON", async () => {
    signInAs(userA);
    expect((await post("{")).status).toBe(400);
  });

  it("returns 401 without a session", async () => {
    signInAs(null);
    expect((await post(jajanHiburan())).status).toBe(401);
  });
});

describe("PATCH /api/budgets/[id]", () => {
  const budgetId = randomUUID();

  /** A budget set up in September, so October has no version of its own yet. */
  async function septemberBudget(overrides: Partial<typeof budgets.$inferInsert> = {}) {
    await db.insert(budgets).values({
      userId: userA,
      budgetId,
      name: "Jajan & Hiburan",
      spendingType: "wants",
      year: 2026,
      month: 9,
      amount: 800_000,
      categoryIds: [cat.Jajan, cat.Hiburan],
      ...overrides,
    });
  }

  it("writes a version for the current month and leaves last month as it was", async () => {
    await septemberBudget();
    signInAs(userA);
    const res = await patch(budgetId, { amount: 1_000_000 });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      id: budgetId,
      name: "Jajan & Hiburan",
      spendingType: "wants",
      amount: 1_000_000,
      categoryIds: [cat.Jajan, cat.Hiburan],
      period: "2026-10",
      deletedAt: null,
    });
    const sep = await budgetUsage(userA, "2026-09");
    expect(sep.items).toMatchObject([{ budgetId, budget: 800_000, name: "Jajan & Hiburan" }]);
    const oct = await budgetUsage(userA, "2026-10");
    expect(oct.items).toMatchObject([{ budgetId, budget: 1_000_000 }]);
  });

  it("keeps one version per month when saved twice", async () => {
    await septemberBudget();
    signInAs(userA);
    await patch(budgetId, { amount: 1_000_000 });
    const res = await patch(budgetId, { name: "Hura-hura", categoryIds: [cat.Hobi] });
    expect(await res.json()).toMatchObject({
      name: "Hura-hura",
      amount: 1_000_000,
      categoryIds: [cat.Hobi],
    });
    expect(await versionsOf(userA)).toHaveLength(2);
  });

  it("keeps an archived category the budget already has, but does not add one", async () => {
    await septemberBudget({ categoryIds: [cat.Jajan, cat.Lama] });
    signInAs(userA);
    expect((await patch(budgetId, { categoryIds: [cat.Lama, cat.Hobi] })).status).toBe(200);

    await db.delete(budgets).where(eq(budgets.userId, userA));
    await septemberBudget();
    const res = await patch(budgetId, { categoryIds: [cat.Jajan, cat.Lama] });
    expect(res.status).toBe(400);
    expect(((await res.json()) as ErrorBody).error.fields).toEqual({
      categoryIds: ["Kategori tidak valid"],
    });
  });

  it.each(["Makan", "Gaji", "foreign"])("rejects category %s", async (name) => {
    await septemberBudget();
    signInAs(userA);
    const res = await patch(budgetId, { categoryIds: [name === "foreign" ? catB : cat[name]] });
    expect(res.status).toBe(400);
  });

  it("rejects a category of another budget and the name of another budget", async () => {
    await septemberBudget();
    signInAs(userA);
    await post({ name: "Hobi", spendingType: "wants", amount: 1, categoryIds: [cat.Hobi] });
    const taken = await patch(budgetId, { categoryIds: [cat.Jajan, cat.Hobi] });
    expect(taken.status).toBe(400);
    expect(((await taken.json()) as ErrorBody).error.fields).toEqual({
      categoryIds: ["Kategori sudah dipakai budget lain"],
    });
    const named = await patch(budgetId, { name: "hobi" });
    expect(named.status).toBe(409);
    expect(((await named.json()) as ErrorBody).error.code).toBe("BUDGET_NAME_TAKEN");
  });

  it("allows renaming to its own name in other letter case", async () => {
    await septemberBudget();
    signInAs(userA);
    const res = await patch(budgetId, { name: "JAJAN & HIBURAN" });
    expect(res.status).toBe(200);
  });

  it.each([
    {},
    { spendingType: "needs" },
    { amount: -1 },
    { name: "" },
    { categoryIds: [] },
    { period: "2026-09" },
  ])("rejects an invalid body %j", async (body) => {
    await septemberBudget();
    signInAs(userA);
    const res = await patch(budgetId, body);
    expect(res.status).toBe(400);
  });

  it("rejects a body that is not JSON", async () => {
    await septemberBudget();
    signInAs(userA);
    expect((await patch(budgetId, "{")).status).toBe(400);
  });

  it.each(["not-a-uuid", "unknown", "ended", "foreign", "future"])(
    "returns 404 BUDGET_NOT_FOUND for a %s budget",
    async (kind) => {
      if (kind === "ended") await septemberBudget({ deletedAt: new Date() });
      if (kind === "foreign") await septemberBudget({ userId: userB, categoryIds: [catB] });
      if (kind === "future") await septemberBudget({ month: 11 });
      signInAs(userA);
      const id =
        kind === "not-a-uuid" ? "not-a-uuid" : kind === "unknown" ? randomUUID() : budgetId;
      const res = await patch(id, { amount: 1 });
      expect(res.status).toBe(404);
      expect(((await res.json()) as ErrorBody).error.code).toBe("BUDGET_NOT_FOUND");
    },
  );

  it("leaves user A's budget alone when user B patches it", async () => {
    await septemberBudget();
    signInAs(userB);
    expect((await patch(budgetId, { amount: 1 })).status).toBe(404);
    expect(await versionsOf(userA)).toHaveLength(1);
  });

  it("returns 401 without a session", async () => {
    signInAs(null);
    expect((await patch(budgetId, { amount: 1 })).status).toBe(401);
  });
});

describe("DELETE /api/budgets/[id] and restore", () => {
  const budgetId = randomUUID();

  async function budgetFrom(month: number, overrides: Partial<typeof budgets.$inferInsert> = {}) {
    await db.insert(budgets).values({
      userId: userA,
      budgetId,
      name: "Jajan & Hiburan",
      spendingType: "wants",
      year: 2026,
      month,
      amount: 800_000,
      categoryIds: [cat.Jajan, cat.Hiburan],
      ...overrides,
    });
  }

  const shownIn = async (period: string) =>
    (await budgetUsage(userA, period)).items.map((i) => i.budgetId);

  it("ends a budget from this month and keeps last month", async () => {
    await budgetFrom(9);
    signInAs(userA);
    const res = await del(budgetId);
    expect(res.status).toBe(200);
    const ended = (await res.json()) as BudgetVersion;
    expect(ended).toMatchObject({ id: budgetId, period: "2026-10", amount: 800_000 });
    expect(ended.deletedAt).toEqual(expect.any(String));
    expect(await shownIn("2026-10")).toEqual([]);
    expect(await shownIn("2026-11")).toEqual([]);
    expect(await shownIn("2026-09")).toEqual([budgetId]);
  });

  it("ends this month's version in place when the budget already has one", async () => {
    await budgetFrom(9);
    await budgetFrom(10, { amount: 900_000 });
    signInAs(userA);
    expect((await del(budgetId)).status).toBe(200);
    expect(await versionsOf(userA)).toHaveLength(2);
    expect(await shownIn("2026-09")).toEqual([budgetId]);
  });

  it("is idempotent: a second delete keeps the first deletedAt", async () => {
    await budgetFrom(9);
    signInAs(userA);
    const first = (await (await del(budgetId)).json()) as BudgetVersion;
    const res = await del(budgetId);
    expect(res.status).toBe(200);
    expect(((await res.json()) as BudgetVersion).deletedAt).toBe(first.deletedAt);
  });

  it("restores an ended budget, idempotently", async () => {
    await budgetFrom(9);
    signInAs(userA);
    await del(budgetId);
    const res = await restore(budgetId);
    expect(res.status).toBe(200);
    expect(((await res.json()) as BudgetVersion).deletedAt).toBeNull();
    expect(await shownIn("2026-10")).toEqual([budgetId]);
    expect((await restore(budgetId)).status).toBe(200);
    expect(await shownIn("2026-10")).toEqual([budgetId]);
  });

  it("removes a budget created and ended this month from every month", async () => {
    signInAs(userA);
    const created = (await (
      await post({
        name: "Jajan & Hiburan",
        spendingType: "wants",
        amount: 800_000,
        categoryIds: [cat.Jajan],
      })
    ).json()) as BudgetVersion;
    await del(created.id);
    expect((await budgetUsage(userA, "2026-10")).items).toEqual([]);
    expect((await budgetUsage(userA, "2026-09")).items).toEqual([]);
  });

  it("frees the name and categories, so restoring after they are reused conflicts", async () => {
    await budgetFrom(9);
    signInAs(userA);
    await del(budgetId);
    const reused = await post({
      name: "Jajan & Hiburan",
      spendingType: "wants",
      amount: 1,
      categoryIds: [cat.Jajan],
    });
    expect(reused.status).toBe(201);
    const res = await restore(budgetId);
    expect(res.status).toBe(409);
    expect(((await res.json()) as ErrorBody).error.code).toBe("BUDGET_RESTORE_CONFLICT");
    expect(await shownIn("2026-10")).toEqual([((await reused.json()) as BudgetVersion).id]);
  });

  it("returns 404 for a budget that ended before this month, for delete and restore", async () => {
    await budgetFrom(8);
    await budgetFrom(9, { deletedAt: new Date() });
    signInAs(userA);
    expect((await del(budgetId)).status).toBe(404);
    expect((await restore(budgetId)).status).toBe(404);
  });

  it.each(["not-a-uuid", "unknown", "foreign", "future"])(
    "returns 404 BUDGET_NOT_FOUND for a %s budget",
    async (kind) => {
      if (kind === "foreign") await budgetFrom(9, { userId: userB, categoryIds: [catB] });
      if (kind === "future") await budgetFrom(11);
      signInAs(userA);
      const id =
        kind === "not-a-uuid" ? "not-a-uuid" : kind === "unknown" ? randomUUID() : budgetId;
      for (const res of [await del(id), await restore(id)]) {
        expect(res.status).toBe(404);
        expect(((await res.json()) as ErrorBody).error.code).toBe("BUDGET_NOT_FOUND");
      }
    },
  );

  it("leaves user A's budget alone when user B deletes it", async () => {
    await budgetFrom(9);
    signInAs(userB);
    expect((await del(budgetId)).status).toBe(404);
    expect(await shownIn("2026-10")).toEqual([budgetId]);
  });

  it("returns 401 without a session", async () => {
    signInAs(null);
    expect((await del(budgetId)).status).toBe(401);
    expect((await restore(budgetId)).status).toBe(401);
  });
});
