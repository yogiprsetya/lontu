"use client";

import { useState } from "react";
import { PlusIcon } from "lucide-react";
import { CategoryForm, KIND_LABELS, SPENDING_TYPE_LABELS } from "@/components/forms/category-form";
import { ResponsiveModal } from "@/components/layout/responsive-modal";
import { LoadError } from "@/components/settings/load-error";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { groupBySpendingType, useCategories } from "@/hooks/use-categories";
import { CATEGORY_KINDS, type Category, type CategoryKind, SPENDING_TYPES } from "@/lib/schemas/category";

type View = { kind: "list" } | { kind: "create" };

type ManageCategoriesProps = { open: boolean; onClose: () => void; initialKind?: CategoryKind };

export function ManageCategories({ open, onClose, initialKind }: ManageCategoriesProps) {
  const [tab, setTab] = useState<CategoryKind>(initialKind ?? "income");
  const [view, setView] = useState<View>({ kind: "list" });
  const toList = () => setView({ kind: "list" });

  // The host keeps this mounted, so each opening restarts at the requested tab and the list.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setTab(initialKind ?? "income");
      toList();
    }
  }

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title={view.kind === "list" ? "Kelola kategori" : "Tambah kategori"}
      description={view.kind === "list" ? "Kategori untuk income, saving, dan spending." : undefined}
      footer={
        view.kind === "list" ? (
          <Button className="h-11 text-base" onClick={() => setView({ kind: "create" })}>
            <PlusIcon aria-hidden />
            Tambah kategori
          </Button>
        ) : undefined
      }
    >
      <div className="lg:max-h-[60vh] lg:overflow-y-auto">
        {view.kind === "list" ? (
          <Tabs value={tab} onValueChange={(value) => setTab(value as CategoryKind)} className="gap-4 pb-2">
            <TabsList className="w-full group-data-horizontal/tabs:h-auto">
              {CATEGORY_KINDS.map((kind) => (
                <TabsTrigger key={kind} value={kind} className="h-11 text-base md:text-sm">
                  {KIND_LABELS[kind]}
                </TabsTrigger>
              ))}
            </TabsList>
            {CATEGORY_KINDS.map((kind) => (
              <TabsContent key={kind} value={kind}>
                <CategoryList kind={kind} />
              </TabsContent>
            ))}
          </Tabs>
        ) : (
          <CategoryForm kind={tab} onDone={toList} onCancel={toList} />
        )}
      </div>
    </ResponsiveModal>
  );
}

function CategoryList({ kind }: { kind: CategoryKind }) {
  const { data, error, mutate } = useCategories({ kind });

  if (error) return <LoadError onRetry={() => void mutate()} message="Gagal memuat kategori." />;
  if (!data) {
    return (
      <div className="flex flex-col gap-2" aria-busy="true" aria-label="Memuat kategori">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-11 w-full" />
        ))}
      </div>
    );
  }
  if (data.length === 0) {
    return <p className="py-6 text-center text-muted-foreground">Belum ada kategori {KIND_LABELS[kind]}.</p>;
  }
  if (kind !== "spending") return <CategoryItems categories={data} />;

  const groups = groupBySpendingType(data);
  return (
    <div className="flex flex-col gap-4">
      {SPENDING_TYPES.map((type) => (
        <section key={type} aria-label={SPENDING_TYPE_LABELS[type]} className="flex flex-col gap-1">
          <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {SPENDING_TYPE_LABELS[type]}
          </h3>
          {groups[type].length > 0 ? (
            <CategoryItems categories={groups[type]} />
          ) : (
            <p className="py-2 text-sm text-muted-foreground">Belum ada kategori.</p>
          )}
        </section>
      ))}
    </div>
  );
}

function CategoryItems({ categories }: { categories: Category[] }) {
  return (
    <ul className="flex flex-col">
      {categories.map((category) => (
        <li key={category.id} className="flex min-h-11 items-center text-base">
          {category.name}
        </li>
      ))}
    </ul>
  );
}
