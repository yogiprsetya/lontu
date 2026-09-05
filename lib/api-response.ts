import { NextResponse } from 'next/server';
import type { ErrorResponse, ExpensePayload, ExpensesPayload } from './response-types';

export const errorResponse = (message: string, status: number): NextResponse<ErrorResponse> => {
  return NextResponse.json({ error: message }, { status });
};

export const unauthorizedResponse = (): NextResponse<ErrorResponse> => {
  return errorResponse('Unauthorized', 401);
};

export const badRequestResponse = (message: string): NextResponse<ErrorResponse> => {
  return errorResponse(message, 400);
};

export const notFoundResponse = (message = 'Not found'): NextResponse<ErrorResponse> => {
  return errorResponse(message, 404);
};

export const expenseResponse = <T>(expense: T, status: number = 200): NextResponse<ExpensePayload<T>> => {
  return NextResponse.json({ expense }, { status });
};

export const expensesResponse = <T>(expenses: T[]): NextResponse<ExpensesPayload<T>> => {
  return NextResponse.json({ expenses });
};
