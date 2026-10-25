/** True when a request never got an HTTP response: fetch rejected, was aborted, or timed out. */
export function isNetworkError(err: unknown): boolean {
  // fetch rejects with a TypeError only when the request itself fails; ApiError is not one.
  if (err instanceof TypeError) return true;
  return err instanceof Error && (err.name === "AbortError" || err.name === "TimeoutError");
}

export const OFFLINE_MUTATION_MESSAGE = "Tidak ada koneksi. Perubahan ini butuh internet.";

/** The toast for a failed mutation: offline gets its own message instead of "coba lagi". */
export function failureMessage(err: unknown, fallback: string) {
  return isNetworkError(err) ? OFFLINE_MUTATION_MESSAGE : fallback;
}
