"use client";

import { useState } from "react";
import { PlusIcon } from "lucide-react";
import { CategoryForm, KIND_LABELS, SPENDING_TYPE_LABELS } from "@/components/forms/category-form";
import { ResponsiveModal } from "@/components/layout/responsive-modal";
import { ArchiveButton, RestoreButton, ShowArchivedSwitch } from "@/components/modals/archive-controls";
import { LoadError } from "@/components/settings/load-error";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { archiveCategory, groupBySpendingType, restoreCategory, useCategories } from "@/hooks/use-categories";
import { CATEGORY_KINDS, type Category, type CategoryKind, SPENDING_TYPES } from "@/lib/schemas/category";

type View = { kind: "list" } | { kind: "create" } | { kind: "edit"; category: Category };

const titles = { list: "Kelola kategori", create: "Tambah kategori", edit: "Ubah kategori" };

type ManageCategoriesProps = { open: boolean; onClose: () => void; initialKind?: CategoryKind };

export function ManageCategories({ open, onClose, initialKind }: ManageCategoriesProps) {
  const [tab, setTab] = useState<CategoryKind>(initialKind ?? "income");
  const [view, setView] = useState<View>({ kind: "list" });
  const [showArchived, setShowArchived] = useState(false);
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
      title={titles[view.kind]}
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
            <ShowArchivedSwitch
              id="show-archived-categories"
              checked={showArchived}
              onCheckedChange={setShowArchived}
            />
            {CATEGORY_KINDS.map((kind) => (
              <TabsContent key={kind} value={kind}>
                <CategoryList
                  kind={kind}
                  includeArchived={showArchived}
                  onEdit={(category) => setView({ kind: "edit", category })}
                />
              </TabsContent>
            ))}
          </Tabs>
        ) : view.kind === "create" ? (
          <CategoryForm kind={tab} onDone={toList} onCancel={toList} />
        ) : (
          <CategoryForm
            key={view.category.id}
            kind={view.category.kind}
            category={view.category}
            onDone={toList}
            onCancel={toList}
          >
            <ArchiveButton
              label="Arsipkan kategori"
              name={view.category.name}
              description="Kategori disembunyikan dari daftar dan pilihan, tetapi tetap tercatat di transaksi lama. Kamu bisa memulihkannya kapan saja."
              archive={() => archiveCategory(view.category.id)}
              onArchived={toList}
            />
          </CategoryForm>
        )}
      </div>
    </ResponsiveModal>
  );
}

type CategoryListProps = { kind: CategoryKind; includeArchived: boolean; onEdit: (category: Category) => void };

function CategoryList({ kind, includeArchived, onEdit }: CategoryListProps) {
  const { data, error, mutate } = useCategories({ kind, includeArchived });

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
  if (kind !== "spending") return <CategoryItems categories={data} onEdit={onEdit} />;

  const groups = groupBySpendingType(data);
  return (
    <div className="flex flex-col gap-4">
      {SPENDING_TYPES.map((type) => (
        <section key={type} aria-label={SPENDING_TYPE_LABELS[type]} className="flex flex-col gap-1">
          <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {SPENDING_TYPE_LABELS[type]}
          </h3>
          {groups[type].length > 0 ? (
            <CategoryItems categories={groups[type]} onEdit={onEdit} />
          ) : (
            <p className="py-2 text-sm text-muted-foreground">Belum ada kategori.</p>
          )}
        </section>
      ))}
    </div>
  );
}

function CategoryItems({ categories, onEdit }: { categories: Category[]; onEdit: (category: Category) => void }) {
  return (
    <ul className="flex flex-col">
      {categories.map((category) => (
        <li key={category.id}>
          {category.archivedAt ? (
            <div className="flex items-center gap-3">
              <span className="min-w-0 flex-1 truncate text-base opacity-60">{category.name}</span>
              <RestoreButton name={category.name} restore={() => restoreCategory(category.id)} />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onEdit(category)}
              className="-mx-2 flex min-h-11 w-[calc(100%+1rem)] items-center rounded-md px-2 text-left text-base outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {category.name}
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
