import Link from "next/link";
import { TYPE_STYLES } from "@/components/transactions/type-styles";
import { cn } from "@/lib/utils";
import { TRANSACTION_TYPES, TRANSACTION_TYPE_LABELS } from "@/lib/transaction-types";

export function QuickAdd() {
  return (
    <section aria-labelledby="quick-add-title" className="flex flex-col gap-3">
      <h2 id="quick-add-title" className="font-heading text-lg font-bold">
        Catat cepat
      </h2>
      <ul className="grid grid-cols-4 gap-2">
        {TRANSACTION_TYPES.map((type) => {
          const { icon: Icon, pop } = TYPE_STYLES[type];
          return (
            <li key={type}>
              <Link
                href={`/add/${type}`}
                className="group flex flex-col items-center gap-1.5 rounded-2xl py-1 text-sm font-bold outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <span
                  aria-hidden
                  className={cn(
                    "flex size-14 items-center justify-center rounded-[1.25rem] shadow-soft transition-transform motion-safe:group-hover:-rotate-3 motion-safe:group-active:scale-95",
                    pop,
                  )}
                >
                  <Icon className="size-7" strokeWidth={2.5} />
                </span>
                {TRANSACTION_TYPE_LABELS[type]}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
