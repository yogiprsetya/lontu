"use client";

import { useRouter } from "next/navigation";

/** Back to wherever the list was (keeping its filters); a page opened directly goes to /transactions. */
export function useBackToList() {
  const router = useRouter();
  return () => {
    if (window.history.length > 1) router.back();
    else router.push("/transactions");
  };
}
