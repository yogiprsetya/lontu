import { and, eq } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { budgets, categories } from "@/db/schema";
import { createTestUsers } from "../setup/db";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

const { auth } = await import("@/lib/auth");
const route = await import("@/app/api/budgets/copy/route");
const mockedAuth = vi.mocked(auth as unknown as () => Promise<unknown>);

function signInAs(userId: string | null) {
  mockedAuth.mockResolvedValue(userId ? { user: { id: userId } } : null);
}

function copy(body: unknown) {
  return route.POST(
    new Request("http://localhost/api/budgets/copy", {
      method: "POST",
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({}) },
  );
}

let userA: string;
let userB: string;
let cleanup: () => PromiseLike<unknown>;
let cat: Record<string, string>;
let catB: string;

function monthOf(userId: string, year: number, month: number) {
  return db
    .select()
    .from(budgets)
    .where(and(eq(budgets.userId, userId), eq(budgets.year, year), eq(budgets.month, month)));
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
      { userId: userB, name: "Makan", kind: "spending", spendingType: "needs" },
    ])
    .returning({ id: categories.id, name: categories.name, userId: categories.userId });
  cat = Object.fromEntries(rows.filter((r) => r.userId === userA).map((r) => [r.name, r.id]));
  catB = rows.find((r) => r.userId === userB)!.id;

  const a = (categoryId: string, month: number, amount: number, deletedAt: Date | null = null) => ({
    userId: userA,
    categoryId,
    year: 2026,
    month,
    amount,
    deletedAt,
  });
  await db.insert(budgets).values([
    // August → September: the main scenario.
    a(cat.Makan, 8, 1_000_000),
    a(cat.Hiburan, 8, 300_000),
    a(cat.Lama, 8, 50_000),
    a(cat.Transport, 8, 200_000, new Date()),
    a(cat.Makan, 9, 900_000),
    // June → July: a deleted July budget comes back with June's amount.
    a(cat.Makan, 6, 700_000),
    a(cat.Makan, 7, 100_000, new Date()),
    { userId: userB, categoryId: catB, year: 2026, month: 8, amount: 42_000 },
  ]);
});

afterAll(async () => {
  await cleanup();
});

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-23T05:00:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("POST /api/budgets/copy", () => {
  it("fills only categories without an active budget, skipping archived categories and deleted sources", async () => {
    signInAs(userA);
    const res = await copy({ to: "2026-09" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ copied: 1 });

    const september = Object.fromEntries(
      (await monthOf(userA, 2026, 9)).map((b) => [b.categoryId, b.amount]),
    );
    expect(september).toEqual({ [cat.Makan]: 900_000, [cat.Hiburan]: 300_000 });
  });

  it("copies nothing the second time", async () => {
    signInAs(userA);
    expect(await (await copy({ to: "2026-09" })).json()).toEqual({ copied: 0 });
    expect(await monthOf(userA, 2026, 9)).toHaveLength(2);
  });

  it("revives a deleted budget in the target month with the source amount", async () => {
    signInAs(userA);
    const [before] = await monthOf(userA, 2026, 7);
    expect(await (await copy({ to: "2026-07" })).json()).toEqual({ copied: 1 });
    const [after] = await monthOf(userA, 2026, 7);
    expect(after).toMatchObject({
      id: before.id,
      amount: 700_000,
      deletedAt: null,
      createdAt: before.createdAt,
    });
  });

  it.each(["2026-05", "2000-01"])(
    "copies nothing to %s when the previous month is empty or out of range",
    async (to) => {
      signInAs(userA);
      expect(await (await copy({ to })).json()).toEqual({ copied: 0 });
    },
  );

  it("never reads or writes another user's budgets", async () => {
    signInAs(userB);
    expect(await (await copy({ to: "2026-09" })).json()).toEqual({ copied: 1 });
    expect((await monthOf(userB, 2026, 9)).map((b) => [b.categoryId, b.amount])).toEqual([
      [catB, 42_000],
    ]);
    expect(await monthOf(userA, 2026, 9)).toHaveLength(2);
  });

  it.each([{ to: "2026-13" }, { to: "2026-12" }, {}, { to: "2026-09", userId: "test-x" }])(
    "rejects %j",
    async (body) => {
      signInAs(userA);
      const res = await copy(body);
      expect(res.status).toBe(400);
      expect((await res.json()).error.code).toBe("VALIDATION_ERROR");
    },
  );

  it("returns 401 without a session", async () => {
    signInAs(null);
    expect((await copy({ to: "2026-09" })).status).toBe(401);
  });
});
