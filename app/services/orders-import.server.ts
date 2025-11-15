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
    nonFulfillableQuantity: number;
    productId: string;
}

export interface ShopifyOrder {
    id: string;
    createdAt: string;
    currentSubtotalLineItemsQuantity: number;
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

interface OrderQueryResponse {
    order: {
        id: string;
        createdAt: string;
        currentSubtotalLineItemsQuantity: number;
        fullyPaid: boolean;
        displayFulfillmentStatus: string;
        lineItems: {
            edges: Array<{
                node: {
                    id: string;
                    quantity: number;
                    nonFulfillableQuantity: number;
                    product: {
                        id: string;
                        legacyResourceId: string;
                    }
                }
            }>
        };
    }
}

export class OrdersImportService extends BaseService {
    constructor(
        private shopId: number,
        private syncLogId: number,
        shop: string,
        accessToken: string,
        webhookId?: string
    ) {
        super(shop, accessToken, webhookId ? webhookId : "ORDERS_IMPORT");
    }

    private readonly ORDER_IMPORT_QUERY_FIELDS = `
        id
        createdAt
        currentSubtotalLineItemsQuantity
        lineItems {
            edges {
                node {
                    id
                    quantity
                    nonFulfillableQuantity
                    product {
                        id
                        legacyResourceId
                    }
                }
            }
        }
    `;

    private readonly ORDER_QUERY_FIELDS = `
        id
        createdAt
        currentSubtotalLineItemsQuantity
        fullyPaid
        displayFulfillmentStatus
        lineItems(first: 250) {
            edges {
                node {
                    id
                    quantity
                    nonFulfillableQuantity
                    product {
                        id
                        legacyResourceId
                    }
                }
            }
        }
    `;

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
                                                ${this.ORDER_IMPORT_QUERY_FIELDS}
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
                        const orderArray = Array.from(orders.values()).filter((o) => Object.hasOwnProperty.call(o, "currentSubtotalLineItemsQuantity")) as ShopifyOrder[];
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
                                        nonFulfillableQuantity: (chunk as unknown as { nonFulfillableQuantity: number }).nonFulfillableQuantity,
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
                            createdAt: (chunk as unknown as { createdAt: string }).createdAt,
                            currentSubtotalLineItemsQuantity: (chunk as unknown as { currentSubtotalLineItemsQuantity: number }).currentSubtotalLineItemsQuantity,
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
                order.currentSubtotalLineItemsQuantity,
                new Date(order.createdAt),
                now,
                now,
                shopId
            ]).flat();

            const placeholders = batch
                .map((_, i) => {
                    const base = i * 6;
                    return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6})`;
                })
                .join(", ");

            try {
                await prisma.$transaction(async (tx) => {
                    await tx.$executeRawUnsafe(
                        `
                            INSERT INTO "orders" (
                                "shopify_id", total_units_sold, shopify_created_at, created_at, updated_at, shop_id
                            ) 
                            VALUES ${placeholders}
                            ON CONFLICT (shopify_id)
                            DO UPDATE SET
                                total_units_sold = EXCLUDED.total_units_sold,
                                shopify_created_at = EXCLUDED.shopify_created_at,
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
                    for (const order of batch) {
                        const orderId = orderIdMap.get(order.id.toString());
                        if (!orderId || !Array.isArray(order.lineItems)) continue;

                        for (const li of order.lineItems) {
                            if (li.nonFulfillableQuantity > 0) {
                                continue;
                            }
                            lineItemsRows.push([
                                BigInt(li.id),
                                BigInt(li.productId),
                                li.quantity,
                                new Date(order.createdAt),
                                now,
                                now,
                                orderId,
                            ]);
                        }
                    }

                    if (lineItemsRows.length > 0) {
                        const lineItemPlaceholders = lineItemsRows
                            .map((_, i) => {
                                const base = i * 7;
                                return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7})`;
                            })
                            .join(", ");
                        const lineItemValues = lineItemsRows.flat();

                        await tx.$executeRawUnsafe(
                            `
                                INSERT INTO "line_items" (
                                    "shopify_id", "product_shopify_id", quantity, shopify_created_at, created_at, updated_at, order_id
                                )
                                VALUES ${lineItemPlaceholders}
                                ON CONFLICT (shopify_id)
                                DO UPDATE SET
                                    product_shopify_id = EXCLUDED.product_shopify_id,
                                    quantity = EXCLUDED.quantity,
                                    shopify_created_at = EXCLUDED.shopify_created_at,
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

    async handleOrderUpsertWebhook(orderId: string, type: SyncLogType) {
        try {
           this.log(`=============== Starting Order(${type}) Webhook ===============`);
            await prisma.syncLog.upsert({
                where: { id: this.syncLogId },
                update: {
                    status: SyncLogStatus.RUNNING,
                    message: `Order(${type}) webhook started with order(${orderId}).`,
                    updated_at: new Date()
                },
                create: {
                    status: SyncLogStatus.RUNNING,
                    type: type,
                    message: `Order(${type}) webhook started with order(${orderId}).`,
                    created_at: new Date(),
                    updated_at: new Date(),
                    shop_id: this.shopId
                }
            });
            const productQuery = await shopifyGraphqlRequest<OrderQueryResponse>(
                this.shop,
                this.accessToken,
                `
                    query {
                        order(id: "gid://shopify/Order/${orderId}") {
                            ${this.ORDER_QUERY_FIELDS}
                        }
                    }
                `
            );
            if (productQuery?.userErrors?.length) {
                throw new Error(
                    `Shopify User Errors: ${productQuery.userErrors.map(error => error.message).join(", ")}`
                );
            }

            if (!productQuery.data?.order) {
                throw new Error(`Order with ID ${orderId} not found.`);
            }

            if (!productQuery?.data?.order?.fullyPaid || productQuery?.data?.order?.displayFulfillmentStatus !== "FULFILLED") {
                const orderExists = await prisma.order.findUnique({
                    where: {
                        shop_id: this.shopId,
                        shopify_id: BigInt(orderId)
                    }
                });

                if (orderExists) {
                    await prisma.order.delete({
                        where: {
                            shop_id: this.shopId,
                            shopify_id: BigInt(orderId)
                        }
                    });
                }
                await prisma.syncLog.update({
                    where: { id: this.syncLogId },
                    data: {
                        status: SyncLogStatus.COMPLETED,
                        message: `Order(${type}) webhook completed successfully with order(${orderId}). Order is not fully paid and fulfilled, so not continuing.`,
                        updated_at: new Date()
                    },
                });
                this.log(`=============== Finished Order(${type}) Webhook ===============`);
                return;
            }

            const orderExists = await prisma.order.findUnique({
                where: {
                    shop_id: this.shopId,
                    shopify_id: BigInt(orderId)
                }
            });

            if (orderExists) {
                await prisma.order.delete({
                    where: {
                        shop_id: this.shopId,
                        shopify_id: BigInt(orderId)
                    }
                });
            }

            const orders = new Map<string, Partial<ShopifyOrder> & { id: ShopifyOrder["id"] }>();
            const orderData = productQuery.data.order;
            orders.set(orderId, {
                id: orderId,
                createdAt: orderData.createdAt,
                currentSubtotalLineItemsQuantity: orderData.currentSubtotalLineItemsQuantity,
                lineItems: orderData.lineItems.edges.map(edge => ({
                    id: edge.node.id.replace("gid://shopify/LineItem/", ""),
                    productId: edge.node.product.legacyResourceId,
                    quantity: edge.node.quantity,
                    nonFulfillableQuantity: edge.node.nonFulfillableQuantity
                }))
            });
            await OrdersImportService.batchProcessOrders(this.shopId, Array.from(orders.values()) as ShopifyOrder[], {
                log: (message: string) => this.log(message)
            });
            orders.clear();
            global.gc && global.gc();
            await prisma.syncLog.update({
                where: { id: this.syncLogId },
                data: {
                    status: SyncLogStatus.COMPLETED,
                    message: `Order(${type}) webhook completed successfully with order(${orderId}).`,
                    updated_at: new Date()
                },
            });
            this.log(`=============== Finished Order(${type}) Webhook ===============`);
        } catch (error) {
            const errMessage = error instanceof Error ? error.message : JSON.stringify(error);
            await prisma.syncLog.upsert({
                where: { id: this.syncLogId },
                update: {
                    status: SyncLogStatus.FAILED,
                    message: errMessage || `Order(${type}) webhook failed with order(${orderId}).`,
                    updated_at: new Date()
                },
                create: {
                    status: SyncLogStatus.FAILED,
                    type: type,
                    message: errMessage || `Order(${type}) webhook failed with order(${orderId}).`,
                    created_at: new Date(),
                    updated_at: new Date(),
                    shop_id: this.shopId
                }
            });
            this.error(`Error ${type} orders:`, error as Error);
            this.log(`=============== Failed Order(${type}) Webhook ===============`);
        }
    }

    async handleOrderDeleteWebhook(orderId: string, type: SyncLogType) {
        try {
           this.log(`=============== Starting Order(${type}) Webhook ===============`);
            await prisma.syncLog.upsert({
                where: { id: this.syncLogId },
                update: {
                    status: SyncLogStatus.RUNNING,
                    message: `Order(${type}) webhook started with order(${orderId}).`,
                    updated_at: new Date()
                },
                create: {
                    status: SyncLogStatus.RUNNING,
                    type: type,
                    message: `Order(${type}) webhook started with order(${orderId}).`,
                    created_at: new Date(),
                    updated_at: new Date(),
                    shop_id: this.shopId
                }
            });
            
            await prisma.order.delete({
                where: {
                    shop_id: this.shopId,
                    shopify_id: BigInt(orderId)
                }
            });

            await prisma.syncLog.update({
                where: { id: this.syncLogId },
                data: {
                    status: SyncLogStatus.COMPLETED,
                    message: `Order(${type}) webhook completed successfully with order(${orderId}).`,
                    updated_at: new Date()
                },
            });
            this.log(`=============== Finished Order(${type}) Webhook ===============`);
        } catch (error) {
            const errMessage = error instanceof Error ? error.message : JSON.stringify(error);
            await prisma.syncLog.upsert({
                where: { id: this.syncLogId },
                update: {
                    status: SyncLogStatus.FAILED,
                    message: errMessage || `Order(${type}) webhook failed with order(${orderId}).`,
                    updated_at: new Date()
                },
                create: {
                    status: SyncLogStatus.FAILED,
                    type: type,
                    message: errMessage || `Order(${type}) webhook failed with order(${orderId}).`,
                    created_at: new Date(),
                    updated_at: new Date(),
                    shop_id: this.shopId
                }
            });
            this.error("Error deleting orders:", error as Error);
            this.log(`=============== Failed Order(${type}) Webhook ===============`);
        }
    }
}