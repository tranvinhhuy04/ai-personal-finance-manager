const express = require('express');
const { connectDB } = require('./config/db');
const { connectRabbitMQ } = require('./config/rabbitmq');
const walletRoutes = require('./src/routes/index');
const errorHandler = require('./src/middlewares/errorHandler');

const app = express();
const PORT = process.env.WALLET_PORT || 3002;

app.use(express.json());
app.use('/api/v1/wallets', walletRoutes);
app.use(errorHandler);

async function start() {
  await connectDB();
  await connectRabbitMQ();

  app.listen(PORT, function () {
    console.log('wallet-service app.js running on port ' + PORT);
  });
}

start().catch(function (error) {
  console.error('wallet-service app.js startup failed', error);
  process.exit(1);
});

