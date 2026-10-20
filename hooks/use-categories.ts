"use client";

import useSWR, { mutate } from "swr";
import { sendJSON } from "@/lib/fetcher";
import type { Category, CategoryCreateInput, CategoryKind } from "@/lib/schemas/category";

type Options = { kind?: CategoryKind; includeArchived?: boolean };

export function categoriesKey({ includeArchived = false }: Options = {}) {
  return includeArchived ? "/api/categories?include=archived" : "/api/categories";
}

export function isCategoriesKey(key: unknown) {
  return typeof key === "string" && key.startsWith("/api/categories");
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

function revalidateCategories() {
  return mutate(isCategoriesKey);
}

export async function createCategory(input: CategoryCreateInput) {
  const category = await sendJSON<Category>("/api/categories", "POST", input);
  await revalidateCategories();
  return category;
}
