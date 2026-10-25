import { type NextRequest, NextResponse } from "next/server";

const SESSION_COOKIES = ["authjs.session-token", "__Secure-authjs.session-token"];

// Optimistic check only: withAuth and server components verify the session for real.
export function proxy(request: NextRequest) {
  const hasSession = request.cookies
    .getAll()
    .some(({ name }) => SESSION_COOKIES.some((c) => name === c || name.startsWith(`${c}.`)));
  if (hasSession) return NextResponse.next();
  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  matcher: ["/((?!login|api/|_next/static|_next/image|favicon\\.ico|manifest\\.webmanifest|icons/|sw\\.js|~offline).*)"],
};
