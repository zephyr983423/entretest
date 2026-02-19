-- CreateEnum
CREATE TYPE "RepairType" AS ENUM ('SCREEN', 'BATTERY', 'MOTHERBOARD', 'WATER_DAMAGE', 'CHARGING_PORT', 'CAMERA', 'SPEAKER', 'SOFTWARE', 'OTHER');

-- CreateEnum
CREATE TYPE "Urgency" AS ENUM ('NORMAL', 'URGENT', 'CRITICAL');

-- CreateEnum
CREATE TYPE "WarrantyStatus" AS ENUM ('IN_WARRANTY', 'OUT_OF_WARRANTY', 'EXTENDED');

-- AlterTable
ALTER TABLE "work_orders" ADD COLUMN     "repairType" "RepairType",
ADD COLUMN     "urgency" "Urgency" NOT NULL DEFAULT 'NORMAL',
ADD COLUMN     "warrantyStatus" "WarrantyStatus";
