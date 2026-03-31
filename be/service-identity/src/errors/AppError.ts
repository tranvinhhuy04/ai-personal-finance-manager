/**
 * AppError — operational (expected) HTTP errors.
 * Throw this anywhere in the service layer and the global errorHandler
 * will convert it to the correct HTTP response automatically.
 *
 * Usage:
 *   throw new AppError('Email already exists', 409);
 *   throw new AppError('Invalid credentials', 401);
 *   throw new AppError('email is required', 400);
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean = true;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    // Maintains proper prototype chain for `instanceof` checks
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}
