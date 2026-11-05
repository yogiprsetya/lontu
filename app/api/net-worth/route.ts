import { badRequest, fieldError, netWorthNameTaken, invalidJson } from "@/lib/api/errors";
import { withAuth } from "@/lib/api/with-auth";
import { todayInJakarta } from "@/lib/date";
import { netWorthCreateSchema } from "@/lib/schemas/net-worth";
import { createNetWorth } from "@/lib/server/net-worth";
import { netWorthProgress } from "@/lib/server/queries/net-worth-progress";

export const GET = withAuth(async (req, { userId }) => {
  const includeArchived = new URL(req.url).searchParams.get("includeArchived") === "true";
  return Response.json(
    await netWorthProgress(userId, { today: todayInJakarta(), includeArchived }),
  );
});

export const POST = withAuth(async (req, { userId }) => {
  const body = await req.json().catch(() => undefined);
  if (body === undefined) return invalidJson();

  const parsed = netWorthCreateSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error);

  const result = await createNetWorth(userId, parsed.data);
  if ("invalid" in result) return fieldError(result.invalid.field, result.invalid.message);
  if ("nameTaken" in result) return netWorthNameTaken();
  return Response.json(result, { status: 201 });
});
