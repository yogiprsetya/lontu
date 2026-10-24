"use client";

import useSWR from "swr";
import { invalidate } from "@/lib/cache-invalidation";
import { sendJSON } from "@/lib/fetcher";
import type { Category, CategoryCreateInput, CategoryKind } from "@/lib/schemas/category";

type Options = { kind?: CategoryKind; includeArchived?: boolean };

export function categoriesKey({ includeArchived = false }: Options = {}) {
  return includeArchived ? "/api/categories?include=archived" : "/api/categories";
}

export function filterByKind(categories: Category[], kind?: CategoryKind) {
  return kind ? categories.filter((c) => c.kind === kind) : categories;
}

export function groupBySpendingType(categories: Category[]) {
  return {
    needs: categories.filter((c) => c.spendingType === "needs"),
    wants: categories.filter((c) => c.spendingType === "wants"),
  };
}

/** The list is small (dozens), so filtering by kind happens here rather than in the API. */
export function useCategories(options: Options = {}) {
  const swr = useSWR<Category[]>(categoriesKey(options));
  return { ...swr, data: swr.data && filterByKind(swr.data, options.kind) };
}

export async function createCategory(input: CategoryCreateInput) {
  const category = await sendJSON<Category>("/api/categories", "POST", input);
  await invalidate("categories");
  return category;
}

export async function renameCategory(id: string, name: string) {
  const category = await sendJSON<Category>(`/api/categories/${id}`, "PATCH", { name });
  await invalidate("categories");
  return category;
}

export async function archiveCategory(id: string) {
  const category = await sendJSON<Category>(`/api/categories/${id}`, "DELETE");
  await invalidate("categories");
  return category;
}

export async function restoreCategory(id: string) {
  const category = await sendJSON<Category>(`/api/categories/${id}/restore`, "POST");
  await invalidate("categories");
  return category;
}
