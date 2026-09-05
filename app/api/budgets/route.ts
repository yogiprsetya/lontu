import { NextRequest } from 'next/server';
import { and, asc, eq } from 'drizzle-orm';
import { db } from '~/config/db';
import { budgetsTable, categoriesTable } from '~/db/schema';
import {
  badRequestResponse,
  collectionResponse,
  errorResponse,
  resourceResponse,
  unauthorizedResponse,
} from '~/utils/api-response';
import { getServerUserId } from '~/utils/server-auth';
import { validateBudgetInput } from '~/utils/validators';

const getMonthFilter = (request: NextRequest) => {
  const year = request.nextUrl.searchParams.get('year');
  const month = request.nextUrl.searchParams.get('month');

  if (year === null && month === null) return null;

  try {
    return validateBudgetInput({ categoryId: 1, amount: 1, year: year ?? '', month: month ?? '' });
  } catch {
    return false;
  }
};

export const GET = async (request: NextRequest) => {
  const userId = await getServerUserId();

  if (!userId) return unauthorizedResponse();

  const monthFilter = getMonthFilter(request);

  if (monthFilter === false) return badRequestResponse('year and month are invalid');

  const budgets = await db
    .select({
      id: budgetsTable.id,
      userId: budgetsTable.userId,
      categoryId: budgetsTable.categoryId,
      categoryName: categoriesTable.name,
      amount: budgetsTable.amount,
      year: budgetsTable.year,
      month: budgetsTable.month,
      createdAt: budgetsTable.createdAt,
      updatedAt: budgetsTable.updatedAt,
    })
    .from(budgetsTable)
    .innerJoin(categoriesTable, eq(budgetsTable.categoryId, categoriesTable.id))
    .where(
      monthFilter
        ? and(
            eq(budgetsTable.userId, userId),
            eq(budgetsTable.year, monthFilter.year),
            eq(budgetsTable.month, monthFilter.month)
          )
        : eq(budgetsTable.userId, userId)
    )
    .orderBy(asc(budgetsTable.year), asc(budgetsTable.month), asc(categoriesTable.name));

  return collectionResponse('budgets', budgets);
};

export const POST = async (request: NextRequest) => {
  const userId = await getServerUserId();

  if (!userId) return unauthorizedResponse();

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return badRequestResponse('Invalid JSON');
  }

  let validated: ReturnType<typeof validateBudgetInput>;

  try {
    validated = validateBudgetInput(body as Parameters<typeof validateBudgetInput>[0]);
  } catch (error) {
    return badRequestResponse(error instanceof Error ? error.message : 'Invalid input');
  }

  const category = await db
    .select({ id: categoriesTable.id })
    .from(categoriesTable)
    .where(
      and(
        eq(categoriesTable.id, validated.categoryId),
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
        eq(budgetsTable.categoryId, validated.categoryId),
        eq(budgetsTable.year, validated.year),
        eq(budgetsTable.month, validated.month)
      )
    )
    .limit(1);

  if (duplicate.length > 0) return errorResponse('Budget already exists for this category and month', 409);

  const [budget] = await db
    .insert(budgetsTable)
    .values({ userId, ...validated })
    .returning();

  return resourceResponse('budget', budget, 201);
};
