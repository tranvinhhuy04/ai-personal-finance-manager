import mongoose from 'mongoose';

export async function connectDB(): Promise<void> {
  const mongoUri = process.env.MONGO_URI_NOTIFICATION;
  if (!mongoUri) {
    throw new Error('Missing required env: MONGO_URI_NOTIFICATION');
  }

  await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 5000,
  });

  console.log('MongoDB connected (notification-service)');
}
