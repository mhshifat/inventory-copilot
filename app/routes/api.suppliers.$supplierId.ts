import { supplierSchema } from "@/components/modules/suppliers/suppliers-form-dialog";
import { ApiResponse } from "@/lib/api-response";
import prisma from "@/lib/db.server";
import rateLimit from "@/lib/rate-limit";
import { authenticate, handleError } from "@/shopify.server";
import type { ActionFunctionArgs } from "@remix-run/node";
import type z from "zod";

export const action = async (args: ActionFunctionArgs) => {
    try {
        const { session } = await authenticate.admin(args.request);

        rateLimit(`${session.shop}-update-supplier`, 10, 60_000);

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

        const supplierId = args.params.supplierId;

        if (!supplierId) {
            throw new Error("Supplier ID is required");
        }


        switch (args.request.method) {
            case "DELETE": {
                await prisma.supplier.delete({
                    where: {
                        id: +supplierId
                    }
                });

                return new ApiResponse({
                    data: null,
                    message: "Supplier deleted successfully"
                });
            }
            case "PUT": {
                const payload = await args.request.json();
                
                try {
                    await supplierSchema.partial().safeParseAsync(payload);
                } catch (err) {
                    const errors = (err as z.ZodError).issues.map((e) => e.message).join(", ");
                    throw new Error(`Invalid supplier data: ${errors}`);
                }

                await prisma.supplier.update({
                    where: {
                        id: +supplierId,
                        shop_id: shop.id,
                    },
                    data: {
                        name: payload.name,
                        contact_email: payload.contactEmail,
                        lead_time: payload.leadTime,
                        min_order_qty: payload.minOrderQty,
                        notes: payload.notes,
                    },
                    select: {
                        id: true
                    }
                });
                
                return new ApiResponse({
                    data: null,
                    message: "Supplier updated successfully",
                });
            }
            default:
                throw new Error(`Unsupported request method: ${args.request.method}`);
        }
    } catch (err) {
        handleError(err);
        return new ApiResponse({
            data: null,
            error: err instanceof Error ? err.message : "An error occurred while processing your request.",
        });
    }
}