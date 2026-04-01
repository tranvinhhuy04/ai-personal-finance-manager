const express = require('express');
const { connectDB } = require('./config/db');
const { connectRabbitMQ } = require('./config/rabbitmq');
const transactionRoutes = require('./src/routes/index');
const categoryRoutes = require('./src/routes/category.routes');
const errorHandler = require('./src/middlewares/errorHandler');

const app = express();
const PORT = process.env.TRANSACTION_PORT || 3003;

app.use(express.json());
app.use('/api/v1/transactions', transactionRoutes);
app.use('/api/v1/categories', categoryRoutes);
app.use(errorHandler);

async function start() {
  await connectDB();
  await connectRabbitMQ();

  app.listen(PORT, function () {
    console.log('transaction-service app.js running on port ' + PORT);
  });
}

start().catch(function (error) {
  console.error('transaction-service app.js startup failed', error);
  process.exit(1);
});
