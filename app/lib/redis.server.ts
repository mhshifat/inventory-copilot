import Redis from "ioredis";

if (!process.env.REDIS_URI) {
    throw new Error("REDIS_URI is not defined in environment variables.");
}

export const pubRedisConnection = new Redis(process.env.REDIS_URI!);
export const subRedisConnection = new Redis(process.env.REDIS_URI!);

// await subRedisConnection.subscribe("shop:inventory-copilot-test-store.myshopify.com:sync_progress");

// subRedisConnection.on("message", (channel, message) => {
//   console.log(`📩 Message on ${channel}:`, JSON.parse(message));
// });