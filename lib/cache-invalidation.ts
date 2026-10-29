import { mutate } from "swr";

export type Resource = "accounts" | "categories" | "transactions" | "budgets" | "dashboard" | "recurring";

/** Every SWR key of a resource starts with its base path. `infinite`: it also has useSWRInfinite lists. */
const RESOURCES: Record<Resource, { base: string; infinite?: boolean }> = {
  accounts: { base: "/api/accounts" },
  categories: { base: "/api/categories" },
  transactions: { base: "/api/transactions", infinite: true },
  budgets: { base: "/api/budgets" },
  dashboard: { base: "/api/dashboard" },
  recurring: { base: "/api/recurring" },
};

// `$inf$` is useSWRInfinite's prefix for its aggregate entry.
const KEYS = Object.fromEntries(
  Object.entries(RESOURCES).map(([resource, { base, infinite }]) => [
    resource,
    new RegExp(`^${infinite ? "(\\$inf\\$)?" : ""}${base}($|[/?])`),
  ]),
) as Record<Resource, RegExp>;

type Query = URLSearchParams | Record<string, string | number | undefined>;

/**
 * The SWR key (and fetch URL) for `resource`: base path, optional sub-path, then the query in the
 * given order. Undefined values are dropped, so equal options give equal keys.
 */
export function apiKey(resource: Resource, { path, query }: { path?: string; query?: Query } = {}) {
  const url = path ? `${RESOURCES[resource].base}/${path}` : RESOURCES[resource].base;
  const params =
    query instanceof URLSearchParams
      ? query
      : new URLSearchParams(
          Object.entries(query ?? {}).flatMap(([name, value]) => (value === undefined ? [] : [[name, String(value)]])),
        );
  const search = params.toString();
  return search ? `${url}?${search}` : url;
}

/**
 * Everything a change to each resource makes stale on the server. Each entry is complete:
 * `invalidate` never follows edges, so a mutation that changes another resource names that one.
 */
const AFFECTS: Record<Resource, Resource[]> = {
  // Balances, budget usage, the dashboard and the payday forecast are sums over transactions.
  transactions: ["accounts", "budgets", "dashboard", "recurring"],
  // An initial-balance edit records an adjustment transaction and moves the forecast balance.
  accounts: ["transactions", "recurring"],
  // Usage rows depend on whether a category is archived.
  categories: ["budgets"],
  budgets: [],
  // Read-only. Adjustments are not counted and names resolve on the client.
  dashboard: [],
  // Rules are not summed anywhere. Recording an occurrence is a "transactions" change.
  recurring: [],
};

export function isResourceKey(resource: Resource, key: unknown) {
  return typeof key === "string" && KEYS[resource].test(key);
}

export function affectedBy(changed: Resource): Resource[] {
  return [changed, ...AFFECTS[changed]];
}

/**
 * The one way a mutation refreshes server data: name what changed, not which keys to refetch.
 * `except` leaves one key alone, such as the detail entry of a row that was just deleted.
 */
export function invalidate(changed: Resource, { except }: { except?: string } = {}) {
  const resources = affectedBy(changed);
  return mutate((key) => key !== except && resources.some((resource) => isResourceKey(resource, key)));
}

/**
 * Takes something out of the cache at once, then sends the request. On success `resource` is
 * invalidated except `except`; if the server refuses, a full revalidation brings the real data
 * back and the error is rethrown.
 */
export async function removeOptimistically<Data, Result>({
  match,
  update,
  send,
  resource,
  except,
}: {
  match: string | ((key: unknown) => boolean);
  update: (current?: Data) => Data | undefined;
  send: () => Promise<Result>;
  resource: Resource;
  except?: string;
}): Promise<Result> {
  // SWR's overloads take a key or a matcher, not the union of both.
  void mutate(match as string, update, { revalidate: false });
  try {
    const result = await send();
    await invalidate(resource, { except });
    return result;
  } catch (err) {
    await invalidate(resource);
    throw err;
  }
}
