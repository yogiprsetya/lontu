import { z } from 'zod';

export type ValidationResult<T> = { success: true; data: T } | { success: false; errors: Record<string, string> };

export const validateData = <T>(data: unknown, schema: z.ZodType<T>): ValidationResult<T> => {
  const result = schema.safeParse(data);

  if (result.success) return result;

  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const field = issue.path.join('.') || 'root';
    if (!errors[field]) errors[field] = issue.message;
  }

  return { success: false, errors };
};
