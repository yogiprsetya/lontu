'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
import { Field, FieldContent, FieldError, FieldLabel } from '~/components/ui/field';
import { categoryInputFormSchema, type CategoryFormInput } from '~/utils/validators/category';

interface CategoryFormDialogProps {
  open: boolean;
  isEditing: boolean;
  defaultName?: string;
  defaultColor?: string;
  formError: string | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CategoryFormInput) => void;
  onCancel: () => void;
}

export const CategoryFormDialog = ({
  open,
  isEditing,
  defaultName,
  defaultColor,
  formError,
  onOpenChange,
  onSubmit,
  onCancel,
}: CategoryFormDialogProps) => {
  const form = useForm<CategoryFormInput>({
    resolver: zodResolver(categoryInputFormSchema),
    defaultValues: {
      name: defaultName ?? '',
      color: defaultColor ?? '#2f7d73',
    },
  });

  const { register, handleSubmit, reset, watch, setValue, formState } = form;

  useEffect(() => {
    if (open) {
      reset({
        name: defaultName ?? '',
        color: defaultColor ?? '#2f7d73',
      });
    }
  }, [open, defaultName, defaultColor, reset]);

  const selectedColor = watch('color') ?? '#2f7d73';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit category' : 'Add category'}</DialogTitle>

          <DialogDescription>
            {isEditing ? 'Rename or recolor this category.' : 'Create a custom category for budgets and expenses.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
          <Field>
            <FieldLabel htmlFor="category-name">Name</FieldLabel>

            <FieldContent>
              <Input id="category-name" {...register('name')} placeholder="Category name" />

              <FieldError errors={[formState.errors.name]} />
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel htmlFor="category-color-text">Color</FieldLabel>

            <FieldContent>
              <div className="flex items-center gap-2">
                <input
                  aria-label="Category color"
                  type="color"
                  value={selectedColor}
                  onChange={(event) => setValue('color', event.target.value, { shouldValidate: true })}
                  className="h-8 w-10 cursor-pointer rounded-md border"
                />

                <Input id="category-color-text" {...register('color')} placeholder="#2f7d73" className="flex-1" />
              </div>

              <FieldError errors={[formState.errors.color]} />
            </FieldContent>
          </Field>

          {formError && <p className="text-destructive text-sm">{formError}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>

            <Button type="submit">{isEditing ? 'Save changes' : 'Add category'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
