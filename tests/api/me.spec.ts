import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createTestUsers } from "../setup/db";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

const { auth } = await import("@/lib/auth");
const { GET, PATCH } = await import("@/app/api/me/route");
const mockedAuth = vi.mocked(auth as unknown as () => Promise<unknown>);

const ctx = { params: Promise.resolve({}) };

function signInAs(userId: string | null) {
  mockedAuth.mockResolvedValue(userId ? { user: { id: userId } } : null);
}

function patch(body: unknown) {
  return PATCH(
    new Request("http://localhost/api/me", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
    ctx,
  );
}

let userA: string;
let userB: string;
let cleanup: () => PromiseLike<unknown>;

beforeAll(async () => {
  const created = await createTestUsers(2);
  [userA, userB] = created.ids;
  cleanup = created.cleanup;
  await db.update(users).set({ displayName: "User B" }).where(eq(users.id, userB));
});

afterAll(async () => {
  await cleanup();
});

describe("GET /api/me", () => {
  it("returns 401 UNAUTHORIZED without a session", async () => {
    signInAs(null);
    const res = await GET(new Request("http://localhost/api/me"), ctx);
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({
      error: { code: "UNAUTHORIZED", message: expect.any(String) },
    });
  });

  it("returns the signed-in user's own profile", async () => {
    signInAs(userA);
    const res = await GET(new Request("http://localhost/api/me"), ctx);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      id: userA,
      email: `${userA}@example.test`,
      displayName: null,
      image: null,
      phone: null,
      location: null,
      currency: "IDR",
    });
  });

  it("returns 404 when the session user has no row", async () => {
    signInAs("test-missing-user");
    const res = await GET(new Request("http://localhost/api/me"), ctx);
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/me", () => {
  it("returns 401 without a session", async () => {
    signInAs(null);
    expect((await patch({ displayName: "X" })).status).toBe(401);
  });

  it("returns 400 VALIDATION_ERROR with per-field errors", async () => {
    signInAs(userA);
    const res = await patch({ displayName: "", currency: "USD" });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(Object.keys(body.error.fields).sort()).toEqual(["currency", "displayName"]);
  });

  it("returns 400 INVALID_JSON for a malformed body", async () => {
    signInAs(userA);
    const res = await patch("{not json");
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("INVALID_JSON");
  });

  it("updates only the signed-in user's profile", async () => {
    signInAs(userA);
    const res = await patch({
      displayName: "User A",
      phone: "0812",
      location: "Bandung",
      id: userB,
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      id: userA,
      displayName: "User A",
      phone: "0812",
      location: "Bandung",
    });

    const [b] = await db.select().from(users).where(eq(users.id, userB));
    expect(b).toMatchObject({ displayName: "User B", phone: null, location: null });
  });

  it("lets user B read only B's profile after A's update", async () => {
    signInAs(userB);
    const res = await GET(new Request("http://localhost/api/me"), ctx);
    expect(await res.json()).toMatchObject({ id: userB, displayName: "User B" });
  });
});
