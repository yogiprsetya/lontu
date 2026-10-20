"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ResponsiveModal } from "@/components/layout/responsive-modal";

export function ManageAccountsPlaceholder() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="outline" className="h-11 self-start text-base" onClick={() => setOpen(true)}>
        Kelola akun
      </Button>
      <ResponsiveModal
        open={open}
        onOpenChange={setOpen}
        title="Kelola akun"
        description="Daftar rekening, e-wallet, dan aset."
        footer={
          <Button className="h-11 text-base" onClick={() => setOpen(false)}>
            Tutup
          </Button>
        }
      >
        <p className="py-4 text-muted-foreground">Pengelolaan akun hadir di modul accounts-categories.</p>
      </ResponsiveModal>
    </>
  );
}
