import { badRequest } from "@/lib/api/errors";
import { withAuth } from "@/lib/api/with-auth";
import { transactionFilterSchema } from "@/lib/schemas/transaction";
import { exportTransactionsCsv } from "@/lib/server/transaction-export";
import { exportFilename } from "@/lib/transaction-filters";

export const GET = withAuth(async (req, { userId }) => {
  const parsed = transactionFilterSchema.safeParse(
    Object.fromEntries(new URL(req.url).searchParams),
  );
  if (!parsed.success) return badRequest(parsed.error);

  return new Response(await exportTransactionsCsv(userId, parsed.data), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      // The name is built only from validated YYYY-MM-DD dates.
      "content-disposition": `attachment; filename="${exportFilename(parsed.data)}"`,
    },
  });
});
