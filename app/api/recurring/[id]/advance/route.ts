import {
  badRequest,
  fieldError,
  invalidJson,
  occurrenceStale,
  ruleNotFound,
  transactionIdTaken,
} from "@/lib/api/errors";
import { withAuth } from "@/lib/api/with-auth";
import { recurringAdvanceSchema } from "@/lib/schemas/recurring";
import { advanceRule } from "@/lib/server/recurring";

export const POST = withAuth<{ id: string }>(async (req, { userId, params }) => {
  const body = await req.json().catch(() => undefined);
  if (body === undefined) return invalidJson();

  const parsed = recurringAdvanceSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error);

  const outcome = await advanceRule(userId, params.id, parsed.data);
  if ("notFound" in outcome) return ruleNotFound();
  if ("stale" in outcome) return occurrenceStale();
  if ("idTaken" in outcome) return transactionIdTaken();
  if ("invalid" in outcome) return fieldError(outcome.invalid.field, outcome.invalid.message);
  return Response.json(outcome.result);
});
