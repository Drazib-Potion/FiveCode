
-- AlterTable
ALTER TABLE "technical_characteristics" DROP COLUMN "position",
ADD COLUMN     "enumOptions" JSONB;
