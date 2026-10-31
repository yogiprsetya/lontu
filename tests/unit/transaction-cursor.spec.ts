import { describe, expect, it } from "vitest";
import { decodeCursor, encodeCursor } from "@/lib/server/transaction-cursor";

const id = "0b0e5f7e-4f0a-4c53-9a4e-2f6d1c9f8a11";
const key = { date: "2026-10-20", createdAtMicros: 1_760_000_000_123_456, id };

function raw(value: unknown) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

describe("transaction cursor", () => {
  it("round-trips date, microsecond timestamp and id", () => {
    expect(decodeCursor(encodeCursor(key))).toEqual(key);
  });

  it("keeps microsecond precision", () => {
    const micros = 1_760_000_000_000_001;
    expect(decodeCursor(encodeCursor({ ...key, createdAtMicros: micros }))?.createdAtMicros).toBe(
      micros,
    );
  });

  it.each([
    ["not base64 json", "!!!"],
    ["not an array", raw({ a: 1 })],
    ["wrong length", raw(["2026-10-20", 1])],
    ["bad date", raw(["20-10-2026", 1, id])],
    ["impossible date", raw(["2026-02-31", 1, id])],
    ["fractional micros", raw(["2026-10-20", 1.5, id])],
    ["string micros", raw(["2026-10-20", "1", id])],
    ["bad id", raw(["2026-10-20", 1, "nope"])],
  ])("rejects %s", (_, cursor) => {
    expect(decodeCursor(cursor)).toBeNull();
  });
});
