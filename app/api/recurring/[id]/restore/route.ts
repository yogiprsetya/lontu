import { ruleNotFound } from "@/lib/api/errors";
import { withAuth } from "@/lib/api/with-auth";
import { setRuleArchived } from "@/lib/server/recurring";

export const POST = withAuth<{ id: string }>(async (_req, { userId, params }) => {
  const rule = await setRuleArchived(userId, params.id, false);
  return rule ? Response.json(rule) : ruleNotFound();
});
