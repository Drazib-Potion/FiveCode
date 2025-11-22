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

    // Vérifier que familyId ou variantId est fourni
    if (!createTechnicalCharacteristicDto.familyId && !createTechnicalCharacteristicDto.variantId) {
      throw new BadRequestException('Une famille ou une variante doit être fournie');
    }

    // Vérifier que la famille existe si fournie
    if (createTechnicalCharacteristicDto.familyId) {
      const family = await this.prisma.family.findUnique({
        where: { id: createTechnicalCharacteristicDto.familyId },
      });
      if (!family) {
        throw new NotFoundException(`Family with ID ${createTechnicalCharacteristicDto.familyId} not found`);
      }
    }

    // Vérifier que la variante existe si fournie
    if (createTechnicalCharacteristicDto.variantId) {
      const variant = await this.prisma.variant.findUnique({
        where: { id: createTechnicalCharacteristicDto.variantId },
      });
      if (!variant) {
        throw new NotFoundException(`Variant with ID ${createTechnicalCharacteristicDto.variantId} not found`);
      }
    }

    return this.prisma.technicalCharacteristic.create({
      data: createTechnicalCharacteristicDto,
      include: {
        family: true,
        variant: true,
      },
    });
  }

  async findAll() {
    return this.prisma.technicalCharacteristic.findMany({
      include: {
        family: true,
        variant: true,
      },
      orderBy: [
        { position: 'asc' },
        { createdAt: 'desc' },
      ],
    });
  }

  async findByFamily(familyId: string) {
    return this.prisma.technicalCharacteristic.findMany({
      where: { familyId },
      include: {
        family: true,
        variant: true,
      },
      orderBy: [
        { position: 'asc' },
        { createdAt: 'desc' },
      ],
    });
  }

  async findByVariant(variantId: string) {
    return this.prisma.technicalCharacteristic.findMany({
      where: { variantId },
      include: {
        family: true,
        variant: true,
      },
      orderBy: [
        { position: 'asc' },
        { createdAt: 'desc' },
      ],
    });
  }

  async findByFamilyAndVariant(familyId: string, variantId: string) {
    return this.prisma.technicalCharacteristic.findMany({
      where: {
        OR: [
          { familyId, variantId: null },
          { variantId },
          { familyId, variantId },
        ],
      },
      include: {
        family: true,
        variant: true,
      },
      orderBy: [
        { position: 'asc' },
        { createdAt: 'desc' },
      ],
    });
  }

  async findOne(id: string) {
    const technicalCharacteristic = await this.prisma.technicalCharacteristic.findUnique({
      where: { id },
      include: {
        family: true,
        variant: true,
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

    return this.prisma.technicalCharacteristic.update({
      where: { id },
      data: updateTechnicalCharacteristicDto,
      include: {
        family: true,
        variant: true,
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

