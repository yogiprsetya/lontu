"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { restoreNetWorth } from "@/hooks/use-net-worth";
import { ApiError } from "@/lib/fetcher";
import { failureMessage } from "@/lib/offline/network-error";
import type { NetWorthProgress } from "@/lib/schemas/net-worth";

/** A 409 names the net worth or account that is now taken, so its message is shown as is. */
export async function restoreWithMessage(netWorth: NetWorthProgress) {
  try {
    await restoreNetWorth(netWorth.id);
    toast.success(`${netWorth.name} dipulihkan`);
  } catch (err) {
    toast.error(
      err instanceof ApiError && err.status === 409
        ? err.message
        : failureMessage(err, "Gagal memulihkan target. Coba lagi."),
    );
  }
}

export function RestoreNetWorthButton({
  netWorth,
  disabled,
}: {
  netWorth: NetWorthProgress;
  disabled?: boolean;
}) {
  const [pending, setPending] = useState(false);
  return (
    <Button
      variant="outline"
      className="shrink-0"
      disabled={disabled || pending}
      onClick={async () => {
        setPending(true);
        await restoreWithMessage(netWorth);
        setPending(false);
      }}
    >
      Pulihkan
    </Button>
  );
}
