"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDB = connectDB;
const mongoose_1 = __importDefault(require("mongoose"));
async function connectDB() {
    const mongoUri = process.env.MONGO_URI_NOTIFICATION;
    if (!mongoUri) {
        throw new Error('Missing required env: MONGO_URI_NOTIFICATION');
    }
    await mongoose_1.default.connect(mongoUri, {
        serverSelectionTimeoutMS: 5000,
    });
    console.log('MongoDB connected (notification-service)');
}
