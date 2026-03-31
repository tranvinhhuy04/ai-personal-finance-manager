"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.catchAsync = void 0;
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
const catchAsync = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};
exports.catchAsync = catchAsync;
