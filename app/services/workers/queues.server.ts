import { redisClient } from '@/lib/redis.server';
import { Queue } from 'bullmq';

export const QUEUE_NAMES = {
    IMPORT_PRODUCTS: 'import-products',
}

export const importProductsQueue = new Queue(QUEUE_NAMES.IMPORT_PRODUCTS, {
    connection: redisClient,
    defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: true,
    },
});