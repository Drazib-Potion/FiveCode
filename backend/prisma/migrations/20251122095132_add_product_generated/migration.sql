
-- DropForeignKey
ALTER TABLE "product_fields" DROP CONSTRAINT "product_fields_productId_fkey";

-- DropForeignKey
ALTER TABLE "product_variants" DROP CONSTRAINT "product_variants_productId_fkey";

-- DropIndex
DROP INDEX "product_fields_productId_fieldId_key";

-- DropIndex
DROP INDEX "product_variants_productId_variantId_key";

-- AlterTable
ALTER TABLE "product_fields" DROP COLUMN "productId",
ADD COLUMN     "generatedInfoId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "product_variants" DROP COLUMN "productId",
ADD COLUMN     "generatedInfoId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "product_generated_infos" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "generatedCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_generated_infos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "product_generated_infos_generatedCode_key" ON "product_generated_infos"("generatedCode");

-- CreateIndex
CREATE UNIQUE INDEX "product_fields_generatedInfoId_fieldId_key" ON "product_fields"("generatedInfoId", "fieldId");

-- CreateIndex
CREATE UNIQUE INDEX "product_variants_generatedInfoId_variantId_key" ON "product_variants"("generatedInfoId", "variantId");

-- AddForeignKey
ALTER TABLE "product_generated_infos" ADD CONSTRAINT "product_generated_infos_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_generatedInfoId_fkey" FOREIGN KEY ("generatedInfoId") REFERENCES "product_generated_infos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_fields" ADD CONSTRAINT "product_fields_generatedInfoId_fkey" FOREIGN KEY ("generatedInfoId") REFERENCES "product_generated_infos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
