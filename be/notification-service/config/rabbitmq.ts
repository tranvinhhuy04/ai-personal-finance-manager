import amqp, { Channel, ChannelModel } from 'amqplib';

let connection: ChannelModel | null = null;
let channel: Channel | null = null;

const RABBITMQ_URL = process.env.RABBITMQ_URL;

export const EXCHANGES = {
  WALLET_EVENTS: 'wallet.events',
  FINTECH_EVENTS: 'fintech_events',
};

export const QUEUES = {
  NOTIFICATION_WALLET_EVENTS: 'notification.wallet.events',
};

export const ROUTING_KEYS = {
  WALLET_BALANCE_UPDATED: 'wallet.balance.updated',
  NOTIFICATION_TRANSACTION: 'notification.transaction',
};

export async function connectRabbitMQ() {
  if (!RABBITMQ_URL) {
    throw new Error('Missing required env: RABBITMQ_URL');
  }

  connection = await amqp.connect(RABBITMQ_URL);
  channel = await connection.createChannel();

  await channel.assertExchange(EXCHANGES.WALLET_EVENTS, 'topic', { durable: true });
  await channel.assertExchange(EXCHANGES.FINTECH_EVENTS, 'topic', { durable: true });
  await channel.assertQueue(QUEUES.NOTIFICATION_WALLET_EVENTS, { durable: true });
  await channel.bindQueue(
    QUEUES.NOTIFICATION_WALLET_EVENTS,
    EXCHANGES.WALLET_EVENTS,
    ROUTING_KEYS.WALLET_BALANCE_UPDATED
  );
  await channel.bindQueue(
    QUEUES.NOTIFICATION_WALLET_EVENTS,
    EXCHANGES.FINTECH_EVENTS,
    ROUTING_KEYS.NOTIFICATION_TRANSACTION
  );

  console.log('Connected to RabbitMQ (notification-service)');
}

export async function getChannel(): Promise<Channel> {
  if (!channel) {
    throw new Error('RabbitMQ channel not initialized');
  }
  return channel;
}
