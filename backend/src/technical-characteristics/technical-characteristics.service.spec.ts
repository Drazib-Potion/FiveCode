import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TechnicalCharacteristicsService } from './technical-characteristics.service';
import { createPrismaMock } from '../test-utils/prisma-mock';
import { PrismaService } from '../prisma/prisma.service';

describe('TechnicalCharacteristicsService', () => {
  let service: TechnicalCharacteristicsService;
  let prisma: ReturnType<typeof createPrismaMock>;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new TechnicalCharacteristicsService(prisma as unknown as PrismaService);
    prisma.technicalCharacteristic.findMany?.mockResolvedValue([]);
  });

  describe('create', () => {
    it('crée une caractéristique string avec au moins une famille', async () => {
      prisma.technicalCharacteristic.findMany?.mockResolvedValue([]);
      prisma.family.findMany?.mockResolvedValue([{ id: 'family-1' }]);
      const created = { id: 'tc-1', name: 'Puissance', type: 'string' };
      prisma.technicalCharacteristic.create?.mockResolvedValue(created);

      const result = await service.create({
        name: 'Puissance',
        type: 'string',
        familyIds: ['family-1'],
      });

      expect(result).toEqual(created);
      expect(prisma.technicalCharacteristic.create).toHaveBeenCalledTimes(1);
      expect(prisma.technicalCharacteristic.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'PUISSANCE',
        }),
        include: expect.any(Object),
      });
    });

    it('normalise les options enum en majuscules', async () => {
      prisma.family.findMany?.mockResolvedValue([{ id: 'family-1' }]);
      prisma.technicalCharacteristic.create?.mockResolvedValue({
        id: 'tc-enum',
        name: 'Couleur',
        type: 'enum',
      });
      const result = await service.create({
        name: 'Couleur',
        type: 'enum',
        familyIds: ['family-1'],
        enumOptions: ['Rouge', 'Bleu'],
      });

      expect(result).toEqual({ id: 'tc-enum', name: 'Couleur', type: 'enum' });
      expect(prisma.technicalCharacteristic.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'COULEUR',
          enumOptions: ['ROUGE', 'BLEU'],
        }),
        include: expect.any(Object),
      });
    });

    it('rejette les types invalides', async () => {
      await expect(
        service.create({
          name: 'Invalide',
          type: 'array' as any,
          familyIds: ['family-1'],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejette les enums sans options valides', async () => {
      await expect(
        service.create({
          name: 'Couleur',
          type: 'enum',
          familyIds: ['family-1'],
          enumOptions: [],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejette si aucune famille ni variante fournie', async () => {
      await expect(
        service.create({
          name: 'Couleur',
          type: 'string',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejette si une famille est introuvable', async () => {
      prisma.technicalCharacteristic.findMany?.mockResolvedValue([]);
      prisma.family.findMany?.mockResolvedValue([{ id: 'family-1' }]);

      await expect(
        service.create({
          name: 'Couleur',
          type: 'string',
          familyIds: ['family-1', 'family-2'],
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejette si une variante est introuvable', async () => {
      prisma.technicalCharacteristic.findMany?.mockResolvedValue([]);
      prisma.family.findMany?.mockResolvedValue([{ id: 'family-1' }]);
      prisma.variant.findMany?.mockResolvedValue([{ id: 'variant-1' }]);

      await expect(
        service.create({
          name: 'Couleur',
          type: 'string',
          familyIds: ['family-1'],
          variantIds: ['variant-1', 'variant-2'],
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});

