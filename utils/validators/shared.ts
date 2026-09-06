import { z } from 'zod';

const MAX_INTEGER_VALUE = 2147483647;
const CATEGORY_NAME_MAX_LENGTH = 100;
const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i;
export const RECURRING_FREQUENCIES = ['monthly', 'yearly'] as const;

/**
 * Coerces string/number ids and amounts to positive integers within the
 * database's integer range. Matches the legacy manual parser:
 * `Number(value)` then requiring a positive integer <= 2147483647.
 */
export const requiredInt = (field: string) =>
  z.coerce
    .number({ message: `${field} must be a positive integer within the database range` })
    .int(`${field} must be a positive integer within the database range`)
    .positive(`${field} must be a positive integer within the database range`)
    .max(MAX_INTEGER_VALUE, `${field} must be a positive integer within the database range`);

export const budgetYearSchema = requiredInt('year').min(1970, 'year is invalid').max(9999, 'year is invalid');
export const budgetMonthSchema = requiredInt('month').min(1, 'month is invalid').max(12, 'month is invalid');

export const categoryNameSchema = z
  .string({
    required_error: 'name is required',
    invalid_type_error: 'name is required',
    message: 'name is required',
  })
  .trim()
  .min(1, 'name is required')
  .max(CATEGORY_NAME_MAX_LENGTH, 'name is too long');

export const categoryColorSchema = z
  .union([z.literal(''), z.string().regex(HEX_COLOR_PATTERN, 'color must be a hex color')])
  .nullish()
  .transform((color) => color || undefined);

export const noteSchema = z.string().max(1000, 'note is too long').optional();

export const dateSchema = (field: string) =>
  z.coerce.date({
    errorMap: () => ({ message: `${field} is invalid` }),
  });

export const spentAtSchema = dateSchema('spentAt');

export const recurringFrequencySchema = z.enum(RECURRING_FREQUENCIES, { message: 'frequency is invalid' });
