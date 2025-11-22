import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductTypeDto } from './dto/create-product-type.dto';
import { UpdateProductTypeDto } from './dto/update-product-type.dto';

@Injectable()
export class ProductTypesService {
  constructor(private prisma: PrismaService) {}

  async create(createProductTypeDto: CreateProductTypeDto) {
    // Récupérer tous les types de produit pour comparaison case-insensitive
    const allProductTypes = await this.prisma.productType.findMany();

    // Vérifier que le code n'existe pas déjà (insensible à la casse)
    const existingByCode = allProductTypes.find(
      (pt) => pt.code.toLowerCase() === createProductTypeDto.code.toLowerCase(),
    );

    if (existingByCode) {
      throw new BadRequestException(
        `Un type de produit avec le code "${createProductTypeDto.code}" existe déjà`,
      );
    }

    // Vérifier que le nom n'existe pas déjà (insensible à la casse)
    const existingByName = allProductTypes.find(
      (pt) => pt.name.toLowerCase() === createProductTypeDto.name.toLowerCase(),
    );

    if (existingByName) {
      throw new BadRequestException(
        `Un type de produit avec le nom "${createProductTypeDto.name}" existe déjà`,
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
    const productType = await this.findOne(id);

    // Récupérer tous les types de produit pour comparaison case-insensitive
    const allProductTypes = await this.prisma.productType.findMany({
      where: { id: { not: id } },
    });

    // Si le code est modifié, vérifier qu'il n'existe pas déjà (insensible à la casse)
    if (updateProductTypeDto.code && updateProductTypeDto.code.toLowerCase() !== productType.code.toLowerCase()) {
      const existingByCode = allProductTypes.find(
        (pt) => pt.code.toLowerCase() === updateProductTypeDto.code.toLowerCase(),
      );

      if (existingByCode) {
        throw new BadRequestException(
          `Un type de produit avec le code "${updateProductTypeDto.code}" existe déjà`,
        );
      }
    }

    // Si le nom est modifié, vérifier qu'il n'existe pas déjà (insensible à la casse)
    if (updateProductTypeDto.name && updateProductTypeDto.name.toLowerCase() !== productType.name.toLowerCase()) {
      const existingByName = allProductTypes.find(
        (pt) => pt.name.toLowerCase() === updateProductTypeDto.name.toLowerCase(),
      );

      if (existingByName) {
        throw new BadRequestException(
          `Un type de produit avec le nom "${updateProductTypeDto.name}" existe déjà`,
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

