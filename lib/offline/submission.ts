"use client";

import { sendJSON } from "@/lib/fetcher";
import type { TransactionCreated } from "@/lib/schemas/transaction";
import type { OutboxBody } from "./outbox";

/** No response within this long is treated as no connection, online and in replay alike. */
export const SEND_TIMEOUT_MS = 10_000;

/** The one way a create reaches the server. Throws ApiError on an HTTP error, or the network error. */
export function sendCreate(body: OutboxBody) {
  return sendJSON<TransactionCreated>("/api/transactions", "POST", body, { signal: AbortSignal.timeout(SEND_TIMEOUT_MS) });
}
