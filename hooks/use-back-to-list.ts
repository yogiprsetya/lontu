"use client";

import { useRouter } from "next/navigation";

/**
 * Back to wherever the list was (keeping its filters). A page opened directly, or from another
 * site, goes to /transactions instead of leaving the app.
 */
export function useBackToList() {
  const router = useRouter();
  return () => {
    const cameFromApp =
      !document.referrer || new URL(document.referrer).origin === window.location.origin;
    if (window.history.length > 1 && cameFromApp) router.back();
    else router.push("/transactions");
  };
}
