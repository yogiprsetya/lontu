"use client";

import { ManageAccounts } from "@/components/modals/manage-accounts";
import { ManageCategories } from "@/components/modals/manage-categories";
import { CATEGORY_KINDS, type CategoryKind } from "@/lib/schemas/category";
import { useUIStore } from "@/stores/ui";

function asCategoryKind(value: unknown): CategoryKind | undefined {
  return CATEGORY_KINDS.find((kind) => kind === value);
}

/** Mounted once in the (app) layout so any page can open these modals through useUIStore. */
export function ModalHost() {
  const modal = useUIStore((s) => s.modal);
  const modalProps = useUIStore((s) => s.modalProps);
  const close = useUIStore((s) => s.close);

  return (
    <>
      <ManageAccounts open={modal === "manageAccounts"} onClose={close} />
      <ManageCategories
        open={modal === "manageCategories"}
        onClose={close}
        initialKind={asCategoryKind(modalProps?.kind)}
      />
    </>
  );
}
