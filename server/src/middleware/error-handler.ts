import type { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { config } from '../config';

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function globalErrorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err.name === 'UnauthorizedError' || (err as any).status === 401) {
    res.status(401).json({ error: 'Invalid or missing authentication token', code: 'UNAUTHORIZED' });
    return;
  }
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message, ...(err.code ? { code: err.code } : {}) });
    return;
  }
  if (err.name === 'ZodError') {
    res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: (err as any).issues?.map((i: any) => ({ path: i.path?.join('.'), message: i.message })),
    });
    return;
  }
  if ((err as any).type?.startsWith('Stripe')) {
    logger.error({ err }, 'Stripe error');
    res.status(402).json({ error: 'Payment processing error. Please try again.', code: 'PAYMENT_ERROR' });
    return;
  }
  logger.error({ err }, 'Unhandled server error');
  res.status(500).json({
    error: 'An unexpected error occurred. Please try again later.',
    code: 'INTERNAL_ERROR',
    ...(config.isProduction ? {} : { detail: err.message }),
  });
}
