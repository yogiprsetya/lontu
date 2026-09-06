'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { httpClient } from '~/config/http-client';
import { errorHandler } from '~/utils/error-handler';
import { useCategoryList } from './use-category-list';
import { Field, FieldLabel, FieldContent, FieldError } from '~/components/ui/field';
import { categoryInputFormSchema, type CategoryFormInput } from '~/utils/validators/category';

export const CategoryManager = () => {
  const form = useForm<CategoryFormInput>({
    resolver: zodResolver(categoryInputFormSchema),
    defaultValues: {
      name: '',
      color: '#2f7d73',
    },
  });

  const { handleSubmit, reset } = form;
  const [editingId, setEditingId] = useState<number | null>(null);
  const { data, mutate } = useCategoryList();
  const categories = data?.categories ?? [];

  const createCategory = handleSubmit(async (data) => {
    try {
      await httpClient.post('/api/categories', { name: data.name, color: data.color });
      reset({ name: '', color: '#2f7d73' });
      await mutate();
    } catch (err) {
      errorHandler(err);
    }
  });

  const archiveCategory = async (id: number) => {
    try {
      await httpClient.delete(`/api/categories/${id}`);
      await mutate();
    } catch (err) {
      errorHandler(err);
    }
  };

  const renameCategory = async (id: number, nextName: string) => {
    try {
      await httpClient.patch(`/api/categories/${id}`, {
        name: nextName,
        color: categories.find((category) => category.id === id)?.color,
      });
      setEditingId(null);
      await mutate();
    } catch (err) {
      errorHandler(err);
    }
  };

  return (
    <section className="flex flex-col gap-4">
      <form onSubmit={createCategory} className="flex flex-col gap-2">
        <Field orientation="horizontal">
          <FieldLabel className="w-24">Name</FieldLabel>
          <FieldContent className="flex-1">
            <Input {...form.register('name')} placeholder="Category name" />
            <FieldError errors={[form.formState.errors.name]} />
          </FieldContent>
        </Field>
        <Field orientation="horizontal">
          <FieldLabel className="w-24">Color</FieldLabel>
          <FieldContent className="flex-1">
            <div className="flex gap-2">
              <input aria-label="Category color" type="color" {...form.register('color')} />
              <Input {...form.register('color')} placeholder="#2f7d73" />
            </div>
            <FieldError errors={[form.formState.errors.color]} />
          </FieldContent>
        </Field>
        <Button type="submit">Add</Button>
      </form>
      <ul className="divide-y">
        {categories.map((category) => (
          <li key={category.id} className="flex items-center justify-between py-3">
            {editingId === category.id ? (
              <form
                className="flex flex-1 gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  const nextName = new FormData(event.currentTarget).get('name');
                  if (typeof nextName === 'string') void renameCategory(category.id, nextName);
                }}
              >
                <Input name="name" defaultValue={category.name} required />
                <Button type="submit" size="sm">
                  Save
                </Button>
              </form>
            ) : (
              <span className={category.isArchived ? 'text-muted-foreground line-through' : ''}>
                {category.name}
              </span>
            )}
            {!category.isArchived && (
              <div className="flex gap-1">
                <Button type="button" variant="ghost" size="sm" onClick={() => setEditingId(category.id)}>
                  Rename
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => archiveCategory(category.id)}>
                  Archive
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
};
