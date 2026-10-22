import { z } from "zod";

export type CursorKey = { date: string; createdAtMicros: number; id: string };

const tupleSchema = z.tuple([z.iso.date(), z.int(), z.uuid()]);

export function encodeCursor({ date, createdAtMicros, id }: CursorKey) {
  return Buffer.from(JSON.stringify([date, createdAtMicros, id])).toString("base64url");
}

/** Returns null for anything that is not a cursor this module produced. */
export function decodeCursor(cursor: string): CursorKey | null {
  try {
    const parsed = tupleSchema.safeParse(JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")));
    if (!parsed.success) return null;
    const [date, createdAtMicros, id] = parsed.data;
    return { date, createdAtMicros, id };
  } catch {
    return null;
  }
}
