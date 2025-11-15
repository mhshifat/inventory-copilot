import { ApiResponse } from "@/lib/api-response";
import prisma from "@/lib/db.server";
import rateLimit from "@/lib/rate-limit";
import { authenticate, handleError } from "@/shopify.server";
import { AlertStatus } from "@prisma/client";
import type { ActionFunctionArgs } from "@remix-run/node";

export const action = async (args: ActionFunctionArgs) => {
    try {
        const { session } = await authenticate.admin(args.request);

        rateLimit(`${session.shop}-mark-alert-read`, 10, 60_000);

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

        const payload = await args.request.json();

        if (!payload?.id) {
            throw new Error("Alert ID is required to mark as read");
        }

        await prisma.alert.update({
            where: {
                id: payload.id
            },
            data: {
                status: AlertStatus.RESOLVED
            },
            select: {
                id: true
            }
        });
        
        return new ApiResponse({
            data: null,
            message: "Alert marked as read successfully",
        });
    } catch (err) {
        handleError(err);
        return new ApiResponse({
            data: null,
            message: "Error marking alert as read",
        });
    }
}