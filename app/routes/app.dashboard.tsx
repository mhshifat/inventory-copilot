import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect, useLoaderData, useNavigate, useRevalidator } from "@remix-run/react";
import { toast } from "sonner";
import { authenticate, handleError } from '@/shopify.server';
import prisma from '@/lib/db.server';
import DashboardHeader from '@/components/modules/dashboard/dashboard-header';
import DashboardLowStockAlert from '@/components/modules/dashboard/dashboard-low-stock-alert';
import DashboardConfigureAlertsAlert from '@/components/modules/dashboard/dashboard-configure-alerts-alert';
import DashboardCustomizeSettingsAlert from '@/components/modules/dashboard/dashboard-customize-settings-alert';
import DashboardAiForecastWidget from '@/components/modules/dashboard/dashboard-ai-forecast-widget';
import DashboardSummaryCards from '@/components/modules/dashboard/dashboard-summary-cards';
import DashboardProductsTable, { type DashboardProductsTableData } from '@/components/modules/dashboard/dashboard-products-table';
import useFilter from '@/hooks/use-filter';
import DashboardTableFilters from '@/components/modules/dashboard/dashboard-table-filters';
import { TooltipProvider } from "@/components/ui/tooltip";

export const loader = async (args: LoaderFunctionArgs) => {
  const response = {
    products: {
        list: [] as DashboardProductsTableData[],
        pagination: {
            page: 1,
            perPage: 10,
            totalItems: 0,
            hasNextPage: false,
            hasPreviousPage: false,
        },
    },
    vendors: [] as { label: string, value: string }[],
    collections: [] as { label: string, value: string }[],
  }

  try {
    const { session } = await authenticate.admin(args.request);
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
    const page = parseInt(searchParams.get("page") || "1", 10) || 1;
    const perPage = response.products.pagination.perPage;

    const searchQuery = searchParams.get("q");
    const stockStatus = searchParams.get("stockStatus");
    const vendor = searchParams.get("vendor");
    const collection = searchParams.get("collection");

    const forecastPeriod = 30; // days
    const leadTimeDays = 14; // days

    const whereQuery = `
        WHERE
            shop_id = ${shop.id}
            ${stockStatus ? `AND stock_status = '${stockStatus}'` : ''}
            ${searchQuery ? `AND title ILIKE '%${decodeURIComponent(searchQuery).replace(/'/g, "''")}%'` : ''}
            ${vendor ? `AND vendor = '${decodeURIComponent(vendor)}'` : ''}
            ${collection ? `AND '${decodeURIComponent(collection)}' = ANY (collections)` : ''}
    `;

    const querySelect = `
        WITH products_with_sales AS (
            WITH daily_sales AS (
                WITH avgSales AS (
                    WITH sales as (
                        SELECT
                            p.*,
                            COALESCE(SUM(li.quantity), 0) as total_units_sold
                        FROM products as p

                        LEFT JOIN line_items as li
                        ON p.shopify_id = li.product_shopify_id

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
                            ELSE 0
                    END as days_until_out,
                    (COALESCE(avg_daily_sales, 0) * ${leadTimeDays}) as suggested_reorder
                FROM avgSales
            )

            SELECT 
                *,
                CASE
                    WHEN (COALESCE(days_until_out, 0)) = 0 
                        THEN 'STOCK_OUT'
                    WHEN days_until_out <= 7 
                        THEN 'LOW_STOCK'
                    ELSE 
                        'IN_STOCK'
                END as stock_status
            FROM daily_sales
        )

        SELECT *
        FROM products_with_sales
    `;

    const [productsCount, products, vendors, collections] = await Promise.all([
        prisma.$queryRawUnsafe(
            `
                WITH products_with_sales_count AS (
                    ${querySelect}

                    ${whereQuery}
                )

                SELECT COUNT(*) as count
                FROM products_with_sales_count
            `
        ),
        prisma.$queryRawUnsafe(
            `
                ${querySelect}

                ${whereQuery}

                ORDER BY created_at DESC
                LIMIT ${perPage} 
                OFFSET ${(perPage * (page - 1))}
            `
        ),
        prisma.product.findMany({
            where: {
                shop_id: shop.id,
            },
            select: {
                vendor: true,
            },
            distinct: ['vendor'],
        }),
        prisma.product.findMany({
            where: {
                shop_id: shop.id,
            },
            select: {
                collections: true,
            },
        }),
    ]);

    const productsCountNumber = Number((productsCount as { count: bigint }[])[0]?.count || BigInt(0));
    const transformProduct = (product: {
        id: number,
        shopify_id: bigint,
        title: string,
        handle: string,
        vendor: string,
        image: string,
        total_inventory: number,
        created_at: Date,
        updated_at: Date,
        shop_id: number,
        total_units_sold: bigint,
        avg_daily_sales: number,
        days_until_out: number,
        suggested_reorder: number,
        stock_status: "STOCK_OUT" | "LOW_STOCK" | "IN_STOCK",
    }): DashboardProductsTableData => {
        return {
            id: product.id,
            title: product?.title || "Untitled Product",
            handle: product?.handle || "",
            vendor: product?.vendor || "Unknown Vendor",
            image: product?.image || "https://placehold.co/40x40/png",
            stock: product?.total_inventory ?? 0,
            avgDailySales: product?.avg_daily_sales ?? 0,
            daysUntilOut: product?.days_until_out ?? 0,
            suggestedReorder: product?.suggested_reorder ?? 0,
            status: product.stock_status,
        }
    }

    if ((products as []).length === 0) {
        return redirect('/app');
    }

    response.products.list = (products as []).map((p) => transformProduct(p));
    response.products.pagination = {
        page,
        perPage,
        totalItems: productsCountNumber,
        hasNextPage: productsCountNumber > page * perPage,
        hasPreviousPage: page > 1,
    }
    response.vendors = vendors.map((v) => ({
        label: v.vendor || "",
        value: v.vendor || "",
    }));
    const collectionSet = new Set<string>();
    collections.forEach((c) => {
        (c.collections || []).forEach((col: string) => {
            collectionSet.add(col);
        });
    });
    response.collections = Array.from(collectionSet).map((col) => ({
        label: col,
        value: col,
    }));
    return response;
  } catch (err) {
    handleError(err);
    return response;
  }
}

export default function Dashboard() {
    const navigate = useNavigate();
    const { filter: filterData } = useFilter();
    const loaderData = useLoaderData<typeof loader>();
    const revalidator = useRevalidator();
    console.log({ loaderData });
    // const { isTourOpen, startTour, closeTour, completeTour } = useTour();

    // Contextual hints state
    const alertsConfigured = false;
    const settingsCustomized = false;   

    const products = loaderData.products.list;
    const pagination = loaderData.products.pagination;
    const vendors = loaderData.vendors;
    const collections = loaderData.collections;


    const handleSyncInventory = () => {
        revalidator.revalidate();
        toast.info("Syncing inventory data...");
    };


    // Calculate summary stats
    const lowStockCount = products.filter((p) => p.status === "LOW_STOCK" || p.status === "STOCK_OUT").length;
    const inventoryHealth = Math.round(
        (products.filter((p) => p.status === "IN_STOCK").length / products.length) * 100
    );

    return (
        <TooltipProvider>
            <div className="min-h-screen bg-background p-6!">
                <div className="max-w-7xl mx-auto! space-y-6">
                    {/* Header */}
                    <DashboardHeader
                        handleSyncInventory={handleSyncInventory}
                    />

                    {/* Contextual Hint Banners */}
                    <div className="space-y-3">
                        {/* Low Stock Alert */}
                        {lowStockCount > 0 && (
                            <DashboardLowStockAlert
                                lowStockCount={lowStockCount}
                            />
                        )}

                        {/* Alerts Not Configured */}
                        {!alertsConfigured && (
                            <DashboardConfigureAlertsAlert />
                        )}

                        {/* Settings Customization */}
                        {!settingsCustomized && (
                            <DashboardCustomizeSettingsAlert />
                        )}
                    </div>

                    {/* Summary Cards & AI Forecast */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <DashboardSummaryCards
                            lowStockCount={lowStockCount}
                            inventoryHealth={inventoryHealth}
                            products={products}
                        />

                        {/* AI Forecast Widget */}
                        <div className="lg:col-span-1" data-tour-id="ai-forecast">
                            <DashboardAiForecastWidget onViewAll={() => navigate("/reports")} />
                        </div>
                    </div>

                    {/* Filters and Search */}
                    <DashboardTableFilters
                        vendors={vendors}
                        collections={collections}
                    />

                    {/* Products Table */}
                    <DashboardProductsTable
                        data={products}
                        pagination={pagination}
                        onPageChange={(page) => filterData({
                            page: page.toString()
                        })}
                    />
                </div>

                {/* Tour Component */}
                {/* <Tour 
            steps={tourSteps} 
            isOpen={isTourOpen} 
            onClose={closeTour}
            onComplete={completeTour}
        /> */}
            </div>
        </TooltipProvider>
    );
}