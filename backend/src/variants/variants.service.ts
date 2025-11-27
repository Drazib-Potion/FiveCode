import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVariantDto } from './dto/create-variant.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';
import {
  normalizeString,
  normalizeStringForStorage,
} from '../utils/string-normalizer';

@Injectable()
export class VariantsService {
  constructor(private prisma: PrismaService) {}

  async create(createVariantDto: CreateVariantDto) {
    // Vérifier que la famille existe
    const family = await this.prisma.family.findUnique({
      where: { id: createVariantDto.familyId },
    });

    if (!family) {
      throw new NotFoundException(
        `Family with ID ${createVariantDto.familyId} not found`,
      );
    }

    // Récupérer toutes les variantes de cette famille pour comparaison case-insensitive
    const familyVariants = await this.prisma.variant.findMany({
      where: { familyId: createVariantDto.familyId },
    });

    // Vérifier que le code n'existe pas déjà pour cette famille (insensible à la casse et aux accents)
    const existingByCode = familyVariants.find(
      (v) =>
        v.variantLevel === createVariantDto.variantLevel &&
        normalizeString(v.code) === normalizeString(createVariantDto.code),
    );

    if (existingByCode) {
      throw new BadRequestException(
        `Une variante avec le code "${createVariantDto.code}" existe déjà pour cette famille`,
      );
    }

    // Vérifier que le nom n'existe pas déjà pour cette famille (insensible à la casse et aux accents)
    const existingByName = familyVariants.find(
      (v) => normalizeString(v.name) === normalizeString(createVariantDto.name),
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
        name: normalizeStringForStorage(createVariantDto.name),
        code: createVariantDto.code,
        variantLevel: createVariantDto.variantLevel,
      },
      include: {
        family: true,
      },
    });

    return variant;
  }

  async findAll(offset: number = 0, limit: number = 50, search?: string) {
    // Récupérer toutes les variantes si recherche, sinon utiliser la pagination normale
    let allVariants = await this.prisma.variant.findMany({
      include: {
        family: true,
        technicalCharacteristicVariants: {
          include: {
            technicalCharacteristic: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Filtrer avec normalisation si recherche
    if (search && typeof search === 'string' && search.trim().length > 0) {
      const normalizedSearch = normalizeString(search.trim());
      allVariants = allVariants.filter((variant) => {
        const normalizedName = normalizeString(variant.name);
        const normalizedCode = normalizeString(variant.code);
        const normalizedFamilyName = variant.family
          ? normalizeString(variant.family.name)
          : '';
        return (
          normalizedName.includes(normalizedSearch) ||
          normalizedCode.includes(normalizedSearch) ||
          normalizedFamilyName.includes(normalizedSearch)
        );
      });
    }

    // Appliquer la pagination
    const total = allVariants.length;
    const paginatedVariants = allVariants.slice(offset, offset + limit);

    return {
      data: paginatedVariants,
      total,
      hasMore: offset + limit < total,
    };
  }

  async findByFamily(
    familyId: string,
    offset: number = 0,
    limit: number = 50,
    search?: string,
  ) {
    // Récupérer toutes les variantes de la famille
    let allVariants = await this.prisma.variant.findMany({
      where: { familyId },
      include: {
        family: true,
        technicalCharacteristicVariants: {
          include: {
            technicalCharacteristic: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Filtrer avec normalisation si recherche
    if (search && typeof search === 'string' && search.trim().length > 0) {
      const normalizedSearch = normalizeString(search.trim());
      allVariants = allVariants.filter((variant) => {
        const normalizedName = normalizeString(variant.name);
        const normalizedCode = normalizeString(variant.code);
        return (
          normalizedName.includes(normalizedSearch) ||
          normalizedCode.includes(normalizedSearch)
        );
      });
    }

    // Appliquer la pagination
    const total = allVariants.length;
    const paginatedVariants = allVariants.slice(offset, offset + limit);

    return {
      data: paginatedVariants,
      total,
      hasMore: offset + limit < total,
    };
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
      },
    });

    if (!variant) {
      throw new NotFoundException(`Variant with ID ${id} not found`);
    }

    return variant;
  }

  async update(id: string, updateVariantDto: UpdateVariantDto) {
    const variant = await this.findOne(id);

    const targetFamilyId = updateVariantDto.familyId ?? variant.familyId;
    const targetVariantLevel =
      updateVariantDto.variantLevel ?? variant.variantLevel;
    const targetCode = updateVariantDto.code ?? variant.code;
    const targetName = updateVariantDto.name ?? variant.name;

    if (
      updateVariantDto.familyId &&
      updateVariantDto.familyId !== variant.familyId
    ) {
      const family = await this.prisma.family.findUnique({
        where: { id: updateVariantDto.familyId },
      });

      if (!family) {
        throw new NotFoundException(
          `Family with ID ${updateVariantDto.familyId} not found`,
        );
      }
    }

    // Récupérer toutes les variantes de la famille cible (sauf la variante actuelle) pour comparaison case-insensitive
    const familyVariants = await this.prisma.variant.findMany({
      where: {
        familyId: targetFamilyId,
        id: { not: id }, // Exclure la variante actuelle
      },
    });

    const existingByCode = familyVariants.find(
      (v) =>
        v.variantLevel === targetVariantLevel &&
        normalizeString(v.code) === normalizeString(targetCode),
    );

    if (existingByCode) {
      throw new BadRequestException(
        `Une variante avec le code "${targetCode}" existe déjà pour cette famille et ce type`,
      );
    }

    const existingByName = familyVariants.find(
      (v) => normalizeString(v.name) === normalizeString(targetName),
    );

    if (existingByName) {
      throw new BadRequestException(
        `Une variante avec le nom "${targetName}" existe déjà pour cette famille`,
      );
    }

    // Mettre à jour la variante (sans les exclusions pour l'instant)
    const updatedVariant = await this.prisma.variant.update({
      where: { id },
      data: {
        familyId: updateVariantDto.familyId,
        name: updateVariantDto.name
          ? normalizeStringForStorage(updateVariantDto.name)
          : undefined,
        code: updateVariantDto.code,
        variantLevel: updateVariantDto.variantLevel,
      },
      include: {
        family: true,
      },
    });
    return updatedVariant;
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.variant.delete({
      where: { id },
    });
  }
}
