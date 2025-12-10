import { Worker } from 'bullmq';
import { QUEUE_NAMES, upsertOrderQueue } from './queues.server';
import { redisClient } from '../../lib/redis.server';
import { Logger } from '../../lib/logger.server';
import { OrdersImportService } from '../orders-import.server';
import { SyncLogType } from '@prisma/client';
import * as Sentry from '@sentry/node';

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
    } catch (err) {
        Logger.error(`Failed to ${data.type} order job: ${(err as Error).message}`);
        Sentry.captureException(err);
        throw err;
    }
}

export function upsertOrderWorker() {
    const worker = new Worker(
        QUEUE_NAMES.UPSERT_ORDER,
        async job => {
            const data = job.data as IUpsertOrderJobData;

            const orderImportService = new OrdersImportService(
                data.shopId, data.syncLogId, data.shop, data.accessToken, data.webhookId
            );
            if (data.type === SyncLogType.ORDERS_DELETE || data.type === SyncLogType.ORDERS_CANCEL) {
                await orderImportService.handleOrderDeleteWebhook(data.orderId, data.type);
            } else {
                await orderImportService.handleOrderUpsertWebhook(data.orderId, data.type);
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
        Sentry.captureException(err, {
            tags: {
                worker: QUEUE_NAMES.UPSERT_ORDER,
                jobId: job?.id
            },
            extra: {
                jobData: job?.data
            }
        });
    });

    return {
        name: QUEUE_NAMES.UPSERT_ORDER,
        close: async () => {
            await worker.close();
        }
    }
}