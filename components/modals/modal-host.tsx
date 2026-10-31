"use client";

import { lazy, Suspense, useState } from "react";
import { CATEGORY_KINDS, type CategoryKind } from "@/lib/schemas/category";
import { type ModalId, useUIStore } from "@/stores/ui";

// Loaded on first open: the modals and react-hook-form would otherwise ship with every app route.
const ManageAccounts = lazy(() =>
  import("@/components/modals/manage-accounts").then((m) => ({ default: m.ManageAccounts })),
);
const ManageCategories = lazy(() =>
  import("@/components/modals/manage-categories").then((m) => ({ default: m.ManageCategories })),
);
const SignOutConfirm = lazy(() =>
  import("@/components/modals/sign-out-confirm").then((m) => ({ default: m.SignOutConfirm })),
);

function asCategoryKind(value: unknown): CategoryKind | undefined {
  return CATEGORY_KINDS.find((kind) => kind === value);
}

/** Mounted once in the (app) layout so any page can open these modals through useUIStore. */
export function ModalHost() {
  const modal = useUIStore((s) => s.modal);
  const modalProps = useUIStore((s) => s.modalProps);
  const close = useUIStore((s) => s.close);

  // A modal stays mounted after its first opening so its close animation can play.
  const [opened, setOpened] = useState<ReadonlySet<ModalId>>(() => new Set());
  if (modal && !opened.has(modal)) setOpened(new Set(opened).add(modal));

  return (
    <>
      {opened.has("manageAccounts") && (
        <Suspense fallback={null}>
          <ManageAccounts open={modal === "manageAccounts"} onClose={close} />
        </Suspense>
      )}
      {opened.has("manageCategories") && (
        <Suspense fallback={null}>
          <ManageCategories
            open={modal === "manageCategories"}
            onClose={close}
            initialKind={asCategoryKind(modalProps?.kind)}
          />
        </Suspense>
      )}
      {opened.has("signOut") && (
        <Suspense fallback={null}>
          <SignOutConfirm
            open={modal === "signOut"}
            onClose={close}
            userId={typeof modalProps?.userId === "string" ? modalProps.userId : undefined}
            count={typeof modalProps?.count === "number" ? modalProps.count : undefined}
          />
        </Suspense>
      )}
    </>
  );
}
