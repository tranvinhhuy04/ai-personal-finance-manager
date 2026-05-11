import { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/AppError';

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof SyntaxError && 'body' in err) {
    if (!res.headersSent) res.status(400).json({ message: 'Malformed JSON body' });
    return;
  }

  if (err?.name === 'ValidationError') {
    const message = Object.values(err.errors ?? {})
      .map((e: any) => e.message)
      .join(', ');
    if (!res.headersSent) res.status(400).json({ message });
    return;
  }

  if (err instanceof AppError) {
    if (!res.headersSent) res.status(err.statusCode).json({ message: err.message });
    return;
  }

  console.error('[analytics-service][UNHANDLED ERROR]', err);
  if (!res.headersSent) {
    res.status(500).json({ message: 'ANALYTICS_ERROR' });
  }
}
