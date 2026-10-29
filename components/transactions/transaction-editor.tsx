"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2Icon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { TransactionForm } from "@/components/forms/transaction-form";
import { TransferForm } from "@/components/forms/transfer-form";
import { AdjustmentCard } from "@/components/transactions/adjustment-card";
import { LoadError } from "@/components/settings/load-error";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useBackToList } from "@/hooks/use-back-to-list";
import { deleteTransaction, restoreTransaction, useTransaction } from "@/hooks/use-transactions";
import { ApiError } from "@/lib/fetcher";
import { cn } from "@/lib/utils";
import { failureMessage } from "@/lib/offline/network-error";
import { undoToast } from "@/lib/undo-toast";

function NotFound() {
  return (
    <div className="flex flex-col items-start gap-3 rounded-2xl border-2 border-dashed px-4 py-6">
      <p className="font-medium">Transaksi tidak ditemukan</p>
      <p className="text-sm text-muted-foreground">Mungkin sudah dihapus.</p>
      <Link href="/transactions" className={cn(buttonVariants({ variant: "outline" }), "h-11 text-base")}>
        Kembali ke daftar
      </Link>
    </div>
  );
}

function DeleteButton({ id }: { id: string }) {
  const backToList = useBackToList();
  const [deleting, setDeleting] = useState(false);

  // The cached list drops the row at once; we only leave this page once the server agrees,
  // so a failed delete keeps the user here with the row still in front of them.
  async function onDelete() {
    setDeleting(true);
    try {
      await deleteTransaction(id);
      backToList();
      undoToast({ message: "Transaksi dihapus", restore: () => restoreTransaction(id) });
    } catch (err) {
      toast.error(failureMessage(err, "Gagal menghapus transaksi. Coba lagi."));
      setDeleting(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      className="mt-8 h-11 w-full text-base text-destructive"
      disabled={deleting}
      onClick={() => void onDelete()}
    >
      {deleting ? <Loader2Icon className="animate-spin" aria-hidden /> : <Trash2Icon aria-hidden />}
      Hapus
    </Button>
  );
}

/** Loads one transaction and picks the form for its stored type. */
export function TransactionEditor({ id }: { id: string }) {
  const { data, error, mutate } = useTransaction(id);

  if (error instanceof ApiError && error.status === 404) return <NotFound />;
  if (error) return <LoadError message="Gagal memuat transaksi." onRetry={() => void mutate()} />;
  if (!data) return <Skeleton className="h-96 w-full" aria-label="Memuat transaksi" />;

  return (
    <>
      {data.type === "transfer" ? (
        <TransferForm transaction={data} />
      ) : data.type === "adjustment" ? (
        <AdjustmentCard transaction={data} />
      ) : (
        <TransactionForm type={data.type} transaction={data} />
      )}
      <DeleteButton id={data.id} />
    </>
  );
}
