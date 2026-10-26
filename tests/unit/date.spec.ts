import { describe, expect, it } from "vitest";
import { greetingInJakarta } from "@/lib/date";

describe("greetingInJakarta", () => {
  it.each([
    ["2026-10-26T21:00:00Z", "Selamat pagi"], // 04:00 WIB
    ["2026-10-27T03:59:00Z", "Selamat pagi"], // 10:59 WIB
    ["2026-10-27T04:00:00Z", "Selamat siang"], // 11:00 WIB
    ["2026-10-27T07:59:00Z", "Selamat siang"], // 14:59 WIB
    ["2026-10-27T08:00:00Z", "Selamat sore"], // 15:00 WIB
    ["2026-10-27T10:59:00Z", "Selamat sore"], // 17:59 WIB
    ["2026-10-27T11:00:00Z", "Selamat malam"], // 18:00 WIB
    ["2026-10-26T17:00:00Z", "Selamat malam"], // 00:00 WIB
    ["2026-10-26T20:59:00Z", "Selamat malam"], // 03:59 WIB
  ])("at %s says %s", (iso, expected) => {
    expect(greetingInJakarta(new Date(iso))).toBe(expected);
  });
});
