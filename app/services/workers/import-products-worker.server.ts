import { Worker } from 'bullmq';
import { importProductsQueue, QUEUE_NAMES } from './queues.server';
import { redisClient } from '../../lib/redis.server';
import { logger } from '../../lib/logger.worker';
import { ProductsImportService } from '../products-import.server';

export interface IProductsImportJobData {
    shopId: number;
    syncLogId: number;
    shop: string;
    accessToken: string;
}

export async function addProductsImportJob(data: IProductsImportJobData) {
    try {
        await importProductsQueue.add(QUEUE_NAMES.IMPORT_PRODUCTS, data);
        logger.info(`Products import job added to queue`, {
            tags: {
                queue_name: QUEUE_NAMES.IMPORT_PRODUCTS,
            },
            shopId: data.shopId,
            shop: data.shop,
        });
    } catch (err) {
        logger.error(`Failed to add products import job`, err, {
            tags: {
                queue_name: QUEUE_NAMES.IMPORT_PRODUCTS,
            },
            shopId: data.shopId,
            shop: data.shop,
        });
        throw err;
    }
}

export function createProductsImportWorker() {
    const worker = new Worker(
        QUEUE_NAMES.IMPORT_PRODUCTS,
        async job => {
            const startTime = Date.now();
            const data = job.data as IProductsImportJobData;

            logger.logJobStart(job.id!, QUEUE_NAMES.IMPORT_PRODUCTS, QUEUE_NAMES.IMPORT_PRODUCTS, data);

            const productImportSrv = new ProductsImportService(
                data.shopId, data.syncLogId, data.shop, data.accessToken
            );
            await productImportSrv.importProducts({});

            const duration = Date.now() - startTime;
            logger.logJobComplete(job.id!, QUEUE_NAMES.IMPORT_PRODUCTS, QUEUE_NAMES.IMPORT_PRODUCTS, duration);
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
                queue_name: QUEUE_NAMES.IMPORT_PRODUCTS,
                job_status: 'completed',
            },
            jobId: job.id!,
            jobName: QUEUE_NAMES.IMPORT_PRODUCTS,
            queueName: QUEUE_NAMES.IMPORT_PRODUCTS,
        });
    });

    worker.on('failed', (job, err) => {
        logger.logJobFailed(
            job?.id || 'unknown',
            QUEUE_NAMES.IMPORT_PRODUCTS,
            QUEUE_NAMES.IMPORT_PRODUCTS,
            err,
            job?.data
        );
    });

    return {
        name: QUEUE_NAMES.IMPORT_PRODUCTS,
        close: async () => {
            await worker.close();
        }
    }
}