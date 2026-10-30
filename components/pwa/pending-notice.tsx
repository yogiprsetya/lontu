"use client";

import Link from "next/link";
import { useOutbox } from "@/hooks/use-outbox";

export function PendingNotice() {
  const count = useOutbox().length;
  return (
    <div aria-live="polite">
      {count > 0 && (
        <p className="surface px-5 py-4 text-sm">
          {count} transaksi belum terkirim, belum masuk saldo dan ringkasan.{" "}
          <Link
            href="/transactions"
            className="inline-flex min-h-11 items-center font-medium underline underline-offset-4"
          >
            Lihat
          </Link>
        </p>
      )}
    </div>
  );
}
