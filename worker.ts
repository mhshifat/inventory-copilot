import { disconnectPrisma } from '@/lib/db.server';
import { pubRedisConnection, redisClient } from '@/lib/redis.server';
import { createProductsImportWorker } from '@/services/workers/import-products-worker.server';
import * as dotenv from 'dotenv';
dotenv.config();

(async () => {
  try {
    const workers = [
        createProductsImportWorker(),
    ];
  
    console.log({ "Running Workers": workers.map((worker) => worker?.name) });
  
    // Graceful shutdown
    async function shutdown(signal: string) {
      try {
        console.log(`[${new Date().toISOString()}] Received ${signal}, shutting down workers...`);

        await Promise.allSettled(workers.map((worker) => worker.close()));
      }
      catch (error) {
        console.error(`[${new Date().toISOString()}] Error during shutdown workers: ${signal} : `, error);
      } finally {
        try {
          await disconnectPrisma();
          await redisClient.quit();
          await pubRedisConnection.quit();
        } finally {
          process.exit(0);
        }
      }
    }
  
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Error in worker process: `, err);
  }
})()