import { NextRequest } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db } from '~/config/db';
import { categoriesTable, expensesTable, recurringConfigsTable } from '~/db/schema';
import {
  badRequestResponse,
  noContentResponse,
  notFoundResponse,
  resourceResponse,
  unauthorizedResponse,
} from '~/utils/api-response';
import { getServerUserId } from '~/utils/server-auth';
import { validateRecurringUpdateInput } from '~/utils/validators/recurring';
import { getRecurringPeriodKey } from '~/utils/recurrence';

const getRecurringId = async (context: { params: Promise<{ id: string }> }) => {
  const { id } = await context.params;
  const recurringId = Number(id);
  return Number.isInteger(recurringId) && recurringId > 0 ? recurringId : null;
};

export const PATCH = async (request: NextRequest, context: { params: Promise<{ id: string }> }) => {
  const userId = await getServerUserId();

  if (!userId) return unauthorizedResponse();

  const recurringId = await getRecurringId(context);

  if (!recurringId) return badRequestResponse('Invalid id');

  const existing = await db
    .select()
    .from(recurringConfigsTable)
    .where(and(eq(recurringConfigsTable.id, recurringId), eq(recurringConfigsTable.userId, userId)))
    .limit(1);

  if (existing.length === 0) return notFoundResponse();

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return badRequestResponse('Invalid JSON');
  }

  let validated: ReturnType<typeof validateRecurringUpdateInput>;

  try {
    validated = validateRecurringUpdateInput(body as Parameters<typeof validateRecurringUpdateInput>[0]);
  } catch (error) {
    return badRequestResponse(error instanceof Error ? error.message : 'Invalid input');
  }

  if (validated.categoryId !== undefined) {
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

    if (category.length === 0) return notFoundResponse('Category not found');
  }

  const [recurring] = await db
    .update(recurringConfigsTable)
    .set(validated)
    .where(and(eq(recurringConfigsTable.id, recurringId), eq(recurringConfigsTable.userId, userId)))
    .returning();

  return resourceResponse('recurring', recurring);
};

export const POST = async (_request: NextRequest, context: { params: Promise<{ id: string }> }) => {
  const userId = await getServerUserId();
  if (!userId) return unauthorizedResponse();

  const recurringId = await getRecurringId(context);
  if (!recurringId) return badRequestResponse('Invalid id');

  const [recurring] = await db
    .select()
    .from(recurringConfigsTable)
    .where(and(eq(recurringConfigsTable.id, recurringId), eq(recurringConfigsTable.userId, userId)))
    .limit(1);
  if (!recurring) return notFoundResponse();
  if (!recurring.isActive) return badRequestResponse('Recurring expense is inactive');

  const spentAt = new Date();
  if (spentAt < recurring.startDate) return badRequestResponse('Recurring expense has not started');
  const recurringPeriod = getRecurringPeriodKey(spentAt, recurring.frequency as 'monthly' | 'yearly');
  const [expense] = await db
    .insert(expensesTable)
    .values({
      userId,
      categoryId: recurring.categoryId,
      amount: recurring.amount,
      note: recurring.note,
      spentAt,
      recurringConfigId: recurringId,
      recurringPeriod,
    })
    .onConflictDoNothing({
      target: [expensesTable.recurringConfigId, expensesTable.recurringPeriod],
    })
    .returning();

  if (expense) return resourceResponse('expense', expense, 201);

  const [existing] = await db
    .select()
    .from(expensesTable)
    .where(
      and(
        eq(expensesTable.userId, userId),
        eq(expensesTable.recurringConfigId, recurringId),
        eq(expensesTable.recurringPeriod, recurringPeriod)
      )
    )
    .limit(1);
  if (!existing) return notFoundResponse();

  return resourceResponse('expense', existing);
};

export const DELETE = async (_request: NextRequest, context: { params: Promise<{ id: string }> }) => {
  const userId = await getServerUserId();
  if (!userId) return unauthorizedResponse();

  const recurringId = await getRecurringId(context);
  if (!recurringId) return badRequestResponse('Invalid id');

  const deactivated = await db
    .update(recurringConfigsTable)
    .set({ isActive: 0 })
    .where(and(eq(recurringConfigsTable.id, recurringId), eq(recurringConfigsTable.userId, userId)))
    .returning({ id: recurringConfigsTable.id });
  if (deactivated.length === 0) return notFoundResponse();

  return noContentResponse();
};
