import { Worker } from 'bullmq';
import { QUEUE_NAMES, upsertOrderQueue } from './queues.server';
import { redisClient } from '../../lib/redis.server';
import { logger } from '../../lib/logger.worker';
import { OrdersImportService } from '../orders-import.server';
import { SyncLogType } from '@prisma/client';

export interface IUpsertOrderJobData {
    shopId: number;
    syncLogId: number;
    shop: string;
    accessToken: string;
    webhookId: string;
    orderId: string;
    type: SyncLogType;
}

export async function addUpsertOrderJob(data: IUpsertOrderJobData) {
    try {
        await upsertOrderQueue.add(QUEUE_NAMES.UPSERT_ORDER, data);
        logger.info(`Order job added to queue: ${data.type}`, {
            tags: {
                queue_name: QUEUE_NAMES.UPSERT_ORDER,
                order_id: data.orderId,
                job_type: data.type,
            },
            shopId: data.shopId,
            shop: data.shop,
        });
    } catch (err) {
        logger.error(`Failed to add ${data.type} order job`, err, {
            tags: {
                queue_name: QUEUE_NAMES.UPSERT_ORDER,
                order_id: data.orderId,
                job_type: data.type,
            },
            shopId: data.shopId,
            shop: data.shop,
        });
        throw err;
    }
}

export function upsertOrderWorker() {
    const worker = new Worker(
        QUEUE_NAMES.UPSERT_ORDER,
        async job => {
            const startTime = Date.now();
            const data = job.data as IUpsertOrderJobData;

            logger.logJobStart(job.id!, QUEUE_NAMES.UPSERT_ORDER, QUEUE_NAMES.UPSERT_ORDER, data);

            const orderImportService = new OrdersImportService(
                data.shopId, data.syncLogId, data.shop, data.accessToken, data.webhookId
            );
            if (data.type === SyncLogType.ORDERS_DELETE || data.type === SyncLogType.ORDERS_CANCEL) {
                await orderImportService.handleOrderDeleteWebhook(data.orderId, data.type);
            } else {
                await orderImportService.handleOrderUpsertWebhook(data.orderId, data.type);
            }

            const duration = Date.now() - startTime;
            logger.logJobComplete(job.id!, QUEUE_NAMES.UPSERT_ORDER, QUEUE_NAMES.UPSERT_ORDER, duration);
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
                queue_name: QUEUE_NAMES.UPSERT_ORDER,
                job_status: 'completed',
            },
            jobId: job.id!,
            jobName: QUEUE_NAMES.UPSERT_ORDER,
            queueName: QUEUE_NAMES.UPSERT_ORDER,
        });
    });

    worker.on('failed', (job, err) => {
        logger.logJobFailed(
            job?.id || 'unknown',
            QUEUE_NAMES.UPSERT_ORDER,
            QUEUE_NAMES.UPSERT_ORDER,
            err,
            job?.data
        );
    });

    return {
        name: QUEUE_NAMES.UPSERT_ORDER,
        close: async () => {
            await worker.close();
        }
    }
}