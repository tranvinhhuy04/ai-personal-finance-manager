"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ROUTING_KEYS = exports.QUEUES = exports.EXCHANGES = void 0;
exports.connectRabbitMQ = connectRabbitMQ;
exports.getChannel = getChannel;
const amqplib_1 = __importDefault(require("amqplib"));
let connection = null;
let channel = null;
const RABBITMQ_URL = process.env.RABBITMQ_URL;
exports.EXCHANGES = {
    WALLET_EVENTS: 'wallet.events',
};
exports.QUEUES = {
    NOTIFICATION_WALLET_EVENTS: 'notification.wallet.events',
};
exports.ROUTING_KEYS = {
    WALLET_BALANCE_UPDATED: 'wallet.balance.updated',
};
async function connectRabbitMQ() {
    if (!RABBITMQ_URL) {
        throw new Error('Missing required env: RABBITMQ_URL');
    }
    connection = await amqplib_1.default.connect(RABBITMQ_URL);
    channel = await connection.createChannel();
    await channel.assertExchange(exports.EXCHANGES.WALLET_EVENTS, 'topic', { durable: true });
    await channel.assertQueue(exports.QUEUES.NOTIFICATION_WALLET_EVENTS, { durable: true });
    await channel.bindQueue(exports.QUEUES.NOTIFICATION_WALLET_EVENTS, exports.EXCHANGES.WALLET_EVENTS, exports.ROUTING_KEYS.WALLET_BALANCE_UPDATED);
    console.log('Connected to RabbitMQ (notification-service)');
}
async function getChannel() {
    if (!channel) {
        throw new Error('RabbitMQ channel not initialized');
    }
    return channel;
}
