import { z } from "zod";

function error(status: number, code: string, message: string, fields?: Record<string, string[] | undefined>) {
  return Response.json({ error: { code, message, ...(fields && { fields }) } }, { status });
}

export function badRequest(err: z.ZodError) {
  return error(400, "VALIDATION_ERROR", "Data tidak valid", z.flattenError(err).fieldErrors);
}

export function invalidJson() {
  return error(400, "INVALID_JSON", "Body request bukan JSON yang valid");
}

export function unauthorized() {
  return error(401, "UNAUTHORIZED", "Silakan masuk terlebih dahulu");
}

export function notFound(code = "NOT_FOUND", message = "Data tidak ditemukan") {
  return error(404, code, message);
}

export function conflict(code: string, message: string) {
  return error(409, code, message);
}

export function accountNameTaken() {
  return conflict("ACCOUNT_NAME_TAKEN", "Nama akun sudah dipakai. Jika akun itu diarsipkan, pulihkan saja.");
}

export function serverError(err: unknown) {
  console.error(err);
  return error(500, "INTERNAL", "Terjadi kesalahan di server");
}
