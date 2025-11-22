import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFamilyDto } from './dto/create-family.dto';
import { UpdateFamilyDto } from './dto/update-family.dto';

@Injectable()
export class FamiliesService {
  constructor(private prisma: PrismaService) {}

  async create(createFamilyDto: CreateFamilyDto) {
    // Récupérer toutes les familles pour comparaison case-insensitive
    const allFamilies = await this.prisma.family.findMany();

    // Vérifier que le nom n'existe pas déjà (insensible à la casse)
    const existing = allFamilies.find(
      (f) => f.name.toLowerCase() === createFamilyDto.name.toLowerCase(),
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

  async findAll() {
    return this.prisma.family.findMany({
      include: {
        variants: true,
        technicalCharacteristicFamilies: {
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

    // Si le nom est modifié, vérifier qu'il n'existe pas déjà (insensible à la casse)
    if (updateFamilyDto.name && updateFamilyDto.name.toLowerCase() !== family.name.toLowerCase()) {
      const existing = allFamilies.find(
        (f) => f.name.toLowerCase() === updateFamilyDto.name.toLowerCase(),
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

