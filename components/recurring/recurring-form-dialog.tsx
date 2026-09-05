'use client';

import type { FormEvent } from 'react';
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

interface CategoryOption {
  id: number;
  name: string;
}

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
  categoryId: string;
  selectedCategoryName?: string;
  amount: string;
  frequency: 'monthly' | 'yearly';
  startDate: Date;
  note: string;
  categories: CategoryOption[];
  formError: string | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCategoryChange: (value: string) => void;
  onAmountChange: (value: string) => void;
  onFrequencyChange: (value: 'monthly' | 'yearly') => void;
  onStartDateChange: (date: Date | undefined) => void;
  onNoteChange: (value: string) => void;
  onCancel: () => void;
}

export const RecurringFormDialog = ({
  open,
  isEditing,
  categoryId,
  selectedCategoryName,
  amount,
  frequency,
  startDate,
  note,
  categories,
  formError,
  onOpenChange,
  onSubmit,
  onCategoryChange,
  onAmountChange,
  onFrequencyChange,
  onStartDateChange,
  onNoteChange,
  onCancel,
}: RecurringFormDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{isEditing ? 'Edit recurring expense' : 'Add recurring expense'}</DialogTitle>
        <DialogDescription>Track a subscription or other scheduled payment.</DialogDescription>
      </DialogHeader>

      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-muted-foreground flex flex-col gap-1 text-xs">
            Category
            <Select
              value={categoryId || null}
              onValueChange={(value) => onCategoryChange(value ?? '')}
              required
              disabled={isEditing}
            >
              <SelectTrigger aria-label="Recurring category" className="bg-muted w-full">
                <SelectValue placeholder="Select category">
                  {selectedCategoryName ?? 'Select category'}
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
          </label>

          <label className="text-muted-foreground flex flex-col gap-1 text-xs">
            Amount
            <Input
              type="number"
              min={1}
              step={1}
              value={amount}
              onChange={(event) => onAmountChange(event.target.value)}
              required
            />
          </label>

          <label className="text-muted-foreground flex flex-col gap-1 text-xs">
            Frequency
            <Select value={frequency} onValueChange={(value) => onFrequencyChange(value as 'monthly' | 'yearly')}>
              <SelectTrigger aria-label="Recurring frequency" className="bg-muted w-full">
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </label>

          <label className="text-muted-foreground flex flex-col gap-1 text-xs">
            Start date
            <DatePicker
              value={startDate}
              onChange={onStartDateChange}
              disabled={disablePastDates}
              placeholder="Select start date"
            />
          </label>
        </div>

        <label className="text-muted-foreground flex flex-col gap-1 text-xs">
          Note
          <Input value={note} onChange={(event) => onNoteChange(event.target.value)} placeholder="Optional note" />
        </label>

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
