import { createClient } from 'redis';

const redisClient = createClient({
  socket: {
    host: process.env.REDIS_HOST || 'redis-cache',
    port: Number(process.env.REDIS_PORT) || 6379,
  }
});

redisClient.connect().catch(console.error);

export default redisClient;
