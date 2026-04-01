"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyticsConsumer = void 0;
const rabbitmq_1 = require("../../config/rabbitmq");
const analytics_service_1 = require("../services/analytics.service");
class AnalyticsConsumer {
    constructor() {
        this.isRunning = false;
    }
    async start() {
        if (this.isRunning)
            return;
        const channel = await (0, rabbitmq_1.getChannel)();
        await channel.consume(rabbitmq_1.QUEUES.ANALYTICS_TRANSACTION_EVENTS, (msg) => this.handleMessage(msg));
        this.isRunning = true;
        console.log('Analytics consumer started');
    }
    async stop() {
        this.isRunning = false;
    }
    async handleMessage(msg) {
        if (!msg)
            return;
        const channel = await (0, rabbitmq_1.getChannel)();
        try {
            const event = JSON.parse(msg.content.toString());
            if (!event?.payload) {
                channel.ack(msg);
                return;
            }
            const amount = Number(event.payload.amount ?? 0);
            if (!Number.isFinite(amount) || amount <= 0) {
                channel.ack(msg);
                return;
            }
            await analytics_service_1.analyticsService.applyTransactionEvent({
                userId: event.payload.userId,
                walletId: event.payload.walletId,
                walletName: event.payload.walletName,
                categoryId: event.payload.categoryId,
                categoryName: event.payload.categoryName,
                transactionType: event.payload.transactionType,
                amount,
                occurredAt: event.payload.occurredAt,
            });
            channel.ack(msg);
        }
        catch (error) {
            console.error('[analytics-consumer] failed to process message', error);
            channel.ack(msg);
        }
    }
}
exports.analyticsConsumer = new AnalyticsConsumer();
