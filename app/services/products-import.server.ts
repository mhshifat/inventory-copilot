import path from 'path';
import { fileURLToPath } from "url";
import { shopifyGraphqlRequest } from "@/lib/shopify-graphql-request.server";
import { BaseService } from "./base-srv.server";
import { ShopifyUtils } from "./shopify-utils.server";
import prisma from '@/lib/db.server';
import { SyncLogStatus, SyncLogType } from '@prisma/client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    variants: ShopifyProductVariant[];
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



export class ProductsImportService extends BaseService {
    constructor(
        private shopId: number,
        private syncLogId: number,
        shop: string,
        accessToken: string
    ) {
        super(shop, accessToken, "PRODUCTS_IMPORT");
    }

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
                                                id
                                                title
                                                handle
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
                                                variants {
                                                    edges {
                                                        node {
                                                            id
                                                            title
                                                            sku
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

            const downloadPath = path.resolve(__dirname, '../../public', `products-${this.shop}.jsonl`);
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
                        }
                    } else if ("id" in chunk) {
                        // Product chunk
                        const productId = (chunk as { id: string }).id.replace("gid://shopify/Product/", "");
                        products.set(productId, {
                            ...(products.get(productId) || {}),
                            id: productId,
                            title: (chunk as unknown as { title: string }).title,
                            handle: (chunk as unknown as { handle: string }).handle,
                            vendor: (chunk as { vendor?: string })?.vendor || null
                        });
                    }
                }
            });
            await ProductsImportService.batchProcessProducts(this.shopId, Array.from(products.values()) as ShopifyProduct[], {
                log: (message: string) => this.log(message)
            });
            products.clear();
            global.gc && global.gc();
            await this.updateProgress(`Step 4: Imported products into database for shop ID ${this.shopId}`, 100);
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
        for (let i = 0; i < products.length; i += batchSize) {
            const batch = products.slice(i, i + batchSize);
            options.log(`Processing batch ${i / batchSize + 1} with ${batch.length} products`);
            const now = new Date();
            const values = batch.map((product) => [
                BigInt(product.id),
                product.title,
                product.handle,
                product.vendor,
                product.image,
                shopId,
                now,
                now
            ]).flat();

            const placeholders = batch
                .map((_, i) => {
                    const base = i * 8;
                    return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8})`;
                })
                .join(", ");

            try {
                await prisma.$transaction(async (tx) => {
                    await tx.$executeRawUnsafe(
                        `
                            INSERT INTO "products" (
                                "shopify_id", title, handle, vendor, image, shop_id, created_at, updated_at
                            ) 
                            VALUES ${placeholders}
                            ON CONFLICT (shopify_id)
                            DO UPDATE SET
                                title = EXCLUDED.title,
                                vendor = EXCLUDED.vendor,
                                image = EXCLUDED.image,
                                shop_id = EXCLUDED.shop_id,
                                created_at = EXCLUDED.created_at,
                                updated_at = EXCLUDED.updated_at;
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
                })
            } catch (err) {
                throw new Error(`Database error during batch processing: ${err instanceof Error ? err.message : JSON.stringify(err)}`);
            }
        }
    }
}