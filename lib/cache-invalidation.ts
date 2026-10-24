import { mutate } from "swr";

export type Resource = "accounts" | "categories" | "transactions" | "budgets";

// `$inf$` is useSWRInfinite's prefix for its aggregate entry.
const KEYS: Record<Resource, RegExp> = {
  accounts: /^\/api\/accounts($|[/?])/,
  categories: /^\/api\/categories($|[/?])/,
  transactions: /^(\$inf\$)?\/api\/transactions($|[/?])/,
  budgets: /^\/api\/budgets($|[/?])/,
};

/** What a change to each resource also makes stale on the server. Direct edges only. */
const AFFECTS: Record<Resource, Resource[]> = {
  // Balances and budget usage are sums over transactions.
  transactions: ["accounts", "budgets"],
  // An initial-balance edit records an adjustment transaction.
  accounts: ["transactions"],
  // Usage rows depend on whether a category is archived.
  categories: ["budgets"],
  budgets: [],
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
