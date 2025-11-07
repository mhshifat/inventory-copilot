import fs from 'fs';
import fetch from 'node-fetch';
import { pipeline } from 'stream';
import { promisify } from 'util';
import { setTimeout as delay } from 'timers/promises';

import { shopifyGraphqlRequest } from "../lib/shopify-graphql-request.server";
import { sleep } from "../lib/utils";

const streamPipeline = promisify(pipeline);

export interface BulkOperationCompletionPayload {
    shop: string;
    accessToken: string;
}

export interface CurrentBulkOperationResponse {
    currentBulkOperation: {
        id: string;
        status: "CANCELED" | "COMPLETED" | "FAILED" | "EXPIRED" | "RUNNING" | "CANCELING";
        errorCode: string | null;
        createdAt: string;
        completedAt: string | null;
        objectCount: number;
        fileSize: number;
        url: string;
        partialDataUrl: string | null;
    };
}

export class ShopifyUtils {
    static async waitForBulkOperationCompletion(payload: BulkOperationCompletionPayload, options: {
        log: (message: string) => void;
    }): Promise<string | null> {
        try {
            while (true) {
                const currentBulkOperationResponse = await shopifyGraphqlRequest<CurrentBulkOperationResponse>(
                    payload.shop,
                    payload.accessToken,
                    `
                        query {
                            currentBulkOperation {
                                id
                                status
                                errorCode
                                createdAt
                                completedAt
                                objectCount
                                fileSize
                                url
                                partialDataUrl
                            }
                        }
                    `
                );
                if (currentBulkOperationResponse?.userErrors?.length) {
                    throw new Error(
                        `Shopify User Errors: ${currentBulkOperationResponse.userErrors.map(error => error.message).join(", ")}`
                    );
                }
                const currentBulkOperationStatus = currentBulkOperationResponse?.data?.currentBulkOperation?.status;
                if (currentBulkOperationStatus && ["CANCELED", "FAILED", "EXPIRED", "CANCELING"].includes(currentBulkOperationStatus)) {
                    throw new Error(`Bulk operation failed with status: ${currentBulkOperationStatus}, error code: ${currentBulkOperationResponse?.data?.currentBulkOperation?.errorCode}`);
                } else if (currentBulkOperationStatus === "COMPLETED") {
                    return currentBulkOperationResponse?.data?.currentBulkOperation?.url || currentBulkOperationResponse?.data?.currentBulkOperation?.partialDataUrl || null;
                } else if (currentBulkOperationStatus === "RUNNING") {
                    await sleep(10000);
                    options.log(`Bulk operation is still running, waiting for 10s and trying again...`);
                    await this.waitForBulkOperationCompletion(payload, options);
                }
            }
        } catch (err) {
            options.log(`Error occurred while waiting for bulk operation completion: ${err instanceof Error ? err.message : JSON.stringify(err)}`);
            throw err;
        }
    }

    static async downloadBulkOperationData(url: string, outputPath: string, { timeout = 30000, maxRetries = 3 } = {}, options: {
        log: (message: string) => void;
    }): Promise<void> {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);

            try {
                console.log(`Attempt ${attempt}: downloading ${url}`);

                const response = await fetch(url, { signal: controller.signal });

                if (!response.ok) {
                    throw new Error(`Unexpected response ${response.status} ${response.statusText}`);
                }

                const fileStream = fs.createWriteStream(outputPath, { flags: 'w' });

                if (response.body) await streamPipeline(response.body, fileStream);

                options.log(`✅ File saved to ${outputPath}`);
                return;
            } catch (err) {
                const errorMessage = (err instanceof Error) ? err.message : "Something went wrong, while downloading file";
                if (attempt < maxRetries) {
                    options.log(`⚠️ Attempt to download file(${url}) ${attempt} failed: ${errorMessage}. Retrying...`);
                    await delay(1000 * attempt); // Exponential-ish backoff
                } else {
                    options.log(`❌ Failed to download file(${url}) after ${attempt} attempts: ${errorMessage}`);
                    throw err;
                }
            } finally {
                clearTimeout(timeoutId);
            }
        }
    }

    static async readJsonlFile(filePath: string, options: {
        log: (message: string) => void;
        onChunk?: (chunk: object) => void;
    }): Promise<void> {
        const readStream = fs.createReadStream(filePath, { encoding: 'utf-8' });

        readStream.on('error', (err) => {
            throw new Error(`Stream error reading file: ${err.message}`);
        });

        try {
            await streamPipeline(
                readStream,
                async function* (source) {
                    for await (const chunk of source) {
                        try {
                            const lines = chunk.toString().split('\n');
                            for (const line of lines) {
                                if (line.trim()) {
                                    let jsonData: object | null = null;
                                    try {
                                        jsonData = JSON.parse(line);
                                    } catch (parseErr) {
                                        options.log(`⚠️ Failed to parse JSON line: ${line}`);
                                    }
                                    if (!jsonData) {
                                        options.log(`⚠️ No valid JSON data found in line, skipping...`);
                                        continue;
                                    }
                                    try {
                                        await options?.onChunk?.(jsonData);
                                    } catch (err) {
                                        throw new Error(`Error in onChunk callback: ${err instanceof Error ? err.message : String(err)}`);
                                    }
                                }
                            }
                            yield chunk;
                        } catch (processErr) {
                            options.log('⚠️ Error processing chunk: ' + (processErr instanceof Error ? processErr.message : String(processErr)));
                            continue; // Skip to next chunk
                        }
                    }
                }
            );
            options.log(`✅ Completed reading ${filePath}`);
            await fs.promises.unlink(filePath);
            options.log(`🗑️ Deleted temporary file ${filePath}`);

        } catch (err) {
            console.error(`❌ Failed reading file ${filePath}:`, err);

            // Attempt safe cleanup (delete partial file if necessary)
            try {
                await fs.promises.unlink(filePath);
                options.log(`🧹 File removed after failure: ${filePath}`);
            } catch (cleanupErr) {
                options.log(`⚠️ Failed to delete file after error: ${(cleanupErr as Error).message}`);
            }

            throw err; // Re-throw for upstream handling if necessary
        }
    }
}