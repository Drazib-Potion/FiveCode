import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ProductTypesService } from './product-types.service';
import { createPrismaMock } from '../test-utils/prisma-mock';
import { PrismaService } from '../prisma/prisma.service';

describe('ProductTypesService', () => {
  let service: ProductTypesService;
  let prisma: ReturnType<typeof createPrismaMock>;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new ProductTypesService(prisma as unknown as PrismaService);
  });

  describe('create', () => {
    it('crée un type si code et nom sont uniques', async () => {
      prisma.productType.findMany?.mockResolvedValue([]);
      prisma.productType.create?.mockResolvedValue({
        id: 'type-1',
        name: 'Standard',
        code: 'STD',
      });

      const result = await service.create({ name: 'Standard', code: 'STD' });

      expect(result.code).toBe('STD');
      expect(prisma.productType.create).toHaveBeenCalledWith({
        data: { name: 'STANDARD', code: 'STD' },
      });
    });

    it('rejette si le code existe déjà', async () => {
      prisma.productType.findMany?.mockResolvedValue([{ id: 'type-1', name: 'Standard', code: 'STD' }]);

      await expect(service.create({ name: 'Premium', code: 'STD' })).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejette si le nom existe déjà', async () => {
      prisma.productType.findMany?.mockResolvedValue([{ id: 'type-1', name: 'Standard', code: 'STD' }]);

      await expect(service.create({ name: 'standard', code: 'PREM' })).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('update', () => {
    beforeEach(() => {
      prisma.productType.findUnique?.mockResolvedValue({ id: 'type-1', name: 'Standard', code: 'STD' });
    });

    it('met à jour si les nouvelles valeurs sont libres', async () => {
      prisma.productType.findMany?.mockResolvedValue([]);
      prisma.productType.update?.mockResolvedValue({ id: 'type-1', name: 'Premium', code: 'PRM' });

      const result = await service.update('type-1', { name: 'Premium', code: 'PRM' });

      expect(result.name).toBe('Premium');
      expect(prisma.productType.update).toHaveBeenCalledWith({
        where: { id: 'type-1' },
        data: { name: 'PREMIUM', code: 'PRM' },
      });
    });

    it('rejette si le nouveau code existe', async () => {
      prisma.productType.findMany?.mockResolvedValue([{ id: 'type-2', name: 'Autre', code: 'PRM' }]);

      await expect(service.update('type-1', { code: 'PRM' })).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('findOne / remove', () => {
    it('rejette remove si non trouvé', async () => {
      prisma.productType.findUnique?.mockResolvedValue(null);

      await expect(service.remove('unknown')).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});

