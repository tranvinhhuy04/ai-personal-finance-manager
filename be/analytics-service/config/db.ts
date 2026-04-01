import mongoose from 'mongoose';

export async function connectDB(): Promise<void> {
  const mongoUri = process.env.MONGO_URI_ANALYTICS;
  if (!mongoUri) {
    throw new Error('Missing required env: MONGO_URI_ANALYTICS');
  }

  await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 5000,
  });

  console.log('MongoDB connected (analytics-service)');
}
