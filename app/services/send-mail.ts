import prisma from "../lib/db.server";
import { BaseService } from "./base-srv.server";
import type { SyncLogType } from "@prisma/client";
import { SyncLogStatus } from "@prisma/client";
import * as Sentry from "@sentry/node";

import sgMail from '@sendgrid/mail';

if (!process.env.SENDGRID_API_KEY) {
  throw new Error("SENDGRID_API_KEY is not defined in environment variables");
}

sgMail.setApiKey(process.env.SENDGRID_API_KEY)

interface SendMailPayload {
    subject: string;
    message: string;
    to: string;
    from: string;
}

export class SendMailService extends BaseService {
    constructor(
        private shopId: number,
        private syncLogId: number = 0,
        shop: string,
        type?: string
    ) {
        super(shop, "", type ? type : "SEND_MAIL");
    }

    async sendMail(payload: SendMailPayload, type: SyncLogType) {
        try {
            this.log(`=============== Starting Send Mail(${type}) ===============`);
            const syncLog = await prisma.syncLog.upsert({
                where: { id: this.syncLogId },
                update: {
                    status: SyncLogStatus.RUNNING,
                    message: "Sending mail started.",
                    updated_at: new Date()
                },
                create: {
                    status: SyncLogStatus.RUNNING,
                    type: type,
                    message: "Sending mail started.",
                    created_at: new Date(),
                    updated_at: new Date(),
                    shop_id: this.shopId
                }
            });
            this.syncLogId = syncLog.id;

            const msg = {
                from: payload.from,
                to: payload.to,
                subject: payload.subject,
                text: payload.message,
                html: `<p>${payload.message}</p>`,
            }

            const res = await sgMail.send(msg);

            this.log(`Message sent: ${res[0].headers['x-message-id']}`);

            global.gc && global.gc();
            await prisma.syncLog.update({
                where: { id: this.syncLogId },
                data: {
                    status: SyncLogStatus.COMPLETED,
                    message: "Sending mail completed successfully.",
                    updated_at: new Date()
                },
            });
            this.log(`=============== Finished Sending Mail(${type}) ===============`);
        } catch (error) {
            console.dir(error, { depth: null });
            const errMessage = error instanceof Error ? error.message : JSON.stringify(error);
            
            // Capture error in Sentry with context
            Sentry.captureException(error, {
                tags: {
                    service: 'send-mail',
                    shop_id: this.shopId.toString(),
                    sync_log_type: type,
                },
                extra: {
                    payload: {
                        to: payload.to,
                        subject: payload.subject,
                        from: payload.from,
                    },
                    shop: this.shop,
                },
            });
            
            await prisma.syncLog.upsert({
                where: { id: this.syncLogId },
                update: {
                    status: SyncLogStatus.FAILED,
                    message: errMessage || "Sending mail failed.",
                    updated_at: new Date()
                },
                create: {
                    status: SyncLogStatus.FAILED,
                    type: type,
                    message: errMessage || "Sending mail failed.",
                    created_at: new Date(),
                    updated_at: new Date(),
                    shop_id: this.shopId
                }
            });
            this.error("Error sending mail:", error as Error);
            this.log(`=============== Sending Mail(${type}) Failed ===============`);
        }
    }
}