import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTechnicalCharacteristicDto } from './dto/create-technical-characteristic.dto';
import { UpdateTechnicalCharacteristicDto } from './dto/update-technical-characteristic.dto';
import { normalizeString } from '../utils/string-normalizer';

@Injectable()
export class TechnicalCharacteristicsService {
  constructor(private prisma: PrismaService) {}

  async create(createTechnicalCharacteristicDto: CreateTechnicalCharacteristicDto) {
    // Valider le type
    const validTypes = ['string', 'number', 'boolean', 'enum'];
    if (!validTypes.includes(createTechnicalCharacteristicDto.type)) {
      throw new BadRequestException(`Type de caractéristique technique invalide. Doit être l'un de : ${validTypes.join(', ')}`);
    }

    // Si le type est "enum", vérifier que enumOptions est fourni et non vide
    if (createTechnicalCharacteristicDto.type === 'enum') {
      if (!createTechnicalCharacteristicDto.enumOptions || createTechnicalCharacteristicDto.enumOptions.length === 0) {
        throw new BadRequestException('Les options enum sont requises pour le type "enum"');
      }
      // Filtrer les options vides
      const filteredOptions = createTechnicalCharacteristicDto.enumOptions.filter(opt => opt.trim().length > 0);
      if (filteredOptions.length === 0) {
        throw new BadRequestException('Au moins une option enum valide est requise');
      }
    }

    // Récupérer toutes les caractéristiques techniques pour comparaison case-insensitive
    const allTechnicalCharacteristics = await this.prisma.technicalCharacteristic.findMany();

    // Vérifier que le nom n'existe pas déjà (insensible à la casse et aux accents)
    const existing = allTechnicalCharacteristics.find(
      (tc) => normalizeString(tc.name) === normalizeString(createTechnicalCharacteristicDto.name),
    );

    if (existing) {
      throw new BadRequestException(
        `Une caractéristique technique avec le nom "${createTechnicalCharacteristicDto.name}" existe déjà`,
      );
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
        enumOptions: createTechnicalCharacteristicDto.type === 'enum' && createTechnicalCharacteristicDto.enumOptions
          ? createTechnicalCharacteristicDto.enumOptions.filter(opt => opt.trim().length > 0)
          : null,
        enumMultiple: createTechnicalCharacteristicDto.type === 'enum' 
          ? (createTechnicalCharacteristicDto.enumMultiple ?? false)
          : null,
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

  async findAll(offset: number = 0, limit: number = 50, search?: string) {
    // Récupérer toutes les caractéristiques techniques si recherche, sinon utiliser la pagination normale
    let allTechnicalCharacteristics = await this.prisma.technicalCharacteristic.findMany({
      include: {
        families: {
          include: { family: true },
        },
        variants: {
          include: { variant: true },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Filtrer avec normalisation si recherche
    if (search && typeof search === 'string' && search.trim().length > 0) {
      const normalizedSearch = normalizeString(search.trim());
      allTechnicalCharacteristics = allTechnicalCharacteristics.filter((tc) => {
        const normalizedName = normalizeString(tc.name);
        const normalizedType = normalizeString(tc.type);
        const familyNames = (tc.families || [])
          .map((f: any) => f.family?.name || '')
          .map((name: string) => normalizeString(name))
          .join(' ');
        const variantNames = (tc.variants || [])
          .map((v: any) => v.variant?.name || '')
          .map((name: string) => normalizeString(name))
          .join(' ');
        return (
          normalizedName.includes(normalizedSearch) ||
          normalizedType.includes(normalizedSearch) ||
          familyNames.includes(normalizedSearch) ||
          variantNames.includes(normalizedSearch)
        );
      });
    }

    // Appliquer la pagination
    const total = allTechnicalCharacteristics.length;
    const data = allTechnicalCharacteristics.slice(offset, offset + limit);

    return {
      data,
      total,
      hasMore: offset + limit < total,
    };
  }

  async findByFamily(familyId: string, offset: number = 0, limit: number = 50, search?: string) {
    // Récupérer toutes les caractéristiques techniques de la famille
    let allTechnicalCharacteristics = await this.prisma.technicalCharacteristic.findMany({
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
          include: { variant: true },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Filtrer avec normalisation si recherche
    if (search && typeof search === 'string' && search.trim().length > 0) {
      const normalizedSearch = normalizeString(search.trim());
      allTechnicalCharacteristics = allTechnicalCharacteristics.filter((tc) => {
        const normalizedName = normalizeString(tc.name);
        const normalizedType = normalizeString(tc.type);
        return (
          normalizedName.includes(normalizedSearch) ||
          normalizedType.includes(normalizedSearch)
        );
      });
    }

    // Appliquer la pagination
    const total = allTechnicalCharacteristics.length;
    const data = allTechnicalCharacteristics.slice(offset, offset + limit);

    return {
      data,
      total,
      hasMore: offset + limit < total,
    };
  }

  async findByVariant(variantId: string, offset: number = 0, limit: number = 50, search?: string) {
    // Récupérer toutes les caractéristiques techniques de la variante
    let allTechnicalCharacteristics = await this.prisma.technicalCharacteristic.findMany({
      where: {
        variants: {
          some: { variantId },
        },
      },
      include: {
        families: {
          include: { family: true },
        },
        variants: {
          include: { variant: true },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Filtrer avec normalisation si recherche
    if (search && typeof search === 'string' && search.trim().length > 0) {
      const normalizedSearch = normalizeString(search.trim());
      allTechnicalCharacteristics = allTechnicalCharacteristics.filter((tc) => {
        const normalizedName = normalizeString(tc.name);
        const normalizedType = normalizeString(tc.type);
        return (
          normalizedName.includes(normalizedSearch) ||
          normalizedType.includes(normalizedSearch)
        );
      });
    }

    // Appliquer la pagination
    const total = allTechnicalCharacteristics.length;
    const data = allTechnicalCharacteristics.slice(offset, offset + limit);

    return {
      data,
      total,
      hasMore: offset + limit < total,
    };
  }

  async findByFamilyAndVariant(familyId: string, variantIds: string[], offset: number = 0, limit: number = 50, search?: string) {
    // Construire le filtre de base
    const baseFilter: any = {
      families: {
        some: { familyId },
      },
    };

    // Récupérer toutes les caractéristiques techniques associées à la famille
    let allTechnicalCharacteristics = await this.prisma.technicalCharacteristic.findMany({
      where: baseFilter,
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
        name: 'asc',
      },
    });

    // Filtrer selon la logique : si pas de variantes pour cette famille, s'applique à toute la famille
    // Sinon, vérifier si une des variantes sélectionnées correspond
    let filtered = allTechnicalCharacteristics.filter((technicalCharacteristic) => {
      // Récupérer les variantes associées avec leur famille (en filtrant les null/undefined)
      const associatedVariants = (technicalCharacteristic.variants || [])
        .filter((tcVariant: any) => tcVariant.variant && tcVariant.variant.familyId) // Filtrer les variantes invalides
        .map((tcVariant: any) => ({
          variantId: tcVariant.variantId,
          familyId: tcVariant.variant.familyId,
        }));

      // Filtrer les variantes pour ne garder que celles qui appartiennent à la famille
      const variantsForThisFamily = associatedVariants.filter(
        (v) => v.familyId === familyId,
      );

      // Si la caractéristique n'a pas de variantes pour cette famille, elle s'applique à toute la famille
      if (variantsForThisFamily.length === 0) {
        return true;
      }

      // Si la caractéristique a des variantes pour cette famille, vérifier si une correspond aux variantes sélectionnées
      const variantIdsForThisFamily = variantsForThisFamily.map((v) => v.variantId);
      return variantIds.some((variantId) =>
        variantIdsForThisFamily.includes(variantId),
      );
    });

    // Appliquer la recherche avec normalisation si nécessaire
    let finalFiltered = filtered;
    if (search && typeof search === 'string' && search.trim().length > 0) {
      const normalizedSearch = normalizeString(search.trim());
      finalFiltered = filtered.filter((tc) => {
        const normalizedName = normalizeString(tc.name);
        const normalizedType = normalizeString(tc.type);
        const familyNames = (tc.families || [])
          .map((f: any) => f.family?.name || '')
          .map((name: string) => normalizeString(name))
          .join(' ');
        const variantNames = (tc.variants || [])
          .map((v: any) => v.variant?.name || '')
          .map((name: string) => normalizeString(name))
          .join(' ');
        return (
          normalizedName.includes(normalizedSearch) ||
          normalizedType.includes(normalizedSearch) ||
          familyNames.includes(normalizedSearch) ||
          variantNames.includes(normalizedSearch)
        );
      });
    }

    // Appliquer la pagination sur le résultat filtré
    const total = finalFiltered.length;
    const data = finalFiltered.slice(offset, offset + limit);

    return {
      data,
      total,
      hasMore: offset + limit < total,
    };
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
    const technicalCharacteristic = await this.findOne(id);

    if (updateTechnicalCharacteristicDto.type) {
      const validTypes = ['string', 'number', 'boolean', 'enum'];
      if (!validTypes.includes(updateTechnicalCharacteristicDto.type)) {
        throw new BadRequestException(`Type de caractéristique technique invalide. Doit être l'un de : ${validTypes.join(', ')}`);
      }
    }

    // Si le type est "enum", vérifier que enumOptions est fourni et non vide
    const finalType = updateTechnicalCharacteristicDto.type || technicalCharacteristic.type;
    if (finalType === 'enum') {
      const enumOptions = updateTechnicalCharacteristicDto.enumOptions !== undefined 
        ? updateTechnicalCharacteristicDto.enumOptions 
        : (technicalCharacteristic.enumOptions as string[] | null);
      
      if (!enumOptions || enumOptions.length === 0) {
        throw new BadRequestException('Les options enum sont requises pour le type "enum"');
      }
      // Filtrer les options vides
      const filteredOptions = enumOptions.filter(opt => opt.trim().length > 0);
      if (filteredOptions.length === 0) {
        throw new BadRequestException('Au moins une option enum valide est requise');
      }
    }

    // Récupérer toutes les caractéristiques techniques (sauf la caractéristique actuelle) pour comparaison case-insensitive
    const allTechnicalCharacteristics = await this.prisma.technicalCharacteristic.findMany({
      where: { id: { not: id } },
    });

    // Si le nom est modifié, vérifier qu'il n'existe pas déjà (insensible à la casse et aux accents)
    if (updateTechnicalCharacteristicDto.name && normalizeString(updateTechnicalCharacteristicDto.name) !== normalizeString(technicalCharacteristic.name)) {
      const existing = allTechnicalCharacteristics.find(
        (tc) => normalizeString(tc.name) === normalizeString(updateTechnicalCharacteristicDto.name),
      );

      if (existing) {
        throw new BadRequestException(
          `Une caractéristique technique avec le nom "${updateTechnicalCharacteristicDto.name}" existe déjà`,
        );
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

    // Gérer enumOptions
    if (updateTechnicalCharacteristicDto.type === 'enum' || (finalType === 'enum' && updateTechnicalCharacteristicDto.enumOptions !== undefined)) {
      const enumOptions = updateTechnicalCharacteristicDto.enumOptions || (technicalCharacteristic.enumOptions as string[] | null) || [];
      updateData.enumOptions = enumOptions.filter(opt => opt.trim().length > 0);
    } else if (updateTechnicalCharacteristicDto.type && updateTechnicalCharacteristicDto.type !== 'enum') {
      // Si on change le type vers autre chose que enum, supprimer enumOptions et enumMultiple
      updateData.enumOptions = null;
      updateData.enumMultiple = null;
    }

    // Gérer enumMultiple
    if (updateTechnicalCharacteristicDto.type === 'enum' || (finalType === 'enum' && updateTechnicalCharacteristicDto.enumMultiple !== undefined)) {
      updateData.enumMultiple = updateTechnicalCharacteristicDto.enumMultiple ?? false;
    } else if (updateTechnicalCharacteristicDto.type && updateTechnicalCharacteristicDto.type !== 'enum') {
      // Si on change le type vers autre chose que enum, supprimer enumMultiple
      updateData.enumMultiple = null;
    }

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