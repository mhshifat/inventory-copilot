import { redisClient } from '../../lib/redis.server';
import { Queue } from 'bullmq';

export const QUEUE_NAMES = {
    IMPORT_PRODUCTS: 'import-products',
    UPSERT_PRODUCT: 'upsert-product',
    UPSERT_ORDER: 'upsert-order',
}

export const importProductsQueue = new Queue(QUEUE_NAMES.IMPORT_PRODUCTS, {
    connection: redisClient,
    defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: true,
    },
});

export const upsertProductQueue = new Queue(QUEUE_NAMES.UPSERT_PRODUCT, {
    connection: redisClient,
    defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: true,
    },
});

export const upsertOrderQueue = new Queue(QUEUE_NAMES.UPSERT_ORDER, {
    connection: redisClient,
    defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: true,
    },
});