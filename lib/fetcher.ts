export type FieldErrors = Record<string, string[] | undefined>;

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fields?: FieldErrors,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type ErrorBody = { error?: { code?: string; message?: string; fields?: FieldErrors } };

async function parse<T>(res: Response): Promise<T> {
  if (res.ok) return res.json() as Promise<T>;

  const body = (await res.json().catch(() => ({}))) as ErrorBody;
  throw new ApiError(
    res.status,
    body.error?.code ?? "UNKNOWN",
    body.error?.message ?? res.statusText,
    body.error?.fields,
  );
}

export async function fetcher<T = unknown>(url: string): Promise<T> {
  return parse<T>(await fetch(url));
}

/** For mutations: sends `body` as JSON and throws ApiError on a non-2xx response. */
export async function sendJSON<T = unknown>(url: string, method: "POST" | "PATCH" | "DELETE", body?: unknown) {
  const init: RequestInit =
    body === undefined
      ? { method }
      : { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) };
  return parse<T>(await fetch(url, init));
}
