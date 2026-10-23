import "server-only";

/** True when `err` is a Postgres unique violation on `constraint`. Drizzle wraps the driver error in `cause`. */
export function isUniqueViolation(err: unknown, constraint: string) {
  const pg = ((err as { cause?: unknown })?.cause ?? err) as { code?: string; constraint_name?: string } | undefined;
  return pg?.code === "23505" && pg.constraint_name === constraint;
}
