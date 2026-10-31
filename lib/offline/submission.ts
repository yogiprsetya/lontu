"use client";

import { toast } from "sonner";
import { invalidate } from "@/lib/cache-invalidation";
import { sendJSON } from "@/lib/fetcher";
import type { TransactionCreated, TransactionCreateInput } from "@/lib/schemas/transaction";
import { isNetworkError } from "./network-error";
import { outbox as defaultOutbox, type Outbox, type OutboxBody } from "./outbox";
import { requestReplay } from "./replay";

/** No response within this long is treated as no connection, online and in replay alike. */
export const SEND_TIMEOUT_MS = 10_000;

/** The one way a create reaches the server. Throws ApiError on an HTTP error, or the network error. */
export function sendCreate(body: OutboxBody) {
  return sendJSON<TransactionCreated>("/api/transactions", "POST", body, {
    signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
  });
}

export type CreateOutcome =
  { status: "sent"; created: TransactionCreated } | { status: "queued"; id: string };

// One id per submit, sent online too: a request that reached the server but lost its response
// is then safe to repeat.
function withClientIds(input: TransactionCreateInput): OutboxBody {
  const id = crypto.randomUUID();
  if (input.type === "transfer" && input.fee)
    return { ...input, id, fee: { ...input.fee, id: crypto.randomUUID() } };
  return { ...input, id };
}

/**
 * Queues the create on the device when there is no connection or no response within 10 s.
 * Any HTTP response, 5xx included, is not queued and throws as before.
 */
export async function createTransaction(
  input: TransactionCreateInput,
  { userId, outbox = defaultOutbox }: { userId: string | undefined; outbox?: Outbox },
): Promise<CreateOutcome> {
  const body = withClientIds(input);
  const queue = async (cause: unknown): Promise<CreateOutcome> => {
    if (!userId) throw cause;
    await outbox.enqueue(userId, body);
    return { status: "queued", id: body.id };
  };

  if (!navigator.onLine) return queue(new TypeError("Offline"));
  let created: TransactionCreated;
  try {
    created = await sendCreate(body);
  } catch (err) {
    if (isNetworkError(err)) return queue(err);
    throw err;
  }
  await invalidate("transactions");
  return { status: "sent", created };
}

let persistRequested = false;

/** The create forms' submit: sends or queues, then tells the user which one happened. */
export async function submitTransaction(
  input: TransactionCreateInput,
  {
    userId,
    outbox,
    sentMessage,
  }: { userId: string | undefined; outbox?: Outbox; sentMessage: string },
): Promise<CreateOutcome> {
  const outcome = await createTransaction(input, { userId, outbox });
  if (outcome.status === "sent") {
    toast.success(sentMessage);
    return outcome;
  }
  toast("Disimpan di perangkat, dikirim saat online");
  if (!persistRequested) {
    persistRequested = true;
    // Asks the browser not to evict the outbox under storage pressure (iOS clears idle sites).
    void navigator.storage?.persist?.().catch(() => {});
  }
  return outcome;
}

/** "Coba lagi" on a failed item, e.g. after the archived account was restored. */
export async function retryQueued(id: string, outbox: Outbox = defaultOutbox) {
  await outbox.retry(id);
  requestReplay();
}

export function discardQueued(id: string, outbox: Outbox = defaultOutbox) {
  return outbox.remove(id);
}
