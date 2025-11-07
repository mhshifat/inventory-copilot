import path from 'path';
import { format, subDays } from 'date-fns';
import { shopifyGraphqlRequest } from "../lib/shopify-graphql-request.server";
import { BaseService } from "./base-srv.server";
import { ShopifyUtils } from "./shopify-utils.server";
import prisma from '../lib/db.server';
import { SyncLogStatus, SyncLogType } from '@prisma/client';


export interface ImportOrdersPayload {
}

export interface ShopifyLineItem {
    id: string;
    quantity: number;
    productId: string;
}

export interface ShopifyOrder {
    id: string;
    subtotalLineItemsQuantity: number;
    lineItems: ShopifyLineItem[]
}

export interface BulkOperationRunForOrdersQueryResponse {
    bulkOperationRunQuery: {
        bulkOperation: {
            id: string;
            status: string;
        } | null;
        userErrors: Array<{
            field: string[] | null;
            message: string;
        }>;
    };
}



export class OrdersImportService extends BaseService {
    constructor(
        private shopId: number,
        private syncLogId: number,
        shop: string,
        accessToken: string
    ) {
        super(shop, accessToken, "ORDERS_IMPORT");
    }

    async importOrders(_: ImportOrdersPayload) {
        try {
            this.log("=============== Starting Importing Orders ===============");
            await prisma.syncLog.upsert({
                where: { id: this.syncLogId },
                update: {
                    status: SyncLogStatus.RUNNING,
                    message: "Importing orders started.",
                    updated_at: new Date()
                },
                create: {
                    status: SyncLogStatus.RUNNING,
                    type: SyncLogType.ORDERS_IMPORT,
                    message: "Importing orders started.",
                    created_at: new Date(),
                    updated_at: new Date(),
                    shop_id: this.shopId
                }
            });

            const today = format(new Date(), "yyyy-MM-dd");
            const thirtyDaysAgo = format(subDays(new Date(), 30), "yyyy-MM-dd");
            const bulkOperationQueryForOrders = await shopifyGraphqlRequest<BulkOperationRunForOrdersQueryResponse>(
                this.shop,
                this.accessToken,
                `
                    mutation {
                        bulkOperationRunQuery(
                            query: """
                                {
                                    orders(
                                        query: "created_at:>=${thirtyDaysAgo} AND created_at:<=${today} AND fulfillment_status:fulfilled AND AND financial_status:paid",
                                        sortKey: CREATED_AT
                                    ) {
                                        edges {
                                            node {
                                                id
                                                subtotalLineItemsQuantity
                                                lineItems {
                                                    edges {
                                                        node {
                                                            id
                                                            quantity
                                                            product {
                                                                id
                                                                legacyResourceId
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            """
                        ) {
                            bulkOperation {
                                id
                                status
                            }
                            userErrors {
                                field
                                message
                            }
                        }
                    }
                `
            );
            if (bulkOperationQueryForOrders?.userErrors?.length) {
                throw new Error(
                    `Shopify User Errors: ${bulkOperationQueryForOrders.userErrors.map(error => error.message).join(", ")}`
                );
            }
            await this.updateProgress("Step 1: Bulk operation for orders started, waiting for completion...", 10);

            const result = await ShopifyUtils.waitForBulkOperationCompletion({
                shop: this.shop,
                accessToken: this.accessToken
            }, {
                log: (message: string) => this.log(message)
            });
            if (!result) {
                throw new Error("No result URL found after bulk operation completion.");
            }
            await this.updateProgress("Step 2: Bulk operation completed, downloading data...", 40);
            const downloadPath = path.resolve(process.cwd(), 'downloads', `orders-${this.shop}.jsonl`);
            await ShopifyUtils.downloadBulkOperationData(result, downloadPath, {}, {
                log: (message: string) => this.log(message)
            });
            await this.updateProgress("Step 3: Reading downloaded data...", 70);

            const orders = new Map<string, Partial<ShopifyOrder> & { id: ShopifyOrder["id"] }>();
            await ShopifyUtils.readJsonlFile(downloadPath, {
                log: (message: string) => this.log(message),
                onChunk: async (chunk) => {
                    const used = process.memoryUsage().heapUsed / 1024 / 1024;
                    this.log(`Memory usage: ${used.toFixed(2)} MB`);
                    if (used > 100) {
                        this.log("Memory usage exceeded 100 MB");
                        const orderArray = Array.from(orders.values()).filter((o) => Object.hasOwnProperty.call(o, "subtotalLineItemsQuantity")) as ShopifyOrder[];
                        await OrdersImportService.batchProcessOrders(this.shopId, orderArray, {
                            log: (message: string) => this.log(message)
                        });
                        for (const o of orderArray) {
                            orders.delete(o.id);
                        }
                        global.gc && global.gc();
                        this.log("Memory cleared after batch processing.");
                    }

                    if ("__parentId" in chunk) {
                        if (typeof chunk.__parentId === "string" && chunk.__parentId?.startsWith("gid://shopify/Order/") && Object.hasOwnProperty.call(chunk, "product")) {
                            // Line item chunk
                            const orderId = chunk.__parentId?.replace("gid://shopify/Order/", "");
                            orders.set(orderId, {
                                ...(orders.get(orderId) || {}),
                                id: orderId,
                                lineItems: [
                                    ...((orders.get(orderId))?.lineItems || []),
                                    {
                                        id: (chunk as unknown as { id: string }).id.replace("gid://shopify/LineItem/", ""),
                                        productId: (chunk as unknown as { product: { id: string } }).product.id.replace("gid://shopify/Product/", ""),
                                        quantity: (chunk as unknown as { quantity: number }).quantity,
                                    }
                                ]
                            });
                        }
                    } else if ("id" in chunk) {
                        // Order chunk
                        const orderId = (chunk as { id: string }).id.replace("gid://shopify/Order/", "");
                        orders.set(orderId, {
                            ...(orders.get(orderId) || {}),
                            id: orderId,
                            subtotalLineItemsQuantity: (chunk as unknown as { subtotalLineItemsQuantity: number }).subtotalLineItemsQuantity,
                        });
                    }
                }
            });
            await OrdersImportService.batchProcessOrders(this.shopId, Array.from(orders.values()) as ShopifyOrder[], {
                log: (message: string) => this.log(message)
            });
            orders.clear();
            global.gc && global.gc();
            await this.updateProgress(`Step 4: Imported orders into database for shop ID ${this.shopId}`, 100);
            await prisma.syncLog.update({
                where: { id: this.syncLogId },
                data: {
                    status: SyncLogStatus.COMPLETED,
                    message: "Importing orders completed successfully.",
                    updated_at: new Date()
                },
            });
            this.log("=============== Finished Importing Orders ===============");
        } catch (error) {
            const errMessage = error instanceof Error ? error.message : JSON.stringify(error);
            await prisma.syncLog.upsert({
                where: { id: this.syncLogId },
                update: {
                    status: SyncLogStatus.FAILED,
                    message: errMessage || "Importing orders failed.",
                    updated_at: new Date()
                },
                create: {
                    status: SyncLogStatus.FAILED,
                    type: SyncLogType.ORDERS_IMPORT,
                    message: errMessage || "Importing orders started.",
                    created_at: new Date(),
                    updated_at: new Date(),
                    shop_id: this.shopId
                }
            });
            this.error("Error importing orders:", error as Error);
            this.log("=============== Importing Orders Failed ===============");
        }
    }

    static async batchProcessOrders(shopId: number, orders: ShopifyOrder[], options: {
        log: (message: string) => void;
    }) {
        const batchSize = 100;
        for (let i = 0; i < orders.length; i += batchSize) {
            const batch = orders.slice(i, i + batchSize);
            options.log(`Processing batch ${i / batchSize + 1} with ${batch.length} orders`);
            const now = new Date();
            const values = batch.map((order) => [
                BigInt(order.id),
                order.subtotalLineItemsQuantity,
                now,
                now,
                shopId
            ]).flat();

            const placeholders = batch
                .map((_, i) => {
                    const base = i * 5;
                    return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5})`;
                })
                .join(", ");

            try {
                await prisma.$transaction(async (tx) => {
                    await tx.$executeRawUnsafe(
                        `
                            INSERT INTO "orders" (
                                "shopify_id", total_units_sold, created_at, updated_at, shop_id
                            ) 
                            VALUES ${placeholders}
                            ON CONFLICT (shopify_id)
                            DO UPDATE SET
                                total_units_sold = EXCLUDED.total_units_sold,
                                shop_id = EXCLUDED.shop_id,
                                created_at = EXCLUDED.created_at,
                                updated_at = EXCLUDED.updated_at;
                        `,
                        ...values
                    );

                    const orderIds = await tx.order.findMany({
                        where: {
                            shop_id: shopId,
                            shopify_id: {
                                in: batch.map(p => BigInt(p.id))
                            }
                        },
                        select: {
                            id: true,
                            shopify_id: true
                        }
                    });
                    const orderIdMap = new Map(
                        orderIds.map((o) => [o.shopify_id.toString(), o.id])
                    );

                    let lineItemsRows = [];
                    for (const p of batch) {
                        const orderId = orderIdMap.get(p.id.toString());
                        if (!orderId || !Array.isArray(p.lineItems)) continue;

                        for (const li of p.lineItems) {
                            lineItemsRows.push([
                                BigInt(li.id),
                                BigInt(li.productId),
                                li.quantity,
                                now,
                                now,
                                orderId,
                            ]);
                        }
                    }

                    if (lineItemsRows.length > 0) {
                        const lineItemPlaceholders = lineItemsRows
                            .map((_, i) => {
                                const base = i * 6;
                                return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6})`;
                            })
                            .join(", ");
                        const lineItemValues = lineItemsRows.flat();

                        await tx.$executeRawUnsafe(
                            `
                                INSERT INTO "line_items" (
                                    "shopify_id", "product_shopify_id", quantity, created_at, updated_at, order_id
                                )
                                VALUES ${lineItemPlaceholders}
                                ON CONFLICT (shopify_id)
                                DO UPDATE SET
                                    product_shopify_id = EXCLUDED.product_shopify_id,
                                    quantity = EXCLUDED.quantity,
                                    created_at = EXCLUDED.created_at,
                                    updated_at = EXCLUDED.updated_at,
                                    order_id = EXCLUDED.order_id;
                            `,
                            ...lineItemValues
                        );

                        orderIdMap.clear();
                        lineItemsRows = [];
                        global.gc && global.gc();
                    }
                })
            } catch (err) {
                throw new Error(`Database error during batch processing: ${err instanceof Error ? err.message : JSON.stringify(err)}`);
            }
        }
    }
}