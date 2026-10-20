"use client";

import { useState } from "react";
import { ArchiveIcon } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

type ShowArchivedSwitchProps = { id: string; checked: boolean; onCheckedChange: (checked: boolean) => void };

export function ShowArchivedSwitch({ id, checked, onCheckedChange }: ShowArchivedSwitchProps) {
  return (
    <Label htmlFor={id} className="flex min-h-11 cursor-pointer items-center justify-between gap-3 text-base font-normal">
      Tampilkan arsip
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </Label>
  );
}

type ArchiveButtonProps = {
  /** Button text, e.g. "Arsipkan akun". */
  label: string;
  name: string;
  description: React.ReactNode;
  archive: () => Promise<unknown>;
  onArchived: () => void;
};

export function ArchiveButton({ label, name, description, archive, onArchived }: ArchiveButtonProps) {
  const [pending, setPending] = useState(false);

  async function confirm() {
    setPending(true);
    try {
      await archive();
      toast.success(`${name} diarsipkan`);
      onArchived();
    } catch {
      toast.error("Gagal mengarsipkan. Coba lagi.");
      setPending(false);
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button type="button" variant="destructive" className="h-11 self-start text-base" />}>
        <ArchiveIcon aria-hidden />
        {label}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Arsipkan {name}?</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="h-11 text-base">Batal</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            className="h-11 text-base"
            disabled={pending}
            onClick={() => void confirm()}
          >
            Arsipkan
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function RestoreButton({ name, restore }: { name: string; restore: () => Promise<unknown> }) {
  const [pending, setPending] = useState(false);

  async function handleClick() {
    setPending(true);
    try {
      await restore();
      toast.success(`${name} dipulihkan`);
    } catch {
      toast.error("Gagal memulihkan. Coba lagi.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Button variant="outline" className="h-11 shrink-0 text-base" disabled={pending} onClick={() => void handleClick()}>
      Pulihkan
    </Button>
  );
}
