import { badRequest, fieldError, invalidJson } from "@/lib/api/errors";
import { withAuth } from "@/lib/api/with-auth";
import { valuationSchema } from "@/lib/schemas/valuation";
import { assetValuations } from "@/lib/server/queries/asset-valuations";
import { recordValuations } from "@/lib/server/valuations";

export const GET = withAuth(async (_req, { userId }) => {
  return Response.json(await assetValuations(userId));
});

export const POST = withAuth(async (req, { userId }) => {
  const body = await req.json().catch(() => undefined);
  if (body === undefined) return invalidJson();

  const parsed = valuationSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error);

  const result = await recordValuations(userId, parsed.data);
  if ("invalid" in result) return fieldError(result.invalid.field, result.invalid.message);
  return Response.json(result);
});
