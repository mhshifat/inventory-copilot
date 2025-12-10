import { Worker } from 'bullmq';
import { lowStockAlertQueue, QUEUE_NAMES } from './queues.server';
import { redisClient } from '../../lib/redis.server';
import { Logger } from '../../lib/logger.server';
import { SendMailService } from '../send-mail';
import * as Sentry from '@sentry/node';

export interface ILowStockAlertJobData {
    shopId: number;
    shop: string;
    syncLogId?: number;
    currentStock: number;
    threshold: number;
    to: string;
}

export async function addLowStockAlertJob(data: ILowStockAlertJobData) {
    try {
        await lowStockAlertQueue.add(QUEUE_NAMES.LOW_STOCK_ALERT, data);
    } catch (err) {
        Logger.error(`Failed to add low stock alert job: ${(err as Error).message}`);
        Sentry.captureException(err);
        throw err;
    }
}

export function lowStockAlertWorker() {
    const worker = new Worker(
        QUEUE_NAMES.LOW_STOCK_ALERT,
        async job => {
            const data = job.data as ILowStockAlertJobData;

            const payload = {
                subject: 'Low Stock Alert',
                message: `Alert: The stock for your shop (Shop: ${data.shop}) has fallen to ${data.currentStock}, which is below the threshold of ${data.threshold}. Please restock soon.`,
                to: data.to,
                from: "shifat.dev@gmail.com",
            }

            const sendMailService = new SendMailService(
                data.shopId,
                data.syncLogId,
                data.shop,
                "LOW_STOCK_ALERT"
            );

            await sendMailService.sendMail(payload, "LOW_STOCK_ALERT");
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
                worker: QUEUE_NAMES.LOW_STOCK_ALERT,
                jobId: job?.id
            },
            extra: {
                jobData: job?.data
            }
        });
    });

    return {
        name: QUEUE_NAMES.LOW_STOCK_ALERT,
        close: async () => {
            await worker.close();
        }
    }
}