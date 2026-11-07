import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { accounts, netWorths } from "@/db/schema";
import { todayInJakarta } from "@/lib/date";
import { shiftPeriod } from "@/lib/period";
import type { NetWorthProgress } from "@/lib/schemas/net-worth";
import { createTestUsers } from "../setup/db";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

const { auth } = await import("@/lib/auth");
const itemRoute = await import("@/app/api/net-worth/[id]/route");
const restoreRoute = await import("@/app/api/net-worth/[id]/restore/route");
const mockedAuth = vi.mocked(auth as unknown as () => Promise<unknown>);

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

function signInAs(userId: string | null) {
  mockedAuth.mockResolvedValue(userId ? { user: { id: userId } } : null);
}

function patch(id: string, body: unknown) {
  return itemRoute.PATCH(
    new Request(`http://localhost/api/net-worth/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
    ctx(id),
  );
}

function del(id: string) {
  return itemRoute.DELETE(
    new Request(`http://localhost/api/net-worth/${id}`, { method: "DELETE" }),
    ctx(id),
  );
}

function restore(id: string) {
  return restoreRoute.POST(
    new Request(`http://localhost/api/net-worth/${id}/restore`, { method: "POST" }),
    ctx(id),
  );
}

async function expectError(res: Response, status: number, code: string, field?: string) {
  expect(res.status).toBe(status);
  const body = await res.json();
  expect(body.error.code).toBe(code);
  if (field) expect(body.error.fields[field]).toBeDefined();
}

async function ok(res: Response) {
  expect(res.status).toBe(200);
  return (await res.json()) as NetWorthProgress;
}

let userA: string;
let userB: string;
let cleanup: () => PromiseLike<unknown>;

async function account(userId: string, values: Partial<typeof accounts.$inferInsert> = {}) {
  const [row] = await db
    .insert(accounts)
    .values({ userId, name: `Akun ${randomUUID()}`, type: "asset", ...values })
    .returning({ id: accounts.id });
  return row.id;
}

async function netWorth(userId: string, values: Partial<typeof netWorths.$inferInsert> = {}) {
  const [row] = await db
    .insert(netWorths)
    .values({
      userId,
      name: `Target ${randomUUID()}`,
      targetAmount: 10_000_000,
      accountIds: [await account(userId)],
      ...values,
    })
    .returning();
  return row;
}

async function stored(id: string) {
  const [row] = await db.select().from(netWorths).where(eq(netWorths.id, id));
  return row;
}

beforeAll(async () => {
  const users = await createTestUsers(2);
  [userA, userB] = users.ids;
  cleanup = users.cleanup;
});

afterAll(() => cleanup());

describe("PATCH /api/net-worth/[id]", () => {
  it("updates the name, amount and target month, clearing the month with null", async () => {
    signInAs(userA);
    const row = await netWorth(userA);
    const next = shiftPeriod(shiftPeriod(todayInJakarta().slice(0, 7), 1), 1);
    expect(
      await ok(await patch(row.id, { name: " Rumah ", targetAmount: 5, targetMonth: next })),
    ).toMatchObject({ id: row.id, name: "Rumah", targetAmount: 5, targetMonth: next });
    expect((await ok(await patch(row.id, { targetMonth: null }))).targetMonth).toBeNull();
  });

  it("keeps an archived account on a name-only change", async () => {
    signInAs(userA);
    const archived = await account(userA, { archivedAt: new Date() });
    const row = await netWorth(userA, { accountIds: [archived] });
    expect(await ok(await patch(row.id, { name: `Baru ${randomUUID()}` }))).toMatchObject({
      accountIds: [archived],
    });
  });

  it("lets an already-linked archived account stay, but not a new archived one join", async () => {
    signInAs(userA);
    const linked = await account(userA, { archivedAt: new Date() });
    const added = await account(userA);
    const otherArchived = await account(userA, { archivedAt: new Date() });
    const row = await netWorth(userA, { accountIds: [linked] });

    expect((await ok(await patch(row.id, { accountIds: [added, linked] }))).accountIds).toEqual([
      added,
      linked,
    ]);
    await expectError(
      await patch(row.id, { accountIds: [added, linked, otherArchived] }),
      400,
      "VALIDATION_ERROR",
      "accountIds",
    );
  });

  it("rejects an account of another active net worth, but not one of its own", async () => {
    signInAs(userA);
    const mine = await account(userA);
    const theirs = await account(userA);
    const row = await netWorth(userA, { accountIds: [mine] });
    await netWorth(userA, { accountIds: [theirs] });

    await expectError(
      await patch(row.id, { accountIds: [mine, theirs] }),
      400,
      "VALIDATION_ERROR",
      "accountIds",
    );
    expect((await ok(await patch(row.id, { accountIds: [mine] }))).accountIds).toEqual([mine]);
  });

  it("returns 409 for another active net worth's name, and allows its own in another case", async () => {
    signInAs(userA);
    const row = await netWorth(userA);
    const other = await netWorth(userA);
    await expectError(
      await patch(row.id, { name: other.name.toUpperCase() }),
      409,
      "NET_WORTH_NAME_TAKEN",
    );
    expect((await ok(await patch(row.id, { name: row.name.toUpperCase() }))).name).toBe(
      row.name.toUpperCase(),
    );
  });

  it("rejects an empty body, a past month, userId, and invalid JSON", async () => {
    signInAs(userA);
    const row = await netWorth(userA);
    const lastMonth = shiftPeriod(todayInJakarta().slice(0, 7), -1);
    await expectError(await patch(row.id, {}), 400, "VALIDATION_ERROR");
    await expectError(
      await patch(row.id, { targetMonth: lastMonth }),
      400,
      "VALIDATION_ERROR",
      "targetMonth",
    );
    await expectError(await patch(row.id, { userId: userB }), 400, "VALIDATION_ERROR");
    await expectError(await patch(row.id, "{"), 400, "INVALID_JSON");
  });

  it("returns 404 for an archived net worth", async () => {
    signInAs(userA);
    const row = await netWorth(userA, { archivedAt: new Date() });
    await expectError(await patch(row.id, { name: "x" }), 404, "NET_WORTH_NOT_FOUND");
  });
});

describe("DELETE and restore", () => {
  it("archives idempotently, keeping the first timestamp", async () => {
    signInAs(userA);
    const row = await netWorth(userA);
    const first = await ok(await del(row.id));
    expect(first.archivedAt).not.toBeNull();
    const second = await ok(await del(row.id));
    expect(second.archivedAt).toBe(first.archivedAt);
  });

  it("restores an archived net worth, and leaves an active one as it is", async () => {
    signInAs(userA);
    const row = await netWorth(userA, { archivedAt: new Date() });
    expect((await ok(await restore(row.id))).archivedAt).toBeNull();
    expect(await ok(await restore(row.id))).toMatchObject({ id: row.id, archivedAt: null });
  });

  it("refuses to restore a net worth whose account another active net worth took meanwhile", async () => {
    signInAs(userA);
    const shared = await account(userA);
    const a = await netWorth(userA, { accountIds: [shared] });
    await ok(await del(a.id));
    await netWorth(userA, { accountIds: [shared] });
    await expectError(await restore(a.id), 409, "NET_WORTH_RESTORE_CONFLICT");
    expect((await stored(a.id)).archivedAt).not.toBeNull();
  });

  it("refuses to restore a net worth whose name another active net worth took meanwhile", async () => {
    signInAs(userA);
    const a = await netWorth(userA);
    await ok(await del(a.id));
    await netWorth(userA, { name: a.name.toLowerCase() });
    await expectError(await restore(a.id), 409, "NET_WORTH_RESTORE_CONFLICT");
  });
});

describe("net worth ids", () => {
  it.each(["not-a-uuid", randomUUID()])("returns 404 NET_WORTH_NOT_FOUND for %s", async (id) => {
    signInAs(userA);
    await expectError(await patch(id, { name: "x" }), 404, "NET_WORTH_NOT_FOUND");
    await expectError(await del(id), 404, "NET_WORTH_NOT_FOUND");
    await expectError(await restore(id), 404, "NET_WORTH_NOT_FOUND");
  });

  it("returns 404 to user B for user A's net worth and leaves it untouched", async () => {
    const row = await netWorth(userA);
    signInAs(userB);
    await expectError(await patch(row.id, { name: "Diambil" }), 404, "NET_WORTH_NOT_FOUND");
    await expectError(await del(row.id), 404, "NET_WORTH_NOT_FOUND");
    await expectError(await restore(row.id), 404, "NET_WORTH_NOT_FOUND");
    expect(await stored(row.id)).toMatchObject({ name: row.name, archivedAt: null });
  });

  it("does not let user B link user A's account through PATCH", async () => {
    const aAccount = await account(userA);
    const row = await netWorth(userB);
    signInAs(userB);
    await expectError(
      await patch(row.id, { accountIds: [aAccount] }),
      400,
      "VALIDATION_ERROR",
      "accountIds",
    );
  });
});

describe("without a session", () => {
  it("returns 401 for PATCH, DELETE and restore", async () => {
    signInAs(null);
    const id = randomUUID();
    await expectError(await patch(id, { name: "x" }), 401, "UNAUTHORIZED");
    await expectError(await del(id), 401, "UNAUTHORIZED");
    await expectError(await restore(id), 401, "UNAUTHORIZED");
  });
});
