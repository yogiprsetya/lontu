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

export async function fetcher<T = unknown>(url: string): Promise<T> {
  const res = await fetch(url);
  if (res.ok) return res.json() as Promise<T>;

  const body = (await res.json().catch(() => ({}))) as ErrorBody;
  throw new ApiError(
    res.status,
    body.error?.code ?? "UNKNOWN",
    body.error?.message ?? res.statusText,
    body.error?.fields,
  );
}
