import Redis from "ioredis";

if (!process.env.REDIS_URI) {
    throw new Error("REDIS_URI is not defined in environment variables.");
}

export const redisClient = new Redis(process.env.REDIS_URI!, {
    maxRetriesPerRequest: null,
});
export const pubRedisConnection = new Redis(process.env.REDIS_URI!);