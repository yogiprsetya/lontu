import { createStore, del, entries, get, set, type UseStore } from "idb-keyval";

// Injected so offline logic can be tested with a Map instead of a fake IndexedDB.
export interface KeyValueStore {
  get<T>(key: string): Promise<T | undefined>;
  set(key: string, value: unknown): Promise<void>;
  del(key: string): Promise<void>;
  entries<T>(): Promise<[string, T][]>;
}

let idb: UseStore | undefined;

// createStore opens the database right away, so it waits until the first browser call.
function idbStore() {
  return (idb ??= createStore("lontu", "kv"));
}

export const browserStore: KeyValueStore = {
  get: (key) => get(key, idbStore()),
  set: (key, value) => set(key, value, idbStore()),
  del: (key) => del(key, idbStore()),
  entries: <T>() => entries<string, T>(idbStore()),
};
