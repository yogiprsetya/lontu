import { USER_DATA_CACHES } from "./cache-names";
import { browserStore, type KeyValueStore } from "./storage";

const OWNER_KEY = "cacheOwner";

type CacheDeleter = Pick<CacheStorage, "delete">;

// `caches` is missing outside secure contexts (e.g. next dev over plain http on a phone).
export async function clearOfflineCaches(cacheStorage: CacheDeleter | undefined = globalThis.caches) {
  if (!cacheStorage) return;
  await Promise.all(USER_DATA_CACHES.map((name) => cacheStorage.delete(name)));
}

export async function ensureCacheOwner(
  userId: string,
  { store = browserStore, clear = () => clearOfflineCaches() }: { store?: KeyValueStore; clear?: () => Promise<void> } = {},
) {
  if ((await store.get<string>(OWNER_KEY)) === userId) return;
  await clear();
  await store.set(OWNER_KEY, userId);
}
