import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

const { auth } = await import("@/lib/auth");
const { withAuth } = await import("@/lib/api/with-auth");
const mockedAuth = vi.mocked(auth as unknown as () => Promise<unknown>);

const routeContext = { params: Promise.resolve({ id: "abc" }) };

afterEach(() => {
  vi.restoreAllMocks();
});

describe("withAuth", () => {
  it("returns 401 without calling the handler when there is no session", async () => {
    mockedAuth.mockResolvedValue(null);
    const handler = vi.fn();

    const res = await withAuth(handler)(new Request("http://localhost/api/x"), routeContext);

    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ error: { code: "UNAUTHORIZED" } });
    expect(handler).not.toHaveBeenCalled();
  });

  it("returns 401 when the session has no user id", async () => {
    mockedAuth.mockResolvedValue({ user: { email: "x@example.com" } });

    const res = await withAuth(vi.fn())(new Request("http://localhost/api/x"), routeContext);

    expect(res.status).toBe(401);
  });

  it("passes userId and resolved params to the handler", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "google-sub-1" } });
    const handler = vi.fn(async () => Response.json({ ok: true }));

    const res = await withAuth(handler)(new Request("http://localhost/api/x"), routeContext);

    expect(res.status).toBe(200);
    expect(handler).toHaveBeenCalledWith(expect.any(Request), { userId: "google-sub-1", params: { id: "abc" } });
  });

  it("turns an unexpected error into 500 INTERNAL without leaking details", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "google-sub-1" } });
    vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await withAuth(async () => {
      throw new Error("relation users does not exist");
    })(new Request("http://localhost/api/x"), routeContext);

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.code).toBe("INTERNAL");
    expect(JSON.stringify(body)).not.toContain("relation");
  });

  it("rethrows the prerender abort from headers() instead of logging a 500", async () => {
    // Shape of the error `next build` rejects headers() with when it stops prerendering a GET handler.
    const abort = Object.assign(new Error("During prerendering, `headers()` rejects"), {
      digest: "HANGING_PROMISE_REJECTION",
    });
    mockedAuth.mockRejectedValue(abort);
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(withAuth(vi.fn())(new Request("http://localhost/api/x"), routeContext)).rejects.toBe(abort);
    expect(consoleError).not.toHaveBeenCalled();
  });
});
