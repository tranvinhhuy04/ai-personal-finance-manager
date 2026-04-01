"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const morgan_1 = __importDefault(require("morgan"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const routes_1 = __importDefault(require("./routes"));
const db_1 = require("./config/db");
const AppError_1 = require("./src/errors/AppError");
const errorHandler_1 = require("./src/middlewares/errorHandler");
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../.env') });
const app = (0, express_1.default)();
const PORT = Number(process.env.IDENTITY_PORT) || 3001;
// Body parsers and CORS must be mounted before routes.
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use((0, morgan_1.default)('dev'));
app.get('/health', (_req, res) => res.json({ status: 'ok' }));
// Routes (used by api-gateway: /api/auth/* -> service-identity:3001/*)
app.use('/', routes_1.default);
app.use((_req, _res, next) => {
    next(new AppError_1.AppError('Route not found', 404));
});
// Global error handler must be the final middleware.
app.use(errorHandler_1.errorHandler);
async function start() {
    await (0, db_1.connectDB)();
    app.listen(PORT, () => {
        console.log(`service-identity running on port ${PORT}`);
    });
}
start().catch((err) => {
    console.error('Failed to start service-identity', err);
    process.exit(1);
});
process.on('unhandledRejection', (reason) => {
    console.error('[identity-service] Unhandled Rejection:', reason);
});
process.on('uncaughtException', (error) => {
    console.error('[identity-service] Uncaught Exception:', error);
});
