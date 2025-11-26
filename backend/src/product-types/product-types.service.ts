import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductTypeDto } from './dto/create-product-type.dto';
import { UpdateProductTypeDto } from './dto/update-product-type.dto';
import { normalizeString, normalizeStringForStorage } from '../utils/string-normalizer';

@Injectable()
export class ProductTypesService {
  constructor(private prisma: PrismaService) {}

  async create(createProductTypeDto: CreateProductTypeDto) {
    // Récupérer tous les types de produit pour comparaison case-insensitive
    const allProductTypes = await this.prisma.productType.findMany();

    // Vérifier que le code n'existe pas déjà (insensible à la casse et aux accents)
    const existingByCode = allProductTypes.find(
      (pt) => normalizeString(pt.code) === normalizeString(createProductTypeDto.code),
    );

    if (existingByCode) {
      throw new BadRequestException(
        `Un type de produit avec le code "${createProductTypeDto.code}" existe déjà`,
      );
    }

    // Vérifier que le nom n'existe pas déjà (insensible à la casse et aux accents)
    const existingByName = allProductTypes.find(
      (pt) => normalizeString(pt.name) === normalizeString(createProductTypeDto.name),
    );

    if (existingByName) {
      throw new BadRequestException(
        `Un type de produit avec le nom "${createProductTypeDto.name}" existe déjà`,
      );
    }

    return this.prisma.productType.create({
      data: {
        ...createProductTypeDto,
        name: normalizeStringForStorage(createProductTypeDto.name),
      },
    });
  }

  async findAll(offset: number = 0, limit: number = 50, search?: string) {
    // Récupérer tous les types de produit si recherche, sinon utiliser la pagination normale
    let allProductTypes = await this.prisma.productType.findMany({
      orderBy: {
        name: 'asc',
      },
    });

    // Filtrer avec normalisation si recherche
    if (search && typeof search === 'string' && search.trim().length > 0) {
      const normalizedSearch = normalizeString(search.trim());
      allProductTypes = allProductTypes.filter((productType) => {
        const normalizedName = normalizeString(productType.name);
        const normalizedCode = normalizeString(productType.code);
        return (
          normalizedName.includes(normalizedSearch) ||
          normalizedCode.includes(normalizedSearch)
        );
      });
    }

    // Appliquer la pagination
    const total = allProductTypes.length;
    const data = allProductTypes.slice(offset, offset + limit);

    return {
      data,
      total,
      hasMore: offset + limit < total,
    };
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

    // Si le code est modifié, vérifier qu'il n'existe pas déjà (insensible à la casse et aux accents)
    if (updateProductTypeDto.code && normalizeString(updateProductTypeDto.code) !== normalizeString(productType.code)) {
      const existingByCode = allProductTypes.find(
        (pt) => normalizeString(pt.code) === normalizeString(updateProductTypeDto.code),
      );

      if (existingByCode) {
        throw new BadRequestException(
          `Un type de produit avec le code "${updateProductTypeDto.code}" existe déjà`,
        );
      }
    }

    // Si le nom est modifié, vérifier qu'il n'existe pas déjà (insensible à la casse et aux accents)
    if (updateProductTypeDto.name && normalizeString(updateProductTypeDto.name) !== normalizeString(productType.name)) {
      const existingByName = allProductTypes.find(
        (pt) => normalizeString(pt.name) === normalizeString(updateProductTypeDto.name),
      );

      if (existingByName) {
        throw new BadRequestException(
          `Un type de produit avec le nom "${updateProductTypeDto.name}" existe déjà`,
        );
      }
    }

    return this.prisma.productType.update({
      where: { id },
      data: {
        ...updateProductTypeDto,
        name: updateProductTypeDto.name
          ? normalizeStringForStorage(updateProductTypeDto.name)
          : undefined,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.productType.delete({
      where: { id },
    });
  }
}

