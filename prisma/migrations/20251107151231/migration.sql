/*
  Warnings:

  - The values [READ] on the enum `AlertStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "AlertStatus_new" AS ENUM ('UNREAD', 'RESOLVED');
ALTER TABLE "public"."alerts" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "alerts" ALTER COLUMN "status" TYPE "AlertStatus_new" USING ("status"::text::"AlertStatus_new");
ALTER TYPE "AlertStatus" RENAME TO "AlertStatus_old";
ALTER TYPE "AlertStatus_new" RENAME TO "AlertStatus";
DROP TYPE "public"."AlertStatus_old";
ALTER TABLE "alerts" ALTER COLUMN "status" SET DEFAULT 'UNREAD';
COMMIT;
