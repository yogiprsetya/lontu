import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { and, eq } from 'drizzle-orm';
import { authOptions } from '~/auth';
import { db } from '~/config/db';
import { categoriesTable, expensesTable } from '~/db/schema';
import { badRequestResponse, expenseResponse, notFoundResponse, unauthorizedResponse } from '~/lib/api-response';
import { validateExpenseUpdateInput } from '~/lib/validators';

interface SessionUser {
  id?: number;
}

async function getUserId(): Promise<number | null> {
  const session = await getServerSession(authOptions);
  return (session?.user as SessionUser | undefined)?.id ?? null;
}

async function resolveCategory(userId: number, name: string): Promise<number> {
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
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const userId = await getUserId();
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

  const updated = await db.update(expensesTable).set(updateValues).where(eq(expensesTable.id, id)).returning();

  return expenseResponse(updated[0]);
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const userId = await getUserId();
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

  return new Response(null, { status: 204 });
}
