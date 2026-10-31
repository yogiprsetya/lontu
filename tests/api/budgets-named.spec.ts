import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { budgetVersions, categories } from "@/db/schema";
import type { BudgetVersion } from "@/lib/schemas/budget";
import { createTestUsers } from "../setup/db";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

const { auth } = await import("@/lib/auth");
const route = await import("@/app/api/budgets/route");
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

type ErrorBody = { error: { code: string; message: string; fields?: Record<string, string[]> } };

let userA: string;
let userB: string;
let cleanup: () => PromiseLike<unknown>;
let cat: Record<string, string>;
let catB: string;

function versionsOf(userId: string) {
  return db.select().from(budgetVersions).where(eq(budgetVersions.userId, userId));
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
  await db.delete(budgetVersions).where(eq(budgetVersions.userId, userA));
  await db.delete(budgetVersions).where(eq(budgetVersions.userId, userB));
});

afterAll(async () => {
  vi.useRealTimers();
  await cleanup();
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
    await db.insert(budgetVersions).values({
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
