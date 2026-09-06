'use client';

import { useState } from 'react';
import { Button } from '~/components/ui/button';
import { httpClient } from '~/config/http-client';
import { errorHandler } from '~/utils/error-handler';
import { useCategoryList } from './use-category-list';
import { CategoryFormDialog } from './category-form-dialog';
import type { CategoryFormInput } from '~/utils/validators/category';

export const CategoryManager = () => {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const { categories, mutate } = useCategoryList();

  const editingCategory =
    editingId !== null ? (categories.find((category) => category.id === editingId) ?? null) : null;

  const resetForm = () => {
    setEditingId(null);
    setIsDialogOpen(false);
    setFormError(null);
  };

  const openCreateDialog = () => {
    setEditingId(null);
    setFormError(null);
    setIsDialogOpen(true);
  };

  const editCategory = (id: number) => {
    setEditingId(id);
    setFormError(null);
    setIsDialogOpen(true);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setEditingId(null);
      setFormError(null);
    }

    setIsDialogOpen(open);
  };

  const saveCategory = async (values: CategoryFormInput) => {
    setFormError(null);

    try {
      if (editingId !== null) {
        await httpClient.patch(`/api/categories/${editingId}`, {
          name: values.name,
          color: values.color,
        });
      } else {
        await httpClient.post('/api/categories', {
          name: values.name,
          color: values.color,
        });
      }

      resetForm();
      await mutate();
    } catch (err) {
      const message =
        typeof err === 'object' && err !== null && 'error' in err
          ? String((err as { error?: { message?: string } }).error?.message ?? 'Request failed')
          : err instanceof Error
            ? err.message
            : 'Request failed';

      setFormError(message);
      errorHandler(err);
    }
  };

  const archiveCategory = async (id: number) => {
    try {
      await httpClient.delete(`/api/categories/${id}`);
      await mutate();
    } catch (err) {
      errorHandler(err);
    }
  };

  return (
    <section className="flex flex-col gap-6">
      <div className="flex justify-end">
        <Button type="button" onClick={openCreateDialog}>
          Add category
        </Button>
      </div>

      <CategoryFormDialog
        open={isDialogOpen}
        isEditing={editingId !== null}
        defaultName={editingCategory?.name}
        defaultColor={editingCategory?.color ?? undefined}
        formError={formError}
        onOpenChange={handleOpenChange}
        onSubmit={saveCategory}
        onCancel={() => handleOpenChange(false)}
      />

      {categories.length === 0 ? (
        <p className="text-muted-foreground text-sm">No categories yet. Add your first one to get started.</p>
      ) : (
        <ul className="divide-y">
          {categories.map((category) => (
            <li key={category.id} className="flex items-center justify-between gap-3 py-3">
              <span className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="h-3 w-3 rounded-full border"
                  style={{ backgroundColor: category.color ?? '#2f7d73' }}
                />

                <span>{category.name}</span>
              </span>

              <div className="flex gap-1">
                <Button type="button" variant="ghost" size="sm" onClick={() => editCategory(category.id)}>
                  Edit
                </Button>

                <Button type="button" variant="ghost" size="sm" onClick={() => archiveCategory(category.id)}>
                  Archive
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
