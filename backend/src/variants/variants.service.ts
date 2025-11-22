import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVariantDto } from './dto/create-variant.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';

@Injectable()
export class VariantsService {
  constructor(private prisma: PrismaService) {}

  async create(createVariantDto: CreateVariantDto) {
    // Vérifier que la famille existe
    const family = await this.prisma.family.findUnique({
      where: { id: createVariantDto.familyId },
    });

    if (!family) {
      throw new NotFoundException(`Family with ID ${createVariantDto.familyId} not found`);
    }

    // Récupérer toutes les variantes de cette famille pour comparaison case-insensitive
    const familyVariants = await this.prisma.variant.findMany({
      where: { familyId: createVariantDto.familyId },
    });

    // Vérifier que le code n'existe pas déjà pour cette famille (insensible à la casse)
    const existingByCode = familyVariants.find(
      (v) => v.code.toLowerCase() === createVariantDto.code.toLowerCase(),
    );

    if (existingByCode) {
      throw new BadRequestException(
        `Une variante avec le code "${createVariantDto.code}" existe déjà pour cette famille`,
      );
    }

    // Vérifier que le nom n'existe pas déjà pour cette famille (insensible à la casse)
    const existingByName = familyVariants.find(
      (v) => v.name.toLowerCase() === createVariantDto.name.toLowerCase(),
    );

    if (existingByName) {
      throw new BadRequestException(
        `Une variante avec le nom "${createVariantDto.name}" existe déjà pour cette famille`,
      );
    }

    // Créer la variante
    const variant = await this.prisma.variant.create({
      data: {
        familyId: createVariantDto.familyId,
        name: createVariantDto.name,
        code: createVariantDto.code,
      },
      include: {
        family: true,
      },
    });

    // Créer les exclusions si des variantes exclues sont spécifiées
    if (createVariantDto.excludedVariantIds && createVariantDto.excludedVariantIds.length > 0) {
      // Vérifier que toutes les variantes exclues existent et appartiennent à la même famille
      const excludedVariants = await this.prisma.variant.findMany({
        where: {
          id: { in: createVariantDto.excludedVariantIds },
          familyId: createVariantDto.familyId,
        },
      });

      if (excludedVariants.length !== createVariantDto.excludedVariantIds.length) {
        throw new BadRequestException(
          'One or more excluded variants not found or belong to different family',
        );
      }

      // Créer les exclusions (bidirectionnelles)
      for (const excludedVariantId of createVariantDto.excludedVariantIds) {
        // Créer l'exclusion dans les deux sens (A exclut B ET B exclut A)
        await this.prisma.variantExclusion.createMany({
          data: [
            { variantId1: variant.id, variantId2: excludedVariantId },
            { variantId1: excludedVariantId, variantId2: variant.id },
          ],
          skipDuplicates: true, // Évite les doublons si l'exclusion existe déjà
        });
      }
    }

    return variant;
  }

  async findAll() {
    const variants = await this.prisma.variant.findMany({
      include: {
        family: true,
        technicalCharacteristicVariants: {
          include: {
            technicalCharacteristic: true,
          },
        },
        exclusionsAsVariant1: {
          include: {
            variant2: true,
          },
        },
        exclusionsAsVariant2: {
          include: {
            variant1: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Ajouter excludedVariantIds à chaque variante
    return variants.map((variant) => {
      const allExclusions = [
        ...variant.exclusionsAsVariant1.map((e) => e.variant2.id),
        ...variant.exclusionsAsVariant2.map((e) => e.variant1.id),
      ];
      return {
        ...variant,
        excludedVariantIds: allExclusions,
      };
    });
  }

  async findByFamily(familyId: string) {
    const variants = await this.prisma.variant.findMany({
      where: { familyId },
      include: {
        family: true,
        technicalCharacteristicVariants: {
          include: {
            technicalCharacteristic: true,
          },
        },
        exclusionsAsVariant1: {
          include: {
            variant2: true,
          },
        },
        exclusionsAsVariant2: {
          include: {
            variant1: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Ajouter excludedVariantIds à chaque variante
    return variants.map((variant) => {
      const allExclusions = [
        ...variant.exclusionsAsVariant1.map((e) => e.variant2.id),
        ...variant.exclusionsAsVariant2.map((e) => e.variant1.id),
      ];
      return {
        ...variant,
        excludedVariantIds: allExclusions,
      };
    });
  }

  async findOne(id: string) {
    const variant = await this.prisma.variant.findUnique({
      where: { id },
      include: {
        family: true,
        technicalCharacteristicVariants: {
          include: {
            technicalCharacteristic: true,
          },
        },
        exclusionsAsVariant1: {
          include: {
            variant2: true,
          },
        },
        exclusionsAsVariant2: {
          include: {
            variant1: true,
          },
        },
      },
    });

    if (!variant) {
      throw new NotFoundException(`Variant with ID ${id} not found`);
    }

    // Combiner les exclusions des deux côtés
    const allExclusions = [
      ...variant.exclusionsAsVariant1.map((e) => e.variant2.id),
      ...variant.exclusionsAsVariant2.map((e) => e.variant1.id),
    ];

    return {
      ...variant,
      excludedVariantIds: allExclusions,
    };
  }

  async update(id: string, updateVariantDto: UpdateVariantDto) {
    const variant = await this.findOne(id);

    // Récupérer toutes les variantes de cette famille (sauf la variante actuelle) pour comparaison case-insensitive
    const familyVariants = await this.prisma.variant.findMany({
      where: {
        familyId: variant.familyId,
        id: { not: id }, // Exclure la variante actuelle
      },
    });

    // Si le code est modifié, vérifier qu'il n'existe pas déjà (insensible à la casse)
    if (updateVariantDto.code && updateVariantDto.code.toLowerCase() !== variant.code.toLowerCase()) {
      const existingByCode = familyVariants.find(
        (v) => v.code.toLowerCase() === updateVariantDto.code.toLowerCase(),
      );

      if (existingByCode) {
        throw new BadRequestException(
          `Une variante avec le code "${updateVariantDto.code}" existe déjà pour cette famille`,
        );
      }
    }

    // Si le nom est modifié, vérifier qu'il n'existe pas déjà (insensible à la casse)
    if (updateVariantDto.name && updateVariantDto.name.toLowerCase() !== variant.name.toLowerCase()) {
      const existingByName = familyVariants.find(
        (v) => v.name.toLowerCase() === updateVariantDto.name.toLowerCase(),
      );

      if (existingByName) {
        throw new BadRequestException(
          `Une variante avec le nom "${updateVariantDto.name}" existe déjà pour cette famille`,
        );
      }
    }

    // Mettre à jour la variante (sans les exclusions pour l'instant)
    const updatedVariant = await this.prisma.variant.update({
      where: { id },
      data: {
        familyId: updateVariantDto.familyId,
        name: updateVariantDto.name,
        code: updateVariantDto.code,
      },
      include: {
        family: true,
      },
    });

    // Si excludedVariantIds est fourni, mettre à jour les exclusions
    if (updateVariantDto.excludedVariantIds !== undefined) {
      // Supprimer toutes les exclusions existantes pour cette variante
      await this.prisma.variantExclusion.deleteMany({
        where: {
          OR: [{ variantId1: id }, { variantId2: id }],
        },
      });

      // Créer les nouvelles exclusions si des variantes exclues sont spécifiées
      if (updateVariantDto.excludedVariantIds.length > 0) {
        // Vérifier que toutes les variantes exclues existent et appartiennent à la même famille
        const excludedVariants = await this.prisma.variant.findMany({
          where: {
            id: { in: updateVariantDto.excludedVariantIds },
            familyId: variant.familyId,
          },
        });

        if (excludedVariants.length !== updateVariantDto.excludedVariantIds.length) {
          throw new BadRequestException(
            'One or more excluded variants not found or belong to different family',
          );
        }

        // Créer les exclusions (bidirectionnelles)
        for (const excludedVariantId of updateVariantDto.excludedVariantIds) {
          await this.prisma.variantExclusion.createMany({
            data: [
              { variantId1: id, variantId2: excludedVariantId },
              { variantId1: excludedVariantId, variantId2: id },
            ],
            skipDuplicates: true,
          });
        }
      }
    }

    return updatedVariant;
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.variant.delete({
      where: { id },
    });
  }
}

