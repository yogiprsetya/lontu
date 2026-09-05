import { NextRequest } from 'next/server';
import { and, asc, eq } from 'drizzle-orm';
import { db } from '~/config/db';
import { categoriesTable } from '~/db/schema';
import {
  badRequestResponse,
  collectionResponse,
  errorResponse,
  resourceResponse,
  unauthorizedResponse,
} from '~/utils/api-response';
import { getServerUserId } from '~/utils/server-auth';
import { validateCategoryInput } from '~/utils/validators';

export const GET = async () => {
  const userId = await getServerUserId();

  if (!userId) return unauthorizedResponse();

  const categories = await db
    .select()
    .from(categoriesTable)
    .where(eq(categoriesTable.userId, userId))
    .orderBy(asc(categoriesTable.name));

  return collectionResponse('categories', categories);
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

  if (duplicate.length > 0) return errorResponse('Category already exists', 409);

  const [category] = await db
    .insert(categoriesTable)
    .values({ userId, ...validated })
    .returning();

  return resourceResponse('category', category, 201);
};
