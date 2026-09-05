export interface ErrorResponse {
  error: string;
}

export interface ExpensePayload<T> {
  expense: T;
}

export interface ExpensesPayload<T> {
  expenses: T[];
}
