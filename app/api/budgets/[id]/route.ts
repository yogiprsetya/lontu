import { NextRequest } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db } from '~/config/db';
import { budgetsTable, categoriesTable } from '~/db/schema';
import {
  badRequestResponse,
  errorResponse,
  noContentResponse,
  notFoundResponse,
  resourceResponse,
  unauthorizedResponse,
} from '~/utils/api-response';
import { getServerUserId } from '~/utils/server-auth';
import { validateBudgetUpdateInput } from '~/utils/validators';

const getBudgetId = async (context: { params: Promise<{ id: string }> }) => {
  const { id } = await context.params;
  const budgetId = Number(id);
  return Number.isInteger(budgetId) && budgetId > 0 ? budgetId : null;
};

export const PATCH = async (request: NextRequest, context: { params: Promise<{ id: string }> }) => {
  const userId = await getServerUserId();
  if (!userId) return unauthorizedResponse();

  const budgetId = await getBudgetId(context);
  if (!budgetId) return badRequestResponse('Invalid id');

  const existing = await db
    .select()
    .from(budgetsTable)
    .where(and(eq(budgetsTable.id, budgetId), eq(budgetsTable.userId, userId)))
    .limit(1);

  if (existing.length === 0) return notFoundResponse();

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return badRequestResponse('Invalid JSON');
  }

  let validated: ReturnType<typeof validateBudgetUpdateInput>;
  try {
    validated = validateBudgetUpdateInput(body as Parameters<typeof validateBudgetUpdateInput>[0]);
  } catch (error) {
    return badRequestResponse(error instanceof Error ? error.message : 'Invalid input');
  }

  const next = { ...existing[0], ...validated };
  const category = await db
    .select({ id: categoriesTable.id })
    .from(categoriesTable)
    .where(
      and(
        eq(categoriesTable.id, next.categoryId),
        eq(categoriesTable.userId, userId),
        eq(categoriesTable.isArchived, 0)
      )
    )
    .limit(1);
  if (category.length === 0) return errorResponse('Category not found', 404);

  const duplicate = await db
    .select({ id: budgetsTable.id })
    .from(budgetsTable)
    .where(
      and(
        eq(budgetsTable.userId, userId),
        eq(budgetsTable.categoryId, next.categoryId),
        eq(budgetsTable.year, next.year),
        eq(budgetsTable.month, next.month)
      )
    )
    .limit(1);

  if (duplicate.length > 0 && duplicate[0].id !== budgetId)
    return errorResponse('Budget already exists for this category and month', 409);

  const [budget] = await db
    .update(budgetsTable)
    .set(validated)
    .where(and(eq(budgetsTable.id, budgetId), eq(budgetsTable.userId, userId)))
    .returning();

  return resourceResponse('budget', budget);
};

export const DELETE = async (_request: NextRequest, context: { params: Promise<{ id: string }> }) => {
  const userId = await getServerUserId();

  if (!userId) return unauthorizedResponse();

  const budgetId = await getBudgetId(context);

  if (!budgetId) return badRequestResponse('Invalid id');

  const deleted = await db
    .delete(budgetsTable)
    .where(and(eq(budgetsTable.id, budgetId), eq(budgetsTable.userId, userId)))
    .returning({ id: budgetsTable.id });

  if (deleted.length === 0) return notFoundResponse();

  return noContentResponse();
};
