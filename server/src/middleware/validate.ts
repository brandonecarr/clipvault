import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { buildApiError } from '@clipvault/shared';

type Target = 'body' | 'query' | 'params';

export function validate(schema: ZodSchema, target: Target = 'body'): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);

    if (!result.success) {
      const firstError = result.error.errors[0];
      const message = firstError
        ? `${firstError.path.join('.')}: ${firstError.message}`
        : 'Validation error';

      res.status(400).json(buildApiError(message, 'VALIDATION_ERROR'));
      return;
    }

    // Replace req[target] with parsed + coerced values
    req[target] = result.data as never;
    next();
  };
}

export function formatZodError(error: ZodError): string {
  return error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
}
