'use client';

import { useState } from 'react';
import { RiCheckLine, RiCloseLine, RiDeleteBinLine, RiEditLine } from '@remixicon/react';
import { Button } from '~/components/ui/button';
import { formatIdr } from '~/utils/format';
import { httpClient } from '~/config/http-client';
import { errorHandler } from '~/utils/error-handler';

const DEFAULT_CATEGORIES = ['Food', 'Transport', 'Shopping', 'Bills', 'Health', 'Other'];

interface Expense {
  id: number;
  amount: number;
  note?: string | null;
  spentAt: string;
  categoryName: string;
}

interface ExpenseCardProps {
  expense: Expense;
  categories?: string[];
  onMutate: () => void;
}

const toDatetimeLocal = (isoString: string): string => {
  const date = new Date(isoString);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
};

export const ExpenseCard = ({ expense, categories = DEFAULT_CATEGORIES, onMutate }: ExpenseCardProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [amount, setAmount] = useState(String(expense.amount));
  const [categoryName, setCategoryName] = useState(expense.categoryName);
  const [note, setNote] = useState(expense.note ?? '');
  const [spentAt, setSpentAt] = useState(toDatetimeLocal(expense.spentAt));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSaving(true);

    try {
      await httpClient.patch(`/api/expenses/${expense.id}`, {
        categoryName,
        amount,
        note: note || undefined,
        spentAt: new Date(spentAt).toISOString(),
      });

      setIsEditing(false);
      onMutate();
    } catch (err) {
      errorHandler(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setError(null);
    setIsSaving(true);

    try {
      await httpClient.delete(`/api/expenses/${expense.id}`);

      onMutate();
    } catch (err) {
      errorHandler(err);
    } finally {
      setIsSaving(false);
    }
  };

  if (isEditing) {
    return (
      <li className="bg-card text-card-foreground rounded-xl border px-4 py-3">
        <form onSubmit={handleSave} className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label htmlFor={`category-${expense.id}`} className="text-muted-foreground text-xs">
                Category
              </label>
              <select
                id={`category-${expense.id}`}
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                className="bg-muted text-foreground focus:ring-ring h-10 rounded-lg px-2 text-sm outline-none focus:ring-2"
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor={`amount-${expense.id}`} className="text-muted-foreground text-xs">
                Amount
              </label>
              <input
                id={`amount-${expense.id}`}
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="bg-muted text-foreground focus:ring-ring h-10 rounded-lg px-3 text-sm outline-none focus:ring-2"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor={`note-${expense.id}`} className="text-muted-foreground text-xs">
              Note
            </label>
            <input
              id={`note-${expense.id}`}
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional note"
              className="bg-muted text-foreground focus:ring-ring h-10 rounded-lg px-3 text-sm outline-none focus:ring-2"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor={`spentAt-${expense.id}`} className="text-muted-foreground text-xs">
              Date
            </label>
            <input
              id={`spentAt-${expense.id}`}
              type="datetime-local"
              required
              value={spentAt}
              onChange={(e) => setSpentAt(e.target.value)}
              className="bg-muted text-foreground focus:ring-ring h-10 rounded-lg px-3 text-sm outline-none focus:ring-2"
            />
          </div>

          {error && <p className="text-destructive text-sm">{error}</p>}

          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={isSaving} className="flex-1">
              Save
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSaving}
              onClick={() => setIsEditing(false)}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="bg-card text-card-foreground flex items-center justify-between rounded-xl border px-4 py-3">
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-medium">{expense.categoryName}</span>
        {expense.note ? <span className="text-muted-foreground text-xs">{expense.note}</span> : null}
        <time className="text-muted-foreground text-xs">
          {new Date(expense.spentAt).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          })}
        </time>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold">{formatIdr(expense.amount)}</span>

        {isConfirmingDelete ? (
          <div className="flex gap-1">
            <Button
              type="button"
              variant="destructive"
              size="icon-xs"
              onClick={handleDelete}
              disabled={isSaving}
              aria-label="Confirm delete"
            >
              <RiCheckLine aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon-xs"
              onClick={() => setIsConfirmingDelete(false)}
              disabled={isSaving}
              aria-label="Cancel delete"
            >
              <RiCloseLine aria-hidden="true" />
            </Button>
          </div>
        ) : (
          <div className="flex gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={() => setIsEditing(true)}
              aria-label="Edit expense"
            >
              <RiEditLine aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={() => setIsConfirmingDelete(true)}
              aria-label="Delete expense"
            >
              <RiDeleteBinLine aria-hidden="true" />
            </Button>
          </div>
        )}
      </div>

      {error && <p className="text-destructive w-full text-sm">{error}</p>}
    </li>
  );
};
