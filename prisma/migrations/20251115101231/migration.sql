-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SyncLogType" ADD VALUE 'ORDERS_CANCEL';
ALTER TYPE "SyncLogType" ADD VALUE 'ORDERS_CREATE';
ALTER TYPE "SyncLogType" ADD VALUE 'ORDERS_DELETE';
ALTER TYPE "SyncLogType" ADD VALUE 'ORDERS_EDIT';
ALTER TYPE "SyncLogType" ADD VALUE 'ORDERS_FULFILL';
ALTER TYPE "SyncLogType" ADD VALUE 'ORDERS_PAID';
ALTER TYPE "SyncLogType" ADD VALUE 'ORDER_PARTIAL_FULFILL';
ALTER TYPE "SyncLogType" ADD VALUE 'ORDERS_UPDATE';
