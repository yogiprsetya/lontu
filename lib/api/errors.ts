import { z } from "zod";

function error(status: number, code: string, message: string, fields?: Record<string, string[] | undefined>) {
  return Response.json({ error: { code, message, ...(fields && { fields }) } }, { status });
}

export function badRequest(err: z.ZodError) {
  return error(400, "VALIDATION_ERROR", "Data tidak valid", z.flattenError(err).fieldErrors);
}

/** A 400 for a check Zod cannot do, such as ownership of a referenced id. */
export function fieldError(field: string, message: string) {
  return error(400, "VALIDATION_ERROR", "Data tidak valid", { [field]: [message] });
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

export function accountNotFound() {
  return notFound("ACCOUNT_NOT_FOUND", "Akun tidak ditemukan");
}

export function categoryNameTaken() {
  return conflict(
    "CATEGORY_NAME_TAKEN",
    "Nama kategori sudah dipakai di jenis ini. Jika kategori itu diarsipkan, pulihkan saja.",
  );
}

export function categoryNotFound() {
  return notFound("CATEGORY_NOT_FOUND", "Kategori tidak ditemukan");
}

export function transactionNotFound() {
  return notFound("TRANSACTION_NOT_FOUND", "Transaksi tidak ditemukan");
}

export function transactionNotEditable() {
  return conflict("TRANSACTION_NOT_EDITABLE", "Penyesuaian saldo tidak bisa diubah. Hapus saja jika keliru.");
}

export function transactionChanged() {
  return conflict("TRANSACTION_CHANGED", "Transaksi berubah saat disimpan. Muat ulang lalu coba lagi.");
}

export function budgetNotFound() {
  return notFound("BUDGET_NOT_FOUND", "Budget tidak ditemukan");
}

export function invalidCursor() {
  return error(400, "INVALID_CURSOR", "Cursor tidak valid");
}

export function serverError(err: unknown) {
  console.error(err);
  return error(500, "INTERNAL", "Terjadi kesalahan di server");
}
