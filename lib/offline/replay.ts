import { ApiError } from "@/lib/fetcher";
import type { Outbox, OutboxBody, OutboxError } from "./outbox";

export type ReplayResult = { sent: number; failed: number; stopped: "auth" | "network" | null };

// The field message ("Akun sudah diarsipkan") says more than the generic "Data tidak valid".
function outboxErrorFrom({ message, fields }: ApiError): OutboxError {
  const fieldMessage = Object.values(fields ?? {}).find((messages) => messages?.length)?.[0];
  return fields ? { message: fieldMessage ?? message, fields } : { message };
}

/** One FIFO pass over the user's pending items, one request at a time. */
export async function replayOutbox({
  outbox,
  send,
  userId,
}: {
  outbox: Outbox;
  /** Resolves on 2xx; throws ApiError for any other status, or the network error. */
  send: (body: OutboxBody) => Promise<unknown>;
  userId: string;
}): Promise<ReplayResult> {
  let sent = 0;
  let failed = 0;
  for (const item of await outbox.list(userId)) {
    if (item.status !== "pending") continue;

    try {
      await send(item.body);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return { sent, failed, stopped: "auth" };
      if (err instanceof ApiError && err.status >= 400 && err.status < 500) {
        // Rejected on its merits: retrying the same body cannot succeed until the user acts.
        await outbox.markFailed(item.id, outboxErrorFrom(err));
        failed++;
        continue;
      }
      // No response at all (offline, timeout) is handled like a 5xx.
      await outbox.bump(item.id);
      return { sent, failed, stopped: "network" };
    }
    await outbox.remove(item.id);
    sent++;
  }
  return { sent, failed, stopped: null };
}
