'use client';

import { useState } from 'react';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { httpClient } from '~/config/http-client';
import { errorHandler } from '~/utils/error-handler';
import { useCategoryList } from './use-category-list';

export const CategoryManager = () => {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#2f7d73');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { data, mutate } = useCategoryList();
  const categories = data?.categories ?? [];

  const createCategory = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    try {
      await httpClient.post('/api/categories', { name, color });
      setName('');
      await mutate();
    } catch (err) {
      errorHandler(err);
    }
  };

  const archiveCategory = async (id: number) => {
    setError(null);
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
      <form onSubmit={createCategory} className="flex gap-2">
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Category name"
          required
        />
        <input
          aria-label="Category color"
          type="color"
          value={color}
          onChange={(event) => setColor(event.target.value)}
        />
        <Button type="submit">Add</Button>
      </form>
      {error && <p className="text-destructive text-sm">{error}</p>}
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
