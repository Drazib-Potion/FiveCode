
-- DropForeignKey
ALTER TABLE "product_variants" DROP CONSTRAINT "product_variants_generatedInfoId_fkey";

-- DropForeignKey
ALTER TABLE "product_variants" DROP CONSTRAINT "product_variants_variantId_fkey";

-- AlterTable
ALTER TABLE "product_generated_infos" ADD COLUMN     "variantId" TEXT;

-- DropTable
DROP TABLE "product_variants";

-- AddForeignKey
ALTER TABLE "product_generated_infos" ADD CONSTRAINT "product_generated_infos_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
