import AlertCard, { type AlertCardDetails } from "@/components/modules/alerts/alert-card";
import AlertsEmptyHeader from "@/components/modules/alerts/alerts-empty-header";
import AlertsHeader from "@/components/modules/alerts/alerts-header";
import AlertsLearnHowWorksDialog from "@/components/modules/alerts/alerts-learn-how-works-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import useFilter from "@/hooks/use-filter";
import prisma from "@/lib/db.server";
import { authenticate, handleError } from "@/shopify.server";
import type { AlertStatus } from "@prisma/client";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";

export const loader = async (args: LoaderFunctionArgs) => {
    const response = {
        alerts: {
            list: [] as AlertCardDetails[],
            pagination: {
                hasNextPage: false,
                hasPreviousPage: false,
                page: 1,
                perPage: 20,
                totalItems: 0,
            }
        },
        alertsSummary: {
            totalAlerts: 0,
            unreadAlerts: 0,
            resolvedAlerts: 0,
        }
    }

    try {
        const { session, billing, redirect } = await authenticate.admin(args.request);

        const existingBilling = await billing.check({});
        const currentBilling = existingBilling.appSubscriptions?.[0];
        if (currentBilling?.status !== "ACTIVE") return redirect("/app/pricing", 303);

        const shop = await prisma.shop.findUnique({
            where: {
                domain: session.shop
            },
            select: {
                id: true,
            }
        });

        if (!shop?.id) {
            throw new Error(`Shop not found with domain: ${session.shop}`);
        }

        const searchParams = new URL(args.request.url).searchParams;
        const filterTab = searchParams.get("tab");
        const timeFilter = searchParams.get("timeFilter") || "7";
        
        const currentDate = new Date();
        let pastDate = new Date();
        pastDate.setDate(currentDate.getDate() - parseInt(timeFilter, 10));

        const [alertsSummaryRes, alerts] = await Promise.all([
            prisma.$queryRawUnsafe(`
                SELECT
                    COUNT(*) AS total_alerts,
                    COALESCE(SUM(CASE WHEN status = 'UNREAD' THEN 1 ELSE 0 END), 0) AS unread_alerts,
                    COALESCE(SUM(CASE WHEN status = 'RESOLVED' THEN 1 ELSE 0 END), 0) AS resolved_alerts
                FROM alerts
            `),
            prisma.alert.findMany({
                where: {
                    shop_id: shop.id,
                    created_at: {
                        gte: pastDate,
                        lte: currentDate
                    },
                    ...filterTab && filterTab !== "all" ? { status: filterTab as AlertStatus } : {}
                },
                orderBy: {
                    created_at: 'desc',
                },
            }),
        ]);

        type AlertFromDB = typeof alerts[number];

        const transformAlert = (alert: AlertFromDB): AlertCardDetails => ({
            id: alert.id,
            productId: String(alert.shopify_product_id),
            productName: alert.productName,
            productImage: alert.productImage,
            message: alert.message,
            status: alert.status,
            severity: alert.severity,
            timestamp: alert.created_at,
        });

        response.alerts.list = alerts.map(transformAlert);

        const alertsSummary = alertsSummaryRes as Array<{
            total_alerts: bigint,
            unread_alerts: bigint,
            resolved_alerts: bigint,
        }>;
        response.alertsSummary = {
            totalAlerts: Number(alertsSummary?.[0]?.total_alerts || 0),
            unreadAlerts: Number(alertsSummary?.[0]?.unread_alerts || 0),
            resolvedAlerts: Number(alertsSummary?.[0]?.resolved_alerts || 0),
        }

        return response;
    } catch (err) {
        handleError(err);
        return response;
    }
}

export default function Alerts() {
    const { filter, filterValues } = useFilter();
    const loaderData = useLoaderData<typeof loader>();
    // Show empty state when there are no alerts at all

    const hasNoAlerts = loaderData.alerts.list.length === 0;
    const alertsSummary = loaderData.alertsSummary;
    const alerts = loaderData.alerts.list as unknown as AlertCardDetails[];

    // If there are no alerts at all, show the empty state
    if (hasNoAlerts) {
        return (
            <div className="min-h-screen bg-background">
                {/* Header */}
                <AlertsEmptyHeader />

                {/* Empty State Content */}
                <div className="max-w-6xl mx-auto! p-6">
                    <div className="flex flex-col items-center">
                        <EmptyState
                            type="alerts"
                        />

                        {/* Learn More Link */}
                        <AlertsLearnHowWorksDialog />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <AlertsHeader />

            {/* Alerts Content */}
            <div className="max-w-6xl mx-auto! p-6">
                <Tabs defaultValue={filterValues?.["tab"] || "all"} className="w-full">
                    <TabsList className="grid w-full max-w-md grid-cols-3 mb-6!">
                        <TabsTrigger value="all" onClick={() => filter({ tab: "all" })}>
                            All Alerts ({alertsSummary.totalAlerts})
                        </TabsTrigger>
                        <TabsTrigger value="UNREAD" onClick={() => filter({ tab: "UNREAD" })}>
                            Unread ({alertsSummary.unreadAlerts})
                        </TabsTrigger>
                        <TabsTrigger value="RESOLVED" onClick={() => filter({ tab: "RESOLVED" })}>
                            Resolved ({alertsSummary.resolvedAlerts})
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="all" className="space-y-4!">
                        {alerts.length === 0 ? (
                            <Card className="p-12 text-center">
                                <p className="text-muted-foreground">No alerts found for this time period</p>
                            </Card>
                        ) : (
                            alerts.map((alert) => (
                                <AlertCard key={alert.id} alert={alert} />
                            ))
                        )}
                    </TabsContent>

                    <TabsContent value="UNREAD" className="space-y-4!">
                        {alerts.length === 0 ? (
                            <EmptyState
                                type="alerts"
                            />
                        ) : (
                            alerts.map((alert) => (
                                <AlertCard key={alert.id} alert={alert} />
                            ))
                        )}
                    </TabsContent>

                    <TabsContent value="RESOLVED" className="space-y-4!">
                        {alerts.length === 0 ? (
                            <Card className="p-12 text-center">
                                <p className="text-muted-foreground">No resolved alerts</p>
                            </Card>
                        ) : (
                            alerts.map((alert) => (
                                <AlertCard key={alert.id} alert={alert} />
                            ))
                        )}
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}