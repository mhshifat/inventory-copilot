import { ApiResponse } from "@/lib/api-response";
import prisma from "@/lib/db.server";
import rateLimit from "@/lib/rate-limit";
import { addProductsImportJob } from "@/services/workers/import-products-worker.server";
import { authenticate, handleError } from "@/shopify.server";
import { SyncLogStatus, SyncLogType } from "@prisma/client";
import type { ActionFunctionArgs } from "@remix-run/node";

export const action = async (args: ActionFunctionArgs) => {
    try {
        const { session } = await authenticate.admin(args.request);

        rateLimit(`${session.shop}-import-products`, 10, 60_000);
        
        const shop = await prisma.shop.findUnique({
            where: {
                domain: session.shop
            },
            select: {
                id: true
            }
        });

        if (!shop?.id) {
            throw new Error(`Shop not found with domain: ${session.shop}`);
        }
        if (!session.accessToken) {
            throw new Error(`Access token missing for shop: ${session.shop}`);
        }

        const syncLog = await prisma.syncLog.create({
            data: {
                shop_id: shop.id,
                status: SyncLogStatus.QUEUED,
                type: SyncLogType.PRODUCTS_IMPORT,
                message: "Products import initiated",
            },
            select: {
                id: true
            }
        });
        await addProductsImportJob({
            shopId: shop.id,
            syncLogId: syncLog.id,
            shop: session.shop,
            accessToken: session.accessToken,
        });
        
        return new ApiResponse({
            data: null,
            message: "Products import initiated",
        });
    } catch (err) {
        handleError(err);
        return new ApiResponse({
            data: null,
            message: "Error importing products",
        });
    }
}