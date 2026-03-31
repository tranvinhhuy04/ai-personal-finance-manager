"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDB = connectDB;
const mongoose_1 = __importDefault(require("mongoose"));
const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 3000; // 3 seconds between attempts
async function connectDB() {
    // MONGO_URI for local dev (.env), MONGODB_URI injected by docker-compose
    const mongoUri = process.env.MONGO_URI ?? process.env.MONGODB_URI;
    if (!mongoUri) {
        throw new Error('Database URI is not defined. Set MONGO_URI (local) or MONGODB_URI (Docker).');
    }
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            await mongoose_1.default.connect(mongoUri, {
                serverSelectionTimeoutMS: 5000, // give Atlas 5s to respond
            });
            console.log(`✓ MongoDB connected (attempt ${attempt}/${MAX_RETRIES})`);
            return;
        }
        catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            if (attempt < MAX_RETRIES) {
                console.warn(`✗ MongoDB connection failed (attempt ${attempt}/${MAX_RETRIES}): ${msg}`);
                console.warn(`  Retrying in ${RETRY_DELAY_MS / 1000}s…`);
                await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
            }
            else {
                console.error(`✗ MongoDB unreachable after ${MAX_RETRIES} attempts. Exiting.`);
                throw error;
            }
        }
    }
}
