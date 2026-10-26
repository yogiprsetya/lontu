import type { FieldErrors } from "@/lib/fetcher";
import type { Outbox, OutboxBody, OutboxError } from "./outbox";

export type ReplayResult = { sent: number; failed: number; stopped: "auth" | "network" | null };

type ErrorBody = { error?: { message?: string; fields?: FieldErrors } };

// The field message ("Akun sudah diarsipkan") says more than the generic "Data tidak valid".
async function errorOf(res: Response): Promise<OutboxError> {
  const { error } = (await res.json().catch(() => ({}))) as ErrorBody;
  const fieldMessage = Object.values(error?.fields ?? {}).find((messages) => messages?.length)?.[0];
  const message = fieldMessage ?? error?.message ?? res.statusText;
  return error?.fields ? { message, fields: error.fields } : { message };
}

/** One FIFO pass over the user's pending items, one request at a time. */
export async function replayOutbox({
  outbox,
  send,
  userId,
}: {
  outbox: Outbox;
  send: (body: OutboxBody) => Promise<Response>;
  userId: string;
}): Promise<ReplayResult> {
  let sent = 0;
  let failed = 0;
  for (const item of await outbox.list(userId)) {
    if (item.status !== "pending") continue;

    // No response at all (offline, timeout) is handled like a 5xx below.
    const res = await send(item.body).catch(() => undefined);

    if (res?.ok) {
      await outbox.remove(item.id);
      sent++;
    } else if (res?.status === 401) {
      return { sent, failed, stopped: "auth" };
    } else if (res && res.status >= 400 && res.status < 500) {
      // Rejected on its merits: retrying the same body cannot succeed until the user acts.
      await outbox.markFailed(item.id, await errorOf(res));
      failed++;
    } else {
      await outbox.bump(item.id);
      return { sent, failed, stopped: "network" };
    }
  }
  return { sent, failed, stopped: null };
}
