"use client";

import { useState } from "react";
import { Loader2Icon } from "lucide-react";
import { signOutToLogin } from "@/components/layout/sign-out";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function SignOutConfirm({
  open,
  onClose,
  userId,
  count,
}: {
  open: boolean;
  onClose: () => void;
  userId?: string;
  count?: number;
}) {
  const [pending, setPending] = useState(false);

  return (
    <AlertDialog open={open} onOpenChange={(next) => !next && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Keluar dari Lontu?</AlertDialogTitle>
          <AlertDialogDescription>
            {count} transaksi belum terkirim akan dibuang. Tetap keluar?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="h-11 text-base">Batal</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            className="h-11 text-base"
            disabled={pending}
            onClick={() => {
              setPending(true);
              void signOutToLogin(userId);
            }}
          >
            {pending && <Loader2Icon className="animate-spin" aria-hidden />}
            Buang dan keluar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
