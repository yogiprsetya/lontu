"use client";

import { useEffect } from "react";

/**
 * Mirrors a form's `isSubmitting` to a parent that renders the Simpan button outside the form.
 * The cleanup reports `false` on unmount too: forms call `onDone()` inside the submit handler,
 * which unmounts them before react-hook-form clears `isSubmitting`.
 */
export function useReportSubmitting(
  isSubmitting: boolean,
  report: ((submitting: boolean) => void) | undefined,
) {
  useEffect(() => {
    if (!isSubmitting || !report) return;
    report(true);
    return () => report(false);
  }, [isSubmitting, report]);
}
