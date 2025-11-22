import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTechnicalCharacteristicDto } from './dto/create-technical-characteristic.dto';
import { UpdateTechnicalCharacteristicDto } from './dto/update-technical-characteristic.dto';

@Injectable()
export class TechnicalCharacteristicsService {
  constructor(private prisma: PrismaService) {}

  async create(createTechnicalCharacteristicDto: CreateTechnicalCharacteristicDto) {
    // Valider le type
    const validTypes = ['string', 'number', 'boolean', 'select'];
    if (!validTypes.includes(createTechnicalCharacteristicDto.type)) {
      throw new BadRequestException(`Type de caractéristique technique invalide. Doit être l'un de : ${validTypes.join(', ')}`);
    }

    // Vérifier qu'au moins une famille ou une variante est fournie
    const hasFamilies = createTechnicalCharacteristicDto.familyIds && createTechnicalCharacteristicDto.familyIds.length > 0;
    const hasVariants = createTechnicalCharacteristicDto.variantIds && createTechnicalCharacteristicDto.variantIds.length > 0;
    
    if (!hasFamilies && !hasVariants) {
      throw new BadRequestException('Au moins une famille ou une variante doit être fournie');
    }

    // Vérifier que les familles existent
    if (hasFamilies) {
      const families = await this.prisma.family.findMany({
        where: { id: { in: createTechnicalCharacteristicDto.familyIds! } },
      });
      if (families.length !== createTechnicalCharacteristicDto.familyIds!.length) {
        throw new NotFoundException('Une ou plusieurs familles n\'existent pas');
      }
    }

    // Vérifier que les variantes existent
    if (hasVariants) {
      const variants = await this.prisma.variant.findMany({
        where: { id: { in: createTechnicalCharacteristicDto.variantIds! } },
      });
      if (variants.length !== createTechnicalCharacteristicDto.variantIds!.length) {
        throw new NotFoundException('Une ou plusieurs variantes n\'existent pas');
      }
    }

    return this.prisma.technicalCharacteristic.create({
      data: {
        name: createTechnicalCharacteristicDto.name,
        type: createTechnicalCharacteristicDto.type,
        families: hasFamilies ? {
          create: createTechnicalCharacteristicDto.familyIds!.map(familyId => ({ familyId }))
        } : undefined,
        variants: hasVariants ? {
          create: createTechnicalCharacteristicDto.variantIds!.map(variantId => ({ variantId }))
        } : undefined,
      },
      include: {
        families: {
          include: { family: true }
        },
        variants: {
          include: { variant: true }
        },
      },
    });
  }

  async findAll() {
    return this.prisma.technicalCharacteristic.findMany({
      include: {
        families: {
          include: { family: true },
        },
        variants: {
          include: {
            variant: {
              include: { family: true },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findByFamily(familyId: string) {
    return this.prisma.technicalCharacteristic.findMany({
      where: {
        families: {
          some: { familyId }
        }
      },
      include: {
        families: {
          include: { family: true }
        },
        variants: {
          include: { variant: true }
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findByVariant(variantId: string) {
    return this.prisma.technicalCharacteristic.findMany({
      where: {
        variants: {
          some: { variantId }
        }
      },
      include: {
        families: {
          include: { family: true }
        },
        variants: {
          include: { variant: true }
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findByFamilyAndVariant(familyId: string, variantIds: string[]) {
    // Récupérer toutes les caractéristiques techniques associées à la famille
    const allTechnicalCharacteristics = await this.prisma.technicalCharacteristic.findMany({
      where: {
        families: {
          some: { familyId },
        },
      },
      include: {
        families: {
          include: { family: true },
        },
        variants: {
          include: {
            variant: {
              include: { family: true },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Filtrer selon la logique : si pas de variantes pour cette famille, s'applique à toute la famille
    // Sinon, vérifier si une des variantes sélectionnées correspond
    return allTechnicalCharacteristics.filter((technicalCharacteristic) => {
      // Récupérer les variantes associées avec leur famille (en filtrant les null/undefined)
      const associatedVariants = (technicalCharacteristic.variants || [])
        .filter((tcVariant: any) => tcVariant.variant && tcVariant.variant.familyId) // Filtrer les variantes invalides
        .map((tcVariant: any) => ({
          variantId: tcVariant.variantId,
          familyId: tcVariant.variant.familyId,
        }));

      // Filtrer les variantes pour ne garder que celles qui appartiennent à la famille
      const variantsForThisFamily = associatedVariants.filter(
        (v) => v.familyId === familyId
      );

      // Si la caractéristique n'a pas de variantes pour cette famille, elle s'applique à toute la famille
      if (variantsForThisFamily.length === 0) {
        return true;
      }

      // Si la caractéristique a des variantes pour cette famille, vérifier si une correspond aux variantes sélectionnées
      const variantIdsForThisFamily = variantsForThisFamily.map((v) => v.variantId);
      return variantIds.some((variantId) =>
        variantIdsForThisFamily.includes(variantId)
      );
    });
  }

  async findOne(id: string) {
    const technicalCharacteristic = await this.prisma.technicalCharacteristic.findUnique({
      where: { id },
      include: {
        families: {
          include: { family: true }
        },
        variants: {
          include: { variant: true }
        },
      },
    });

    if (!technicalCharacteristic) {
      throw new NotFoundException(`Caractéristique technique avec l'ID ${id} introuvable`);
    }

    return technicalCharacteristic;
  }

  async update(id: string, updateTechnicalCharacteristicDto: UpdateTechnicalCharacteristicDto) {
    await this.findOne(id);

    if (updateTechnicalCharacteristicDto.type) {
      const validTypes = ['string', 'number', 'boolean', 'select'];
      if (!validTypes.includes(updateTechnicalCharacteristicDto.type)) {
        throw new BadRequestException(`Type de caractéristique technique invalide. Doit être l'un de : ${validTypes.join(', ')}`);
      }
    }

    const hasFamilies = updateTechnicalCharacteristicDto.familyIds && updateTechnicalCharacteristicDto.familyIds.length > 0;
    const hasVariants = updateTechnicalCharacteristicDto.variantIds && updateTechnicalCharacteristicDto.variantIds.length > 0;

    // Vérifier que les familles existent
    if (hasFamilies) {
      const families = await this.prisma.family.findMany({
        where: { id: { in: updateTechnicalCharacteristicDto.familyIds! } },
      });
      if (families.length !== updateTechnicalCharacteristicDto.familyIds!.length) {
        throw new NotFoundException('Une ou plusieurs familles n\'existent pas');
      }
    }

    // Vérifier que les variantes existent
    if (hasVariants) {
      const variants = await this.prisma.variant.findMany({
        where: { id: { in: updateTechnicalCharacteristicDto.variantIds! } },
      });
      if (variants.length !== updateTechnicalCharacteristicDto.variantIds!.length) {
        throw new NotFoundException('Une ou plusieurs variantes n\'existent pas');
      }
    }

    // Préparer les données de mise à jour
    const updateData: any = {
      name: updateTechnicalCharacteristicDto.name,
      type: updateTechnicalCharacteristicDto.type,
    };

    // Mettre à jour les familles si fournies
    if (hasFamilies !== undefined) {
      updateData.families = {
        deleteMany: {},
        create: hasFamilies ? updateTechnicalCharacteristicDto.familyIds!.map(familyId => ({ familyId })) : []
      };
    }

    // Mettre à jour les variantes si fournies
    if (hasVariants !== undefined) {
      updateData.variants = {
        deleteMany: {},
        create: hasVariants ? updateTechnicalCharacteristicDto.variantIds!.map(variantId => ({ variantId })) : []
      };
    }

    return this.prisma.technicalCharacteristic.update({
      where: { id },
      data: updateData,
      include: {
        families: {
          include: { family: true }
        },
        variants: {
          include: { variant: true }
        },
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.technicalCharacteristic.delete({
      where: { id },
    });
  }
}

