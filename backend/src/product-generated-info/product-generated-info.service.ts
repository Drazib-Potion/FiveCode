import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductGeneratedInfoDto } from './dto/create-product-generated-info.dto';
import { UpdateProductGeneratedInfoDto } from './dto/update-product-generated-info.dto';
import { TechnicalCharacteristicsService } from '../technical-characteristics/technical-characteristics.service';
import {
  normalizeString,
  normalizeStringForStorage,
} from '../utils/string-normalizer';

@Injectable()
export class ProductGeneratedInfoService {
  constructor(
    private prisma: PrismaService,
    private technicalCharacteristicsService: TechnicalCharacteristicsService,
  ) {}

  async create(createDto: CreateProductGeneratedInfoDto, userEmail: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: createDto.productId },
      include: {
        family: true,
        productType: true,
      },
    });

    if (!product) {
      throw new NotFoundException(
        `Product with ID ${createDto.productId} not found`,
      );
    }

    const variantChecks = async (
      variantId: string,
      expectedLevel: 'FIRST' | 'SECOND',
    ) => {
      const variant = await this.prisma.variant.findUnique({
        where: { id: variantId },
      });

      if (!variant) {
        throw new NotFoundException('Variant not found');
      }

      if (variant.familyId !== product.familyId) {
        throw new BadRequestException(
          `Variant ${variant.name} does not belong to the product's family`,
        );
      }

      if (variant.variantLevel !== expectedLevel) {
        throw new BadRequestException(
          `Variant ${variant.name} must be of type ${expectedLevel === 'FIRST' ? 'Variante 1' : 'Variante 2'}`,
        );
      }

      if (!variant.code) {
        throw new BadRequestException(
          `Variant ${variant.name} must have a code defined`,
        );
      }

      return variant;
    };

    const variant1 = createDto.variant1Id
      ? await variantChecks(createDto.variant1Id, 'FIRST')
      : null;
    const variant2 = createDto.variant2Id
      ? await variantChecks(createDto.variant2Id, 'SECOND')
      : null;

    const selectedVariantIds = [variant1?.id, variant2?.id].filter(
      (id): id is string => Boolean(id),
    );

    const allTechnicalCharacteristicsResponse =
      await this.technicalCharacteristicsService.findAll();
    const allTechnicalCharacteristics = Array.isArray(
      allTechnicalCharacteristicsResponse,
    )
      ? allTechnicalCharacteristicsResponse
      : allTechnicalCharacteristicsResponse.data;

    const applicableTechnicalCharacteristics =
      allTechnicalCharacteristics.filter((technicalCharacteristic: any) => {
        const isAssociatedWithFamily = technicalCharacteristic.families?.some(
          (tcFamily: any) => tcFamily.familyId === product.familyId,
        );

        if (!isAssociatedWithFamily) {
          return false;
        }

        const associatedVariants = (technicalCharacteristic.variants || [])
          .filter(
            (tcVariant: any) => tcVariant.variant && tcVariant.variant.familyId,
          )
          .map((tcVariant: any) => ({
            variantId: tcVariant.variantId,
            familyId: tcVariant.variant.familyId,
          }));

        const variantsForThisFamily = associatedVariants.filter(
          (v) => v.familyId === product.familyId,
        );

        if (variantsForThisFamily.length === 0) {
          return selectedVariantIds.length === 0;
        }

        const variantIdsForThisFamily = variantsForThisFamily.map(
          (v) => v.variantId,
        );
        if (selectedVariantIds.length > 0) {
          return selectedVariantIds.some((variantId) =>
            variantIdsForThisFamily.includes(variantId),
          );
        }
        return false;
      });


    const uniqueTechnicalCharacteristics = Array.from(
      new Map(
        applicableTechnicalCharacteristics.map(
          (technicalCharacteristic: any) => [
            technicalCharacteristic.id,
            technicalCharacteristic,
          ],
        ),
      ).values(),
    );

    const allProductInfos = await this.prisma.productGeneratedInfo.findMany({
      where: {
        productId: createDto.productId,
        variant1Id: variant1?.id ?? null,
        variant2Id: variant2?.id ?? null,
      },
      include: {
        variant1: true,
        variant2: true,
        technicalCharacteristics: {
          include: {
            technicalCharacteristic: true,
          },
        },
      },
    });

    const exactVariantMatches = allProductInfos;

    if (exactVariantMatches.length > 0) {
      const requestValues: Record<string, string | null> = {};
      for (const technicalCharacteristic of uniqueTechnicalCharacteristics) {
        const value = createDto.values?.[(technicalCharacteristic as any).id];
        if (value !== undefined && value !== null && value !== '') {
          requestValues[(technicalCharacteristic as any).id] = String(value);
        } else {
          requestValues[(technicalCharacteristic as any).id] = null;
        }
      }

      for (const match of exactVariantMatches) {
        const matchValues: Record<string, string | null> = {};
        for (const technicalCharacteristic of uniqueTechnicalCharacteristics) {
          matchValues[(technicalCharacteristic as any).id] = null;
        }
        if (match.technicalCharacteristics) {
          for (const tc of match.technicalCharacteristics) {
            const technicalCharacteristicId = tc.technicalCharacteristic.id;
            if (matchValues.hasOwnProperty(technicalCharacteristicId)) {
              matchValues[technicalCharacteristicId] = tc.value;
            }
          }
        }

        let allValuesMatch = true;

        if (uniqueTechnicalCharacteristics.length === 0) {
          const matchHasNoTechChars =
            !match.technicalCharacteristics ||
            match.technicalCharacteristics.length === 0;
          const requestHasNoTechChars =
            !createDto.values ||
            Object.keys(createDto.values || {}).length === 0;

          if (matchHasNoTechChars && requestHasNoTechChars) {
            allValuesMatch = true;
          } else {
            allValuesMatch = false;
          }
        } else {
          for (const technicalCharacteristic of uniqueTechnicalCharacteristics) {
            const technicalCharacteristicId = (technicalCharacteristic as any)
              .id;
            const requestValue =
              requestValues[technicalCharacteristicId] ?? null;
            const matchValue = matchValues[technicalCharacteristicId] ?? null;

            const normalizedRequestValue = requestValue
              ? normalizeString(String(requestValue).trim())
              : null;
            const normalizedMatchValue = matchValue
              ? normalizeString(String(matchValue).trim())
              : null;

            if (normalizedRequestValue !== normalizedMatchValue) {
              allValuesMatch = false;
              break;
            }
          }
        }

        if (allValuesMatch) {
          throw new BadRequestException(
            'Un code généré identique existe déjà pour ce produit avec les mêmes variantes et les mêmes valeurs de caractéristiques techniques.',
          );
        }
      }
    }

    const variant1Code = variant1?.code ?? '0';
    const variant2Code = variant2?.code ?? '0';
    const codePrefix = `F${product.productType.code}${product.code}${variant1Code}${variant2Code}`;

    const existingIncrements = new Set<number>();
    for (const info of exactVariantMatches) {
      if (info.generatedCode && info.generatedCode.startsWith(codePrefix)) {
        const incrementPart = info.generatedCode.slice(-6);
        const incrementNumber = parseInt(incrementPart, 10);
        if (!isNaN(incrementNumber)) {
          existingIncrements.add(incrementNumber);
        }
      }
    }

    let increment = 1;
    while (existingIncrements.has(increment)) {
      increment++;
    }

    let generatedCode: string;
    let codeExists = true;

    while (codeExists) {
      const incrementStr = String(increment).padStart(6, '0');
      generatedCode = `${codePrefix}${incrementStr}`;

      const existingCode = await this.prisma.productGeneratedInfo.findUnique({
        where: { generatedCode },
      });

      if (!existingCode) {
        codeExists = false;
      } else {
        increment++;
      }
    }

    if (
      uniqueTechnicalCharacteristics.length > 0 &&
      createDto.values &&
      Object.keys(createDto.values).length > 0
    ) {
      for (const technicalCharacteristic of uniqueTechnicalCharacteristics) {
        const value = createDto.values[(technicalCharacteristic as any).id];
        if (
          createDto.values.hasOwnProperty(
            (technicalCharacteristic as any).id,
          ) &&
          (value === null || value === '')
        ) {
          throw new BadRequestException(
            `La valeur pour la caractéristique technique ${(technicalCharacteristic as any).name} (${(technicalCharacteristic as any).id}) ne peut pas être vide`,
          );
        }
      }
    }

    if (
      uniqueTechnicalCharacteristics.length > 0 &&
      createDto.values &&
      Object.keys(createDto.values).length > 0
    ) {
      for (const technicalCharacteristic of uniqueTechnicalCharacteristics) {
        const uniqueInItself = (technicalCharacteristic as any).uniqueInItself;
        if (uniqueInItself) {
          const technicalCharacteristicId = (technicalCharacteristic as any).id;
          const value = createDto.values[technicalCharacteristicId];
          
          if (value !== undefined && value !== null && value !== '') {
            const normalizedValue = this.normalizeTechValue(value);
            const normalizedValueForSearch = normalizeString(normalizedValue.trim());
            
            const existingProductTechChars = await this.prisma.productTechnicalCharacteristic.findMany({
              where: {
                technicalCharacteristicId,
              },
              include: {
                generatedInfo: {
                  include: {
                    product: true,
                  },
                },
              },
            });

            for (const existingProductTechChar of existingProductTechChars) {
              const existingNormalizedValue = normalizeString(existingProductTechChar.value.trim());
              if (existingNormalizedValue === normalizedValueForSearch) {
                throw new BadRequestException(
                  `La valeur "${value}" pour la caractéristique technique "${(technicalCharacteristic as any).name}" est déjà utilisée dans un autre code généré (${existingProductTechChar.generatedInfo.generatedCode}). Cette caractéristique doit avoir une valeur unique.`,
                );
              }
            }
          }
        }
      }
    }

    const generatedInfo = await this.prisma.productGeneratedInfo.create({
      data: {
        productId: createDto.productId,
        variant1Id: variant1?.id ?? null,
        variant2Id: variant2?.id ?? null,
        generatedCode,
        createdBy: userEmail,
        updatedBy: userEmail,
      },
      include: {
        product: {
          include: {
            family: true,
          },
        },
        variant1: true,
        variant2: true,
      },
    });

    if (uniqueTechnicalCharacteristics.length > 0 && createDto.values) {
      for (const technicalCharacteristic of uniqueTechnicalCharacteristics) {
        const value = createDto.values[(technicalCharacteristic as any).id];
        if (value !== undefined && value !== null && value !== '') {
          const normalizedValue = this.normalizeTechValue(value);
          this.ensureValueLength(normalizedValue);
          await this.prisma.productTechnicalCharacteristic.create({
            data: {
              generatedInfoId: generatedInfo.id,
              technicalCharacteristicId: (technicalCharacteristic as any).id,
              value: normalizedValue,
            },
          });
        }
      }
    }

    return this.findOne(generatedInfo.id);
  }

  private ensureValueLength(value: string) {
    const MAX_LENGTH = 30;
    if (value.length > MAX_LENGTH) {
      throw new BadRequestException(
        `Les valeurs des caractéristiques techniques sont limitées à ${MAX_LENGTH} caractères`,
      );
    }
  }

  private normalizeTechValue(value: any) {
    return normalizeStringForStorage(String(value));
  }

  async update(
    id: string,
    updateDto: UpdateProductGeneratedInfoDto,
    userEmail: string,
  ) {
    const currentGeneratedInfo = await this.findOne(id);
    
    if (updateDto.values) {
      const product = await this.prisma.product.findUnique({
        where: { id: currentGeneratedInfo.productId },
        include: {
          family: true,
          productType: true,
        },
      });

      if (!product) {
        throw new NotFoundException(
          `Product with ID ${currentGeneratedInfo.productId} not found`,
        );
      }

      const variant1 = currentGeneratedInfo.variant1;
      const variant2 = currentGeneratedInfo.variant2;
      const selectedVariantIds = [variant1?.id, variant2?.id].filter(
        (id): id is string => Boolean(id),
      );

      const allTechnicalCharacteristicsResponse =
        await this.technicalCharacteristicsService.findAll();
      const allTechnicalCharacteristics = Array.isArray(
        allTechnicalCharacteristicsResponse,
      )
        ? allTechnicalCharacteristicsResponse
        : allTechnicalCharacteristicsResponse.data;

      const applicableTechnicalCharacteristics =
        allTechnicalCharacteristics.filter((technicalCharacteristic: any) => {
          const isAssociatedWithFamily = technicalCharacteristic.families?.some(
            (tcFamily: any) => tcFamily.familyId === product.familyId,
          );

          if (!isAssociatedWithFamily) {
            return false;
          }

          const associatedVariants = (technicalCharacteristic.variants || [])
            .filter(
              (tcVariant: any) => tcVariant.variant && tcVariant.variant.familyId,
            )
            .map((tcVariant: any) => ({
              variantId: tcVariant.variantId,
              familyId: tcVariant.variant.familyId,
            }));

          const variantsForThisFamily = associatedVariants.filter(
            (v) => v.familyId === product.familyId,
          );

          if (variantsForThisFamily.length === 0) {
            return selectedVariantIds.length === 0;
          }

          const variantIdsForThisFamily = variantsForThisFamily.map(
            (v) => v.variantId,
          );
          if (selectedVariantIds.length > 0) {
            return selectedVariantIds.some((variantId) =>
              variantIdsForThisFamily.includes(variantId),
            );
          }
          return false;
        });


      const uniqueTechnicalCharacteristics = Array.from(
        new Map(
          applicableTechnicalCharacteristics.map(
            (technicalCharacteristic: any) => [
              technicalCharacteristic.id,
              technicalCharacteristic,
            ],
          ),
        ).values(),
      );

      const allProductInfos = await this.prisma.productGeneratedInfo.findMany({
        where: {
          productId: currentGeneratedInfo.productId,
        variant1Id: variant1?.id ?? null,
        variant2Id: variant2?.id ?? null,
        id: { not: id },
        },
        include: {
          variant1: true,
          variant2: true,
          technicalCharacteristics: {
            include: {
              technicalCharacteristic: true,
            },
          },
        },
      });

      if (allProductInfos.length > 0) {
        const requestValues: Record<string, string | null> = {};
        for (const technicalCharacteristic of uniqueTechnicalCharacteristics) {
          const value = updateDto.values?.[(technicalCharacteristic as any).id];
          if (value !== undefined && value !== null && value !== '') {
            requestValues[(technicalCharacteristic as any).id] = String(value);
          } else {
            requestValues[(technicalCharacteristic as any).id] = null;
          }
        }

        for (const match of allProductInfos) {
          const matchValues: Record<string, string | null> = {};
          for (const technicalCharacteristic of uniqueTechnicalCharacteristics) {
            matchValues[(technicalCharacteristic as any).id] = null;
          }
          if (match.technicalCharacteristics) {
            for (const tc of match.technicalCharacteristics) {
              const technicalCharacteristicId = tc.technicalCharacteristic.id;
              if (matchValues.hasOwnProperty(technicalCharacteristicId)) {
                matchValues[technicalCharacteristicId] = tc.value;
              }
            }
          }

          let allValuesMatch = true;

          if (uniqueTechnicalCharacteristics.length === 0) {
            const matchHasNoTechChars =
              !match.technicalCharacteristics ||
              match.technicalCharacteristics.length === 0;
            const requestHasNoTechChars =
              !updateDto.values ||
              Object.keys(updateDto.values || {}).length === 0;

            if (matchHasNoTechChars && requestHasNoTechChars) {
              allValuesMatch = true;
            } else {
              allValuesMatch = false;
            }
          } else {
            for (const technicalCharacteristic of uniqueTechnicalCharacteristics) {
              const technicalCharacteristicId = (technicalCharacteristic as any)
                .id;
              const requestValue =
                requestValues[technicalCharacteristicId] ?? null;
              const matchValue = matchValues[technicalCharacteristicId] ?? null;

              const normalizedRequestValue = requestValue
                ? normalizeString(String(requestValue).trim())
                : null;
              const normalizedMatchValue = matchValue
                ? normalizeString(String(matchValue).trim())
                : null;

              if (normalizedRequestValue !== normalizedMatchValue) {
                allValuesMatch = false;
                break;
              }
            }
          }

          if (allValuesMatch) {
            throw new BadRequestException(
              'Un code généré identique existe déjà pour ce produit avec les mêmes variantes et les mêmes valeurs de caractéristiques techniques.',
            );
          }
        }
      }
    }

    if (updateDto.values) {
      const technicalCharacteristicIds = Object.keys(updateDto.values);
      if (technicalCharacteristicIds.length > 0) {
        const technicalCharacteristics = await this.prisma.technicalCharacteristic.findMany({
          where: {
            id: { in: technicalCharacteristicIds },
            uniqueInItself: true,
          },
        });

        for (const technicalCharacteristic of technicalCharacteristics) {
          const value = updateDto.values[technicalCharacteristic.id];
          
          if (value !== undefined && value !== null && value !== '') {
            const normalizedValue = this.normalizeTechValue(value);
            const normalizedValueForSearch = normalizeString(normalizedValue.trim());
            
            const existingProductTechChars = await this.prisma.productTechnicalCharacteristic.findMany({
              where: {
                technicalCharacteristicId: technicalCharacteristic.id,
                generatedInfoId: { not: id }, // Exclure le code généré actuel
              },
              include: {
                generatedInfo: {
                  include: {
                    product: true,
                  },
                },
              },
            });

            for (const existingProductTechChar of existingProductTechChars) {
              const existingNormalizedValue = normalizeString(existingProductTechChar.value.trim());
              if (existingNormalizedValue === normalizedValueForSearch) {
                throw new BadRequestException(
                  `La valeur "${value}" pour la caractéristique technique "${technicalCharacteristic.name}" est déjà utilisée dans un autre code généré (${existingProductTechChar.generatedInfo.generatedCode}). Cette caractéristique doit avoir une valeur unique.`,
                );
              }
            }
          }
        }
      }
    }

    if (updateDto.values) {
      await this.prisma.productTechnicalCharacteristic.deleteMany({
        where: { generatedInfoId: id },
      });

      for (const [technicalCharacteristicId, value] of Object.entries(
        updateDto.values,
      )) {
        if (value !== undefined && value !== null && value !== '') {
          const normalizedValue = this.normalizeTechValue(value);
          this.ensureValueLength(normalizedValue);
          await this.prisma.productTechnicalCharacteristic.create({
            data: {
              generatedInfoId: id,
              technicalCharacteristicId,
              value: normalizedValue,
            },
          });
        }
      }
    }

    return this.prisma.productGeneratedInfo.update({
      where: { id },
      data: {
        updatedBy: userEmail,
      },
      include: {
        product: {
          include: {
            family: true,
          },
        },
        variant1: true,
        variant2: true,
        technicalCharacteristics: {
          include: {
            technicalCharacteristic: true,
          },
        },
      },
    });
  }

  async findAll() {
    return this.prisma.productGeneratedInfo.findMany({
      include: {
        product: {
          include: {
            family: true,
          },
        },
        variant1: true,
        variant2: true,
        technicalCharacteristics: {
          include: {
            technicalCharacteristic: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findByProduct(productId: string) {
    return this.prisma.productGeneratedInfo.findMany({
      where: { productId },
      include: {
        product: {
          include: {
            family: true,
          },
        },
        variant1: true,
        variant2: true,
        technicalCharacteristics: {
          include: {
            technicalCharacteristic: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const generatedInfo = await this.prisma.productGeneratedInfo.findUnique({
      where: { id },
      include: {
        product: {
          include: {
            family: true,
          },
        },
        variant1: true,
        variant2: true,
        technicalCharacteristics: {
          include: {
            technicalCharacteristic: true,
          },
        },
      },
    });

    if (!generatedInfo) {
      throw new NotFoundException(
        `ProductGeneratedInfo with ID ${id} not found`,
      );
    }

    return generatedInfo;
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.productGeneratedInfo.delete({
      where: { id },
    });
  }
}
