import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { config, proxy } from "@/proxy";

function request(path: string, cookie?: string) {
  return new NextRequest(new URL(path, "http://localhost:3000"), {
    headers: cookie ? { cookie } : undefined,
  });
}

describe("proxy", () => {
  it("redirects to /login without a session cookie", () => {
    const res = proxy(request("/dashboard"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/login");
  });

  it.each(["authjs.session-token=abc", "__Secure-authjs.session-token=abc"])("passes through with %s", (cookie) => {
    const res = proxy(request("/dashboard", cookie));
    expect(res.headers.get("location")).toBeNull();
  });

  it("passes through chunked session cookies", () => {
    const res = proxy(request("/dashboard", "authjs.session-token.0=abc; authjs.session-token.1=def"));
    expect(res.headers.get("location")).toBeNull();
  });
});

describe("proxy matcher", () => {
  const pattern = new RegExp(`^${config.matcher[0]}$`);

  it.each(["/", "/dashboard", "/add/expense"])("runs on %s", (path) => {
    expect(pattern.test(path)).toBe(true);
  });

  it.each([
    "/login",
    "/api/auth/callback/google",
    "/api/me",
    "/_next/static/chunk.js",
    "/_next/image",
    "/favicon.ico",
    "/manifest.webmanifest",
    "/icons/icon-192.png",
  ])("skips %s", (path) => {
    expect(pattern.test(path)).toBe(false);
  });
});
