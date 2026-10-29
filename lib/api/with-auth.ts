import "server-only";
import { unstable_rethrow } from "next/navigation";
import { auth } from "@/lib/auth";
import { serverError, unauthorized } from "@/lib/api/errors";

type Params = Record<string, string | string[]>;

export type AuthedContext<P extends Params = Params> = { userId: string; params: P };

type RouteContext<P extends Params> = { params: Promise<P> };

export function withAuth<P extends Params = Params>(
  handler: (req: Request, ctx: AuthedContext<P>) => Promise<Response>,
) {
  return async (req: Request, { params }: RouteContext<P>): Promise<Response> => {
    try {
      const session = await auth();
      const userId = session?.user?.id;
      if (!userId) return unauthorized();
      return await handler(req, { userId, params: await params });
    } catch (err) {
      // Cache Components prerenders GET handlers at build time; Next aborts that by rejecting headers().
      unstable_rethrow(err);
      return serverError(err);
    }
  };
}
