"use client";

import { useState } from "react";
import { ArchiveIcon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { failureMessage } from "@/lib/offline/network-error";

type ArchiveButtonProps = {
  /** Button text, e.g. "Arsipkan akun". */
  label: string;
  name: string;
  description: React.ReactNode;
  archive: () => Promise<unknown>;
  onArchived: () => void;
  disabled?: boolean;
};

export function ArchiveButton({
  label,
  name,
  description,
  archive,
  onArchived,
  disabled,
}: ArchiveButtonProps) {
  const [pending, setPending] = useState(false);

  async function confirm() {
    setPending(true);
    try {
      await archive();
      toast.success(`${name} diarsipkan`);
      onArchived();
    } catch (err) {
      toast.error(failureMessage(err, "Gagal mengarsipkan. Coba lagi."));
      setPending(false);
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger
        disabled={disabled}
        render={<Button type="button" variant="destructive" className="self-start" />}
      >
        <ArchiveIcon aria-hidden />
        {label}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Arsipkan {name}?</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Batal</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"

            disabled={pending}
            onClick={() => void confirm()}
          >
            {pending && <Loader2Icon className="animate-spin" aria-hidden />}
            Arsipkan
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function RestoreButton({
  name,
  restore,
  disabled,
}: {
  name: string;
  restore: () => Promise<unknown>;
  disabled?: boolean;
}) {
  const [pending, setPending] = useState(false);

  async function handleClick() {
    setPending(true);
    try {
      await restore();
      toast.success(`${name} dipulihkan`);
    } catch (err) {
      toast.error(failureMessage(err, "Gagal memulihkan. Coba lagi."));
    } finally {
      setPending(false);
    }
  }

  return (
    <Button
      variant="outline"
      className="shrink-0"
      disabled={disabled || pending}
      onClick={() => void handleClick()}
    >
      Pulihkan
    </Button>
  );
}
