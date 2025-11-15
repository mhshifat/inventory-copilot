import path from 'path';
import { shopifyGraphqlRequest } from "../lib/shopify-graphql-request.server";
import { BaseService } from "./base-srv.server";
import { ShopifyUtils } from "./shopify-utils.server";
import prisma from '../lib/db.server';
import { SyncLogStatus, SyncLogType } from '@prisma/client';
import { OrdersImportService } from './orders-import.server';
import { addLowStockAlertJob } from './workers/low-stock-alert-worker.server';


export interface ImportProductsPayload {
}

export interface ShopifyProductVariant {
    id: string;
    title: string;
    sku: string | null;
}
export interface ShopifyProduct {
    id: string;
    title: string;
    handle: string;
    image: string | null;
    vendor: string | null;
    totalInventory: number | null;
    variants: ShopifyProductVariant[];
    collections?: string[];
}

export interface BulkOperationRunForProductsQueryResponse {
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

export interface ProductQueryResponse {
    product: {
        id: string;
        title: string;
        handle: string;
        vendor: string;
        totalInventory: number;
        media: {
            edges: Array<{
                node: {
                    preview: {
                        image: {
                            url: string;
                        };
                    };
                };
            }>;
        },
        collections: {
            edges: Array<{
                node: {
                    id: string;
                    title: string;
                    __typename: string;
                };
            }>;
        };
        variants: {
            edges: Array<{
                node: {
                    id: string;
                    title: string;
                    sku: string | null;
                };
            }>;
        };
    };
}

export class ProductsImportService extends BaseService {
    constructor(
        private shopId: number,
        private syncLogId: number,
        shop: string,
        accessToken: string,
        webhookId?: string
    ) {
        super(shop, accessToken, webhookId ? webhookId : "PRODUCTS_IMPORT");
    }

    private PRODUCT_IMPORT_QUERY_FIELDS = `
        id
        title
        handle
        totalInventory
        media {
            edges {
                node {
                    preview {
                        image {
                            url
                        }
                    }
                }
            }
        }
        vendor
        collections {
            edges {
                node {
                    id
                    title
                    __typename
                }
            }
        }
        variants {
            edges {
                node {
                    id
                    title
                    sku
                }
            }
        }
    `;
    private PRODUCT_QUERY_FIELDS = `
        id
        title
        handle
        totalInventory
        media(first: 250) {
            edges {
                node {
                    preview {
                        image {
                            url
                        }
                    }
                }
            }
        }
        vendor
        collections(first: 250) {
            edges {
                node {
                    id
                    title
                    __typename
                }
            }
        }
        variants(first: 250) {
            edges {
                node {
                    id
                    title
                    sku
                }
            }
        }
    `;

    async importProducts(_: ImportProductsPayload) {
        try {
            this.log("=============== Starting Importing Products ===============");
            await prisma.syncLog.upsert({
                where: { id: this.syncLogId },
                update: {
                    status: SyncLogStatus.RUNNING,
                    message: "Importing products started.",
                    updated_at: new Date()
                },
                create: {
                    status: SyncLogStatus.RUNNING,
                    type: SyncLogType.PRODUCTS_IMPORT,
                    message: "Importing products started.",
                    created_at: new Date(),
                    updated_at: new Date(),
                    shop_id: this.shopId
                }
            });

            const bulkOperationQueryForProducts = await shopifyGraphqlRequest<BulkOperationRunForProductsQueryResponse>(
                this.shop,
                this.accessToken,
                `
                    mutation {
                        bulkOperationRunQuery(
                            query: """
                                {
                                    products {
                                        edges {
                                            node {
                                                ${this.PRODUCT_IMPORT_QUERY_FIELDS}
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
            if (bulkOperationQueryForProducts?.userErrors?.length) {
                throw new Error(
                    `Shopify User Errors: ${bulkOperationQueryForProducts.userErrors.map(error => error.message).join(", ")}`
                );
            }
            await this.updateProgress("Step 1: Bulk operation for products started, waiting for completion...", 10);

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
            const downloadPath = path.resolve(process.cwd(), 'downloads', `products-${this.shop}.jsonl`);
            await ShopifyUtils.downloadBulkOperationData(result, downloadPath, {}, {
                log: (message: string) => this.log(message)
            });
            await this.updateProgress("Step 3: Reading downloaded data...", 70);

            const products = new Map<string, Partial<ShopifyProduct> & { id: ShopifyProduct["id"] }>();
            await ShopifyUtils.readJsonlFile(downloadPath, {
                log: (message: string) => this.log(message),
                onChunk: async (chunk) => {
                    const used = process.memoryUsage().heapUsed / 1024 / 1024;
                    this.log(`Memory usage: ${used.toFixed(2)} MB`);
                    if (used > 100) {
                        this.log("Memory usage exceeded 100 MB");
                        const productArray = Array.from(products.values()).filter((p) => Object.hasOwnProperty.call(p, "handle")) as ShopifyProduct[];
                        await ProductsImportService.batchProcessProducts(this.shopId, productArray, {
                            log: (message: string) => this.log(message)
                        });
                        for (const p of productArray) {
                            products.delete(p.id);
                        }
                        global.gc && global.gc();
                        this.log("Memory cleared after batch processing.");
                    }

                    if ("__parentId" in chunk) {
                        if (typeof chunk.__parentId === "string" && chunk.__parentId?.startsWith("gid://shopify/Product/") && Object.hasOwnProperty.call(chunk, "preview")) {
                            // Image chunk
                            const productId = chunk.__parentId?.replace("gid://shopify/Product/", "");
                            products.set(productId, {
                                ...(products.get(productId) || {}),
                                id: productId,
                                image: (chunk as { preview?: { image?: { url?: string } } })?.preview?.image?.url || null
                            });
                        } else if (typeof chunk.__parentId === "string" && chunk.__parentId?.startsWith("gid://shopify/Product/") && Object.hasOwnProperty.call(chunk, "sku")) {
                            // Variant chunk
                            const productId = chunk.__parentId?.replace("gid://shopify/Product/", "");
                            products.set(productId, {
                                ...(products.get(productId) || {}),
                                id: productId,
                                variants: [
                                    ...((products.get(productId))?.variants || []),
                                    {
                                        id: (chunk as unknown as { id: string }).id.replace("gid://shopify/ProductVariant/", ""),
                                        title: (chunk as unknown as { title: string }).title,
                                        sku: (chunk as { sku?: string })?.sku || null
                                    }
                                ]
                            });
                        } else if (typeof chunk.__parentId === "string" && chunk.__parentId?.startsWith("gid://shopify/Product/") && Object.hasOwnProperty.call(chunk, "__typename") && (chunk as unknown as { __typename: string }).__typename === "Collection") {
                            // Collection chunk
                            const productId = chunk.__parentId?.replace("gid://shopify/Product/", "");
                            products.set(productId, {
                                ...(products.get(productId) || {}),
                                id: productId,
                                collections: [
                                    ...((products.get(productId))?.collections || []),
                                    (chunk as unknown as { title: string }).title
                                ]
                            });
                        }
                    } else if ("id" in chunk) {
                        // Product chunk
                        const productId = (chunk as { id: string }).id.replace("gid://shopify/Product/", "");
                        products.set(productId, {
                            ...(products.get(productId) || {}),
                            id: productId,
                            title: (chunk as unknown as { title: string }).title,
                            handle: (chunk as unknown as { handle: string }).handle,
                            vendor: (chunk as { vendor?: string })?.vendor || null,
                            totalInventory: (chunk as { totalInventory?: number })?.totalInventory || null,
                        });
                    }
                }
            });
            await ProductsImportService.batchProcessProducts(this.shopId, Array.from(products.values()) as ShopifyProduct[], {
                log: (message: string) => this.log(message)
            });
            products.clear();
            global.gc && global.gc();
            await this.updateProgress(`Step 4: Imported products into database for shop ID ${this.shopId}`, 80);
            const orderService = new OrdersImportService(
                this.shopId,
                this.syncLogId,
                this.shop,
                this.accessToken
            );
            await orderService.importOrders({});
            await this.updateProgress(`Step 5: Imported orders into database for shop ID ${this.shopId}`, 100);
            await prisma.syncLog.update({
                where: { id: this.syncLogId },
                data: {
                    status: SyncLogStatus.COMPLETED,
                    message: "Importing products completed successfully.",
                    updated_at: new Date()
                },
            });
            this.log("=============== Finished Importing Products ===============");
        } catch (error) {
            const errMessage = error instanceof Error ? error.message : JSON.stringify(error);
            await prisma.syncLog.upsert({
                where: { id: this.syncLogId },
                update: {
                    status: SyncLogStatus.FAILED,
                    message: errMessage || "Importing products failed.",
                    updated_at: new Date()
                },
                create: {
                    status: SyncLogStatus.FAILED,
                    type: SyncLogType.PRODUCTS_IMPORT,
                    message: errMessage || "Importing products started.",
                    created_at: new Date(),
                    updated_at: new Date(),
                    shop_id: this.shopId
                }
            });
            this.error("Error importing products:", error as Error);
            this.log("=============== Importing Products Failed ===============");
        }
    }

    static async batchProcessProducts(shopId: number, products: ShopifyProduct[], options: {
        log: (message: string) => void;
    }) {
        const batchSize = 100;

        const settings = await prisma.setting.findUnique({
            where: { shop_id: shopId },
            include: {
                shop: {
                    select: {
                        domain: true
                    }
                }
            }
        });
        const lowStockThreshold = settings?.low_stock_threshold ? parseInt(settings.low_stock_threshold) : 0;
        const inAppAlertsEnabled = settings?.in_app_alerts_enabled || false;
        const emailAlertsEnabled = settings?.email_alerts_enabled || false;
        
        for (let i = 0; i < products.length; i += batchSize) {
            const batch = products.slice(i, i + batchSize);
            options.log(`Processing batch ${i / batchSize + 1} with ${batch.length} products`);
            const now = new Date();
            
            const values = batch.map((product) => [
                BigInt(product.id),
                product.title,
                product.handle,
                product.vendor,
                product.collections,
                product.image,
                product.totalInventory,
                shopId,
                now,
                now
            ]).flat();

            const placeholders = batch
                .map((_, i) => {
                    const base = i * 10;
                    return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}, $${base + 9}, $${base + 10})`;
                })
                .join(", ");

            try {
                await prisma.$transaction(async (tx) => {
                    await tx.$executeRawUnsafe(
                        `
                            INSERT INTO "products" (
                                "shopify_id", title, handle, vendor, collections, image, total_inventory, shop_id, created_at, updated_at
                            ) 
                            VALUES ${placeholders}
                            ON CONFLICT (shopify_id)
                            DO UPDATE SET
                                title = EXCLUDED.title,
                                vendor = EXCLUDED.vendor,
                                image = EXCLUDED.image,
                                shop_id = EXCLUDED.shop_id,
                                created_at = EXCLUDED.created_at,
                                updated_at = EXCLUDED.updated_at,
                                total_inventory = EXCLUDED.total_inventory;
                        `,
                        ...values
                    );
                    const productIds = await tx.product.findMany({
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
                    const productIdMap = new Map(
                        productIds.map((p) => [p.shopify_id.toString(), p.id])
                    );

                    let variantRows = [];
                    for (const p of batch) {
                        const productId = productIdMap.get(p.id.toString());
                        if (!productId || !Array.isArray(p.variants)) continue;

                        for (const v of p.variants) {
                            variantRows.push([
                                BigInt(v.id),
                                v.title,
                                v.sku ?? null,
                                now,
                                now,
                                productId,
                                shopId,
                            ]);
                        }
                    }

                    if (variantRows.length > 0) {
                        const variantPlaceholders = variantRows
                            .map((_, i) => {
                                const base = i * 7;
                                return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7})`;
                            })
                            .join(", ");
                        const variantValues = variantRows.flat();

                        await tx.$executeRawUnsafe(
                            `
                                INSERT INTO "variants" (
                                    "shopify_id", title, sku, created_at, updated_at, product_id, shop_id
                                )
                                VALUES ${variantPlaceholders}
                                ON CONFLICT (shopify_id)
                                DO UPDATE SET
                                    title = EXCLUDED.title,
                                    sku = EXCLUDED.sku,
                                    created_at = EXCLUDED.created_at,
                                    updated_at = EXCLUDED.updated_at,
                                    product_id = EXCLUDED.product_id,
                                    shop_id = EXCLUDED.shop_id;
                            `,
                            ...variantValues
                        );

                        productIdMap.clear();
                        variantRows = [];
                        global.gc && global.gc();
                    }
                });

                for (const product of batch) {
                    const shouldSendAlert = product.totalInventory !== null && (product.totalInventory <= lowStockThreshold);
                    
                    if ((product.totalInventory || 0) > lowStockThreshold) {
                        const existingAlert = await prisma.alert.findFirst({
                            where: {
                                shopify_product_id: BigInt(product.id),
                                alert_sent_at: {
                                    not: null
                                },
                                severity: {
                                    in: ["CRITICAL", "WARNING"]
                                }
                            }
                        });

                        if (existingAlert) {
                            await prisma.alert.deleteMany({
                                where: {
                                    shopify_product_id: existingAlert.shopify_product_id,
                                }
                            });
                            await prisma.alert.create({
                                data: {
                                    shop_id: shopId,
                                    shopify_product_id: BigInt(product.id),
                                    message: `Stock replenished for product "${product.title}". Current inventory: ${product.totalInventory}. Threshold: ${lowStockThreshold}.`,
                                    created_at: now,
                                    updated_at: now,
                                    productImage: product.image || "",
                                    productName: product.title,
                                    severity: "RESTOCKED",
                                }
                            })
                        }
                    }

                    if (shouldSendAlert && inAppAlertsEnabled) {
                        await prisma.alert.create({
                            data: {
                                shop_id: shopId,
                                shopify_product_id: BigInt(product.id),
                                message: `Low stock alert for product "${product.title}". Current inventory: ${product.totalInventory}. Threshold: ${lowStockThreshold}.`,
                                created_at: now,
                                updated_at: now,
                                productImage: product.image || "",
                                productName: product.title,
                                severity: ((product?.totalInventory || 0) <= (lowStockThreshold / 2)) ? "CRITICAL" : "WARNING",
                                alert_sent_at: now
                            }
                        });
                    }

                    if (shouldSendAlert && emailAlertsEnabled) {
                        await addLowStockAlertJob({
                            shopId: shopId,
                            shop: settings?.shop.domain || "",
                            syncLogId: 0,
                            currentStock: product.totalInventory || 0,
                            threshold: lowStockThreshold,
                            to: settings?.alert_email || "",
                        });
                    }
                }
            } catch (err) {
                throw new Error(`Database error during batch processing: ${err instanceof Error ? err.message : JSON.stringify(err)}`);
            }
        }
    }

    async handleProductUpsertWebhook(productId: string, type: "CREATED" | "UPDATED") {
        try {
           this.log(`=============== Starting Product(${type}) Webhook ===============`);
            await prisma.syncLog.upsert({
                where: { id: this.syncLogId },
                update: {
                    status: SyncLogStatus.RUNNING,
                    message: `Product(${type}) webhook started with product(${productId}).`,
                    updated_at: new Date()
                },
                create: {
                    status: SyncLogStatus.RUNNING,
                    type: type === "CREATED" ? SyncLogType.PRODUCTS_CREATE : SyncLogType.PRODUCTS_UPDATE,
                    message: `Product(${type}) webhook started with product(${productId}).`,
                    created_at: new Date(),
                    updated_at: new Date(),
                    shop_id: this.shopId
                }
            });
            const productQuery = await shopifyGraphqlRequest<ProductQueryResponse>(
                this.shop,
                this.accessToken,
                `
                    query {
                        product(id: "gid://shopify/Product/${productId}") {
                            ${this.PRODUCT_QUERY_FIELDS}
                        }
                    }
                `
            );
            if (productQuery?.userErrors?.length) {
                throw new Error(
                    `Shopify User Errors: ${productQuery.userErrors.map(error => error.message).join(", ")}`
                );
            }
            if (!productQuery.data?.product) {
                throw new Error(`Product with ID ${productId} not found.`);
            }
            const products = new Map<string, Partial<ShopifyProduct> & { id: ShopifyProduct["id"] }>();
            const productData = productQuery.data.product;
            products.set(productId, {
                id: productId,
                title: productData.title,
                handle: productData.handle,
                vendor: productData.vendor || null,
                totalInventory: productData.totalInventory || null,
                image: productData.media.edges[0]?.node.preview.image.url || null,
                variants: productData.variants.edges.map(edge => ({
                    id: edge.node.id.replace("gid://shopify/ProductVariant/", ""),
                    title: edge.node.title,
                    sku: edge.node.sku || null
                })),
                collections: productData.collections.edges.map(edge => edge.node.title)
            });
            await ProductsImportService.batchProcessProducts(this.shopId, Array.from(products.values()) as ShopifyProduct[], {
                log: (message: string) => this.log(message)
            });
            products.clear();
            global.gc && global.gc();
            await prisma.syncLog.update({
                where: { id: this.syncLogId },
                data: {
                    status: SyncLogStatus.COMPLETED,
                    message: `Product(${type}) webhook completed successfully with product(${productId}).`,
                    updated_at: new Date()
                },
            });
            this.log(`=============== Finished Product(${type}) Webhook ===============`);
        } catch (error) {
            const errMessage = error instanceof Error ? error.message : JSON.stringify(error);
            await prisma.syncLog.upsert({
                where: { id: this.syncLogId },
                update: {
                    status: SyncLogStatus.FAILED,
                    message: errMessage || `Product(${type}) webhook failed with product(${productId}).`,
                    updated_at: new Date()
                },
                create: {
                    status: SyncLogStatus.FAILED,
                    type: type === "CREATED" ? SyncLogType.PRODUCTS_CREATE : SyncLogType.PRODUCTS_UPDATE,
                    message: errMessage || `Product(${type}) webhook failed with product(${productId}).`,
                    created_at: new Date(),
                    updated_at: new Date(),
                    shop_id: this.shopId
                }
            });
            this.error(`Error ${type} products:`, error as Error);
            this.log(`=============== Failed Product(${type}) Webhook ===============`);
        }
    }

    async handleProductDeleteWebhook(productId: string, type: "DELETED") {
        try {
           this.log(`=============== Starting Product(${type}) Webhook ===============`);
            await prisma.syncLog.upsert({
                where: { id: this.syncLogId },
                update: {
                    status: SyncLogStatus.RUNNING,
                    message: `Product(${type}) webhook started with product(${productId}).`,
                    updated_at: new Date()
                },
                create: {
                    status: SyncLogStatus.RUNNING,
                    type: SyncLogType.PRODUCTS_DELETE,
                    message: `Product(${type}) webhook started with product(${productId}).`,
                    created_at: new Date(),
                    updated_at: new Date(),
                    shop_id: this.shopId
                }
            });
            
            await prisma.product.delete({
                where: {
                    shop_id: this.shopId,
                    shopify_id: BigInt(productId)
                }
            });

            await prisma.syncLog.update({
                where: { id: this.syncLogId },
                data: {
                    status: SyncLogStatus.COMPLETED,
                    message: `Product(${type}) webhook completed successfully with product(${productId}).`,
                    updated_at: new Date()
                },
            });
            this.log(`=============== Finished Product(${type}) Webhook ===============`);
        } catch (error) {
            const errMessage = error instanceof Error ? error.message : JSON.stringify(error);
            await prisma.syncLog.upsert({
                where: { id: this.syncLogId },
                update: {
                    status: SyncLogStatus.FAILED,
                    message: errMessage || `Product(${type}) webhook failed with product(${productId}).`,
                    updated_at: new Date()
                },
                create: {
                    status: SyncLogStatus.FAILED,
                    type: SyncLogType.PRODUCTS_DELETE,
                    message: errMessage || `Product(${type}) webhook failed with product(${productId}).`,
                    created_at: new Date(),
                    updated_at: new Date(),
                    shop_id: this.shopId
                }
            });
            this.error("Error deleting products:", error as Error);
            this.log(`=============== Failed Product(${type}) Webhook ===============`);
        }
    }
}