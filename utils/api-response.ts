import { NextResponse } from 'next/server';

enum ErrorCode {
  BAD_REQUEST = 'BAD_REQUEST',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

interface ResponseMeta {
  timestamp: string;
  requestId?: string;
  path?: string;
}

interface SuccessResponse<T> {
  success: true;
  data: T;
  meta: ResponseMeta;
}

interface ErrorResponse {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    statusCode: number;
    details?: unknown;
  };
  meta: ResponseMeta;
}

type ApiResponseType<T> = SuccessResponse<T> | ErrorResponse;

const createMeta = (requestId?: string | null, path?: string): ResponseMeta => ({
  timestamp: new Date().toISOString(),
  ...(requestId ? { requestId } : {}),
  ...(path ? { path } : {}),
});

class ResponseBuilder {
  constructor(
    private readonly requestId?: string | null,
    private readonly path?: string
  ) {}

  success<T>(data: T, status = 200) {
    return NextResponse.json<ApiResponseType<T>>(
      { success: true, data, meta: createMeta(this.requestId, this.path) },
      { status }
    );
  }

  error(code: ErrorCode, message: string, statusCode: number, details?: unknown) {
    const error: ErrorResponse = {
      success: false,
      error: { code, message, statusCode, ...(details === undefined ? {} : { details }) },
      meta: createMeta(this.requestId, this.path),
    };
    return NextResponse.json(error, { status: statusCode });
  }

  validationError(message = 'Invalid request data', details?: unknown) {
    return this.error(ErrorCode.VALIDATION_ERROR, message, 400, details);
  }

  badRequest(message = 'Bad request', details?: unknown) {
    return this.error(ErrorCode.BAD_REQUEST, message, 400, details);
  }

  unauthorized(message = 'Unauthorized') {
    return this.error(ErrorCode.UNAUTHORIZED, message, 401);
  }

  forbidden(message = 'Forbidden') {
    return this.error(ErrorCode.FORBIDDEN, message, 403);
  }

  notFound(message = 'Not found') {
    return this.error(ErrorCode.NOT_FOUND, message, 404);
  }

  conflict(message = 'Conflict', details?: unknown) {
    return this.error(ErrorCode.CONFLICT, message, 409, details);
  }

  internalError(message = 'An unexpected error occurred', details?: unknown) {
    return this.error(ErrorCode.INTERNAL_ERROR, message, 500, details);
  }
}

const createResponse = (requestId?: string | null, path?: string) => new ResponseBuilder(requestId, path);

export const resourceResponse = <T>(name: string, data: T, status = 200) =>
  createResponse().success({ [name]: data }, status);

export const collectionResponse = <T>(name: string, data: T, status = 200) =>
  createResponse().success({ [name]: data }, status);

export const noContentResponse = () => new Response(null, { status: 204 });

export const errorResponse = (message: string, status = 500, details?: unknown) => {
  const response = createResponse();
  if (status === 400) return response.badRequest(message, details);
  if (status === 401) return response.unauthorized(message);
  if (status === 403) return response.forbidden(message);
  if (status === 404) return response.notFound(message);
  if (status === 409) return response.conflict(message, details);
  return response.internalError(message, details);
};

export const unauthorizedResponse = () => createResponse().unauthorized();
export const badRequestResponse = (message: string) => createResponse().badRequest(message);
export const notFoundResponse = (message = 'Not found') => createResponse().notFound(message);
export const expenseResponse = <T>(expense: T, status = 200) => resourceResponse('expense', expense, status);
export const expensesResponse = <T>(expenses: T[]) => collectionResponse('expenses', expenses);

export { ErrorCode };
