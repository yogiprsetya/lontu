"use client";

import Link from "next/link";
import { TransactionForm } from "@/components/forms/transaction-form";
import { LoadError } from "@/components/settings/load-error";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTransaction } from "@/hooks/use-transactions";
import { ApiError } from "@/lib/fetcher";
import { cn } from "@/lib/utils";

function NotFound() {
  return (
    <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed px-4 py-6">
      <p className="font-medium">Transaksi tidak ditemukan</p>
      <p className="text-sm text-muted-foreground">Mungkin sudah dihapus.</p>
      <Link href="/transactions" className={cn(buttonVariants({ variant: "outline" }), "h-11 text-base")}>
        Kembali ke daftar
      </Link>
    </div>
  );
}

/** Loads one transaction and picks the form for its stored type. */
export function TransactionEditor({ id }: { id: string }) {
  const { data, error, mutate } = useTransaction(id);

  if (error instanceof ApiError && error.status === 404) return <NotFound />;
  if (error) return <LoadError message="Gagal memuat transaksi." onRetry={() => void mutate()} />;
  if (!data) return <Skeleton className="h-96 w-full" aria-label="Memuat transaksi" />;

  if (data.type === "income" || data.type === "expense" || data.type === "saving") {
    return <TransactionForm type={data.type} transaction={data} />;
  }
  // Transfer and adjustment pages arrive in the next task.
  return <p className="text-muted-foreground">Jenis transaksi ini belum bisa dibuka di sini.</p>;
}
