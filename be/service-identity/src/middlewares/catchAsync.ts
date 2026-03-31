import { Request, Response, NextFunction, RequestHandler } from 'express';

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

/**
 * catchAsync — wraps an async Express handler and pipes any rejection to next().
 *
 * Without this, an async function that throws inside a route handler produces
 * an unhandled promise rejection in Express 4, which means NO response is ever
 * sent and the frontend hangs forever.
 *
 * In Express 5, async errors are caught automatically, but using catchAsync
 * is still recommended for explicit, predictable behaviour.
 *
 * Usage:
 *   router.post('/login', catchAsync(async (req, res) => { ... }));
 */
export const catchAsync = (fn: AsyncHandler): RequestHandler =>
  (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
