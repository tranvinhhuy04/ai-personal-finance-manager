"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const morgan_1 = __importDefault(require("morgan"));
const dotenv_1 = __importDefault(require("dotenv"));
const db_1 = require("./config/db");
const rabbitmq_1 = require("./config/rabbitmq");
const routes_1 = __importDefault(require("./src/routes"));
const analytics_consumer_1 = require("./src/messaging/analytics.consumer");
const errorHandler_1 = require("./src/middlewares/errorHandler");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = Number(process.env.ANALYTICS_PORT ?? process.env.PORT) || 3004;
app.use((0, cors_1.default)());
app.use((0, morgan_1.default)('combined'));
app.use(express_1.default.json());
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'analytics-service' });
});
app.use('/api/v1/analytics', routes_1.default);
app.use(errorHandler_1.errorHandler);
async function start() {
    try {
        await (0, db_1.connectDB)();
        await (0, rabbitmq_1.connectRabbitMQ)();
        await analytics_consumer_1.analyticsConsumer.start();
        app.listen(PORT, () => {
            console.log(`Analytics service running on port ${PORT}`);
        });
    }
    catch (error) {
        console.error('Failed to start analytics service', error);
        process.exit(1);
    }
}
process.on('SIGINT', async () => {
    await analytics_consumer_1.analyticsConsumer.stop();
    process.exit(0);
});
start();
exports.default = app;
