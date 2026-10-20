import "server-only";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { auth } from "@/lib/auth";

/** Real session check for app pages; proxy.ts only looks at the cookie. Render inside <Suspense>. */
export async function RequireSession({ children }: { children: React.ReactNode }) {
  // auth() draws random bytes before it reads the request, which Cache Components rejects during prerender.
  await connection();
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return children;
}
