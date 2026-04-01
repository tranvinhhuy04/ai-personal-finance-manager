"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationConsumer = void 0;
const rabbitmq_1 = require("../../config/rabbitmq");
const notification_service_1 = require("../services/notification.service");
class NotificationConsumer {
    constructor() {
        this.isRunning = false;
    }
    async start() {
        if (this.isRunning)
            return;
        const channel = await (0, rabbitmq_1.getChannel)();
        await channel.consume(rabbitmq_1.QUEUES.NOTIFICATION_WALLET_EVENTS, (msg) => this.handleMessage(msg));
        this.isRunning = true;
        console.log('Notification consumer started');
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
            if (event?.eventType !== 'WalletBalanceUpdated') {
                channel.ack(msg);
                return;
            }
            await notification_service_1.notificationService.createThresholdAlert({
                userId: event.userId,
                walletId: event.walletId,
                walletName: event.walletName,
                newBalance: Number(event.newBalance),
                spendingLimit: event.spendingLimit,
            });
            channel.ack(msg);
        }
        catch (error) {
            console.error('[notification-consumer] failed to process message', error);
            channel.ack(msg);
        }
    }
}
exports.notificationConsumer = new NotificationConsumer();
