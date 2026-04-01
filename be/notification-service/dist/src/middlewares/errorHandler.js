"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
const AppError_1 = require("../errors/AppError");
function errorHandler(err, _req, res, _next) {
    if (err instanceof SyntaxError && 'body' in err) {
        if (!res.headersSent)
            res.status(400).json({ message: 'Malformed JSON body' });
        return;
    }
    if (err?.name === 'ValidationError') {
        const message = Object.values(err.errors ?? {})
            .map((e) => e.message)
            .join(', ');
        if (!res.headersSent)
            res.status(400).json({ message });
        return;
    }
    if (err instanceof AppError_1.AppError) {
        if (!res.headersSent)
            res.status(err.statusCode).json({ message: err.message });
        return;
    }
    console.error('[notification-service][UNHANDLED ERROR]', err);
    if (!res.headersSent) {
        res.status(500).json({ message: 'Internal Server Error' });
    }
}
