const amqp = require('amqplib');

let connection = null;
let channel = null;

const EXCHANGES = {
  WALLET_EVENTS: 'wallet.events',
  TRANSACTION_EVENTS: 'transaction.events',
};

const QUEUES = {
  WALLET_RESPONSES: 'wallet.responses',
};

const ROUTING_KEYS = {
  TRANSACTION_CREATED: 'transaction.created',
  WALLET_BALANCE_UPDATED: 'wallet.balance.updated',
  WALLET_BALANCE_UPDATE_FAILED: 'wallet.balance.update.failed',
};

async function connectRabbitMQ() {
  const url = process.env.RABBITMQ_URL;
  if (!url) {
    throw new Error('Missing required env: RABBITMQ_URL');
  }

  connection = await amqp.connect(url);
  channel = await connection.createChannel();
  await channel.assertExchange(EXCHANGES.WALLET_EVENTS, 'topic', { durable: true });
  await channel.assertExchange(EXCHANGES.TRANSACTION_EVENTS, 'topic', { durable: true });
  await channel.assertQueue(QUEUES.WALLET_RESPONSES, { durable: true });

  console.log('RabbitMQ connected (transaction-service)');
}

module.exports = {
  connectRabbitMQ,
  EXCHANGES,
  QUEUES,
  ROUTING_KEYS,
};
