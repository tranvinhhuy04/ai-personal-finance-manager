import mongoose from 'mongoose';

export async function connectDB(): Promise<void> {
  const mongoUri = process.env.MONGO_URI_WALLET;
  if (!mongoUri) {
    throw new Error('Missing required env: MONGO_URI_WALLET');
  }

  await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 5000,
  });

  console.log('MongoDB connected (wallet-service)');
}

export async function disconnectDB() {
  await mongoose.disconnect();
}

export default mongoose;
