import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ProductsService } from './products.service';
import { createPrismaMock } from '../test-utils/prisma-mock';
import { PrismaService } from '../prisma/prisma.service';

describe('ProductsService', () => {
  let service: ProductsService;
  let prisma: ReturnType<typeof createPrismaMock>;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new ProductsService(prisma as unknown as PrismaService);
  });

  describe('create', () => {
    beforeEach(() => {
      prisma.family.findUnique?.mockResolvedValue({ id: 'family-1' });
      prisma.productType.findUnique?.mockResolvedValue({ id: 'type-1' });
    });

    it('crée un produit si code et nom sont uniques', async () => {
      prisma.product.findMany?.mockResolvedValue([]);
      const createdProduct = {
        id: 'product-1',
        name: 'Ventilo 1000',
        code: 'V1000',
        familyId: 'family-1',
        productTypeId: 'type-1',
      };
      prisma.product.create?.mockResolvedValue(createdProduct);

      const result = await service.create({
        name: 'Ventilo 1000',
        code: 'V1000',
        familyId: 'family-1',
        productTypeId: 'type-1',
      });

      expect(result).toEqual(createdProduct);
    });

    it('rejette si la famille est inconnue', async () => {
      prisma.family.findUnique?.mockResolvedValueOnce(null);

      await expect(
        service.create({
          name: 'Ventilo',
          code: 'V1',
          familyId: 'unknown',
          productTypeId: 'type-1',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejette si le type de produit est inconnu', async () => {
      prisma.productType.findUnique?.mockResolvedValueOnce(null);

      await expect(
        service.create({
          name: 'Ventilo',
          code: 'V1',
          familyId: 'family-1',
          productTypeId: 'unknown',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejette les doublons de code', async () => {
      prisma.product.findMany?.mockResolvedValue([{ id: 'product-1', name: 'Ventilo', code: 'V1' }]);

      await expect(
        service.create({
          name: 'Ventilo 2',
          code: 'V1',
          familyId: 'family-1',
          productTypeId: 'type-1',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('findOne / remove', () => {
    it('rejette remove si le produit est introuvable', async () => {
      prisma.product.findUnique?.mockResolvedValue(null);

      await expect(service.remove('unknown')).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});

