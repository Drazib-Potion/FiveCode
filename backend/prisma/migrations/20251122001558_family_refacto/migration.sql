
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
