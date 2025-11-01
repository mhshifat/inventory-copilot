import type { Session } from "@shopify/shopify-app-remix/server";
import type { PrismaSessionStorageInterface } from "@shopify/shopify-app-session-storage-prisma";
import prisma from "./db.server";
import { Session as ShopifySession } from '@shopify/shopify-api';

export class CustomSessionStorage implements PrismaSessionStorageInterface {
    isReady(): Promise<boolean> {
        return Promise.resolve(true);
    }

    async storeSession(session: Session): Promise<boolean> {
        try {
            const { id, isOnline, accessToken, ...data } = session;
            const domain: string = session?.shop;
            
            if (!domain) {
                console.error("Missing shop domain in session");
                return false;
            }

            const storeSessionResponse = await prisma.$transaction(async (transaction) => {
                await transaction.shop.upsert({
                    where: { domain },
                    update: {
                        updated_at: new Date(),
                    },
                    create: {
                        domain,
                        created_at: new Date(),
                    }
                });
            
                await transaction.session.upsert({
                    where: { id },
                    update: {
                        ...data,
                        access_token: accessToken || "",
                        is_online: isOnline,
                    },
                    create: { 
                        id, 
                        ...data, 
                        access_token: accessToken || "", 
                        is_online: isOnline
                    }
                });
            
                return true;
            });

            
            return storeSessionResponse;
        } catch (error) {
            console.error("Store Session Error:", error);
            return false;
        }
    }

    async loadSession(id: string): Promise<Session | undefined> {
        try {
            const session = await prisma.session.findUnique({
                where: { id }
            });

            if (session && session.id) {
                const sanitizedEntries = Object.entries(session).map(([key, value]) => {
                    if (value === null || value === undefined) {
                        return [key, ''];
                    }
                    if (value instanceof Date) {
                        return [key, value.toISOString()];
                    }
                    if (typeof value === 'bigint') {
                        return [key, value.toString()];
                    }
                    return [key, value];
                }) as [string, string | number | boolean][];
                return ShopifySession.fromPropertyArray(sanitizedEntries);
            } else {
                console.error("Session not found with id: ", id);
                return undefined; 
            }

        } catch (error) {
            console.error(error, ` <<------- loadSession = ERROR`);
            return undefined;
        }
    }

    async deleteSession(id: string): Promise<boolean> {
        try{
            await prisma.session.delete({
                where: {
                    id: id,
                },
            });
            return true;
        }catch(error){
            console.error(error, ` <<------- deleteSession = ERROR`);
            return false;
        }
    }

    async deleteSessions(ids: string[]): Promise<boolean> {
        try {
            await prisma.session.deleteMany({
                where: {
                    id: {
                        in: ids,
                    },
                },
            });
            return true;
        } catch (error) {
            console.error(error, ` <<------- deleteSessions[] = ERROR`);
            return false;
        }
    }
    
    async findSessionsByShop(shop: string): Promise<Session[]> {
        try{
            const sessions = await prisma.session.findMany({
                where: {
                    shop: shop,
                },
            });
            return sessions?.map((session) => {
                const sanitizedEntries = Object.entries(session).map(([key, value]) => {
                    if (value === null || value === undefined) {
                        return [key, ''];
                    }
                    if (value instanceof Date) {
                        return [key, value.toISOString()];
                    }
                    if (typeof value === 'bigint') {
                        return [key, value.toString()];
                    }
                    return [key, value];
                }) as [string, string | number | boolean][];
                return ShopifySession.fromPropertyArray(sanitizedEntries);
            });
        }catch(error){
            console.error(error, ` <<------- findSessionsByShop = ERROR`);
            return [];    
        }
    }
}