import { BadRequestException, NotFoundException } from '@nestjs/common';
import { VariantsService } from './variants.service';
import { VariantLevel } from './dto/create-variant.dto';
import { createPrismaMock } from '../test-utils/prisma-mock';
import { PrismaService } from '../prisma/prisma.service';

describe('VariantsService', () => {
  let service: VariantsService;
  let prisma: ReturnType<typeof createPrismaMock>;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new VariantsService(prisma as unknown as PrismaService);
  });

  describe('create', () => {
    it('crée une variante quand le code est unique pour le niveau ciblé', async () => {
      prisma.family.findUnique?.mockResolvedValue({ id: 'family-1' });
      prisma.variant.findMany?.mockResolvedValue([
        { id: 'variant-2', code: '1', name: 'Variante existante', variantLevel: VariantLevel.SECOND },
      ]);
      const createdVariant = {
        id: 'variant-1',
        familyId: 'family-1',
        name: '1 tête',
        code: '1',
        variantLevel: VariantLevel.FIRST,
      };
      prisma.variant.create?.mockResolvedValue(createdVariant);

      const result = await service.create({
        familyId: 'family-1',
        name: '1 tête',
        code: '1',
        variantLevel: VariantLevel.FIRST,
      });

      expect(result).toEqual(createdVariant);
      expect(prisma.variant.create).toHaveBeenCalledTimes(1);
    });

    it('refuse les doublons de code pour un même niveau de variante', async () => {
      prisma.family.findUnique?.mockResolvedValue({ id: 'family-1' });
      prisma.variant.findMany?.mockResolvedValue([
        { id: 'variant-2', code: '1', name: 'Variante existante', variantLevel: VariantLevel.FIRST },
      ]);

      await expect(
        service.create({
          familyId: 'family-1',
          name: '1 tête bis',
          code: '1',
          variantLevel: VariantLevel.FIRST,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('refuse les doublons de nom pour un même niveau de variante', async () => {
      prisma.family.findUnique?.mockResolvedValue({ id: 'family-1' });
      prisma.variant.findMany?.mockResolvedValue([
        { id: 'variant-2', code: '2', name: '1 tête', variantLevel: VariantLevel.FIRST },
      ]);

      await expect(
        service.create({
          familyId: 'family-1',
          name: '1 tête',
          code: '3',
          variantLevel: VariantLevel.FIRST,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('lève NotFound si la famille est inconnue', async () => {
      prisma.family.findUnique?.mockResolvedValue(null);

      await expect(
        service.create({
          familyId: 'unknown',
          name: '1 tête',
          code: '1',
          variantLevel: VariantLevel.FIRST,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('update', () => {
    const existingVariant = {
      id: 'variant-1',
      familyId: 'family-1',
      name: 'Variante originale',
      code: '1',
      variantLevel: VariantLevel.FIRST,
    };

    beforeEach(() => {
      prisma.variant.findUnique?.mockResolvedValue(existingVariant);
    });

    it('met à jour quand aucun conflit n’est détecté', async () => {
      prisma.variant.findMany?.mockResolvedValue([]);
      prisma.variant.update?.mockResolvedValue({
        ...existingVariant,
        name: 'Variante modifiée',
      });

      const result = await service.update('variant-1', {
        name: 'Variante modifiée',
      });

      expect(result.name).toBe('Variante modifiée');
      expect(prisma.variant.update).toHaveBeenCalledWith({
        where: { id: 'variant-1' },
        data: {
          familyId: undefined,
          name: 'Variante modifiée',
          code: undefined,
          variantLevel: undefined,
        },
        include: { family: true },
      });
    });

    it('refuse les doublons de code sur le même niveau', async () => {
      prisma.variant.findMany?.mockResolvedValue([
        { id: 'variant-2', familyId: 'family-1', name: 'Autre', code: '2', variantLevel: VariantLevel.FIRST },
      ]);

      await expect(
        service.update('variant-1', {
          code: '2',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('refuse les doublons de nom sur le même niveau', async () => {
      prisma.variant.findMany?.mockResolvedValue([
        { id: 'variant-2', familyId: 'family-1', name: 'Doublon', code: '2', variantLevel: VariantLevel.FIRST },
      ]);

      await expect(
        service.update('variant-1', {
          name: 'Doublon',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('valide la nouvelle famille si elle change', async () => {
      prisma.variant.findMany?.mockResolvedValue([]);
      prisma.family.findUnique?.mockResolvedValue({ id: 'family-2' });

      prisma.variant.update?.mockResolvedValue({
        ...existingVariant,
        familyId: 'family-2',
      });

      const result = await service.update('variant-1', {
        familyId: 'family-2',
      });

      expect(result.familyId).toBe('family-2');
    });

    it('rejette si la famille renseignée est inconnue', async () => {
      prisma.variant.findMany?.mockResolvedValue([]);
      prisma.family.findUnique?.mockResolvedValue(null);

      await expect(
        service.update('variant-1', {
          familyId: 'unknown',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});

