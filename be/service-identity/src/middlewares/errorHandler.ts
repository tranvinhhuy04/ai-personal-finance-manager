import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof SyntaxError && 'body' in err) {
    if (!res.headersSent) res.status(400).json({ message: 'Malformed JSON body' });
    return;
  }

  // Mongoose duplicate key (E11000)
  if (err?.code === 11000) {
    const field = Object.keys(err.keyValue ?? {})[0] ?? 'field';
    if (!res.headersSent) res.status(409).json({ message: `${field} already exists` });
    return;
  }

  // Mongoose validation error
  if (err?.name === 'ValidationError') {
    const message = Object.values(err.errors ?? {})
      .map((e: any) => e.message)
      .join(', ');
    if (!res.headersSent) res.status(400).json({ message });
    return;
  }

  // Operational error thrown via AppError — safe to expose message
  if (err instanceof AppError) {
    if (!res.headersSent) res.status(err.statusCode).json({ message: err.message });
    return;
  }

  // Programming / unknown error — log in full, mask from client
  console.error('[identity-service][UNHANDLED ERROR]', err);
  if (!res.headersSent) {
    res.status(500).json({ message: 'IDENTITY_ERROR' });
  }
}
