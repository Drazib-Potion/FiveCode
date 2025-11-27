import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import {
  normalizeString,
  normalizeStringForStorage,
} from '../utils/string-normalizer';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async create(createProductDto: CreateProductDto) {
    // Vérifier que la famille existe
    const family = await this.prisma.family.findUnique({
      where: { id: createProductDto.familyId },
    });
    if (!family) {
      throw new NotFoundException(
        `Family with ID ${createProductDto.familyId} not found`,
      );
    }

    // Vérifier que le type de produit existe
    const productType = await this.prisma.productType.findUnique({
      where: { id: createProductDto.productTypeId },
    });
    if (!productType) {
      throw new NotFoundException(
        `Product type with ID ${createProductDto.productTypeId} not found`,
      );
    }

    // Récupérer tous les produits pour comparaison case-insensitive
    const allProducts = await this.prisma.product.findMany();

    // Vérifier que le code n'existe pas déjà (insensible à la casse et aux accents)
    const existingByCode = allProducts.find(
      (p) => normalizeString(p.code) === normalizeString(createProductDto.code),
    );

    if (existingByCode) {
      throw new BadRequestException(
        `Un produit avec le code "${createProductDto.code}" existe déjà`,
      );
    }

    // Vérifier que le nom n'existe pas déjà (insensible à la casse et aux accents)
    const existingByName = allProducts.find(
      (p) => normalizeString(p.name) === normalizeString(createProductDto.name),
    );

    if (existingByName) {
      throw new BadRequestException(
        `Un produit avec le nom "${createProductDto.name}" existe déjà`,
      );
    }

    return this.prisma.product.create({
      data: {
        name: normalizeStringForStorage(createProductDto.name),
        code: createProductDto.code,
        familyId: createProductDto.familyId,
        productTypeId: createProductDto.productTypeId,
      },
      include: {
        family: true,
        productType: true,
      },
    });
  }

  async findAll(offset: number = 0, limit: number = 50, search?: string) {
    // Récupérer tous les produits si recherche, sinon utiliser la pagination normale
    let allProducts = await this.prisma.product.findMany({
      include: {
        family: true,
        productType: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Filtrer avec normalisation si recherche
    if (search && typeof search === 'string' && search.trim().length > 0) {
      const normalizedSearch = normalizeString(search.trim());
      allProducts = allProducts.filter((product) => {
        const normalizedName = normalizeString(product.name);
        const normalizedCode = normalizeString(product.code);
        const normalizedFamilyName = product.family
          ? normalizeString(product.family.name)
          : '';
        const normalizedProductTypeName = product.productType
          ? normalizeString(product.productType.name)
          : '';
        const normalizedProductTypeCode = product.productType
          ? normalizeString(product.productType.code)
          : '';
        return (
          normalizedName.includes(normalizedSearch) ||
          normalizedCode.includes(normalizedSearch) ||
          normalizedFamilyName.includes(normalizedSearch) ||
          normalizedProductTypeName.includes(normalizedSearch) ||
          normalizedProductTypeCode.includes(normalizedSearch)
        );
      });
    }

    // Appliquer la pagination
    const total = allProducts.length;
    const data = allProducts.slice(offset, offset + limit);

    return {
      data,
      total,
      hasMore: offset + limit < total,
    };
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        family: true,
        productType: true,
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    return product;
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.product.delete({
      where: { id },
    });
  }
}
