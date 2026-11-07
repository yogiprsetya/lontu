import {
  badRequest,
  fieldError,
  netWorthNameTaken,
  netWorthNotFound,
  invalidJson,
} from "@/lib/api/errors";
import { withAuth } from "@/lib/api/with-auth";
import { netWorthUpdateSchema } from "@/lib/schemas/net-worth";
import { archiveNetWorth, updateNetWorth } from "@/lib/server/net-worth";

export const PATCH = withAuth<{ id: string }>(async (req, { userId, params }) => {
  const body = await req.json().catch(() => undefined);
  if (body === undefined) return invalidJson();

  const parsed = netWorthUpdateSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error);

  const result = await updateNetWorth(userId, params.id, parsed.data);
  if ("notFound" in result) return netWorthNotFound();
  if ("invalid" in result) return fieldError(result.invalid.field, result.invalid.message);
  if ("nameTaken" in result) return netWorthNameTaken();
  return Response.json(result);
});

export const DELETE = withAuth<{ id: string }>(async (_req, { userId, params }) => {
  const result = await archiveNetWorth(userId, params.id);
  return "notFound" in result ? netWorthNotFound() : Response.json(result);
});
