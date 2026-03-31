import amqp, { ChannelModel, Channel } from 'amqplib';

let connection: ChannelModel | null = null;
let channel: Channel | null = null;

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';

// Exchange và Queue names
export const EXCHANGES = {
  WALLET_EVENTS: 'wallet.events',
  TRANSACTION_EVENTS: 'transaction.events',
};

export const QUEUES = {
  WALLET_BALANCE_UPDATES: 'wallet.balance.updates',
  WALLET_RESPONSES: 'wallet.responses',
  TRANSACTION_EVENTS_QUEUE: 'transaction.events.queue',
};

export const ROUTING_KEYS = {
  TRANSACTION_CREATED: 'transaction.created',
  WALLET_BALANCE_UPDATED: 'wallet.balance.updated',
  WALLET_BALANCE_UPDATE_FAILED: 'wallet.balance.update.failed',
};

export async function connectRabbitMQ() {
  try {
    connection = await amqp.connect(RABBITMQ_URL);
    channel = await connection.createChannel();

    // Declare exchanges
    await channel.assertExchange(EXCHANGES.WALLET_EVENTS, 'topic', { durable: true });
    await channel.assertExchange(EXCHANGES.TRANSACTION_EVENTS, 'topic', { durable: true });

    // Declare queues
    await channel.assertQueue(QUEUES.WALLET_BALANCE_UPDATES, { durable: true });
    await channel.assertQueue(QUEUES.WALLET_RESPONSES, { durable: true });
    await channel.assertQueue(QUEUES.TRANSACTION_EVENTS_QUEUE, { durable: true });

    console.log('✓ Connected to RabbitMQ');

    // Handle connection/channel closures
    connection.on('error', (err) => {
      console.error('RabbitMQ connection error:', err);
      connection = null;
      channel = null;
    });

    connection.on('close', () => {
      console.log('RabbitMQ connection closed');
      connection = null;
      channel = null;
    });

    return { connection, channel };
  } catch (err) {
    console.error('✗ RabbitMQ connection failed:', err);
    throw err;
  }
}

export async function getChannel(): Promise<Channel> {
  if (!channel) {
    throw new Error('RabbitMQ channel not initialized. Call connectRabbitMQ() first.');
  }
  return channel;
}

export async function closeRabbitMQ() {
  if (channel) {
    await channel.close();
  }
  if (connection) {
    await connection.close();
  }
  connection = null;
  channel = null;
  console.log('RabbitMQ connection closed');
}

export default {
  connectRabbitMQ,
  getChannel,
  closeRabbitMQ,
  EXCHANGES,
  QUEUES,
  ROUTING_KEYS,
};
