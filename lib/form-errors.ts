import { ApiError } from "@/lib/fetcher";

type SetError = (name: never, error: { message: string }) => void;

/** Maps server field errors and 409 name clashes onto the form. Returns false when the caller should show a toast. */
export function applyServerErrors(err: unknown, setError: SetError): boolean {
  if (!(err instanceof ApiError)) return false;
  const set = setError as (name: string, error: { message: string }) => void;

  if (err.status === 409) {
    set("name", { message: err.message });
    return true;
  }
  const entries = Object.entries(err.fields ?? {}).filter(
    (e): e is [string, string[]] => !!e[1]?.length,
  );
  for (const [name, messages] of entries) set(name, { message: messages[0] });
  return entries.length > 0;
}
