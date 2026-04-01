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
    TRANSACTION_EVENTS: 'transaction.events',
};
exports.QUEUES = {
    ANALYTICS_TRANSACTION_EVENTS: 'analytics.transaction.events',
};
exports.ROUTING_KEYS = {
    TRANSACTION_CREATED: 'transaction.created',
    TRANSACTION_COMPLETED: 'transaction.completed',
};
async function connectRabbitMQ() {
    if (!RABBITMQ_URL) {
        throw new Error('Missing required env: RABBITMQ_URL');
    }
    connection = await amqplib_1.default.connect(RABBITMQ_URL);
    channel = await connection.createChannel();
    await channel.assertExchange(exports.EXCHANGES.TRANSACTION_EVENTS, 'topic', { durable: true });
    await channel.assertQueue(exports.QUEUES.ANALYTICS_TRANSACTION_EVENTS, { durable: true });
    await channel.bindQueue(exports.QUEUES.ANALYTICS_TRANSACTION_EVENTS, exports.EXCHANGES.TRANSACTION_EVENTS, exports.ROUTING_KEYS.TRANSACTION_CREATED);
    await channel.bindQueue(exports.QUEUES.ANALYTICS_TRANSACTION_EVENTS, exports.EXCHANGES.TRANSACTION_EVENTS, exports.ROUTING_KEYS.TRANSACTION_COMPLETED);
    console.log('Connected to RabbitMQ (analytics-service)');
}
async function getChannel() {
    if (!channel) {
        throw new Error('RabbitMQ channel not initialized');
    }
    return channel;
}
