/*
  Warnings:

  - You are about to drop the `fields` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `product_fields` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "fields" DROP CONSTRAINT "fields_familyId_fkey";

-- DropForeignKey
ALTER TABLE "fields" DROP CONSTRAINT "fields_variantId_fkey";

-- DropForeignKey
ALTER TABLE "product_fields" DROP CONSTRAINT "product_fields_fieldId_fkey";

-- DropForeignKey
ALTER TABLE "product_fields" DROP CONSTRAINT "product_fields_generatedInfoId_fkey";

-- DropTable
DROP TABLE "fields";

-- DropTable
DROP TABLE "product_fields";

-- CreateTable
CREATE TABLE "technical_characteristics" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "familyId" TEXT,
    "variantId" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "technical_characteristics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_technical_characteristics" (
    "id" TEXT NOT NULL,
    "generatedInfoId" TEXT NOT NULL,
    "technicalCharacteristicId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_technical_characteristics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "product_technical_characteristics_generatedInfoId_technical_key" ON "product_technical_characteristics"("generatedInfoId", "technicalCharacteristicId");

-- AddForeignKey
ALTER TABLE "technical_characteristics" ADD CONSTRAINT "technical_characteristics_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "technical_characteristics" ADD CONSTRAINT "technical_characteristics_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_technical_characteristics" ADD CONSTRAINT "product_technical_characteristics_generatedInfoId_fkey" FOREIGN KEY ("generatedInfoId") REFERENCES "product_generated_infos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_technical_characteristics" ADD CONSTRAINT "product_technical_characteristics_technicalCharacteristicI_fkey" FOREIGN KEY ("technicalCharacteristicId") REFERENCES "technical_characteristics"("id") ON DELETE CASCADE ON UPDATE CASCADE;
