/**
 * src/middleware/errorHandler.ts
 * Global Express error handler — must be registered LAST.
 */
import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/apiError';
import { ZodError } from 'zod';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
) {
  // Zod validation error
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: 'Validation error',
      issues: err.flatten().fieldErrors,
    });
    return;
  }

  // Our typed ApiError
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
      code: err.code,
    });
    return;
  }

  // Unknown error
  const message = err instanceof Error ? err.message : 'Internal server error';
  logger.error({ err }, '[Unhandled Error]');

  res.status(500).json({
    success: false,
    error: env.NODE_ENV === 'production' ? 'Internal server error' : message,
  });
}
