import mongoose from 'mongoose';

export async function connectDB(): Promise<void> {
  const mongoUri = process.env.MONGO_URI_TRANSACTION;
  if (!mongoUri) {
    throw new Error('Missing required env: MONGO_URI_TRANSACTION');
  }

  await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 5000,
  });

  console.log('MongoDB connected (transaction-service)');
}

export async function disconnectDB() {
  await mongoose.disconnect();
}

export default mongoose;
