import { BadRequestException, NotFoundException } from '@nestjs/common';
import { FamiliesService } from './families.service';
import { createPrismaMock } from '../test-utils/prisma-mock';
import { PrismaService } from '../prisma/prisma.service';

describe('FamiliesService', () => {
  let service: FamiliesService;
  let prisma: ReturnType<typeof createPrismaMock>;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new FamiliesService(prisma as unknown as PrismaService);
  });

  describe('create', () => {
    it('crée une famille si le nom est unique', async () => {
      prisma.family.findMany?.mockResolvedValue([]);
      prisma.family.create?.mockResolvedValue({ id: 'family-1', name: 'Ventilo' });

      const result = await service.create({ name: 'Ventilo' });

      expect(result).toEqual({ id: 'family-1', name: 'Ventilo' });
      expect(prisma.family.create).toHaveBeenCalledTimes(1);
      expect(prisma.family.create).toHaveBeenCalledWith({
        data: { name: 'VENTILO' },
      });
    });

    it('rejette si le nom existe déjà (insensible à la casse)', async () => {
      prisma.family.findMany?.mockResolvedValue([{ id: 'family-1', name: 'Ventilo' }]);

      await expect(service.create({ name: 'ventilo' })).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('update', () => {
    beforeEach(() => {
      prisma.family.findUnique?.mockResolvedValue({ id: 'family-1', name: 'Ventilo' });
    });

    it('met à jour une famille si le nouveau nom est libre', async () => {
      prisma.family.findMany?.mockResolvedValue([]);
      prisma.family.update?.mockResolvedValue({ id: 'family-1', name: 'Ventilo Plus' });

      const result = await service.update('family-1', { name: 'Ventilo Plus' });

      expect(result.name).toBe('Ventilo Plus');
      expect(prisma.family.update).toHaveBeenCalledWith({
        where: { id: 'family-1' },
        data: { name: 'VENTILO PLUS' },
      });
    });

    it('rejette si le nom est déjà pris par une autre famille', async () => {
      prisma.family.findMany?.mockResolvedValue([{ id: 'family-2', name: 'Ventilo Plus' }]);

      await expect(service.update('family-1', { name: 'Ventilo Plus' })).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('findOne & remove', () => {
    it('rejette remove sur une famille inexistante', async () => {
      prisma.family.findUnique?.mockResolvedValue(null);

      await expect(service.remove('unknown')).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});

