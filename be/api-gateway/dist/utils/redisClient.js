"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const redis_1 = require("redis");
const redisClient = (0, redis_1.createClient)({
    socket: {
        host: process.env.REDIS_HOST || 'redis-cache',
        port: Number(process.env.REDIS_PORT) || 6379,
    }
});
redisClient.connect().catch(console.error);
exports.default = redisClient;
