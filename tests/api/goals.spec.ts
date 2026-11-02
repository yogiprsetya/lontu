import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { accounts, goals } from "@/db/schema";
import { todayInJakarta } from "@/lib/date";
import { shiftPeriod } from "@/lib/period";
import type { GoalProgress } from "@/lib/schemas/goal";
import { createTestUsers } from "../setup/db";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

const { auth } = await import("@/lib/auth");
const route = await import("@/app/api/goals/route");
const mockedAuth = vi.mocked(auth as unknown as () => Promise<unknown>);

const noParams = { params: Promise.resolve({}) };

function signInAs(userId: string | null) {
  mockedAuth.mockResolvedValue(userId ? { user: { id: userId } } : null);
}

function post(body: unknown) {
  return route.POST(
    new Request("http://localhost/api/goals", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
    noParams,
  );
}

async function list(includeArchived = false) {
  const url = `http://localhost/api/goals${includeArchived ? "?includeArchived=true" : ""}`;
  const res = await route.GET(new Request(url), noParams);
  expect(res.status).toBe(200);
  return (await res.json()) as GoalProgress[];
}

async function expectError(res: Response, status: number, code: string, field?: string) {
  expect(res.status).toBe(status);
  const body = await res.json();
  expect(body.error.code).toBe(code);
  if (field) expect(body.error.fields[field]).toBeDefined();
  return field ? (body.error.fields[field][0] as string) : undefined;
}

let userA: string;
let userB: string;
let cleanup: () => PromiseLike<unknown>;

async function account(
  userId: string,
  name: string,
  values: Partial<typeof accounts.$inferInsert> = {},
) {
  const [row] = await db
    .insert(accounts)
    .values({ userId, name: `${name} ${randomUUID()}`, type: "asset", ...values })
    .returning({ id: accounts.id, name: accounts.name });
  return row;
}

const body = (accountIds: string[], patch: Record<string, unknown> = {}) => ({
  name: `Target ${randomUUID()}`,
  targetAmount: 30_000_000,
  accountIds,
  ...patch,
});

beforeAll(async () => {
  const users = await createTestUsers(2);
  [userA, userB] = users.ids;
  cleanup = users.cleanup;
});

afterAll(() => cleanup());

describe("POST /api/goals", () => {
  it("creates a goal and returns its progress", async () => {
    signInAs(userA);
    const emas = await account(userA, "Emas", { initialBalance: 10_000_000 });
    const tabungan = await account(userA, "Tabungan", {
      type: "transaction",
      subtype: "debit",
      initialBalance: 2_000_000,
    });
    const targetMonth = shiftPeriod(todayInJakarta().slice(0, 7), 1);
    const res = await post({
      name: " Dana Darurat ",
      targetAmount: 30_000_000,
      targetMonth,
      accountIds: [tabungan.id, emas.id],
    });
    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({
      name: "Dana Darurat",
      targetAmount: 30_000_000,
      targetMonth,
      accountIds: [tabungan.id, emas.id],
      archivedAt: null,
      current: 12_000_000,
      marketGain: 0,
      contributed: 12_000_000,
      staleAccountIds: [emas.id],
      projection: { remaining: 18_000_000, monthsLeft: 2, neededPerMonth: 9_000_000 },
    });
  });

  it("returns 409 GOAL_NAME_TAKEN for an active goal's name in another case", async () => {
    signInAs(userA);
    const first = await account(userA, "Satu");
    const second = await account(userA, "Dua");
    const name = `Liburan ${randomUUID()}`;
    expect((await post(body([first.id], { name }))).status).toBe(201);
    await expectError(
      await post(body([second.id], { name: name.toUpperCase() })),
      409,
      "GOAL_NAME_TAKEN",
    );
  });

  it("lets an archived goal's name be used again", async () => {
    signInAs(userA);
    const old = await account(userA, "Lama");
    const fresh = await account(userA, "Baru");
    const name = `Mobil ${randomUUID()}`;
    await db.insert(goals).values({
      userId: userA,
      name,
      targetAmount: 1,
      accountIds: [old.id],
      archivedAt: new Date(),
    });
    expect((await post(body([fresh.id], { name }))).status).toBe(201);
  });

  it("rejects a target month before the current month", async () => {
    signInAs(userA);
    const a = await account(userA, "Lampau");
    const lastMonth = shiftPeriod(todayInJakarta().slice(0, 7), -1);
    await expectError(
      await post(body([a.id], { targetMonth: lastMonth })),
      400,
      "VALIDATION_ERROR",
      "targetMonth",
    );
  });

  it("names the account another active goal already uses", async () => {
    signInAs(userA);
    const shared = await account(userA, "Bersama");
    const other = await account(userA, "Lain");
    const name = `Pertama ${randomUUID()}`;
    expect((await post(body([shared.id], { name }))).status).toBe(201);
    const message = await expectError(
      await post(body([other.id, shared.id])),
      400,
      "VALIDATION_ERROR",
      "accountIds",
    );
    expect(message).toBe(`${shared.name} sudah dipakai ${name}`);
  });

  it("allows an account whose goal was archived", async () => {
    signInAs(userA);
    const a = await account(userA, "Bekas");
    await db.insert(goals).values({
      userId: userA,
      name: "Arsip",
      targetAmount: 1,
      accountIds: [a.id],
      archivedAt: new Date(),
    });
    expect((await post(body([a.id]))).status).toBe(201);
  });

  it.each(["credit card", "archived", "foreign", "missing", "duplicate"] as const)(
    "rejects a %s account in fields.accountIds",
    async (kind) => {
      signInAs(userA);
      const valid = await account(userA, "Valid");
      const bad =
        kind === "credit card"
          ? (await account(userA, "Kartu", { type: "transaction", subtype: "credit_card" })).id
          : kind === "archived"
            ? (await account(userA, "Arsip", { archivedAt: new Date() })).id
            : kind === "foreign"
              ? (await account(userB, "Milik B")).id
              : kind === "missing"
                ? randomUUID()
                : valid.id;
      await expectError(await post(body([valid.id, bad])), 400, "VALIDATION_ERROR", "accountIds");
    },
  );

  it("gives a foreign and a missing account the same message", async () => {
    signInAs(userA);
    const foreign = await account(userB, "Milik B lagi");
    const a = await expectError(
      await post(body([foreign.id])),
      400,
      "VALIDATION_ERROR",
      "accountIds",
    );
    const b = await expectError(
      await post(body([randomUUID()])),
      400,
      "VALIDATION_ERROR",
      "accountIds",
    );
    expect(a).toBe(b);
  });

  it("lets exactly one of two parallel goals claim the same account", async () => {
    signInAs(userA);
    const a = await account(userA, "Rebutan");
    const results = await Promise.all([post(body([a.id])), post(body([a.id]))]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 400]);
    const owners = (await list()).filter((g) => g.accountIds.includes(a.id));
    expect(owners).toHaveLength(1);
  });

  it("rejects userId in the body and invalid JSON", async () => {
    signInAs(userA);
    const a = await account(userA, "Body");
    expect((await post({ ...body([a.id]), userId: userB })).status).toBe(400);
    expect((await post("{")).status).toBe(400);
  });
});

describe("GET /api/goals", () => {
  it("lists only the user's goals, active ones by created_at, archived ones on request", async () => {
    signInAs(userB);
    const one = await account(userB, "Satu");
    const two = await account(userB, "Dua");
    const first = (await (await post(body([one.id]))).json()) as GoalProgress;
    const second = (await (await post(body([two.id]))).json()) as GoalProgress;
    await db.update(goals).set({ archivedAt: new Date() }).where(eq(goals.id, first.id));

    expect((await list()).map((g) => g.id)).toEqual([second.id]);
    expect((await list(true)).map((g) => g.id)).toEqual([first.id, second.id]);

    signInAs(userA);
    const forA = (await list(true)).map((g) => g.id);
    expect(forA).not.toContain(first.id);
    expect(forA).not.toContain(second.id);
  });
});

describe("without a session", () => {
  it("returns 401 for GET and POST", async () => {
    signInAs(null);
    const res = await route.GET(new Request("http://localhost/api/goals"), noParams);
    await expectError(res, 401, "UNAUTHORIZED");
    await expectError(await post(body([randomUUID()])), 401, "UNAUTHORIZED");
  });
});
