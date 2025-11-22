/*
  Warnings:

  - You are about to drop the column `code` on the `families` table. All the data in the column will be lost.
  - You are about to drop the column `generatedCode` on the `products` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[code]` on the table `products` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `code` to the `products` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `products` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "families_code_key";

-- AlterTable
ALTER TABLE "families" DROP COLUMN "code";

-- AlterTable
ALTER TABLE "products" DROP COLUMN "generatedCode",
ADD COLUMN     "code" TEXT NOT NULL,
ADD COLUMN     "name" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "products_code_key" ON "products"("code");
