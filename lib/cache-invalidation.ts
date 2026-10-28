import { mutate } from "swr";

export type Resource = "accounts" | "categories" | "transactions" | "budgets" | "dashboard" | "recurring";

// `$inf$` is useSWRInfinite's prefix for its aggregate entry.
const KEYS: Record<Resource, RegExp> = {
  accounts: /^\/api\/accounts($|[/?])/,
  categories: /^\/api\/categories($|[/?])/,
  transactions: /^(\$inf\$)?\/api\/transactions($|[/?])/,
  budgets: /^\/api\/budgets($|[/?])/,
  dashboard: /^\/api\/dashboard($|[/?])/,
  recurring: /^\/api\/recurring($|[/?])/,
};

/** What a change to each resource also makes stale on the server. Direct edges only. */
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
  // Recording an occurrence writes a transaction. Edges are one level deep, so that mutation
  // also invalidates "transactions" itself to reach balances, budgets and the dashboard.
  recurring: ["transactions"],
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
