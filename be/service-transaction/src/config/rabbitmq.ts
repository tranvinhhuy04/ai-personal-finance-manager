import amqp, { Channel, ChannelModel } from 'amqplib';

let connection: ChannelModel | null = null;
let channel: Channel | null = null;

const RABBITMQ_URL = process.env.RABBITMQ_URL;

export const EXCHANGES = {
  WALLET_EVENTS: 'wallet.events',
  TRANSACTION_EVENTS: 'transaction.events',
  FINTECH_EVENTS: 'fintech_events',
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
  NOTIFICATION_TRANSACTION: 'notification.transaction',
};

export async function connectRabbitMQ() {
  if (!RABBITMQ_URL) {
    throw new Error('Missing required env: RABBITMQ_URL');
  }

  connection = await amqp.connect(RABBITMQ_URL);
  channel = await connection.createChannel();

  await channel.assertExchange(EXCHANGES.WALLET_EVENTS, 'topic', { durable: true });
  await channel.assertExchange(EXCHANGES.TRANSACTION_EVENTS, 'topic', { durable: true });
  await channel.assertExchange(EXCHANGES.FINTECH_EVENTS, 'topic', { durable: true });

  await channel.assertQueue(QUEUES.WALLET_BALANCE_UPDATES, { durable: true });
  await channel.assertQueue(QUEUES.WALLET_RESPONSES, { durable: true });
  await channel.assertQueue(QUEUES.TRANSACTION_EVENTS_QUEUE, { durable: true });

  console.log('✓ Connected to RabbitMQ');

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
}

export async function getChannel(): Promise<Channel> {
  if (!channel) {
    throw new Error('RabbitMQ channel not initialized. Call connectRabbitMQ() first.');
  }
  return channel;
}

export async function publishMessage(
  exchange: string,
  routingKey: string,
  payload: Record<string, unknown>
) {
  const currentChannel = await getChannel();
  return currentChannel.publish(exchange, routingKey, Buffer.from(JSON.stringify(payload)), {
    persistent: true,
  });
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
