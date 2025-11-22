import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFieldDto } from './dto/create-field.dto';
import { UpdateFieldDto } from './dto/update-field.dto';

@Injectable()
export class FieldsService {
  constructor(private prisma: PrismaService) {}

  async create(createFieldDto: CreateFieldDto) {
    // Valider le type
    const validTypes = ['string', 'number', 'boolean', 'select'];
    if (!validTypes.includes(createFieldDto.type)) {
      throw new BadRequestException(`Type de caractéristique technique invalide. Doit être l'un de : ${validTypes.join(', ')}`);
    }

    // Vérifier que familyId ou variantId est fourni
    if (!createFieldDto.familyId && !createFieldDto.variantId) {
      throw new BadRequestException('Une famille ou une variante doit être fournie');
    }

    // Vérifier que la famille existe si fournie
    if (createFieldDto.familyId) {
      const family = await this.prisma.family.findUnique({
        where: { id: createFieldDto.familyId },
      });
      if (!family) {
        throw new NotFoundException(`Family with ID ${createFieldDto.familyId} not found`);
      }
    }

    // Vérifier que la variante existe si fournie
    if (createFieldDto.variantId) {
      const variant = await this.prisma.variant.findUnique({
        where: { id: createFieldDto.variantId },
      });
      if (!variant) {
        throw new NotFoundException(`Variant with ID ${createFieldDto.variantId} not found`);
      }
    }

    return this.prisma.technicalCharacteristic.create({
      data: createFieldDto,
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
    const field = await this.prisma.technicalCharacteristic.findUnique({
      where: { id },
      include: {
        family: true,
        variant: true,
      },
    });

    if (!field) {
      throw new NotFoundException(`Caractéristique technique avec l'ID ${id} introuvable`);
    }

    return field;
  }

  async update(id: string, updateFieldDto: UpdateFieldDto) {
    await this.findOne(id);

    if (updateFieldDto.type) {
      const validTypes = ['string', 'number', 'boolean', 'select'];
      if (!validTypes.includes(updateFieldDto.type)) {
        throw new BadRequestException(`Type de caractéristique technique invalide. Doit être l'un de : ${validTypes.join(', ')}`);
      }
    }

    return this.prisma.technicalCharacteristic.update({
      where: { id },
      data: updateFieldDto,
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

