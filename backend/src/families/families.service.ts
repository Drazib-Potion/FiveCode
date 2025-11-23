import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFamilyDto } from './dto/create-family.dto';
import { UpdateFamilyDto } from './dto/update-family.dto';
import { normalizeString } from '../utils/string-normalizer';

@Injectable()
export class FamiliesService {
  constructor(private prisma: PrismaService) {}

  async create(createFamilyDto: CreateFamilyDto) {
    // Récupérer toutes les familles pour comparaison case-insensitive
    const allFamilies = await this.prisma.family.findMany();

    // Vérifier que le nom n'existe pas déjà (insensible à la casse et aux accents)
    const existing = allFamilies.find(
      (f) => normalizeString(f.name) === normalizeString(createFamilyDto.name),
    );

    if (existing) {
      throw new BadRequestException(
        `Une famille avec le nom "${createFamilyDto.name}" existe déjà`,
      );
    }

    return this.prisma.family.create({
      data: createFamilyDto,
    });
  }

  async findAll(offset: number = 0, limit: number = 50, search?: string) {
    // Récupérer toutes les familles si recherche, sinon utiliser la pagination normale
    let allFamilies = await this.prisma.family.findMany({
      include: {
        variants: true,
        technicalCharacteristicFamilies: {
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
      allFamilies = allFamilies.filter((family) => {
        const normalizedName = normalizeString(family.name);
        return normalizedName.includes(normalizedSearch);
      });
    }

    // Appliquer la pagination
    const total = allFamilies.length;
    const data = allFamilies.slice(offset, offset + limit);

    return {
      data,
      total,
      hasMore: offset + limit < total,
    };
  }

  async findOne(id: string) {
    const family = await this.prisma.family.findUnique({
      where: { id },
      include: {
        variants: true,
        technicalCharacteristicFamilies: {
          include: {
            technicalCharacteristic: true,
          },
        },
      },
    });

    if (!family) {
      throw new NotFoundException(`Family with ID ${id} not found`);
    }

    return family;
  }

  async update(id: string, updateFamilyDto: UpdateFamilyDto) {
    const family = await this.findOne(id);

    // Récupérer toutes les familles pour comparaison case-insensitive
    const allFamilies = await this.prisma.family.findMany({
      where: { id: { not: id } },
    });

    // Si le nom est modifié, vérifier qu'il n'existe pas déjà (insensible à la casse et aux accents)
    if (updateFamilyDto.name && normalizeString(updateFamilyDto.name) !== normalizeString(family.name)) {
      const existing = allFamilies.find(
        (f) => normalizeString(f.name) === normalizeString(updateFamilyDto.name),
      );

      if (existing) {
        throw new BadRequestException(
          `Une famille avec le nom "${updateFamilyDto.name}" existe déjà`,
        );
      }
    }

    return this.prisma.family.update({
      where: { id },
      data: updateFamilyDto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.family.delete({
      where: { id },
    });
  }
}

