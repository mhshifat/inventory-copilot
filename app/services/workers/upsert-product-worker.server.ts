import { Worker } from 'bullmq';
import { QUEUE_NAMES, upsertProductQueue } from './queues.server';
import { redisClient } from '../../lib/redis.server';
import { Logger } from '../../lib/logger.server';
import { ProductsImportService } from '../products-import.server';

export interface IUpsertProductJobData {
    shopId: number;
    syncLogId: number;
    shop: string;
    accessToken: string;
    webhookId: string;
    productId: string;
    type: "CREATED" | "UPDATED" | "DELETED";
}

export async function addUpsertProductJob(data: IUpsertProductJobData) {
    try {
        await upsertProductQueue.add(QUEUE_NAMES.UPSERT_PRODUCT, data);
    } catch (err) {
        Logger.error(`Failed to ${data.type} product job: ${(err as Error).message}`);
        throw err;
    }
}

export function upsertProductWorker() {
    const worker = new Worker(
        QUEUE_NAMES.UPSERT_PRODUCT,
        async job => {
            const data = job.data as IUpsertProductJobData;

            const productImportService = new ProductsImportService(
                data.shopId, data.syncLogId, data.shop, data.accessToken, data.webhookId
            );
            if (data.type === "DELETED") {
                await productImportService.handleProductDeleteWebhook(data.productId, "DELETED");
            } else {
                await productImportService.handleProductUpsertWebhook(data.productId, data.type);
            }
        },
        {
            connection: redisClient,
            removeOnComplete: { count: 1, age: 1000 },
            removeOnFail: { count: 1, age: 1000 },
        },
    );

    worker.on('completed', job => {
        Logger.log(`${job.id} has completed!`);
    });

    worker.on('failed', (job, err) => {
        Logger.log(`${job?.id} has failed with ${err.message}`);
    });

    return {
        name: QUEUE_NAMES.UPSERT_PRODUCT,
        close: async () => {
            await worker.close();
        }
    }
}