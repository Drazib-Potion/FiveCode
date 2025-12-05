
-- CreateEnum
CREATE TYPE "VariantLevel" AS ENUM ('FIRST', 'SECOND');

-- DropForeignKey
ALTER TABLE "product_generated_infos" DROP CONSTRAINT "product_generated_infos_variantId_fkey";

-- DropForeignKey
ALTER TABLE "variant_exclusions" DROP CONSTRAINT "variant_exclusions_variantId1_fkey";

-- DropForeignKey
ALTER TABLE "variant_exclusions" DROP CONSTRAINT "variant_exclusions_variantId2_fkey";

-- AlterTable
ALTER TABLE "product_generated_infos" DROP COLUMN "variantId",
ADD COLUMN     "variant1Id" TEXT,
ADD COLUMN     "variant2Id" TEXT;

-- AlterTable
ALTER TABLE "variants" ADD COLUMN     "variantLevel" "VariantLevel" NOT NULL DEFAULT 'FIRST';

-- DropTable
DROP TABLE "variant_exclusions";

-- AddForeignKey
ALTER TABLE "product_generated_infos" ADD CONSTRAINT "product_generated_infos_variant1Id_fkey" FOREIGN KEY ("variant1Id") REFERENCES "variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_generated_infos" ADD CONSTRAINT "product_generated_infos_variant2Id_fkey" FOREIGN KEY ("variant2Id") REFERENCES "variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
