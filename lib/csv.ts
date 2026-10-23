export const BOM = "﻿";

export type Cell = string | number | null;

// A text cell opening with one of these is run as a formula by spreadsheets.
const FORMULA_START = /^[=+\-@\t\r]/;
const NEEDS_QUOTES = /[",\r\n]/;

function toCell(cell: Cell) {
  if (cell === null) return "";
  // Numbers are written as is: an adjustment of -50000 is a number, not an attack.
  if (typeof cell === "number") return String(cell);
  const text = FORMULA_START.test(cell) ? `'${cell}` : cell;
  return NEEDS_QUOTES.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

/** CSV with a UTF-8 BOM so Excel reads the Indonesian text correctly. */
export function toCSV(rows: Cell[][]) {
  return BOM + rows.map((row) => row.map(toCell).join(",")).join("\r\n");
}
