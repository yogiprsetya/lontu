import { NextResponse } from 'next/server';
import type { ErrorResponse, ExpensePayload, ExpensesPayload } from './response-types';

export function errorResponse(message: string, status: number): NextResponse<ErrorResponse> {
  return NextResponse.json({ error: message }, { status });
}

export function unauthorizedResponse(): NextResponse<ErrorResponse> {
  return errorResponse('Unauthorized', 401);
}

export function badRequestResponse(message: string): NextResponse<ErrorResponse> {
  return errorResponse(message, 400);
}

export function notFoundResponse(message = 'Not found'): NextResponse<ErrorResponse> {
  return errorResponse(message, 404);
}

export function expenseResponse<T>(expense: T, status: number = 200): NextResponse<ExpensePayload<T>> {
  return NextResponse.json({ expense }, { status });
}

export function expensesResponse<T>(expenses: T[]): NextResponse<ExpensesPayload<T>> {
  return NextResponse.json({ expenses });
}
