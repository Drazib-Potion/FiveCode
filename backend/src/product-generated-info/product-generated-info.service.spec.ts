import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ProductGeneratedInfoService } from './product-generated-info.service';
import { createPrismaMock } from '../test-utils/prisma-mock';
import { PrismaService } from '../prisma/prisma.service';
import { TechnicalCharacteristicsService } from '../technical-characteristics/technical-characteristics.service';
import { VariantLevel } from '../variants/dto/create-variant.dto';

const createTechnicalServiceMock = () => ({
  findAll: jest.fn(),
});

describe('ProductGeneratedInfoService', () => {
  let service: ProductGeneratedInfoService;
  let prisma: ReturnType<typeof createPrismaMock>;
  let technicalService: ReturnType<typeof createTechnicalServiceMock>;

  beforeEach(() => {
    prisma = createPrismaMock();
    technicalService = createTechnicalServiceMock();
    service = new ProductGeneratedInfoService(
      prisma as unknown as PrismaService,
      technicalService as unknown as TechnicalCharacteristicsService,
    );
  });

  describe('create', () => {
    it('rejette si le produit est introuvable', async () => {
      prisma.product.findUnique?.mockResolvedValue(null);

      await expect(
        service.create(
          {
            productId: 'product-1',
            values: {},
          },
          'test@test.com',
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("rejette si la variante n'appartient pas à la famille du produit", async () => {
      prisma.product.findUnique?.mockResolvedValue({
        id: 'product-1',
        familyId: 'family-1',
        productType: { code: 'PT', name: 'Type' },
        code: 'PROD1',
      });
      prisma.variant.findUnique?.mockResolvedValue({
        id: 'variant-1',
        familyId: 'family-2',
        name: 'Variante',
        variantLevel: VariantLevel.FIRST,
        code: '01',
      });
      technicalService.findAll.mockResolvedValue({ data: [] });
      prisma.productGeneratedInfo.findMany?.mockResolvedValue([]);

      await expect(
        service.create(
          {
            productId: 'product-1',
            variant1Id: 'variant-1',
            values: {},
          },
          'test@test.com',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejette si le niveau de variante ne correspond pas', async () => {
      prisma.product.findUnique?.mockResolvedValue({
        id: 'product-1',
        familyId: 'family-1',
        productType: { code: 'PT', name: 'Type' },
        code: 'PROD1',
      });
      prisma.variant.findUnique?.mockResolvedValueOnce({
        id: 'variant-1',
        familyId: 'family-1',
        name: 'Variante',
        variantLevel: VariantLevel.SECOND,
        code: '01',
      });
      technicalService.findAll.mockResolvedValue({ data: [] });
      prisma.productGeneratedInfo.findMany?.mockResolvedValue([]);

      await expect(
        service.create(
          {
            productId: 'product-1',
            variant1Id: 'variant-1',
            values: {},
          },
          'test@test.com',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('crée une info générée quand toutes les validations passent', async () => {
      const product = {
        id: 'product-1',
        familyId: 'family-1',
        productType: { code: 'PT', name: 'Type' },
        code: 'PROD1',
      };
      prisma.product.findUnique?.mockResolvedValue(product);
      prisma.variant.findUnique
        ?.mockResolvedValueOnce({
          id: 'variant-1',
          familyId: 'family-1',
          name: 'V1',
          variantLevel: VariantLevel.FIRST,
          code: '01',
        })
        .mockResolvedValueOnce({
          id: 'variant-2',
          familyId: 'family-1',
          name: 'V2',
          variantLevel: VariantLevel.SECOND,
          code: '02',
        });
      technicalService.findAll.mockResolvedValue({ data: [] });
      prisma.productGeneratedInfo.findMany?.mockResolvedValue([]);
      const createdInfo = {
        id: 'generated-1',
        generatedCode: 'FPTPROD10102000001',
      };
      prisma.productGeneratedInfo.create?.mockResolvedValue(createdInfo);
      const expectedFull = { ...createdInfo, product };
      jest.spyOn(service, 'findOne').mockResolvedValue(expectedFull as any);

      const result = await service.create(
        {
          productId: 'product-1',
          variant1Id: 'variant-1',
          variant2Id: 'variant-2',
          values: {},
        },
        'test@test.com',
      );

      expect(prisma.productGeneratedInfo.create).toHaveBeenCalledWith({
        data: {
          productId: 'product-1',
          variant1Id: 'variant-1',
          variant2Id: 'variant-2',
          generatedCode: expect.any(String),
          updatedBy: 'test@test.com',
          createdBy: 'test@test.com',
        },
        include: {
          product: { include: { family: true } },
          variant1: true,
          variant2: true,
        },
      });
      expect(result).toEqual(expectedFull);
    });

    it('considère les valeurs techniques comme identiques sans tenir compte de la casse', async () => {
      const product = {
        id: 'product-1',
        familyId: 'family-1',
        productType: { code: 'PT', name: 'Type' },
        code: 'PROD1',
      };
      prisma.product.findUnique?.mockResolvedValue(product);
      technicalService.findAll.mockResolvedValue({
        data: [
          {
            id: 'tc-1',
            name: 'Couleur',
            families: [{ familyId: 'family-1' }],
            variants: [],
          },
        ],
      });
      prisma.productGeneratedInfo.findMany?.mockResolvedValue([
        {
          id: 'generated-1',
          productId: 'product-1',
          variant1Id: null,
          variant2Id: null,
          technicalCharacteristics: [
            {
              technicalCharacteristicId: 'tc-1',
              value: 'Blue',
              technicalCharacteristic: { id: 'tc-1' },
            },
          ],
        },
      ]);

      await expect(
        service.create(
          {
            productId: 'product-1',
            values: { 'tc-1': 'blue' },
          },
          'test@test.com',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
