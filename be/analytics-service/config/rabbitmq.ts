import amqp, { Channel, ChannelModel } from 'amqplib';

let connection: ChannelModel | null = null;
let channel: Channel | null = null;

const RABBITMQ_URL = process.env.RABBITMQ_URL;

export const EXCHANGES = {
  TRANSACTION_EVENTS: 'transaction.events',
};

export const QUEUES = {
  ANALYTICS_TRANSACTION_EVENTS: 'analytics.transaction.events',
};

export const ROUTING_KEYS = {
  TRANSACTION_CREATED: 'transaction.created',
  TRANSACTION_COMPLETED: 'transaction.completed',
};

export async function connectRabbitMQ() {
  if (!RABBITMQ_URL) {
    throw new Error('Missing required env: RABBITMQ_URL');
  }

  connection = await amqp.connect(RABBITMQ_URL);
  channel = await connection.createChannel();

  await channel.assertExchange(EXCHANGES.TRANSACTION_EVENTS, 'topic', { durable: true });
  await channel.assertQueue(QUEUES.ANALYTICS_TRANSACTION_EVENTS, { durable: true });
  await channel.bindQueue(
    QUEUES.ANALYTICS_TRANSACTION_EVENTS,
    EXCHANGES.TRANSACTION_EVENTS,
    ROUTING_KEYS.TRANSACTION_CREATED
  );
  await channel.bindQueue(
    QUEUES.ANALYTICS_TRANSACTION_EVENTS,
    EXCHANGES.TRANSACTION_EVENTS,
    ROUTING_KEYS.TRANSACTION_COMPLETED
  );

  console.log('Connected to RabbitMQ (analytics-service)');
}

export async function getChannel(): Promise<Channel> {
  if (!channel) {
    throw new Error('RabbitMQ channel not initialized');
  }
  return channel;
}
