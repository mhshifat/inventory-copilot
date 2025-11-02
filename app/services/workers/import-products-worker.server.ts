import { Worker } from 'bullmq';
import { importProductsQueue, QUEUE_NAMES } from './queues.server';
import { redisClient } from '@/lib/redis.server';
import { Logger } from '@/lib/logger.server';
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
    } catch (err) {
        Logger.error(`Failed to add products import job: ${(err as Error).message}`);
        throw err;
    }
}

export function createProductsImportWorker() {
    const worker = new Worker(
        QUEUE_NAMES.IMPORT_PRODUCTS,
        async job => {
            const data = job.data as IProductsImportJobData;

            const productImportSrv = new ProductsImportService(
                data.shopId, data.syncLogId, data.shop, data.accessToken
            );
            await productImportSrv.importProducts({});
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
        name: QUEUE_NAMES.IMPORT_PRODUCTS,
        close: async () => {
            await worker.close();
        }
    }
}