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

const REPLAY_EVENT = "lontu:replay";
export const REPLAY_INTERVAL_MS = 30_000;

/** Starts a replay pass now, e.g. from "Kirim sekarang" or "Coba lagi". */
export function requestReplay() {
  window.dispatchEvent(new Event(REPLAY_EVENT));
}

type Lock = (run: () => Promise<ReplayResult>) => Promise<ReplayResult | null>;

// Two tabs coming back online would otherwise both send; the client ids already stop duplicates,
// the lock just avoids the wasted requests.
export const outboxLock: Lock = async (run) => {
  if (!navigator.locks) return run();
  return navigator.locks.request("lontu-outbox", { ifAvailable: true }, (lock) =>
    lock ? run() : null,
  );
};

/**
 * Replays now, then again on `online`, `requestReplay`, the page becoming visible, and every 30 s.
 * `target` is the window and `page` the document in the app. Returns the function that stops it.
 */
export function startReplay({
  userId,
  outbox,
  send,
  target,
  page,
  isOnline,
  lock,
  onSent,
  onAuthLost,
}: {
  userId: string;
  outbox: Outbox;
  send: (body: OutboxBody) => Promise<unknown>;
  target: EventTarget;
  page: EventTarget & { visibilityState: DocumentVisibilityState };
  isOnline: () => boolean;
  lock: Lock;
  onSent: () => Promise<unknown>;
  onAuthLost: () => void;
}) {
  const replay = async () => {
    if (!isOnline()) return;
    const result = await lock(() => replayOutbox({ outbox, send, userId }));
    if (result?.sent) await onSent();
    if (result?.stopped === "auth") onAuthLost();
  };
  const run = () => void replay().catch(() => {});
  const onVisible = () => {
    if (page.visibilityState === "visible") run();
  };

  run();
  target.addEventListener("online", run);
  target.addEventListener(REPLAY_EVENT, run);
  page.addEventListener("visibilitychange", onVisible);
  // A pass over an empty outbox is one IndexedDB read, so the interval does not check for pending items first.
  const interval = setInterval(run, REPLAY_INTERVAL_MS);
  return () => {
    target.removeEventListener("online", run);
    target.removeEventListener(REPLAY_EVENT, run);
    page.removeEventListener("visibilitychange", onVisible);
    clearInterval(interval);
  };
}
