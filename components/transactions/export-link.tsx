import { DownloadIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { exportHref, type ListFilters } from "@/lib/transaction-filters";
import { cn } from "@/lib/utils";

/** A plain link: the session cookie goes along, and the server names the file. */
export function ExportLink({ filters }: { filters: ListFilters }) {
  return (
    <a href={exportHref(filters)} download className={cn(buttonVariants({ variant: "outline" }), "h-11 text-base")}>
      <DownloadIcon aria-hidden />
      Ekspor CSV
    </a>
  );
}
