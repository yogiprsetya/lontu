import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { and, desc, eq } from 'drizzle-orm';
import { authOptions } from '~/auth';
import { db } from '~/config/db';
import { categoriesTable, expensesTable } from '~/db/schema';
import { badRequestResponse, expenseResponse, expensesResponse, unauthorizedResponse } from '~/lib/api-response';
import { validateExpenseInput } from '~/lib/validators';

interface SessionUser {
  id?: number;
}

export const GET = async () => {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as SessionUser | undefined)?.id;
  if (!userId) {
    return unauthorizedResponse();
  }

  const rows = await db
    .select({
      id: expensesTable.id,
      amount: expensesTable.amount,
      note: expensesTable.note,
      spentAt: expensesTable.spentAt,
      createdAt: expensesTable.createdAt,
      categoryId: categoriesTable.id,
      categoryName: categoriesTable.name,
      categoryColor: categoriesTable.color,
    })
    .from(expensesTable)
    .innerJoin(categoriesTable, eq(expensesTable.categoryId, categoriesTable.id))
    .where(eq(expensesTable.userId, userId))
    .orderBy(desc(expensesTable.spentAt));

  return expensesResponse(rows);
};

export const POST = async (request: NextRequest) => {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as SessionUser | undefined)?.id;

  if (!userId) {
    return unauthorizedResponse();
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return badRequestResponse('Invalid JSON');
  }

  let validated: ReturnType<typeof validateExpenseInput>;

  try {
    validated = validateExpenseInput(body as Parameters<typeof validateExpenseInput>[0]);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid input';
    return badRequestResponse(message);
  }

  const existingCategory = await db
    .select()
    .from(categoriesTable)
    .where(and(eq(categoriesTable.userId, userId), eq(categoriesTable.name, validated.categoryName)))
    .limit(1);

  let categoryId: number;

  if (existingCategory.length === 0) {
    const inserted = await db.insert(categoriesTable).values({ userId, name: validated.categoryName }).returning();
    categoryId = inserted[0].id;
  } else {
    categoryId = existingCategory[0].id;
  }

  const inserted = await db
    .insert(expensesTable)
    .values({
      userId,
      categoryId,
      amount: validated.amount,
      note: validated.note,
      spentAt: validated.spentAt,
    })
    .returning();

  return expenseResponse(inserted[0], 201);
};
