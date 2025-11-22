import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductGeneratedInfoDto } from './dto/create-product-generated-info.dto';
import { FieldsService } from '../fields/fields.service';

@Injectable()
export class ProductGeneratedInfoService {
  constructor(
    private prisma: PrismaService,
    private fieldsService: FieldsService,
  ) {}

  async create(createDto: CreateProductGeneratedInfoDto) {
    // Vérifier que le produit existe
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

    // Vérifier que toutes les variantes existent et appartiennent à la famille du produit
    const variants = await this.prisma.variant.findMany({
      where: {
        id: { in: createDto.variantIds },
      },
    });

    if (variants.length !== createDto.variantIds.length) {
      throw new NotFoundException('One or more variants not found');
    }

    // Vérifier que toutes les variantes appartiennent à la famille du produit
    for (const variant of variants) {
      if (variant.familyId !== product.familyId) {
        throw new BadRequestException(
          `Variant ${variant.name} does not belong to the product's family`,
        );
      }
      if (!variant.code) {
        throw new BadRequestException(
          `Variant ${variant.name} must have a code defined`,
        );
      }
    }

    // Vérifier les exclusions entre variantes sélectionnées
    const exclusions = await this.prisma.variantExclusion.findMany({
      where: {
        variantId1: { in: createDto.variantIds },
      },
    });

    // Vérifier si deux variantes exclues sont sélectionnées
    for (const exclusion of exclusions) {
      if (createDto.variantIds.includes(exclusion.variantId2)) {
        const variant1 = variants.find((v) => v.id === exclusion.variantId1);
        const variant2 = variants.find((v) => v.id === exclusion.variantId2);
        throw new BadRequestException(
          `Les variantes "${variant1?.name}" et "${variant2?.name}" ne peuvent pas être sélectionnées ensemble`,
        );
      }
    }

    // Trier les variantes par leur code pour garantir un ordre cohérent
    const sortedVariants = variants.sort((a, b) =>
      a.code.localeCompare(b.code),
    );

    // Récupérer les caractéristiques techniques applicables AVANT de vérifier les doublons
    const allFields = await this.fieldsService.findAll();

    // Filtrer pour avoir les caractéristiques techniques de la famille ou des variantes sélectionnées
    const applicableFields = allFields.filter(
      (field: any) =>
        (field.familyId === product.familyId && !field.variantId) || // Caractéristiques techniques de la famille
        (field.variantId && createDto.variantIds.includes(field.variantId)), // Caractéristiques techniques des variantes sélectionnées
    );

    // Dédupliquer par ID et trier par position
    const uniqueFields = Array.from(
      new Map(applicableFields.map((field: any) => [field.id, field])).values(),
    ).sort((a: any, b: any) => a.position - b.position);

    // Compter combien de ProductGeneratedInfo existent déjà avec cette combinaison produit+variantes
    const allProductInfos = await this.prisma.productGeneratedInfo.findMany({
      where: {
        productId: createDto.productId,
      },
      include: {
        variants: true,
        technicalCharacteristics: {
          include: {
            technicalCharacteristic: true,
          },
        },
      },
    });

    // Filtrer pour avoir seulement ceux qui ont exactement les mêmes variantes
    const exactVariantMatches = allProductInfos.filter((info) => {
      if (info.variants.length !== createDto.variantIds.length) {
        return false;
      }
      const infoVariantIds = info.variants.map((pv) => pv.variantId).sort();
      const requestedVariantIds = [...createDto.variantIds].sort();
      return (
        infoVariantIds.length === requestedVariantIds.length &&
        infoVariantIds.every((id, index) => id === requestedVariantIds[index])
      );
    });

    // Vérifier s'il existe un doublon exact (mêmes variantes ET mêmes valeurs pour toutes les caractéristiques techniques)
    if (exactVariantMatches.length > 0) {
      // Préparer les valeurs des caractéristiques techniques de la requête
      // On doit vérifier TOUTES les caractéristiques techniques applicables
      const requestValues: Record<string, string | null> = {};
      for (const field of uniqueFields) {
        const value = createDto.values?.[(field as any).id];
        if (value !== undefined && value !== null && value !== '') {
          requestValues[(field as any).id] = String(value);
        } else {
          // Marquer comme null si non fournie
          requestValues[(field as any).id] = null;
        }
      }

      // Vérifier chaque match pour voir si les valeurs des caractéristiques techniques sont identiques
      for (const match of exactVariantMatches) {
        // Préparer les valeurs des caractéristiques techniques de ce match
        const matchValues: Record<string, string | null> = {};
        // Initialiser toutes les caractéristiques techniques applicables
        for (const field of uniqueFields) {
          matchValues[(field as any).id] = null;
        }
        // Remplir avec les valeurs existantes
        if (match.technicalCharacteristics) {
          for (const tc of match.technicalCharacteristics) {
            const fieldId = tc.technicalCharacteristic.id;
            if (matchValues.hasOwnProperty(fieldId)) {
              matchValues[fieldId] = tc.value;
            }
          }
        }

        // Comparer TOUTES les caractéristiques techniques applicables
        let allValuesMatch = true;

        // Si aucune caractéristique technique n'est applicable, vérifier que le match n'a pas non plus de caractéristiques techniques
        if (uniqueFields.length === 0) {
          // Pas de caractéristiques techniques applicables, vérifier si le match n'a pas non plus de caractéristiques techniques
          const matchHasNoTechChars =
            !match.technicalCharacteristics ||
            match.technicalCharacteristics.length === 0;
          const requestHasNoTechChars =
            !createDto.values ||
            Object.keys(createDto.values || {}).length === 0;

          // Si les deux n'ont pas de caractéristiques techniques, c'est un match exact
          if (matchHasNoTechChars && requestHasNoTechChars) {
            allValuesMatch = true;
          } else {
            allValuesMatch = false;
          }
        } else {
          // Comparer toutes les caractéristiques techniques applicables
          // Si une caractéristique n'est pas fournie dans la requête, elle est null
          // Si une caractéristique n'existe pas dans le match, elle est aussi null
          for (const field of uniqueFields) {
            const fieldId = (field as any).id;
            const requestValue = requestValues[fieldId] ?? null; // S'assurer que c'est null si non défini
            const matchValue = matchValues[fieldId] ?? null; // S'assurer que c'est null si non défini

            // Les deux doivent être null ou avoir la même valeur (comparaison stricte)
            if (requestValue !== matchValue) {
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

    // Calculer l'incrément (commence à 1)
    const increment = exactVariantMatches.length + 1;

    // Générer le code : F{productType.code}{product.code}{variant1.code}{variant2.code}...{incrément6digits}
    const variantCodes = sortedVariants.map((v) => v.code).join('');
    const incrementStr = String(increment).padStart(6, '0');
    const generatedCode = `F${product.productType.code}${product.code}${variantCodes}${incrementStr}`;

    // Valider que toutes les caractéristiques techniques définies sont fournies (si des caractéristiques techniques existent et des valeurs sont fournies)
    if (
      uniqueFields.length > 0 &&
      createDto.values &&
      Object.keys(createDto.values).length > 0
    ) {
      for (const field of uniqueFields) {
        const value = createDto.values[(field as any).id];
        if (
          createDto.values.hasOwnProperty((field as any).id) &&
          (value === null || value === '')
        ) {
          throw new BadRequestException(
            `La valeur pour la caractéristique technique ${(field as any).name} (${(field as any).id}) ne peut pas être vide`,
          );
        }
      }
    }

    // Créer la ProductGeneratedInfo avec les variantes
    const generatedInfo = await this.prisma.productGeneratedInfo.create({
      data: {
        productId: createDto.productId,
        generatedCode,
        variants: {
          create: createDto.variantIds.map((variantId) => ({
            variantId,
          })),
        },
      },
      include: {
        product: {
          include: {
            family: true,
          },
        },
        variants: {
          include: {
            variant: true,
          },
        },
      },
    });

    // Sauvegarder les valeurs des caractéristiques techniques (seulement si des valeurs sont fournies)
    if (uniqueFields.length > 0 && createDto.values) {
      for (const field of uniqueFields) {
        const value = createDto.values[(field as any).id];
        if (value !== undefined && value !== null && value !== '') {
          await this.prisma.productTechnicalCharacteristic.create({
            data: {
              generatedInfoId: generatedInfo.id,
              technicalCharacteristicId: (field as any).id,
              value: String(value),
            },
          });
        }
      }
    }

    // Retourner la ProductGeneratedInfo complète
    return this.findOne(generatedInfo.id);
  }

  async findAll() {
    return this.prisma.productGeneratedInfo.findMany({
      include: {
        product: {
          include: {
            family: true,
          },
        },
        variants: {
          include: {
            variant: true,
          },
        },
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
        variants: {
          include: {
            variant: true,
          },
        },
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
        variants: {
          include: {
            variant: true,
          },
        },
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
