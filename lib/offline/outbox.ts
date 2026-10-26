import type { FieldErrors } from "@/lib/fetcher";
import type { TransactionCreateInput } from "@/lib/schemas/transaction";
import { browserStore, type KeyValueStore } from "./storage";

export type OutboxBody = TransactionCreateInput & { id: string };

export type OutboxError = { message: string; fields?: FieldErrors };

export type OutboxItem = {
  id: string;
  userId: string;
  body: OutboxBody;
  createdAt: string;
  status: "pending" | "failed";
  attempts: number;
  error?: OutboxError;
};

// The store also holds `cacheOwner`, so items live under their own prefix.
const PREFIX = "outbox:";
const keyOf = (id: string) => `${PREFIX}${id}`;

export function createOutbox(store: KeyValueStore = browserStore, now: () => Date = () => new Date()) {
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((listener) => listener());

  async function update(id: string, change: (item: OutboxItem) => OutboxItem) {
    const item = await store.get<OutboxItem>(keyOf(id));
    if (!item) return;
    await store.set(keyOf(id), change(item));
    notify();
  }

  return {
    /** A second enqueue of the same id keeps the first item. */
    async enqueue(userId: string, body: OutboxBody) {
      if (await store.get(keyOf(body.id))) return;
      const item: OutboxItem = { id: body.id, userId, body, createdAt: now().toISOString(), status: "pending", attempts: 0 };
      await store.set(keyOf(body.id), item);
      notify();
    },
    async list(userId: string): Promise<OutboxItem[]> {
      return (await store.entries<OutboxItem>())
        .filter(([key, item]) => key.startsWith(PREFIX) && item.userId === userId)
        .map(([, item]) => item)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    },
    markFailed: (id: string, error: OutboxError) => update(id, (item) => ({ ...item, status: "failed", error })),
    retry: (id: string) => update(id, (item) => ({ ...item, status: "pending", error: undefined })),
    bump: (id: string) => update(id, (item) => ({ ...item, attempts: item.attempts + 1 })),
    async remove(id: string) {
      await store.del(keyOf(id));
      notify();
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
  };
}

export type Outbox = ReturnType<typeof createOutbox>;

export const outbox = createOutbox();
