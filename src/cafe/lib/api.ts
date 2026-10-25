import { NextResponse } from 'next/server';

export class ApiError extends Error {
  status: number;
  /** Per-field messages for forms, keyed by input name. */
  fields?: Record<string, string>;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export const badRequest = (m: string) => new ApiError(400, m);
export const unauthorized = (m = 'Please log in') => new ApiError(401, m);
export const forbidden = (m = 'You do not have access to this resource') => new ApiError(403, m);
export const notFound = (m = 'Not found') => new ApiError(404, m);
export const conflict = (m: string) => new ApiError(409, m);

export type ApiContext = { params: Promise<Record<string, string | string[]>> };

type Handler = (req: Request, ctx: ApiContext) => Promise<NextResponse | Response>;

/**
 * Standard API handler wrapper: JSON in/out, error mapping, request logging.
 */
export function handleApi(fn: Handler) {
  return async (req: Request, ctx: ApiContext): Promise<Response> => {
    try {
      return await fn(req, ctx);
    } catch (e) {
      if (e instanceof ApiError) {
        return NextResponse.json(e.fields ? { error: e.message, fields: e.fields } : { error: e.message }, { status: e.status });
      }
      if (e instanceof SyntaxError) {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
      }
      console.error('[api]', e);
      return NextResponse.json({ error: 'Server error. Please try again.' }, { status: 500 });
    }
  };
}

export function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function readBody(req: Request): Promise<unknown> {
  return req
    .json()
    .catch(() => {
      throw badRequest('Request body must be valid JSON');
    });
}
