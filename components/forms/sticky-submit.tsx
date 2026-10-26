import { Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Stays above the mobile bottom nav so Simpan is reachable on long forms and with the keyboard open. */
export function StickySubmit({ isSubmitting }: { isSubmitting: boolean }) {
  return (
    <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] -mx-5 mt-2 rounded-b-2xl bg-card px-5 pt-2 pb-1 lg:bottom-0">
      <Button type="submit" className="h-11 w-full text-base" disabled={isSubmitting}>
        {isSubmitting && <Loader2Icon className="animate-spin" aria-hidden />}
        Simpan
      </Button>
    </div>
  );
}
