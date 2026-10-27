import { and, eq, isNull } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { accounts, categories, recurringRules } from "@/db/schema";
import type { RecurringOverview, RecurringRule } from "@/lib/schemas/recurring";
import { createTestUsers } from "../setup/db";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

const { auth } = await import("@/lib/auth");
const collection = await import("@/app/api/recurring/route");
const mockedAuth = vi.mocked(auth as unknown as () => Promise<unknown>);

const noParams = { params: Promise.resolve({}) };

function signInAs(userId: string | null) {
  mockedAuth.mockResolvedValue(userId ? { user: { id: userId } } : null);
}

function create(body: unknown) {
  return collection.POST(
    new Request("http://localhost/api/recurring", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
    noParams,
  );
}

async function overview(query = ""): Promise<RecurringOverview> {
  const res = await collection.GET(new Request(`http://localhost/api/recurring${query}`), noParams);
  expect(res.status).toBe(200);
  return res.json();
}

function activePaydays(userId: string) {
  return db
    .select({ id: recurringRules.id })
    .from(recurringRules)
    .where(and(eq(recurringRules.userId, userId), eq(recurringRules.isPayday, true), isNull(recurringRules.archivedAt)));
}

let userA: string;
let userB: string;
let cleanup: () => PromiseLike<unknown>;
let account: string;
let archivedAccount: string;
let foreignAccount: string;
let cat: Record<"income" | "spending" | "saving" | "archivedSpending" | "foreignSpending", string>;

function netflix(overrides: Record<string, unknown> = {}) {
  return { type: "expense", name: "Netflix", amount: 186_000, accountId: account, categoryId: cat.spending, dayOfMonth: 5, ...overrides };
}

function salary(overrides: Record<string, unknown> = {}) {
  return { type: "income", name: "Gaji", amount: 10_000_000, accountId: account, categoryId: cat.income, dayOfMonth: 25, isPayday: true, ...overrides };
}

beforeAll(async () => {
  const created = await createTestUsers(2);
  [userA, userB] = created.ids;
  cleanup = created.cleanup;

  const archivedAt = new Date();
  const accountRows = await db
    .insert(accounts)
    .values([
      { userId: userA, name: "account", type: "transaction" },
      { userId: userA, name: "archivedAccount", type: "transaction", archivedAt },
      { userId: userB, name: "foreignAccount", type: "transaction" },
    ])
    .returning({ id: accounts.id, name: accounts.name });
  const accountId = (name: string) => accountRows.find((r) => r.name === name)!.id;
  account = accountId("account");
  archivedAccount = accountId("archivedAccount");
  foreignAccount = accountId("foreignAccount");

  const categoryRows = await db
    .insert(categories)
    .values([
      { userId: userA, name: "income", kind: "income" },
      { userId: userA, name: "spending", kind: "spending", spendingType: "wants" },
      { userId: userA, name: "saving", kind: "saving" },
      { userId: userA, name: "archivedSpending", kind: "spending", spendingType: "wants", archivedAt },
      { userId: userB, name: "foreignSpending", kind: "spending", spendingType: "wants" },
    ])
    .returning({ id: categories.id, name: categories.name });
  cat = Object.fromEntries(categoryRows.map((r) => [r.name, r.id])) as typeof cat;
});

beforeEach(() => {
  // 10:00 on 27 Oct 2026 in Jakarta.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-27T03:00:00Z"));
  signInAs(userA);
});

afterEach(async () => {
  vi.useRealTimers();
  await db.delete(recurringRules).where(eq(recurringRules.userId, userA));
});

afterAll(async () => {
  await cleanup();
});

describe("POST /api/recurring", () => {
  it("creates a rule due on the next anchor", async () => {
    const res = await create(netflix());
    expect(res.status).toBe(201);
    const rule = (await res.json()) as RecurringRule;
    expect(rule).toMatchObject({ ...netflix(), nextDueDate: "2026-11-05", isPayday: false, archivedAt: null });
    expect(rule.id).toBeDefined();
  });

  it("makes a rule anchored today due today", async () => {
    const rule = (await (await create(netflix({ dayOfMonth: 27 }))).json()) as RecurringRule;
    expect(rule.nextDueDate).toBe("2026-10-27");
    expect((await overview()).due.map((r) => r.id)).toEqual([rule.id]);
  });

  const UNKNOWN = "8d2c0f4e-2a3b-4c5d-8e6f-7a8b9c0d1e2f";
  const refs = (): Record<string, string> => ({
    income: cat.income,
    archivedSpending: cat.archivedSpending,
    foreignSpending: cat.foreignSpending,
    archivedAccount,
    foreignAccount,
    unknown: UNKNOWN,
  });

  it.each([
    ["category of the wrong kind", "categoryId", "income"],
    ["archived category", "categoryId", "archivedSpending"],
    ["foreign category", "categoryId", "foreignSpending"],
    ["unknown category", "categoryId", "unknown"],
    ["archived account", "accountId", "archivedAccount"],
    ["foreign account", "accountId", "foreignAccount"],
    ["unknown account", "accountId", "unknown"],
  ])("rejects a %s on the field without writing", async (_label, field, ref) => {
    const res = await create(netflix({ [field]: refs()[ref] }));
    expect(res.status).toBe(400);
    expect((await res.json()).error.fields[field]).toBeDefined();
    expect(await db.$count(recurringRules, eq(recurringRules.userId, userA))).toBe(0);
  });

  it("gives foreign and unknown ids the same message", async () => {
    const foreign = await (await create(netflix({ accountId: foreignAccount }))).json();
    const unknown = await (await create(netflix({ accountId: UNKNOWN }))).json();
    expect(foreign.error.fields.accountId).toEqual(unknown.error.fields.accountId);
  });

  it("moves the payday flag to the newest payday rule", async () => {
    const first = (await (await create(salary())).json()) as RecurringRule;
    const second = (await (await create(salary({ name: "Gaji baru" }))).json()) as RecurringRule;
    expect(second.isPayday).toBe(true);
    const { rules } = await overview();
    expect(rules.find((r) => r.id === first.id)?.isPayday).toBe(false);
    expect(await activePaydays(userA)).toEqual([{ id: second.id }]);
  });

  it("keeps exactly one payday when two payday rules are created in parallel", async () => {
    const results = await Promise.all([create(salary()), create(salary({ name: "Gaji 2" }))]);
    expect(results.map((r) => r.status)).toEqual([201, 201]);
    expect(await activePaydays(userA)).toHaveLength(1);
  });

  it("rejects isPayday on an expense rule", async () => {
    const res = await create(netflix({ isPayday: true }));
    expect(res.status).toBe(400);
    expect((await res.json()).error.fields.isPayday).toBeDefined();
  });

  it.each([{ userId: "someone" }, { nextDueDate: "2026-10-01" }])("rejects body field %j", async (extra) => {
    expect((await create(netflix(extra))).status).toBe(400);
  });

  it("rejects invalid JSON", async () => {
    expect((await create("{")).status).toBe(400);
  });

  it("does not let user B create a rule on user A's account or category", async () => {
    signInAs(userB);
    expect((await create(netflix())).status).toBe(400);
  });
});

describe("GET /api/recurring", () => {
  it("sorts by next due date then name and lists only due rules in due", async () => {
    const b = (await (await create(netflix({ name: "b", dayOfMonth: 5 }))).json()) as RecurringRule;
    const a = (await (await create(netflix({ name: "A", dayOfMonth: 5 }))).json()) as RecurringRule;
    const today = (await (await create(netflix({ name: "z", dayOfMonth: 27 }))).json()) as RecurringRule;
    const body = await overview();
    expect(body.rules.map((r) => r.id)).toEqual([today.id, a.id, b.id]);
    expect(body.due.map((r) => r.id)).toEqual([today.id]);
    expect(body.forecast).toEqual({ status: "no_payday" });
  });

  it("includes archived rules in rules only when asked, never in due", async () => {
    const rule = (await (await create(netflix({ dayOfMonth: 27 }))).json()) as RecurringRule;
    await db.update(recurringRules).set({ archivedAt: new Date() }).where(eq(recurringRules.id, rule.id));
    expect((await overview()).rules).toEqual([]);
    const withArchived = await overview("?includeArchived=true");
    expect(withArchived.rules.map((r) => r.id)).toEqual([rule.id]);
    expect(withArchived.rules[0].archivedAt).not.toBeNull();
    expect(withArchived.due).toEqual([]);
  });

  it("never shows user A's rules to user B", async () => {
    await create(netflix());
    signInAs(userB);
    const body = await overview("?includeArchived=true");
    expect(body.rules).toEqual([]);
    expect(body.due).toEqual([]);
  });
});

describe("without a session", () => {
  it("returns 401 for GET and POST", async () => {
    signInAs(null);
    expect((await collection.GET(new Request("http://localhost/api/recurring"), noParams)).status).toBe(401);
    expect((await create(netflix())).status).toBe(401);
  });
});
