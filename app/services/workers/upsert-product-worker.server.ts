import { Worker } from 'bullmq';
import { QUEUE_NAMES, upsertProductQueue } from './queues.server';
import { redisClient } from '../../lib/redis.server';
import { logger } from '../../lib/logger.worker';
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
        logger.info(`Product job added to queue: ${data.type}`, {
            tags: {
                queue_name: QUEUE_NAMES.UPSERT_PRODUCT,
                product_id: data.productId,
                job_type: data.type,
            },
            shopId: data.shopId,
            shop: data.shop,
        });
    } catch (err) {
        logger.error(`Failed to add ${data.type} product job`, err, {
            tags: {
                queue_name: QUEUE_NAMES.UPSERT_PRODUCT,
                product_id: data.productId,
                job_type: data.type,
            },
            shopId: data.shopId,
            shop: data.shop,
        });
        throw err;
    }
}

export function upsertProductWorker() {
    const worker = new Worker(
        QUEUE_NAMES.UPSERT_PRODUCT,
        async job => {
            const startTime = Date.now();
            const data = job.data as IUpsertProductJobData;

            logger.logJobStart(job.id!, QUEUE_NAMES.UPSERT_PRODUCT, QUEUE_NAMES.UPSERT_PRODUCT, data);

            const productImportService = new ProductsImportService(
                data.shopId, data.syncLogId, data.shop, data.accessToken, data.webhookId
            );
            if (data.type === "DELETED") {
                await productImportService.handleProductDeleteWebhook(data.productId, "DELETED");
            } else {
                await productImportService.handleProductUpsertWebhook(data.productId, data.type);
            }

            const duration = Date.now() - startTime;
            logger.logJobComplete(job.id!, QUEUE_NAMES.UPSERT_PRODUCT, QUEUE_NAMES.UPSERT_PRODUCT, duration);
        },
        {
            connection: redisClient,
            removeOnComplete: { count: 1, age: 1000 },
            removeOnFail: { count: 1, age: 1000 },
        },
    );

    worker.on('completed', job => {
        logger.info(`Job completed successfully`, {
            tags: {
                job_id: job.id!,
                queue_name: QUEUE_NAMES.UPSERT_PRODUCT,
                job_status: 'completed',
            },
            jobId: job.id!,
            jobName: QUEUE_NAMES.UPSERT_PRODUCT,
            queueName: QUEUE_NAMES.UPSERT_PRODUCT,
        });
    });

    worker.on('failed', (job, err) => {
        logger.logJobFailed(
            job?.id || 'unknown',
            QUEUE_NAMES.UPSERT_PRODUCT,
            QUEUE_NAMES.UPSERT_PRODUCT,
            err,
            job?.data
        );
    });

    return {
        name: QUEUE_NAMES.UPSERT_PRODUCT,
        close: async () => {
            await worker.close();
        }
    }
}