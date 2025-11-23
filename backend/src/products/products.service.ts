import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';

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

    // Vérifier que le code n'existe pas déjà (insensible à la casse)
    const existingByCode = allProducts.find(
      (p) => p.code.toLowerCase() === createProductDto.code.toLowerCase(),
    );

    if (existingByCode) {
      throw new BadRequestException(
        `Un produit avec le code "${createProductDto.code}" existe déjà`,
      );
    }

    // Vérifier que le nom n'existe pas déjà (insensible à la casse)
    const existingByName = allProducts.find(
      (p) => p.name.toLowerCase() === createProductDto.name.toLowerCase(),
    );

    if (existingByName) {
      throw new BadRequestException(
        `Un produit avec le nom "${createProductDto.name}" existe déjà`,
      );
    }

    return this.prisma.product.create({
      data: {
        name: createProductDto.name,
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
    const searchFilter = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { code: { contains: search, mode: 'insensitive' as const } },
            { family: { name: { contains: search, mode: 'insensitive' as const } } },
            { productType: { name: { contains: search, mode: 'insensitive' as const } } },
            { productType: { code: { contains: search, mode: 'insensitive' as const } } },
          ],
        }
      : {};

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where: searchFilter,
        include: {
          family: true,
          productType: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip: offset,
        take: limit,
      }),
      this.prisma.product.count({ where: searchFilter }),
    ]);

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
