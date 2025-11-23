import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductGeneratedInfoDto } from './dto/create-product-generated-info.dto';
import { TechnicalCharacteristicsService } from '../technical-characteristics/technical-characteristics.service';

@Injectable()
export class ProductGeneratedInfoService {
  constructor(
    private prisma: PrismaService,
    private technicalCharacteristicsService: TechnicalCharacteristicsService,
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

    // Vérifier la variante si elle est fournie
    let variant = null;
    if (createDto.variantId) {
      variant = await this.prisma.variant.findUnique({
        where: { id: createDto.variantId },
      });

      if (!variant) {
        throw new NotFoundException('Variant not found');
      }

      // Vérifier que la variante appartient à la famille du produit
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

    // Récupérer les caractéristiques techniques applicables AVANT de vérifier les doublons
    const allTechnicalCharacteristicsResponse = await this.technicalCharacteristicsService.findAll();
    const allTechnicalCharacteristics = Array.isArray(allTechnicalCharacteristicsResponse) 
      ? allTechnicalCharacteristicsResponse 
      : allTechnicalCharacteristicsResponse.data;

    // Filtrer pour avoir les caractéristiques techniques qui s'appliquent
    const applicableTechnicalCharacteristics = allTechnicalCharacteristics.filter(
      (technicalCharacteristic: any) => {
        // Vérifier si la caractéristique est associée à la famille du produit
        const isAssociatedWithFamily = technicalCharacteristic.families?.some(
          (tcFamily: any) => tcFamily.familyId === product.familyId
        );

        if (!isAssociatedWithFamily) {
          return false;
        }

        // Récupérer les variantes associées avec leur famille (en filtrant les null/undefined)
        const associatedVariants = (technicalCharacteristic.variants || [])
          .filter((tcVariant: any) => tcVariant.variant && tcVariant.variant.familyId) // Filtrer les variantes invalides
          .map((tcVariant: any) => ({
            variantId: tcVariant.variantId,
            familyId: tcVariant.variant.familyId,
          }));

        // Filtrer les variantes pour ne garder que celles qui appartiennent à la famille du produit
        const variantsForThisFamily = associatedVariants.filter(
          (v) => v.familyId === product.familyId
        );

        // Si la caractéristique n'a pas de variantes pour cette famille, elle s'applique à toute la famille
        if (variantsForThisFamily.length === 0) {
          return true;
        }

        // Si la caractéristique a des variantes pour cette famille, vérifier si elle correspond à la variante sélectionnée
        const variantIdsForThisFamily = variantsForThisFamily.map((v) => v.variantId);
        if (createDto.variantId) {
          return variantIdsForThisFamily.includes(createDto.variantId);
        }
        // Si aucune variante n'est sélectionnée, la caractéristique s'applique à toute la famille
        return true;
      }
    );

    // Dédupliquer par ID
    const uniqueTechnicalCharacteristics = Array.from(
      new Map(applicableTechnicalCharacteristics.map((technicalCharacteristic: any) => [technicalCharacteristic.id, technicalCharacteristic])).values(),
    );

    // Compter combien de ProductGeneratedInfo existent déjà avec cette combinaison produit+variante
    const allProductInfos = await this.prisma.productGeneratedInfo.findMany({
      where: {
        productId: createDto.productId,
        variantId: createDto.variantId || null,
      },
      include: {
        variant: true,
        technicalCharacteristics: {
          include: {
            technicalCharacteristic: true,
          },
        },
      },
    });

    // Tous ceux qui ont la même variante (ou pas de variante si variantId n'est pas fourni)
    const exactVariantMatches = allProductInfos;

    // Vérifier s'il existe un doublon exact (mêmes variantes ET mêmes valeurs pour toutes les caractéristiques techniques)
    if (exactVariantMatches.length > 0) {
      // Préparer les valeurs des caractéristiques techniques de la requête
      // On doit vérifier TOUTES les caractéristiques techniques applicables
      const requestValues: Record<string, string | null> = {};
      for (const technicalCharacteristic of uniqueTechnicalCharacteristics) {
        const value = createDto.values?.[(technicalCharacteristic as any).id];
        if (value !== undefined && value !== null && value !== '') {
          requestValues[(technicalCharacteristic as any).id] = String(value);
        } else {
          // Marquer comme null si non fournie
          requestValues[(technicalCharacteristic as any).id] = null;
        }
      }

      // Vérifier chaque match pour voir si les valeurs des caractéristiques techniques sont identiques
      for (const match of exactVariantMatches) {
        // Préparer les valeurs des caractéristiques techniques de ce match
        const matchValues: Record<string, string | null> = {};
        // Initialiser toutes les caractéristiques techniques applicables
        for (const technicalCharacteristic of uniqueTechnicalCharacteristics) {
          matchValues[(technicalCharacteristic as any).id] = null;
        }
        // Remplir avec les valeurs existantes
        if (match.technicalCharacteristics) {
          for (const tc of match.technicalCharacteristics) {
            const technicalCharacteristicId = tc.technicalCharacteristic.id;
            if (matchValues.hasOwnProperty(technicalCharacteristicId)) {
              matchValues[technicalCharacteristicId] = tc.value;
            }
          }
        }

        // Comparer TOUTES les caractéristiques techniques applicables
        let allValuesMatch = true;

        // Si aucune caractéristique technique n'est applicable, vérifier que le match n'a pas non plus de caractéristiques techniques
        if (uniqueTechnicalCharacteristics.length === 0) {
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
          for (const technicalCharacteristic of uniqueTechnicalCharacteristics) {
            const technicalCharacteristicId = (technicalCharacteristic as any).id;
            const requestValue = requestValues[technicalCharacteristicId] ?? null; // S'assurer que c'est null si non défini
            const matchValue = matchValues[technicalCharacteristicId] ?? null; // S'assurer que c'est null si non défini

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

    // Générer le code : F{productType.code}{product.code}{variant.code}{incrément6digits}
    const variantCode = variant?.code || '';
    const incrementStr = String(increment).padStart(6, '0');
    const generatedCode = `F${product.productType.code}${product.code}${variantCode}${incrementStr}`;

    // Valider que toutes les caractéristiques techniques définies sont fournies (si des caractéristiques techniques existent et des valeurs sont fournies)
    if (
      uniqueTechnicalCharacteristics.length > 0 &&
      createDto.values &&
      Object.keys(createDto.values).length > 0
    ) {
      for (const technicalCharacteristic of uniqueTechnicalCharacteristics) {
        const value = createDto.values[(technicalCharacteristic as any).id];
        if (
          createDto.values.hasOwnProperty((technicalCharacteristic as any).id) &&
          (value === null || value === '')
        ) {
          throw new BadRequestException(
            `La valeur pour la caractéristique technique ${(technicalCharacteristic as any).name} (${(technicalCharacteristic as any).id}) ne peut pas être vide`,
          );
        }
      }
    }

    // Créer la ProductGeneratedInfo avec la variante
    const generatedInfo = await this.prisma.productGeneratedInfo.create({
      data: {
        productId: createDto.productId,
        variantId: createDto.variantId || null,
        generatedCode,
      },
      include: {
        product: {
          include: {
            family: true,
          },
        },
        variant: true,
      },
    });

    // Sauvegarder les valeurs des caractéristiques techniques (seulement si des valeurs sont fournies)
    if (uniqueTechnicalCharacteristics.length > 0 && createDto.values) {
      for (const technicalCharacteristic of uniqueTechnicalCharacteristics) {
        const value = createDto.values[(technicalCharacteristic as any).id];
        if (value !== undefined && value !== null && value !== '') {
          await this.prisma.productTechnicalCharacteristic.create({
            data: {
              generatedInfoId: generatedInfo.id,
              technicalCharacteristicId: (technicalCharacteristic as any).id,
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
        variant: true,
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
        variant: true,
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
        variant: true,
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
