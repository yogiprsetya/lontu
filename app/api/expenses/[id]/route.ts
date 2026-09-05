import { NextRequest } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db } from '~/config/db';
import { categoriesTable, expensesTable, recurringConfigsTable } from '~/db/schema';
import {
  badRequestResponse,
  collectionResponse,
  noContentResponse,
  notFoundResponse,
  unauthorizedResponse,
} from '~/utils/api-response';
import { getServerUserId } from '~/utils/server-auth';
import { validateExpenseUpdateInput } from '~/utils/validators';

const resolveCategory = async (userId: number, name: string): Promise<number> => {
  const existing = await db
    .select()
    .from(categoriesTable)
    .where(and(eq(categoriesTable.userId, userId), eq(categoriesTable.name, name)))
    .limit(1);

  if (existing.length > 0) {
    return existing[0].id;
  }

  const inserted = await db.insert(categoriesTable).values({ userId, name }).returning();
  return inserted[0].id;
};

export const PATCH = async (request: NextRequest, context: { params: Promise<{ id: string }> }) => {
  const userId = await getServerUserId();

  if (!userId) {
    return unauthorizedResponse();
  }

  const { id: idParam } = await context.params;
  const id = Number(idParam);
  if (!Number.isFinite(id)) {
    return badRequestResponse('Invalid id');
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequestResponse('Invalid JSON');
  }

  let validated: ReturnType<typeof validateExpenseUpdateInput>;
  try {
    validated = validateExpenseUpdateInput(body as Parameters<typeof validateExpenseUpdateInput>[0]);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid input';
    return badRequestResponse(message);
  }

  const existing = await db
    .select()
    .from(expensesTable)
    .where(and(eq(expensesTable.id, id), eq(expensesTable.userId, userId)))
    .limit(1);

  if (existing.length === 0) {
    return notFoundResponse();
  }

  if (validated.categoryName !== undefined) {
    const archivedCategory = await db
      .select({ id: categoriesTable.id })
      .from(categoriesTable)
      .where(
        and(
          eq(categoriesTable.userId, userId),
          eq(categoriesTable.name, validated.categoryName),
          eq(categoriesTable.isArchived, 1)
        )
      )
      .limit(1);

    if (archivedCategory.length > 0) {
      return badRequestResponse('Archived categories cannot be assigned to new expenses');
    }
  }

  const updateValues: Partial<typeof expensesTable.$inferInsert> = {};

  if (validated.amount !== undefined) {
    updateValues.amount = validated.amount;
  }

  if (validated.note !== undefined) {
    updateValues.note = validated.note;
  }

  if (validated.spentAt !== undefined) {
    updateValues.spentAt = validated.spentAt;
  }

  if (validated.categoryName !== undefined) {
    updateValues.categoryId = await resolveCategory(userId, validated.categoryName);
  }

  const updated =
    Object.keys(updateValues).length > 0
      ? await db
          .update(expensesTable)
          .set(updateValues)
          .where(and(eq(expensesTable.id, id), eq(expensesTable.userId, userId)))
          .returning()
      : existing;

  if (validated.recurring !== undefined) {
    const expense = updated[0];
    const recurringValues = {
      userId,
      expenseId: expense.id,
      categoryId: expense.categoryId,
      amount: expense.amount,
      frequency: validated.recurring.frequency ?? 'monthly',
      startDate: validated.recurring.startDate ?? expense.spentAt,
      ...(validated.recurring.note !== undefined ? { note: validated.recurring.note } : {}),
    };
    const existingRecurring = await db
      .select({ id: recurringConfigsTable.id })
      .from(recurringConfigsTable)
      .where(and(eq(recurringConfigsTable.expenseId, id), eq(recurringConfigsTable.userId, userId)))
      .limit(1);

    if (existingRecurring.length > 0) {
      await db
        .update(recurringConfigsTable)
        .set({
          ...(validated.recurring.frequency !== undefined ? { frequency: validated.recurring.frequency } : {}),
          ...(validated.recurring.startDate !== undefined ? { startDate: validated.recurring.startDate } : {}),
          ...(validated.recurring.note !== undefined ? { note: validated.recurring.note } : {}),
          categoryId: expense.categoryId,
          amount: expense.amount,
        })
        .where(
          and(eq(recurringConfigsTable.id, existingRecurring[0].id), eq(recurringConfigsTable.userId, userId))
        );
    } else {
      await db.insert(recurringConfigsTable).values(recurringValues);
    }
  }

  return collectionResponse('expense', updated[0]);
};

export const DELETE = async (request: NextRequest, context: { params: Promise<{ id: string }> }) => {
  const userId = await getServerUserId();

  if (!userId) {
    return unauthorizedResponse();
  }

  const { id: idParam } = await context.params;
  const id = Number(idParam);

  if (!Number.isFinite(id)) {
    return badRequestResponse('Invalid id');
  }

  const existing = await db
    .select()
    .from(expensesTable)
    .where(and(eq(expensesTable.id, id), eq(expensesTable.userId, userId)))
    .limit(1);

  if (existing.length === 0) {
    return notFoundResponse();
  }

  await db.delete(expensesTable).where(eq(expensesTable.id, id));

  return noContentResponse();
};
