import Redis from "ioredis";

if (!process.env.REDIS_URI) {
    throw new Error("REDIS_URI is not defined in environment variables.");
}

export const redisClient = new Redis(process.env.REDIS_URI!, {
    maxRetriesPerRequest: null,
});
export const pubRedisConnection = new Redis(process.env.REDIS_URI!);

// import Redis from "ioredis";
// import { Redis as UpstashRedis } from "@upstash/redis";

// if (!process.env.REDIS_URI) {
//     throw new Error("REDIS_URI is not defined in environment variables.");
// }

// export const redisClient = process.env.NODE_ENV ==="production" ? new UpstashRedis({
//     url: process.env.REDIS_URI!,
//     token: process.env.UPSTASH_REDIS_TOKEN!,
// }) : new Redis(process.env.REDIS_URI!, {
//     maxRetriesPerRequest: null,
// });
// export const pubRedisConnection = process.env.NODE_ENV ==="production" ? new UpstashRedis({
//     url: process.env.REDIS_URI!,
//     token: process.env.UPSTASH_REDIS_TOKEN!,
// }) : new Redis(process.env.REDIS_URI!);