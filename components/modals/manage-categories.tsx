"use client";

import { useState } from "react";
import { ChevronRightIcon, PlusIcon } from "lucide-react";
import {
  CategoryForm,
  KIND_LABELS,
  SPENDING_TYPE_LABELS,
} from "@/components/forms/category-form";
import { FormActions } from "@/components/layout/form-actions";
import { ResponsiveModal } from "@/components/layout/responsive-modal";
import {
  ArchiveButton,
  RestoreButton,
  ShowArchivedSwitch,
} from "@/components/modals/archive-controls";
import { LoadError } from "@/components/settings/load-error";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  archiveCategory,
  groupBySpendingType,
  restoreCategory,
  useCategories,
} from "@/hooks/use-categories";
import {
  CATEGORY_KINDS,
  type Category,
  type CategoryKind,
  SPENDING_TYPES,
} from "@/lib/schemas/category";

type View =
  | { kind: "list" }
  | { kind: "create" }
  | { kind: "edit"; category: Category };

const titles = {
  list: "Kelola kategori",
  create: "Tambah kategori",
  edit: "Ubah kategori",
};

type ManageCategoriesProps = {
  open: boolean;
  onClose: () => void;
  initialKind?: CategoryKind;
};

export function ManageCategories({
  open,
  onClose,
  initialKind,
}: ManageCategoriesProps) {
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
      description={
        view.kind === "list"
          ? "Kategori untuk income, saving, dan spending."
          : undefined
      }
      footer={
        view.kind === "list" ? (
          <Button
            size="lg"
            className="mx-auto h-11"
            onClick={() => setView({ kind: "create" })}
          >
            <PlusIcon aria-hidden />
            Tambah kategori {KIND_LABELS[tab]}
          </Button>
        ) : (
          <FormActions form="category-form" onCancel={toList} />
        )
      }
    >
      {view.kind === "list" ? (
        <Tabs
          value={tab}
          onValueChange={(value) => setTab(value as CategoryKind)}
          className="gap-4 pb-2"
        >
          <TabsList className="w-full group-data-horizontal/tabs:h-auto">
            {CATEGORY_KINDS.map((kind) => (
              <TabsTrigger key={kind} value={kind} className="h-11 text-base">
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
        <CategoryForm kind={tab} onDone={toList} />
      ) : (
        <CategoryForm
          key={view.category.id}
          kind={view.category.kind}
          category={view.category}
          onDone={toList}
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
    </ResponsiveModal>
  );
}

type CategoryListProps = {
  kind: CategoryKind;
  includeArchived: boolean;
  onEdit: (category: Category) => void;
};

function CategoryList({ kind, includeArchived, onEdit }: CategoryListProps) {
  const { data, error, mutate } = useCategories({ kind, includeArchived });

  if (error) {
    return (
      <LoadError
        onRetry={() => void mutate()}
        message="Gagal memuat kategori."
      />
    );
  }

  if (!data) {
    return (
      <div
        className="flex flex-col gap-2"
        aria-busy="true"
        aria-label="Memuat kategori"
      >
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-11 w-full" />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <p className="py-6 text-center text-muted-foreground">
        Belum ada kategori {KIND_LABELS[kind]}.
      </p>
    );
  }

  if (kind !== "spending") {
    return (
      <ScrollArea className="w-full lg:h-60">
        <CategoryItems categories={data} onEdit={onEdit} />
      </ScrollArea>
    );
  }

  const groups = groupBySpendingType(data);

  return (
    <ScrollArea className="w-full lg:h-56">
      {SPENDING_TYPES.map((type) => (
        <section
          key={type}
          aria-label={SPENDING_TYPE_LABELS[type]}
          className="flex flex-col gap-1 not-first:mt-4"
        >
          <h3 className="px-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {SPENDING_TYPE_LABELS[type]}
          </h3>

          {groups[type].length > 0 ? (
            <CategoryItems categories={groups[type]} onEdit={onEdit} />
          ) : (
            <p className="px-2 py-2 text-sm text-muted-foreground">
              Belum ada kategori.
            </p>
          )}
        </section>
      ))}
    </ScrollArea>
  );
}

function CategoryItems({
  categories,
  onEdit,
}: {
  categories: Category[];
  onEdit: (category: Category) => void;
}) {
  return (
    <ul className="flex flex-col">
      {categories.map((category) => (
        <li key={category.id}>
          {category.archivedAt ? (
            <div className="flex min-h-11 items-center gap-3 pl-2">
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-muted-foreground">
                  {category.name}
                </span>

                <span className="text-xs text-muted-foreground">
                  Diarsipkan
                </span>
              </span>

              <RestoreButton
                name={category.name}
                restore={() => restoreCategory(category.id)}
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onEdit(category)}
              className="flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-left outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-ring/50"
            >
              <span className="min-w-0 flex-1 truncate">{category.name}</span>

              <ChevronRightIcon
                className="size-4 shrink-0 text-muted-foreground"
                aria-hidden
              />
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
