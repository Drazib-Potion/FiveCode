
-- DropForeignKey
ALTER TABLE "products" DROP CONSTRAINT "products_variantId_fkey";

-- DropForeignKey
ALTER TABLE "rules" DROP CONSTRAINT "rules_fieldId_fkey";

-- AlterTable
ALTER TABLE "products" DROP COLUMN "values",
DROP COLUMN "variantId";

-- DropTable
DROP TABLE "rules";

-- CreateTable
CREATE TABLE "product_variants" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "variant_exclusions" (
    "id" TEXT NOT NULL,
    "variantId1" TEXT NOT NULL,
    "variantId2" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "variant_exclusions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "product_variants_productId_variantId_key" ON "product_variants"("productId", "variantId");

-- CreateIndex
CREATE UNIQUE INDEX "variant_exclusions_variantId1_variantId2_key" ON "variant_exclusions"("variantId1", "variantId2");

-- AddForeignKey
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "variant_exclusions" ADD CONSTRAINT "variant_exclusions_variantId1_fkey" FOREIGN KEY ("variantId1") REFERENCES "variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "variant_exclusions" ADD CONSTRAINT "variant_exclusions_variantId2_fkey" FOREIGN KEY ("variantId2") REFERENCES "variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
