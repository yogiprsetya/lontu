import { NextRequest } from 'next/server';
import { and, asc, eq, or } from 'drizzle-orm';
import { db } from '~/config/db';
import { categoriesTable, expensesTable, recurringConfigsTable } from '~/db/schema';
import {
  badRequestResponse,
  collectionResponse,
  errorResponse,
  resourceResponse,
  unauthorizedResponse,
} from '~/utils/api-response';
import { getServerUserId } from '~/utils/server-auth';
import { validateRecurringInput } from '~/utils/validators/recurring';
import { getNextOccurrence, getRecurringPeriodKey } from '~/utils/recurrence';

export const GET = async () => {
  const userId = await getServerUserId();
  if (!userId) return unauthorizedResponse();

  const currentDate = new Date();
  const currentMonth = getRecurringPeriodKey(currentDate, 'monthly');
  const currentYear = getRecurringPeriodKey(currentDate, 'yearly');

  const recurring = await db
    .select({
      id: recurringConfigsTable.id,
      categoryId: recurringConfigsTable.categoryId,
      categoryName: categoriesTable.name,
      amount: recurringConfigsTable.amount,
      frequency: recurringConfigsTable.frequency,
      startDate: recurringConfigsTable.startDate,
      note: recurringConfigsTable.note,
      isActive: recurringConfigsTable.isActive,
      markedExpenseId: expensesTable.id,
      createdAt: recurringConfigsTable.createdAt,
      updatedAt: recurringConfigsTable.updatedAt,
    })
    .from(recurringConfigsTable)
    .innerJoin(categoriesTable, eq(recurringConfigsTable.categoryId, categoriesTable.id))
    .leftJoin(
      expensesTable,
      and(
        eq(expensesTable.recurringConfigId, recurringConfigsTable.id),
        or(
          and(eq(recurringConfigsTable.frequency, 'monthly'), eq(expensesTable.recurringPeriod, currentMonth)),
          and(eq(recurringConfigsTable.frequency, 'yearly'), eq(expensesTable.recurringPeriod, currentYear))
        )
      )
    )
    .where(eq(recurringConfigsTable.userId, userId))
    .orderBy(asc(recurringConfigsTable.startDate));

  return collectionResponse(
    'recurring',
    recurring.map((item) => ({
      ...item,
      nextOccurrence: item.isActive
        ? getNextOccurrence(item.startDate, item.frequency as 'monthly' | 'yearly')
        : null,
    }))
  );
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

  let validated: ReturnType<typeof validateRecurringInput>;
  try {
    validated = validateRecurringInput(body as Parameters<typeof validateRecurringInput>[0]);
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

  const [recurring] = await db
    .insert(recurringConfigsTable)
    .values({ userId, ...validated })
    .returning();

  return resourceResponse('recurring', recurring, 201);
};
