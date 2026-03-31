import mongoose from 'mongoose';

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 3_000;

export async function connectDB(): Promise<void> {
  // Support both MONGO_URI (shared .env convention) and MONGODB_URI as fallback
  const mongoUri = process.env.MONGO_URI ?? process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error(
      '[Wallet] Database URI is not defined. Set MONGO_URI or MONGODB_URI in .env.',
    );
  }

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 5_000,
        retryWrites: true,
        w: 'majority',
      });
      console.log(`✓ MongoDB connected (Wallet Service) – attempt ${attempt}/${MAX_RETRIES}`);
      return;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      if (attempt < MAX_RETRIES) {
        console.warn(`✗ MongoDB connection failed (attempt ${attempt}/${MAX_RETRIES}): ${msg}`);
        console.warn(`  Retrying in ${RETRY_DELAY_MS / 1000}s…`);
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      } else {
        console.error(`✗ MongoDB unreachable after ${MAX_RETRIES} attempts. Exiting.`);
        throw error;
      }
    }
  }
}

export async function disconnectDB() {
  await mongoose.disconnect();
}

export default mongoose;
