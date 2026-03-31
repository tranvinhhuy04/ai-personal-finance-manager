import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/transaction-service';

export async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI, {
      retryWrites: true,
      w: 'majority',
    });
    console.log('✓ Connected to MongoDB (Transaction Service)');
  } catch (err) {
    console.error('✗ MongoDB connection failed:', err);
    process.exit(1);
  }
}

export async function disconnectDB() {
  await mongoose.disconnect();
}

export default mongoose;
