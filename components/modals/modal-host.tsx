"use client";

import { ManageAccounts } from "@/components/modals/manage-accounts";
import { useUIStore } from "@/stores/ui";

/** Mounted once in the (app) layout so any page can open these modals through useUIStore. */
export function ModalHost() {
  const modal = useUIStore((s) => s.modal);
  const close = useUIStore((s) => s.close);

  return <ManageAccounts open={modal === "manageAccounts"} onClose={close} />;
}
