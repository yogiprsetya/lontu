import { z } from 'zod';
import { categoryColorSchema, categoryNameSchema } from './shared';

interface CategoryInput {
  name: string;
  color?: string | null;
}

interface ValidatedCategoryInput {
  name: string;
  color?: string;
}

const categoryInputSchema = z.object({
  name: categoryNameSchema,
  color: categoryColorSchema,
});

export const validateCategoryInput = (input: CategoryInput): ValidatedCategoryInput =>
  categoryInputSchema.parse(input);
