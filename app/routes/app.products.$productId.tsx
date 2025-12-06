import ProductDetailsDepletionPredictionChart from "@/components/modules/product-details/product-details-depletion-prediction-chart";
import ProductDetailsHeader from "@/components/modules/product-details/product-details-header";
import ProductDetailsOverview from "@/components/modules/product-details/product-details-overview";
import ProductDetailsReorderRecommendation from "@/components/modules/product-details/product-details-reorder-recommendation";
import ProductDetailsSalesTrendChart from "@/components/modules/product-details/product-details-sales-trend-chart";
import ProductDetailsSupplierInformation from "@/components/modules/product-details/product-details-supplier-information";
import { Button } from "@/components/ui/button";
import prisma from "@/lib/db.server";
import { authenticate, handleError } from "@/shopify.server";
import { type Setting } from "@prisma/client";
import { type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";

export const loader = async (args: LoaderFunctionArgs) => {
  const response = {
    product: null as ProductDetailsData | null,
    suppliers: [] as { label: string, value: string }[],
    settings: null as Setting | null,
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
        settings: true,
        suppliers: true,
      }
    });

    if (!shop?.id) {
      throw new Error(`Shop not found with domain: ${session.shop}`);
    }

    const { productId } = args.params;

    if (!productId) {
      throw new Error("Product ID is required");
    }

    const forecastPeriod = shop.settings?.forecast_period || 30; // days
    const leadTimeDays = shop.settings?.default_lead_time || 14; // days
    const lowStockThreshold = shop.settings?.low_stock_threshold || 0; // units

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
                            MAX(s.id) AS supplier_id,
                            MAX(s.name) AS supplier_name,
                            MAX(s.contact_email) AS supplier_contact_email,
                            MAX(s.lead_time) AS supplier_lead_time,
                            MAX(s.min_order_qty) AS supplier_min_order_qty,
                            MAX(s.notes) AS supplier_notes,
                            COALESCE(SUM(li.quantity), 0) as total_units_sold
                        FROM products as p

                        LEFT JOIN line_items as li
                        ON p.shopify_id = li.product_shopify_id

                        LEFT JOIN suppliers as s
                        ON p.supplier_id = s.id

                        WHERE
                            p.shop_id = ${shop.id}
                            AND p.id = '${productId}'

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
                    WHEN avg_daily_sales = 0 THEN 'NO_RECENT_SALES'
                    WHEN days_until_out = 0 THEN 'CRITICAL'
                    WHEN days_until_out <= ${lowStockThreshold} THEN 'AT_RISK'
                    ELSE 'HEALTHY'
                END AS stock_status
            FROM daily_sales
        )

        SELECT *
        FROM products_with_sales
    `;

    const [productRes] = await Promise.all([
        prisma.$queryRawUnsafe(
            `
                WITH products_with_sales_count AS (
                    ${querySelect}

                    ${whereQuery}
                )

                SELECT 
                    *
                FROM 
                    products_with_sales_count
            `
        ),
    ]);

    const productData = (productRes as unknown as {
        id: number,
        shopify_id: bigint,
        title: string,
        handle: string,
        vendor: string,
        collections: string | null,
        image: string,
        total_inventory: number,
        created_at: Date,
        updated_at: Date,
        shop_id: 1,
        supplier_id: number | null,
        total_units_sold: 0n,
        supplier_lead_time: number | null,
        supplier_min_order_qty: number | null,
        avg_daily_sales: 0,
        days_until_out: null,
        suggested_reorder: 0,
        stock_status: 'NO_RECENT_SALES' | 'CRITICAL' | 'AT_RISK' | 'HEALTHY',
        supplier_name: string | null,
        supplier_contact_email: string | null,
        supplier_notes: string | null
    }[])?.[0];

    if (productData) {
        response.product = {
            id: productData["id"],
            currentStock: Number(productData["total_inventory"]),
            avgDailySales: Number(productData["avg_daily_sales"]),
            name: productData["title"],
            collection: productData["collections"] || "Uncategorized",
            status: productData["stock_status"],
            image: productData?.image || "https://placehold.co/40x40/png",
            daysUntilOut: productData["days_until_out"] !== null ? Number(productData["days_until_out"]) : null,
            suggestedReorder: Number(productData["suggested_reorder"]),
            supplier: productData.supplier_id ? {
                id: productData.supplier_id,
                name: productData.supplier_name || "N/A",
                contactEmail: productData.supplier_contact_email || "N/A",
                leadTime: productData.supplier_lead_time !== null ? Number(productData.supplier_lead_time) : leadTimeDays as number,
                minOrderQty: productData.supplier_min_order_qty !== null ? Number(productData.supplier_min_order_qty) : 0,
                notes: productData.supplier_notes || "",
            } : undefined,
        };
    }

    response.suppliers = shop.suppliers.map(supplier => ({
        label: supplier.name,
        value: supplier.id.toString(),
    }));

    response.settings = shop.settings || null;

    return response;
  } catch (err) {
    handleError(err);
    return response;
  }
}

// Generate sales trend data
const generateSalesTrend = () => {
    const data = [];
    for (let i = 30; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        data.push({
            date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
            sales: Math.floor(Math.random() * 20) + 5,
            predicted: i < 15 ? Math.floor(Math.random() * 15) + 5 : null,
        });
    }
    return data;
};

// Generate inventory depletion prediction
const generateInventoryPrediction = (currentStock: number, avgDailySales: number) => {
    const data = [];
    let stock = currentStock;

    for (let i = 0; i <= 60; i++) {
        const date = new Date();
        date.setDate(date.getDate() + i);

        stock = Math.max(0, stock - avgDailySales);

        data.push({
            date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
            inventory: Math.round(stock),
        });

        if (stock <= 0) break;
    }

    return data;
};

export interface ProductDetailsSupplier {
    id: number;
    name: string;
    contactEmail: string;
    leadTime: number;
    minOrderQty: number;
    notes?: string;
}

export interface ProductDetailsData {
    id: number;
    currentStock: number;
    avgDailySales: number;
    name: string;
    collection: string;
    status: "NO_RECENT_SALES" | "CRITICAL" | "AT_RISK" | "HEALTHY";
    image: string;
    daysUntilOut: number | null;
    suggestedReorder: number;
    supplier?: ProductDetailsSupplier;
}


export default function Product() {
    const navigate = useNavigate();
    const loaderData = useLoaderData<typeof loader>();
    
    const suppliers = loaderData.suppliers;
    const supplier = loaderData.product?.supplier || null;
    const product = loaderData.product || null;
    const unitText = loaderData.settings?.units || "units";

    if (!product) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl! font-bold! text-foreground mb-2!">Product not found</h2>
                    <Button onClick={() => navigate("/app/dashboard")}>Back to Dashboard</Button>
                </div>
            </div>
        );
    }

    const salesTrend = generateSalesTrend();
    const inventoryPrediction = generateInventoryPrediction(product.currentStock, product.avgDailySales);

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <ProductDetailsHeader
                product={product}
                supplier={supplier}
            />

            <div className="max-w-7xl mx-auto! p-6!">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Content - 2 columns */}
                    <div className="lg:col-span-2 space-y-6!">
                        {/* Product Overview Card */}
                        <ProductDetailsOverview
                            product={product}
                            supplier={supplier}
                        />

                        {/* Sales Trend Chart */}
                        <ProductDetailsSalesTrendChart
                            data={salesTrend}
                        />

                        {/* Inventory Depletion Prediction */}
                        <ProductDetailsDepletionPredictionChart
                            data={inventoryPrediction}
                        />

                        {/* Reorder Recommendation */}
                        <ProductDetailsReorderRecommendation
                            product={product}
                            supplier={supplier}
                            unitText={unitText}
                        />
                    </div>

                    {/* Sidebar - 1 column */}
                    <ProductDetailsSupplierInformation
                        productId={product.id}
                        suppliers={suppliers}
                        supplier={supplier}
                    />
                </div>
            </div>
        </div>
    );
}