import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { accounts, categories, transactions, users } from "@/db/schema";
import { upsertUser } from "@/lib/server/users";
import { createTestUsers } from "../setup/db";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

const { auth } = await import("@/lib/auth");
const collection = await import("@/app/api/categories/route");
const item = await import("@/app/api/categories/[id]/route");
const restoreRoute = await import("@/app/api/categories/[id]/restore/route");
const mockedAuth = vi.mocked(auth as unknown as () => Promise<unknown>);

const noParams = { params: Promise.resolve({}) };

function signInAs(userId: string | null) {
  mockedAuth.mockResolvedValue(userId ? { user: { id: userId } } : null);
}

function list(query = "") {
  return collection.GET(new Request(`http://localhost/api/categories${query}`), noParams);
}

function create(body: unknown) {
  return collection.POST(
    new Request("http://localhost/api/categories", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
    noParams,
  );
}

const idParams = (id: string) => ({ params: Promise.resolve({ id }) });

function rename(id: string, body: unknown) {
  return item.PATCH(
    new Request(`http://localhost/api/categories/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
    idParams(id),
  );
}

function archive(id: string) {
  return item.DELETE(
    new Request(`http://localhost/api/categories/${id}`, { method: "DELETE" }),
    idParams(id),
  );
}

function restore(id: string) {
  return restoreRoute.POST(
    new Request(`http://localhost/api/categories/${id}/restore`, { method: "POST" }),
    idParams(id),
  );
}

async function idOf(userId: string, name: string, kind: string) {
  signInAs(userId);
  const all: { id: string; name: string; kind: string }[] = await (
    await list("?include=archived")
  ).json();
  return all.find((c) => c.name === name && c.kind === kind)!.id;
}

const seededUser = `test-${randomUUID()}`;
let userB: string;
let cleanupB: () => PromiseLike<unknown>;

beforeAll(async () => {
  await upsertUser({ id: seededUser, email: `${seededUser}@example.test` });
  const created = await createTestUsers(1);
  [userB] = created.ids;
  cleanupB = created.cleanup;
});

afterAll(async () => {
  await db.delete(users).where(eq(users.id, seededUser));
  await cleanupB();
});

describe("GET /api/categories", () => {
  it("orders income, saving, spending needs, spending wants, then by name", async () => {
    signInAs(seededUser);
    const body: { kind: string; spendingType: string | null; name: string }[] = await (
      await list()
    ).json();

    expect(body.map((c) => `${c.kind}/${c.spendingType ?? "-"}/${c.name}`)).toEqual([
      "income/-/Bonus",
      "income/-/Gaji",
      "income/-/Hadiah",
      "income/-/Lainnya",
      "saving/-/Dana Darurat",
      "saving/-/Investasi",
      "saving/-/Tabungan",
      "spending/needs/Belanja Bulanan",
      "spending/needs/Kesehatan",
      "spending/needs/Makan",
      "spending/needs/Tagihan",
      "spending/needs/Transportasi",
      "spending/wants/Belanja",
      "spending/wants/Hiburan",
      "spending/wants/Jajan",
      "spending/wants/Langganan",
    ]);
  });

  it("returns the Category shape", async () => {
    signInAs(seededUser);
    const [first] = await (await list()).json();
    expect(first).toEqual({
      id: expect.any(String),
      name: "Bonus",
      kind: "income",
      spendingType: null,
      archivedAt: null,
      createdAt: expect.any(String),
    });
  });

  it("hides archived categories unless include=archived", async () => {
    await db
      .insert(categories)
      .values({ userId: userB, name: "Lama", kind: "income", archivedAt: new Date() });
    signInAs(userB);

    expect(await (await list()).json()).toEqual([]);
    const all = await (await list("?include=archived")).json();
    expect(all).toMatchObject([{ name: "Lama", archivedAt: expect.any(String) }]);
  });

  it("never returns another user's categories", async () => {
    signInAs(userB);
    const names = (await (await list("?include=archived")).json()).map(
      (c: { name: string }) => c.name,
    );
    expect(names).toEqual(["Lama"]);
  });

  it("returns 401 without a session", async () => {
    signInAs(null);
    expect((await list()).status).toBe(401);
    expect((await create({ name: "X", kind: "income" })).status).toBe(401);
  });
});

describe("POST /api/categories", () => {
  it("creates a spending category", async () => {
    signInAs(userB);
    const res = await create({ name: "Parkir", kind: "spending", spendingType: "needs" });

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({
      id: expect.any(String),
      name: "Parkir",
      kind: "spending",
      spendingType: "needs",
      archivedAt: null,
      createdAt: expect.any(String),
    });
  });

  it.each([
    [{ name: "Tol", kind: "spending" }, "spendingType"],
    [{ name: "Bonus", kind: "income", spendingType: "wants" }, "spendingType"],
    [{ name: "X", kind: "expense" }, "kind"],
  ])("returns 400 for %j", async (body, field) => {
    signInAs(userB);
    const res = await create(body);

    expect(res.status).toBe(400);
    expect((await res.json()).error.fields[field]).toBeDefined();
  });

  it("allows the same name under a different kind", async () => {
    signInAs(userB);
    expect((await create({ name: "Parkir", kind: "income" })).status).toBe(201);
  });

  it.each([
    { name: "PARKIR", kind: "spending", spendingType: "wants" },
    { name: "lama", kind: "income" },
  ])("returns 409 CATEGORY_NAME_TAKEN for %j", async (body) => {
    signInAs(userB);
    const res = await create(body);

    expect(res.status).toBe(409);
    expect((await res.json()).error.code).toBe("CATEGORY_NAME_TAKEN");
  });

  it("ignores a userId in the body", async () => {
    signInAs(userB);
    const { id } = await (
      await create({ name: "Milik B", kind: "saving", userId: seededUser })
    ).json();

    const [row] = await db
      .select({ userId: categories.userId })
      .from(categories)
      .where(eq(categories.id, id));
    expect(row.userId).toBe(userB);
  });
});

describe("PATCH /api/categories/[id]", () => {
  it.each([{ kind: "income" }, { spendingType: "wants" }, { name: "Makan", kind: "income" }])(
    "returns 400 for %j",
    async (body) => {
      const id = await idOf(seededUser, "Makan", "spending");
      expect((await rename(id, body)).status).toBe(400);
    },
  );

  it("renames in place so transactions keep the same category_id", async () => {
    const id = await idOf(seededUser, "Makan", "spending");
    const [account] = await db
      .insert(accounts)
      .values({ userId: seededUser, name: "BCA", type: "transaction" })
      .returning({ id: accounts.id });
    const [tx] = await db
      .insert(transactions)
      .values({
        userId: seededUser,
        type: "expense",
        amount: 1_000,
        date: "2026-10-20",
        accountId: account.id,
        categoryId: id,
      })
      .returning({ id: transactions.id });

    const res = await rename(id, { name: "Makan Siang" });

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      id,
      name: "Makan Siang",
      kind: "spending",
      spendingType: "needs",
    });
    const [row] = await db
      .select({ categoryId: transactions.categoryId })
      .from(transactions)
      .where(eq(transactions.id, tx.id));
    expect(row.categoryId).toBe(id);
  });

  it("returns 409 when renaming onto an existing name in the same kind", async () => {
    const id = await idOf(seededUser, "Jajan", "spending");
    const res = await rename(id, { name: "hiburan" });

    expect(res.status).toBe(409);
    expect((await res.json()).error.code).toBe("CATEGORY_NAME_TAKEN");
  });

  it("allows renaming onto a name used by a different kind", async () => {
    const id = await idOf(seededUser, "Jajan", "spending");
    expect((await rename(id, { name: "Bonus" })).status).toBe(200);
  });
});

describe("DELETE and restore /api/categories/[id]", () => {
  it("archives idempotently, hides from the default list, and restores", async () => {
    const id = await idOf(seededUser, "Hiburan", "spending");

    const first = await (await archive(id)).json();
    expect(first.archivedAt).toEqual(expect.any(String));
    expect((await (await archive(id)).json()).archivedAt).toBe(first.archivedAt);
    expect((await (await list()).json()).map((c: { id: string }) => c.id)).not.toContain(id);

    const restored = await restore(id);
    expect(restored.status).toBe(200);
    expect(await restored.json()).toMatchObject({ id, archivedAt: null, spendingType: "wants" });
    expect((await (await restore(id)).json()).archivedAt).toBeNull();
    expect(await db.select().from(categories).where(eq(categories.id, id))).toHaveLength(1);
  });
});

describe("category item routes: not found and isolation", () => {
  it.each([
    ["not a uuid", () => "abc"],
    ["unknown", () => randomUUID()],
  ])("returns 404 CATEGORY_NOT_FOUND for an id that is %s", async (_label, makeId) => {
    signInAs(seededUser);
    const id = makeId();
    for (const res of [await rename(id, { name: "X" }), await archive(id), await restore(id)]) {
      expect(res.status).toBe(404);
      expect((await res.json()).error.code).toBe("CATEGORY_NOT_FOUND");
    }
  });

  it("returns 404 when user B touches the seeded user's category and leaves it unchanged", async () => {
    const id = await idOf(seededUser, "Gaji", "income");

    signInAs(userB);
    expect((await rename(id, { name: "Dicuri" })).status).toBe(404);
    expect((await archive(id)).status).toBe(404);
    expect((await restore(id)).status).toBe(404);

    const [row] = await db.select().from(categories).where(eq(categories.id, id));
    expect(row).toMatchObject({ name: "Gaji", archivedAt: null });
  });

  it("returns 401 without a session", async () => {
    signInAs(null);
    const id = randomUUID();
    expect((await rename(id, { name: "X" })).status).toBe(401);
    expect((await archive(id)).status).toBe(401);
    expect((await restore(id)).status).toBe(401);
  });
});
