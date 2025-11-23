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

  async findAll(offset: number = 0, limit: number = 50, search?: string) {
    const whereClause: any = {};
    
    if (search && typeof search === 'string' && search.trim().length > 0) {
      const searchTerm = search.trim();
      // Utiliser une requête SQL brute avec ILIKE pour PostgreSQL (insensible à la casse)
      const searchPattern = `%${searchTerm}%`;
      
      // Requête SQL brute pour la recherche - utiliser les noms de colonnes de la base de données (snake_case)
      const rawQuery = `
        SELECT id FROM families 
        WHERE LOWER(name) LIKE LOWER($1)
        ORDER BY "createdAt" DESC
        LIMIT $2 OFFSET $3
      `;
      
      const countQuery = `
        SELECT COUNT(*)::int as count FROM families 
        WHERE LOWER(name) LIKE LOWER($1)
      `;
      
      const [rawData, countResult] = await Promise.all([
        this.prisma.$queryRawUnsafe<Array<{ id: string }>>(rawQuery, searchPattern, limit, offset),
        this.prisma.$queryRawUnsafe<Array<{ count: number }>>(countQuery, searchPattern),
      ]);
      
      const total = countResult[0]?.count || 0;
      const familyIds = rawData.map((row) => row.id);
      
      // Récupérer les données complètes avec les relations
      const data = await this.prisma.family.findMany({
        where: { id: { in: familyIds } },
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

      return {
        data,
        total,
        hasMore: offset + limit < total,
      };
    }

    // Pas de recherche - utiliser la requête normale
    try {
      const [data, total] = await Promise.all([
        this.prisma.family.findMany({
          where: whereClause,
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
          skip: offset,
          take: limit,
        }),
        this.prisma.family.count({ where: whereClause }),
      ]);

      return {
        data,
        total,
        hasMore: offset + limit < total,
      };
    } catch (error) {
      console.error('[FamiliesService] Error executing query:', error);
      throw error;
    }
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

