"use client";

import { useSyncExternalStore } from "react";
import { useProfile } from "@/hooks/use-profile";
import { outbox as defaultOutbox, type Outbox, type OutboxItem } from "@/lib/offline/outbox";

const EMPTY: OutboxItem[] = [];

/** A synchronous snapshot over the async outbox, refreshed whenever the outbox changes. */
export function createOutboxStore(outbox: Outbox, userId: string) {
  let items = EMPTY;
  const listeners = new Set<() => void>();
  let unsubscribe: (() => void) | undefined;

  async function refresh() {
    items = await outbox.list(userId);
    listeners.forEach((listener) => listener());
  }

  return {
    subscribe(onChange: () => void) {
      listeners.add(onChange);
      if (listeners.size === 1) {
        unsubscribe = outbox.subscribe(() => void refresh());
        void refresh();
      }
      return () => {
        listeners.delete(onChange);
        if (listeners.size === 0) unsubscribe?.();
      };
    },
    getSnapshot: () => items,
  };
}

const stores = new Map<string, ReturnType<typeof createOutboxStore>>();

function storeFor(userId: string) {
  let store = stores.get(userId);
  if (!store) stores.set(userId, (store = createOutboxStore(defaultOutbox, userId)));
  return store;
}

const noopSubscribe = () => () => {};
const getEmpty = () => EMPTY;

/** The signed-in user's queued creates, oldest first. Empty until the profile is known. */
export function useOutbox(): OutboxItem[] {
  const { data } = useProfile();
  const store = data?.id ? storeFor(data.id) : undefined;
  return useSyncExternalStore(
    store?.subscribe ?? noopSubscribe,
    store?.getSnapshot ?? getEmpty,
    getEmpty,
  );
}
