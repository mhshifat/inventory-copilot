import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import prisma from "@/lib/db.server";
import { type Session } from "@prisma/client";
import { addUpsertProductJob } from "@/services/workers/upsert-product-worker.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { topic, shop, session, admin, payload } = await authenticate.webhook(request);
  
  try {    
    if (!admin && topic !== 'SHOP_REDACT') {
      // The admin context isn't returned if the webhook fired after a shop was uninstalled.
      // The SHOP_REDACT webhook will be fired up to 48 hours after a shop uninstalls the app.
      // Because of this, no admin context is available.
      console.warn("Admin context missing for topic", topic);
    }

    if (!session) {
      throw new Response("session not found", { status: 404 });
    }

     // for duplicate webhooks the webhook ID would be different but the Even ID would be same. So we'll use Event ID
    const webhookId = request.headers.get("X-Shopify-Event-Id");

    if (!webhookId) {
      throw new Response("Invalid webhook id", { status: 400 });
    }

    // More info: https://shopify.dev/docs/apps/build/cli-for-apps/app-configuration
    const shopRes = await prisma.shop.findFirst({ where: { domain: shop } });

    if (!shopRes) {
      throw new Response("Shop reference not found", { status: 404 });
    }

    switch (topic) {
      case "APP_UNINSTALLED": {
        if (session && session?.shop) {
          await prisma.session.deleteMany({ where: { shop: session.shop } });
          console.log(`Session deleted for shop(${session.shop})`);

          if (shopRes && shopRes?.id) {
            console.log(`Store uninstalled handled - ${session.shop}`);
            await prisma.shop.delete({
              where: { 
                id: shopRes.id,
              },
            });
          } else {
            console.error(`[${topic}]: Shop(${shop}) reference not found`);  
          }
        }

        break;
      }
      case "PRODUCTS_UPDATE": {
        if (shopRes && webhookId) {
            let syncLogId: number | null = null;
            try {
                const syncLog = await prisma.syncLog.create({
                    data: {
                        shop_id: shopRes.id,
                        type: "PRODUCTS_UPDATE",
                        message: `Products update webhook received`,
                        status: "QUEUED",
                        created_at: new Date(),
                    },
                });
                syncLogId = syncLog.id;
                await addUpsertProductJob({
                    shopId: shopRes.id,
                    accessToken: (session as unknown as Session).access_token,
                    productId: payload.id,
                    webhookId: webhookId,
                    syncLogId: syncLogId,
                    shop: shopRes.domain,
                    type: "UPDATED",
                });
            } catch (err) {
                if (syncLogId) {
                    await prisma.syncLog.update({
                        where: { id: syncLogId },
                        data: {
                            message: `Error processing PRODUCTS_UPDATE(${payload.id}) webhook: ${err instanceof Error ? err.message : String(err)}`,
                            status: "FAILED",
                            updated_at: new Date(),
                        },
                    });
                }
                console.error(`Error processing PRODUCTS_UPDATE webhook for shop(${shop}):`, err);
                throw err;
            }
        }else {
          console.error(`[${topic}]:Shop(${shop}) not found`);
        }

        break;
      }
      case "PRODUCTS_CREATE": {
        if (shopRes && webhookId) {
            let syncLogId: number | null = null;
            try {
                const syncLog = await prisma.syncLog.create({
                    data: {
                        shop_id: shopRes.id,
                        type: "PRODUCTS_CREATE",
                        message: `Products create webhook received`,
                        status: "QUEUED",
                        created_at: new Date(),
                    },
                });
                syncLogId = syncLog.id;
                await addUpsertProductJob({
                    shopId: shopRes.id,
                    accessToken: (session as unknown as Session).access_token,
                    productId: payload.id,
                    webhookId: webhookId,
                    syncLogId: syncLogId,
                    shop: shopRes.domain,
                    type: "CREATED",
                });
            } catch (err) {
                if (syncLogId) {
                    await prisma.syncLog.update({
                        where: { id: syncLogId },
                        data: {
                            message: `Error processing PRODUCTS_CREATE(${payload.id}) webhook: ${err instanceof Error ? err.message : String(err)}`,
                            status: "FAILED",
                            updated_at: new Date(),
                        },
                    });
                }
                console.error(`Error processing PRODUCTS_CREATE webhook for shop(${shop}):`, err);
                throw err;
            }
        }else {
          console.error(`[${topic}]:Shop(${shop}) not found`);
        }

        break;
      }
      case "PRODUCTS_DELETE": {
        if (shopRes && webhookId) {
            let syncLogId: number | null = null;
            try {
                const syncLog = await prisma.syncLog.create({
                    data: {
                        shop_id: shopRes.id,
                        type: "PRODUCTS_DELETE",
                        message: `Products delete webhook received`,
                        status: "QUEUED",
                        created_at: new Date(),
                    },
                });
                syncLogId = syncLog.id;
                await addUpsertProductJob({
                    shopId: shopRes.id,
                    accessToken: (session as unknown as Session).access_token,
                    productId: payload.id,
                    webhookId: webhookId,
                    syncLogId: syncLogId,
                    shop: shopRes.domain,
                    type: "DELETED",
                });
            } catch (err) {
                if (syncLogId) {
                    await prisma.syncLog.update({
                        where: { id: syncLogId },
                        data: {
                            message: `Error processing PRODUCTS_DELETE(${payload.id}) webhook: ${err instanceof Error ? err.message : String(err)}`,
                            status: "FAILED",
                            updated_at: new Date(),
                        },
                    });
                }
                console.error(`Error processing PRODUCTS_DELETE webhook for shop(${shop}):`, err);
                throw err;
            }
        }else {
          console.error(`[${topic}]:Shop(${shop}) not found`);
        }

        break;
      }
      case "CUSTOMERS_DATA_REQUEST":
      case "CUSTOMERS_REDACT":
      case "SHOP_REDACT":
        return new Response("ok", { status: 200 });
      default:
        throw new Response("Unhandled webhook topic", { status: 404 });
    }

    return new Response("ok", { status: 200 });
  } catch (error: any) {
    console.error("Webhook error: ", error?.message || error);
    const message = error instanceof Error ? error?.message : "Something went wrong";
    return new Response(message, { status: 500 });
  }
};