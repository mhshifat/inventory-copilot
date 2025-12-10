import { Worker } from 'bullmq';
import { lowStockAlertQueue, QUEUE_NAMES } from './queues.server';
import { redisClient } from '../../lib/redis.server';
import { logger } from '../../lib/logger.worker';
import { SendMailService } from '../send-mail';

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
        logger.info(`Low stock alert job added to queue`, {
            tags: {
                queue_name: QUEUE_NAMES.LOW_STOCK_ALERT,
                alert_type: 'low_stock',
            },
            shopId: data.shopId,
            shop: data.shop,
            extra: {
                currentStock: data.currentStock,
                threshold: data.threshold,
            },
        });
    } catch (err) {
        logger.error(`Failed to add low stock alert job`, err, {
            tags: {
                queue_name: QUEUE_NAMES.LOW_STOCK_ALERT,
                alert_type: 'low_stock',
            },
            shopId: data.shopId,
            shop: data.shop,
        });
        throw err;
    }
}

export function lowStockAlertWorker() {
    const worker = new Worker(
        QUEUE_NAMES.LOW_STOCK_ALERT,
        async job => {
            const startTime = Date.now();
            const data = job.data as ILowStockAlertJobData;

            logger.logJobStart(job.id!, QUEUE_NAMES.LOW_STOCK_ALERT, QUEUE_NAMES.LOW_STOCK_ALERT, data);

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

            const duration = Date.now() - startTime;
            logger.logJobComplete(job.id!, QUEUE_NAMES.LOW_STOCK_ALERT, QUEUE_NAMES.LOW_STOCK_ALERT, duration);
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
                queue_name: QUEUE_NAMES.LOW_STOCK_ALERT,
                job_status: 'completed',
            },
            jobId: job.id!,
            jobName: QUEUE_NAMES.LOW_STOCK_ALERT,
            queueName: QUEUE_NAMES.LOW_STOCK_ALERT,
        });
    });

    worker.on('failed', (job, err) => {
        logger.logJobFailed(
            job?.id || 'unknown',
            QUEUE_NAMES.LOW_STOCK_ALERT,
            QUEUE_NAMES.LOW_STOCK_ALERT,
            err,
            job?.data
        );
    });

    return {
        name: QUEUE_NAMES.LOW_STOCK_ALERT,
        close: async () => {
            await worker.close();
        }
    }
}