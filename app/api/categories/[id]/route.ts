import { NextRequest } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db } from '~/config/db';
import { categoriesTable } from '~/db/schema';
import {
  badRequestResponse,
  errorResponse,
  notFoundResponse,
  resourceResponse,
  unauthorizedResponse,
} from '~/utils/api-response';
import { getServerUserId } from '~/utils/server-auth';
import { validateCategoryInput } from '~/utils/validators';

const getCategoryId = async (context: { params: Promise<{ id: string }> }): Promise<number | null> => {
  const { id } = await context.params;
  const categoryId = Number(id);
  return Number.isInteger(categoryId) && categoryId > 0 ? categoryId : null;
};

export const PATCH = async (request: NextRequest, context: { params: Promise<{ id: string }> }) => {
  const userId = await getServerUserId();

  if (!userId) return unauthorizedResponse();

  const categoryId = await getCategoryId(context);

  if (!categoryId) return badRequestResponse('Invalid id');

  const existing = await db
    .select({ id: categoriesTable.id })
    .from(categoriesTable)
    .where(and(eq(categoriesTable.id, categoryId), eq(categoriesTable.userId, userId)))
    .limit(1);

  if (existing.length === 0) return notFoundResponse();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequestResponse('Invalid JSON');
  }

  let validated: ReturnType<typeof validateCategoryInput>;

  try {
    validated = validateCategoryInput(body as Parameters<typeof validateCategoryInput>[0]);
  } catch (error) {
    return badRequestResponse(error instanceof Error ? error.message : 'Invalid input');
  }

  const duplicate = await db
    .select({ id: categoriesTable.id })
    .from(categoriesTable)
    .where(and(eq(categoriesTable.userId, userId), eq(categoriesTable.name, validated.name)))
    .limit(1);

  if (duplicate.length > 0 && duplicate[0].id !== categoryId) return errorResponse('Category already exists', 409);

  const [category] = await db
    .update(categoriesTable)
    .set(validated)
    .where(and(eq(categoriesTable.id, categoryId), eq(categoriesTable.userId, userId)))
    .returning();

  return resourceResponse('category', category);
};

export const DELETE = async (request: NextRequest, context: { params: Promise<{ id: string }> }) => {
  const userId = await getServerUserId();

  if (!userId) return unauthorizedResponse();

  const categoryId = await getCategoryId(context);

  if (!categoryId) return badRequestResponse('Invalid id');

  const [category] = await db
    .update(categoriesTable)
    .set({ isArchived: 1 })
    .where(and(eq(categoriesTable.id, categoryId), eq(categoriesTable.userId, userId)))
    .returning();

  if (!category) return notFoundResponse();

  return resourceResponse('category', category);
};
