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

    // Vérifier que le code n'existe pas déjà
    const existingProduct = await this.prisma.product.findUnique({
      where: { code: createProductDto.code },
    });

    if (existingProduct) {
      throw new BadRequestException(
        `A product with code "${createProductDto.code}" already exists`,
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

  async findAll() {
    return this.prisma.product.findMany({
      include: {
        family: true,
        productType: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
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
