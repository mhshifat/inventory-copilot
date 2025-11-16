-- CreateEnum
CREATE TYPE "SyncLogStatus" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "SyncLogType" AS ENUM ('PRODUCTS_IMPORT', 'ORDERS_IMPORT', 'PRODUCTS_UPDATE', 'PRODUCTS_CREATE', 'PRODUCTS_DELETE', 'ORDERS_CANCEL', 'ORDERS_CREATE', 'ORDERS_DELETE', 'ORDERS_EDIT', 'ORDERS_FULFILL', 'ORDERS_PAID', 'ORDER_PARTIAL_FULFILL', 'ORDERS_UPDATE', 'LOW_STOCK_ALERT', 'BILLING_PLAN_CHANGE', 'BILLING_CANCEL');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('CRITICAL', 'WARNING', 'RESTOCKED');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('UNREAD', 'RESOLVED');

-- CreateEnum
CREATE TYPE "PlanStatus" AS ENUM ('DOWNGRADE', 'UPGRADE', 'CANCELLED', 'EXPIRED', 'PENDING', 'ACTIVE', 'DECLINED', 'FROZEN');

-- CreateEnum
CREATE TYPE "PlanCycle" AS ENUM ('MONTHLY', 'ANNUAL');

-- CreateEnum
CREATE TYPE "BillingCouponType" AS ENUM ('PERCENTAGE_DISCOUNT', 'FIXED_AMOUNT_DISCOUNT', 'FIXED_PRICE');

-- CreateEnum
CREATE TYPE "PlanType" AS ENUM ('Starter', 'Pro', 'Business', 'Enterprise');

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "is_online" BOOLEAN NOT NULL DEFAULT false,
    "scope" TEXT,
    "expires" TIMESTAMP(3),
    "access_token" TEXT NOT NULL,
    "user_id" BIGINT,
    "first_name" TEXT,
    "last_name" TEXT,
    "email" TEXT,
    "account_owner" BOOLEAN NOT NULL DEFAULT false,
    "locale" TEXT,
    "collaborator" BOOLEAN DEFAULT false,
    "email_verified" BOOLEAN DEFAULT false,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shops" (
    "id" SERIAL NOT NULL,
    "domain" TEXT NOT NULL,
    "total_products" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" SERIAL NOT NULL,
    "shopify_id" BIGINT NOT NULL,
    "title" TEXT,
    "handle" TEXT,
    "vendor" TEXT,
    "collections" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "image" TEXT,
    "total_inventory" INTEGER DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "shop_id" INTEGER NOT NULL,
    "supplier_id" INTEGER,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "variants" (
    "id" SERIAL NOT NULL,
    "shopify_id" BIGINT NOT NULL,
    "title" TEXT,
    "sku" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "product_id" INTEGER NOT NULL,
    "shop_id" INTEGER NOT NULL,

    CONSTRAINT "variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" SERIAL NOT NULL,
    "shopify_id" BIGINT NOT NULL,
    "total_units_sold" INTEGER NOT NULL,
    "shopify_created_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "shop_id" INTEGER NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "line_items" (
    "id" SERIAL NOT NULL,
    "shopify_id" BIGINT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "shopify_created_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "order_id" INTEGER NOT NULL,
    "product_shopify_id" BIGINT NOT NULL,

    CONSTRAINT "line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_logs" (
    "id" SERIAL NOT NULL,
    "status" "SyncLogStatus" NOT NULL,
    "type" "SyncLogType" NOT NULL,
    "message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "shop_id" INTEGER NOT NULL,

    CONSTRAINT "sync_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "id" SERIAL NOT NULL,
    "forecast_period" TEXT NOT NULL,
    "default_lead_time" TEXT NOT NULL,
    "low_stock_threshold" TEXT NOT NULL,
    "email_alerts_enabled" BOOLEAN NOT NULL,
    "alert_email" TEXT,
    "in_app_alerts_enabled" BOOLEAN NOT NULL DEFAULT true,
    "units" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "shop_id" INTEGER NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alerts" (
    "id" SERIAL NOT NULL,
    "productName" TEXT NOT NULL,
    "productImage" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "severity" "AlertSeverity" NOT NULL,
    "status" "AlertStatus" NOT NULL DEFAULT 'UNREAD',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "alert_sent_at" TIMESTAMP(3),
    "shopify_product_id" BIGINT NOT NULL,
    "shop_id" INTEGER NOT NULL,

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "contact_email" TEXT NOT NULL,
    "lead_time" INTEGER NOT NULL,
    "min_order_qty" INTEGER NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "shop_id" INTEGER NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billings" (
    "id" SERIAL NOT NULL,
    "current_plan_id" TEXT NOT NULL,
    "current_plan_name" "PlanType" NOT NULL,
    "current_billing_start" TIMESTAMP(3) NOT NULL,
    "current_billing_end" TIMESTAMP(3) NOT NULL,
    "current_product_limit" INTEGER NOT NULL,
    "current_plan_price" DECIMAL(10,2) NOT NULL,
    "current_plan_cycle" "PlanCycle" NOT NULL,
    "remaining_credit" INTEGER DEFAULT 0,
    "trial_taken" BOOLEAN NOT NULL DEFAULT false,
    "trial_end" TIMESTAMP(3),
    "previous_plan_id" TEXT,
    "previous_plan_name" "PlanType",
    "previous_billing_start" TIMESTAMP(3),
    "previous_billing_end" TIMESTAMP(3),
    "previous_product_limit" INTEGER,
    "previous_plan_price" DECIMAL(10,2) NOT NULL,
    "previous_plan_cycle" "PlanCycle" NOT NULL,
    "cancelled_subscription_at" TIMESTAMP(3),
    "status" "PlanStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "coupon_applied" BOOLEAN NOT NULL DEFAULT false,
    "coupon_code" TEXT,
    "coupon_plan_name" "PlanType",
    "coupon_value" DECIMAL(10,2),
    "coupon_value_type" "BillingCouponType",
    "coupon_duration_limit_intervals" INTEGER,
    "coupon_product_limit" INTEGER,
    "coupon_plan_cycle" "PlanCycle",
    "shop_id" INTEGER NOT NULL,

    CONSTRAINT "billings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_coupons" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "plans" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3),
    "allowed_domains" TEXT,
    "max_usage_limit" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_coupons_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sessions_shop_idx" ON "sessions"("shop");

-- CreateIndex
CREATE INDEX "sessions_access_token_idx" ON "sessions"("access_token");

-- CreateIndex
CREATE UNIQUE INDEX "shops_domain_key" ON "shops"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "products_shopify_id_key" ON "products"("shopify_id");

-- CreateIndex
CREATE INDEX "products_vendor_idx" ON "products"("vendor");

-- CreateIndex
CREATE INDEX "products_collections_idx" ON "products" USING GIN ("collections");

-- CreateIndex
CREATE UNIQUE INDEX "variants_shopify_id_key" ON "variants"("shopify_id");

-- CreateIndex
CREATE UNIQUE INDEX "orders_shopify_id_key" ON "orders"("shopify_id");

-- CreateIndex
CREATE UNIQUE INDEX "line_items_shopify_id_key" ON "line_items"("shopify_id");

-- CreateIndex
CREATE UNIQUE INDEX "settings_shop_id_key" ON "settings"("shop_id");

-- CreateIndex
CREATE UNIQUE INDEX "billings_shop_id_key" ON "billings"("shop_id");

-- CreateIndex
CREATE UNIQUE INDEX "billing_coupons_code_key" ON "billing_coupons"("code");

-- CreateIndex
CREATE INDEX "billing_coupons_code_idx" ON "billing_coupons"("code");

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "variants" ADD CONSTRAINT "variants_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "variants" ADD CONSTRAINT "variants_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "line_items" ADD CONSTRAINT "line_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "line_items" ADD CONSTRAINT "line_items_product_shopify_id_fkey" FOREIGN KEY ("product_shopify_id") REFERENCES "products"("shopify_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sync_logs" ADD CONSTRAINT "sync_logs_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settings" ADD CONSTRAINT "settings_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_shopify_product_id_fkey" FOREIGN KEY ("shopify_product_id") REFERENCES "products"("shopify_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billings" ADD CONSTRAINT "billings_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;
