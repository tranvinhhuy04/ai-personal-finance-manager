const mongoose = require('mongoose');

async function connectDB() {
  const mongoUri = process.env.MONGO_URI_TRANSACTION;
  if (!mongoUri) {
    throw new Error('Missing required env: MONGO_URI_TRANSACTION');
  }

  await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 5000,
  });

  console.log('MongoDB connected (transaction-service)');
}

module.exports = {
  connectDB,
};
