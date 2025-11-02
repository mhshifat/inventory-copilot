import { Logger } from "@/lib/logger.server";
import { pubRedisConnection } from "@/lib/redis.server";

export class BaseService {
    constructor(
        protected shop: string,
        protected accessToken: string,
        protected type: string
    ) {}

    log(message: string) {
        Logger.log(`[${this.shop}] [${this.type}] ${message}`);
    }

    error(message: string, error: Error) {
        Logger.error(`[${this.shop}] [${this.type}] ${message}`, error);
    }

    async updateProgress(message: string, number: number) {
        this.log(message);
        this.log(`Progress: ${number}`);
        const result = await pubRedisConnection.publish(`shop:${this.shop}:sync_progress`, JSON.stringify({
            type: this.type,
            message,
            progress: number
        }));
        this.log(`Published progress update to ${result} subscribers.`);
    }
}
