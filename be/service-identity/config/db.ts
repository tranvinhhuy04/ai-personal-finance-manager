import mongoose from 'mongoose';

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 3_000; // 3 seconds between attempts

export async function connectDB(): Promise<void> {
  // MONGO_URI for local dev (.env), MONGODB_URI injected by docker-compose
  const mongoUri = process.env.MONGO_URI ?? process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error(
      'Database URI is not defined. Set MONGO_URI (local) or MONGODB_URI (Docker).',
    );
  }

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 5_000, // give Atlas 5s to respond
      });
      console.log(`✓ MongoDB connected (attempt ${attempt}/${MAX_RETRIES})`);
      return;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      if (attempt < MAX_RETRIES) {
        console.warn(
          `✗ MongoDB connection failed (attempt ${attempt}/${MAX_RETRIES}): ${msg}`,
        );
        console.warn(`  Retrying in ${RETRY_DELAY_MS / 1000}s…`);
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      } else {
        console.error(
          `✗ MongoDB unreachable after ${MAX_RETRIES} attempts. Exiting.`,
        );
        throw error;
      }
    }
  }
}

