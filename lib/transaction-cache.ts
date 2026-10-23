import type { TransactionPage } from "@/lib/schemas/transaction";

/** Drops one row from cached list pages. Cursors stay, so "Muat lebih banyak" still works. */
export function removeFromPages(pages: TransactionPage[], id: string): TransactionPage[] {
  return pages.map((page) => ({ ...page, items: page.items.filter((t) => t.id !== id) }));
}
