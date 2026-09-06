'use client';

import { useForm } from 'react-hook-form';
import { Button } from '~/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import { Input } from '~/components/ui/input';
import { DatePicker } from '~/components/ui/date-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';
import { Field, FieldLabel, FieldContent, FieldError } from '~/components/ui/field';
import { recurringInputFormSchema } from '~/utils/validators/recurring';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';

interface CategoryOption {
  id: number;
  name: string;
}

type RecurringFormValues = z.infer<typeof recurringInputFormSchema>;

const today = new Date();
today.setHours(0, 0, 0, 0);

const disablePastDates = (date: Date) => {
  const candidate = new Date(date);
  candidate.setHours(0, 0, 0, 0);
  return candidate < today;
};

interface RecurringFormDialogProps {
  open: boolean;
  isEditing: boolean;
  categoryId?: number;
  amount?: string;
  frequency?: 'monthly' | 'yearly';
  startDate?: string;
  note?: string;
  categories: CategoryOption[];
  formError: string | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: RecurringFormValues) => void;
  onCancel: () => void;
}

export const RecurringFormDialog = ({
  open,
  isEditing,
  categoryId,
  amount,
  frequency,
  startDate,
  note,
  categories,
  formError,
  onOpenChange,
  onSubmit,
  onCancel,
}: RecurringFormDialogProps) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<RecurringFormValues>({
    resolver: zodResolver(recurringInputFormSchema),
    defaultValues: {
      categoryId: isEditing && categoryId ? categoryId : undefined,
      amount: amount ? Number(amount) : undefined,
      frequency: (frequency as 'monthly' | 'yearly') || 'monthly',
      startDate: startDate ? new Date(startDate) : undefined,
      note: note || undefined,
    },
  });

  const selectedCategoryId = watch('categoryId');
  const selectedFrequency = watch('frequency');
  const selectedStartDate = watch('startDate');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit recurring expense' : 'Add recurring expense'}</DialogTitle>
          <DialogDescription>Track a subscription or other scheduled payment.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="categoryId">Category</FieldLabel>
              <FieldContent>
                <Select
                  value={String(selectedCategoryId) || null}
                  onValueChange={(value) => setValue('categoryId', Number(value), { shouldValidate: true })}
                  required
                  disabled={isEditing}
                >
                  <SelectTrigger id="categoryId" aria-label="Recurring category" className="bg-muted w-full">
                    <SelectValue placeholder="Select category">
                      {categories.find((c) => c.id === selectedCategoryId)?.name ?? 'Select category'}
                    </SelectValue>
                  </SelectTrigger>

                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={String(category.id)}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError errors={[errors.categoryId]} />
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel htmlFor="amount">Amount</FieldLabel>
              <FieldContent>
                <Input
                  id="amount"
                  type="number"
                  min={1}
                  step={1}
                  {...register('amount', { valueAsNumber: true })}
                  required
                />
                <FieldError errors={[errors.amount]} />
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel htmlFor="frequency">Frequency</FieldLabel>
              <FieldContent>
                <Select
                  value={selectedFrequency}
                  onValueChange={(value) =>
                    setValue('frequency', value as 'monthly' | 'yearly', { shouldValidate: true })
                  }
                >
                  <SelectTrigger id="frequency" aria-label="Recurring frequency" className="bg-muted w-full">
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
                <FieldError errors={[errors.frequency]} />
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel htmlFor="startDate">Start date</FieldLabel>
              <FieldContent>
                <DatePicker
                  value={selectedStartDate}
                  onChange={(date) => setValue('startDate', date ?? new Date(), { shouldValidate: true })}
                  disabled={disablePastDates}
                  placeholder="Select start date"
                />
                <FieldError errors={[errors.startDate]} />
              </FieldContent>
            </Field>
          </div>

          <Field>
            <FieldLabel htmlFor="note">Note</FieldLabel>
            <FieldContent>
              <Input
                id="note"
                value={watch('note') || ''}
                onChange={(event) => setValue('note', event.target.value, { shouldValidate: true })}
                placeholder="Optional note"
              />
              <FieldError errors={[errors.note]} />
            </FieldContent>
          </Field>

          {formError && <p className="text-destructive text-sm">{formError}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>

            <Button type="submit">{isEditing ? 'Save changes' : 'Add recurring expense'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
