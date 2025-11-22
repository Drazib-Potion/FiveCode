import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductTypeDto } from './dto/create-product-type.dto';
import { UpdateProductTypeDto } from './dto/update-product-type.dto';

@Injectable()
export class ProductTypesService {
  constructor(private prisma: PrismaService) {}

  async create(createProductTypeDto: CreateProductTypeDto) {
    // Vérifier que le code n'existe pas déjà
    const existing = await this.prisma.productType.findUnique({
      where: { code: createProductTypeDto.code },
    });

    if (existing) {
      throw new BadRequestException(
        `Un type de produit avec le code "${createProductTypeDto.code}" existe déjà`,
      );
    }

    return this.prisma.productType.create({
      data: createProductTypeDto,
    });
  }

  async findAll() {
    return this.prisma.productType.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const productType = await this.prisma.productType.findUnique({
      where: { id },
    });

    if (!productType) {
      throw new NotFoundException(`Type de produit avec l'ID ${id} introuvable`);
    }

    return productType;
  }

  async update(id: string, updateProductTypeDto: UpdateProductTypeDto) {
    await this.findOne(id);

    // Si le code est modifié, vérifier qu'il n'existe pas déjà
    if (updateProductTypeDto.code) {
      const existing = await this.prisma.productType.findFirst({
        where: {
          code: updateProductTypeDto.code,
          id: { not: id },
        },
      });

      if (existing) {
        throw new BadRequestException(
          `Un type de produit avec le code "${updateProductTypeDto.code}" existe déjà`,
        );
      }
    }

    return this.prisma.productType.update({
      where: { id },
      data: updateProductTypeDto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.productType.delete({
      where: { id },
    });
  }
}

