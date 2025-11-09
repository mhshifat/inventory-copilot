import { toast } from "sonner";
import ReportsHeader from "@/components/modules/reports/reports-header";
import ReportsAnalyticalCards from "@/components/modules/reports/reports-analytical-cards";
import ReportsChart from "@/components/modules/reports/reports-chart";
import { authenticate, handleError } from "@/shopify.server";
import type { LoaderFunctionArgs } from "@remix-run/node";
import type { Setting } from "@prisma/client";
import prisma from "@/lib/db.server";
import { useLoaderData } from "@remix-run/react";

export const loader = async (args: LoaderFunctionArgs) => {
  const response = {
    settings: null as Setting | null,
    totalSales: 0,
    stockOuts: 0,
    topProductsData: [] as Array<{
      name: string;
      inventory: number;
      salesVelocity: number;
    }>
  }

  try {
    const { session } = await authenticate.admin(args.request);
    const shop = await prisma.shop.findUnique({
      where: {
        domain: session.shop
      },
      select: {
        id: true,
        settings: true,
      }
    });

    if (!shop?.id) {
      throw new Error(`Shop not found with domain: ${session.shop}`);
    }

    const forecastPeriod = shop.settings?.forecast_period || 30; // days
    const leadTimeDays = shop.settings?.default_lead_time || 14; // days

    const whereQuery = `
        WHERE
            shop_id = ${shop.id}
    `;

    const querySelect = `
        WITH products_with_sales AS (
            WITH daily_sales AS (
                WITH avgSales AS (
                    WITH sales as (
                        SELECT
                            p.*,
                            COALESCE(SUM(li.quantity), 0) as total_units_sold,
                            MAX(s.lead_time) AS supplier_lead_time,
                            MAX(s.min_order_qty) AS supplier_min_order_qty
                        FROM products as p

                        LEFT JOIN line_items as li
                        ON p.shopify_id = li.product_shopify_id
                        AND DATE_TRUNC('month', li.shopify_created_at) = DATE_TRUNC('month', CURRENT_DATE)

                        LEFT JOIN suppliers as s
                        ON p.supplier_id = s.id

                        GROUP BY p.id
                    )

                    SELECT
                        *,
                        CEIL(total_units_sold::numeric / ${forecastPeriod}) as avg_daily_sales
                    FROM sales
                )

                SELECT
                    *,
                    CASE
                        WHEN avg_daily_sales > 0
                            THEN CEIL(total_inventory::numeric / avg_daily_sales)
                            ELSE null
                    END as days_until_out,
                    (COALESCE(avg_daily_sales, 0) * (CASE WHEN supplier_lead_time IS NOT NULL THEN supplier_lead_time ELSE ${leadTimeDays} END)) as suggested_reorder
                FROM avgSales
            )

            SELECT 
                *,
                CASE
                    WHEN days_until_out IS NULL 
                        THEN 'IN_STOCK'
                    WHEN (COALESCE(days_until_out, 0)) = 0 
                        THEN 'STOCK_OUT'
                    WHEN (COALESCE(days_until_out, 0)) <= 7 
                        THEN 'LOW_STOCK'
                    ELSE 
                        'IN_STOCK'
                END as stock_status
            FROM daily_sales
        )

        SELECT *
        FROM products_with_sales
    `;

    const [analyticalRes, chartRes] = await Promise.all([
        prisma.$queryRawUnsafe(
            `
                WITH products_with_sales_count AS (
                    ${querySelect}

                    ${whereQuery}
                )

                SELECT 
                    SUM(
                        avg_daily_sales * 30
                    ) as total_sales,
                    SUM (
                        CASE 
                            WHEN total_inventory <= ${shop.settings?.low_stock_threshold || 0} AND avg_daily_sales > 0 THEN 1 
                            ELSE 0 
                        END
                    ) as stock_outs
                FROM 
                    products_with_sales_count
            `
        ),
        prisma.$queryRawUnsafe(
            `
                WITH products_with_sales_count AS (
                    ${querySelect}

                    ${whereQuery}
                )

                SELECT
                    avg_daily_sales as sales_velocity,
                    total_inventory as inventory,
                    title as product_name
                FROM 
                    products_with_sales_count
                ORDER BY
                    avg_daily_sales DESC
                LIMIT 10
            `
        ),
    ]);

    response.totalSales = Number((analyticalRes as unknown as { total_sales: number }[])?.[0].total_sales) || 0;
    response.stockOuts = Number((analyticalRes as unknown as { stock_outs: number }[])?.[0].stock_outs) || 0;
    response.topProductsData = (chartRes as unknown as Array<{
      sales_velocity: number;
      inventory: number;
      product_name: string;
    }>).map(item => ({
      name: item.product_name,
      inventory: Number(item.inventory),
      salesVelocity: Number(item.sales_velocity),
    }));
    response.settings = shop.settings || null;

    return response;
  } catch (err) {
    handleError(err);
    return response;
  }
}

export default function Reports() {
    const loaderData = useLoaderData<typeof loader>();

    const units = loaderData.settings?.units || "units";
    const totalSales = loaderData.totalSales;
    const stockOuts = loaderData.stockOuts;
    const topProductsData = loaderData.topProductsData;

    const handleExportCSV = () => {
        // Create CSV content
        const headers = ["Product Name", "Inventory Level", `Sales Velocity (${units}/day)`];
        const rows = topProductsData.map((item) => [
            item.name,
            item.inventory,
            item.salesVelocity,
        ]);

        const csvContent = [
            headers.join(","),
            ...rows.map((row) => row.join(",")),
        ].join("\n");

        // Create blob and download
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `inventory_report_${new Date().toISOString().split("T")[0]}.csv`);
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast.success("Report exported successfully");
    };

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <ReportsHeader
                handleExportCSV={handleExportCSV}
            />

            {/* Content */}
            <div className="max-w-7xl mx-auto! p-6! space-y-6!">
                {/* Analytics Cards */}
                <ReportsAnalyticalCards
                    totalSales={totalSales}
                    stockOuts={stockOuts}
                />

                {/* Chart Section */}
                <ReportsChart
                    data={topProductsData}
                    units={units}
                />
            </div>
        </div>
    );
}