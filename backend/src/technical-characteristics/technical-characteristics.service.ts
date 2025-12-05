import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTechnicalCharacteristicDto } from './dto/create-technical-characteristic.dto';
import { UpdateTechnicalCharacteristicDto } from './dto/update-technical-characteristic.dto';
import {
  normalizeString,
  normalizeStringForStorage,
} from '../utils/string-normalizer';
import { MAX_ENUM_OPTION_LENGTH } from '../utils/constants';

@Injectable()
export class TechnicalCharacteristicsService {
  constructor(private prisma: PrismaService) {}

  async create(
    createTechnicalCharacteristicDto: CreateTechnicalCharacteristicDto,
  ) {
    const validTypes = ['string', 'number', 'boolean', 'enum'];
    if (!validTypes.includes(createTechnicalCharacteristicDto.type)) {
      throw new BadRequestException(
        `Type de caractéristique technique invalide. Doit être l'un de : ${validTypes.join(', ')}`,
      );
    }

    let filteredEnumOptions: string[] | null = null;
    const normalizedName = normalizeStringForStorage(
      createTechnicalCharacteristicDto.name,
    );
    if (createTechnicalCharacteristicDto.type === 'enum') {
      if (
        !createTechnicalCharacteristicDto.enumOptions ||
        createTechnicalCharacteristicDto.enumOptions.length === 0
      ) {
        throw new BadRequestException(
          'Les options enum sont requises pour le type "enum"',
        );
      }

      const filteredOptions =
        createTechnicalCharacteristicDto.enumOptions.filter(
          (opt) => opt.trim().length > 0,
        );
      if (filteredOptions.length === 0) {
        throw new BadRequestException(
          'Au moins une option enum valide est requise',
        );
      }
      this.ensureEnumOptionsLength(filteredOptions);
      filteredEnumOptions = filteredOptions.map((option) =>
        normalizeStringForStorage(option),
      );
    }

    const hasFamilies =
      createTechnicalCharacteristicDto.familyIds &&
      createTechnicalCharacteristicDto.familyIds.length > 0;
    const hasVariants =
      createTechnicalCharacteristicDto.variantIds &&
      createTechnicalCharacteristicDto.variantIds.length > 0;

    if (hasFamilies) {
      const existingCharacteristics =
        await this.prisma.technicalCharacteristic.findMany({
          where: {
            families: {
              some: {
                familyId: { in: createTechnicalCharacteristicDto.familyIds! },
              },
            },
          },
          include: {
            families: true,
          },
        });

      for (const familyId of createTechnicalCharacteristicDto.familyIds!) {
        const characteristicsInFamily = existingCharacteristics.filter((tc) =>
          tc.families.some((f: any) => f.familyId === familyId),
        );

        const existing = characteristicsInFamily.find(
          (tc) =>
            normalizeString(tc.name) ===
            normalizeString(createTechnicalCharacteristicDto.name),
        );

        if (existing) {
          const family = await this.prisma.family.findUnique({
            where: { id: familyId },
          });
          throw new BadRequestException(
            `Une caractéristique technique avec le nom "${createTechnicalCharacteristicDto.name}" existe déjà dans la famille "${family?.name || familyId}"`,
          );
        }
      }
    }

    if (!hasFamilies && !hasVariants) {
      throw new BadRequestException(
        'Au moins une famille ou une variante doit être fournie',
      );
    }

    if (hasFamilies) {
      const families = await this.prisma.family.findMany({
        where: { id: { in: createTechnicalCharacteristicDto.familyIds! } },
      });
      if (
        families.length !== createTechnicalCharacteristicDto.familyIds!.length
      ) {
        throw new NotFoundException("Une ou plusieurs familles n'existent pas");
      }
    }


    if (hasVariants) {
      const variants = await this.prisma.variant.findMany({
        where: { id: { in: createTechnicalCharacteristicDto.variantIds! } },
      });
      if (
        variants.length !== createTechnicalCharacteristicDto.variantIds!.length
      ) {
        throw new NotFoundException(
          "Une ou plusieurs variantes n'existent pas",
        );
      }
    }

    return this.prisma.technicalCharacteristic.create({
      data: {
        name: normalizedName,
        type: createTechnicalCharacteristicDto.type,
        enumOptions: filteredEnumOptions,
        enumMultiple:
          createTechnicalCharacteristicDto.type === 'enum'
            ? (createTechnicalCharacteristicDto.enumMultiple ?? false)
            : null,
        uniqueInItself: createTechnicalCharacteristicDto.uniqueInItself ?? false,
        families: hasFamilies
          ? {
              create: createTechnicalCharacteristicDto.familyIds!.map(
                (familyId) => ({ familyId }),
              ),
            }
          : undefined,
        variants: hasVariants
          ? {
              create: createTechnicalCharacteristicDto.variantIds!.map(
                (variantId) => ({ variantId }),
              ),
            }
          : undefined,
      },
      include: {
        families: {
          include: { family: true },
        },
        variants: {
          include: { variant: true },
        },
      },
    });
  }

  async findAll(offset: number = 0, limit: number = 50, search?: string) {
    let allTechnicalCharacteristics =
      await this.prisma.technicalCharacteristic.findMany({
        include: {
          families: {
            include: { family: true },
          },
          variants: {
            include: { variant: true },
          },
        },
        orderBy: {
          name: 'asc',
        },
      });


    if (search && typeof search === 'string' && search.trim().length > 0) {
      const normalizedSearch = normalizeString(search.trim());
      allTechnicalCharacteristics = allTechnicalCharacteristics.filter((tc) => {
        const normalizedName = normalizeString(tc.name);
        const normalizedType = normalizeString(tc.type);
        const familyNames = (tc.families || [])
          .map((f: any) => f.family?.name || '')
          .map((name: string) => normalizeString(name))
          .join(' ');
        const variantNames = (tc.variants || [])
          .map((v: any) => v.variant?.name || '')
          .map((name: string) => normalizeString(name))
          .join(' ');
        return (
          normalizedName.includes(normalizedSearch) ||
          normalizedType.includes(normalizedSearch) ||
          familyNames.includes(normalizedSearch) ||
          variantNames.includes(normalizedSearch)
        );
      });
    }


    const total = allTechnicalCharacteristics.length;
    const data = allTechnicalCharacteristics.slice(offset, offset + limit);

    return {
      data,
      total,
      hasMore: offset + limit < total,
    };
  }

  async findByFamily(
    familyId: string,
    offset: number = 0,
    limit: number = 50,
    search?: string,
  ) {
    let allTechnicalCharacteristics =
      await this.prisma.technicalCharacteristic.findMany({
        where: {
          families: {
            some: { familyId },
          },
        },
        include: {
          families: {
            include: { family: true },
          },
          variants: {
            include: { variant: true },
          },
        },
        orderBy: {
          name: 'asc',
        },
      });


    if (search && typeof search === 'string' && search.trim().length > 0) {
      const normalizedSearch = normalizeString(search.trim());
      allTechnicalCharacteristics = allTechnicalCharacteristics.filter((tc) => {
        const normalizedName = normalizeString(tc.name);
        const normalizedType = normalizeString(tc.type);
        return (
          normalizedName.includes(normalizedSearch) ||
          normalizedType.includes(normalizedSearch)
        );
      });
    }


    const total = allTechnicalCharacteristics.length;
    const data = allTechnicalCharacteristics.slice(offset, offset + limit);

    return {
      data,
      total,
      hasMore: offset + limit < total,
    };
  }

  async findByVariant(
    variantId: string,
    offset: number = 0,
    limit: number = 50,
    search?: string,
  ) {
    let allTechnicalCharacteristics =
      await this.prisma.technicalCharacteristic.findMany({
        where: {
          variants: {
            some: { variantId },
          },
        },
        include: {
          families: {
            include: { family: true },
          },
          variants: {
            include: { variant: true },
          },
        },
        orderBy: {
          name: 'asc',
        },
      });


    if (search && typeof search === 'string' && search.trim().length > 0) {
      const normalizedSearch = normalizeString(search.trim());
      allTechnicalCharacteristics = allTechnicalCharacteristics.filter((tc) => {
        const normalizedName = normalizeString(tc.name);
        const normalizedType = normalizeString(tc.type);
        return (
          normalizedName.includes(normalizedSearch) ||
          normalizedType.includes(normalizedSearch)
        );
      });
    }


    const total = allTechnicalCharacteristics.length;
    const data = allTechnicalCharacteristics.slice(offset, offset + limit);

    return {
      data,
      total,
      hasMore: offset + limit < total,
    };
  }

  async findByFamilyAndVariant(
    familyId: string,
    variantIds: string[],
    offset: number = 0,
    limit: number = 50,
    search?: string,
  ) {
    const baseFilter: any = {
      families: {
        some: { familyId },
      },
    };

    const allTechnicalCharacteristics =
      await this.prisma.technicalCharacteristic.findMany({
        where: baseFilter,
        include: {
          families: {
            include: { family: true },
          },
          variants: {
            include: {
              variant: {
                include: { family: true },
              },
            },
          },
        },
        orderBy: {
          name: 'asc',
        },
      });

    const filtered = allTechnicalCharacteristics.filter(
      (technicalCharacteristic) => {
        const associatedVariants = (technicalCharacteristic.variants || [])
          .filter(
            (tcVariant: any) => tcVariant.variant && tcVariant.variant.familyId,
          )
          .map((tcVariant: any) => ({
            variantId: tcVariant.variantId,
            familyId: tcVariant.variant.familyId,
          }));

        const variantsForThisFamily = associatedVariants.filter(
          (v) => v.familyId === familyId,
        );

        if (variantIds.length > 0) {
          if (variantsForThisFamily.length === 0) {
            return false;
          }
          const variantIdsForThisFamily = variantsForThisFamily.map(
            (v) => v.variantId,
          );
          return variantIds.some((variantId) =>
            variantIdsForThisFamily.includes(variantId),
          );
        } else {
          return variantsForThisFamily.length === 0;
        }
      },
    );

    let finalFiltered = filtered;
    if (search && typeof search === 'string' && search.trim().length > 0) {
      const normalizedSearch = normalizeString(search.trim());
      finalFiltered = filtered.filter((tc) => {
        const normalizedName = normalizeString(tc.name);
        const normalizedType = normalizeString(tc.type);
        const familyNames = (tc.families || [])
          .map((f: any) => f.family?.name || '')
          .map((name: string) => normalizeString(name))
          .join(' ');
        const variantNames = (tc.variants || [])
          .map((v: any) => v.variant?.name || '')
          .map((name: string) => normalizeString(name))
          .join(' ');
        return (
          normalizedName.includes(normalizedSearch) ||
          normalizedType.includes(normalizedSearch) ||
          familyNames.includes(normalizedSearch) ||
          variantNames.includes(normalizedSearch)
        );
      });
    }

    const total = finalFiltered.length;
    const data = finalFiltered.slice(offset, offset + limit);

    return {
      data,
      total,
      hasMore: offset + limit < total,
    };
  }

  async findOne(id: string) {
    const technicalCharacteristic =
      await this.prisma.technicalCharacteristic.findUnique({
        where: { id },
        include: {
          families: {
            include: { family: true },
          },
          variants: {
            include: { variant: true },
          },
        },
      });

    if (!technicalCharacteristic) {
      throw new NotFoundException(
        `Caractéristique technique avec l'ID ${id} introuvable`,
      );
    }

    return technicalCharacteristic;
  }

  async update(
    id: string,
    updateTechnicalCharacteristicDto: UpdateTechnicalCharacteristicDto,
  ) {
    const technicalCharacteristic = await this.findOne(id);

    if (updateTechnicalCharacteristicDto.type) {
      const validTypes = ['string', 'number', 'boolean', 'enum'];
      if (!validTypes.includes(updateTechnicalCharacteristicDto.type)) {
        throw new BadRequestException(
          `Type de caractéristique technique invalide. Doit être l'un de : ${validTypes.join(', ')}`,
        );
      }
    }

    const finalType =
      updateTechnicalCharacteristicDto.type || technicalCharacteristic.type;
    if (finalType === 'enum') {
      const enumOptions =
        updateTechnicalCharacteristicDto.enumOptions !== undefined
          ? updateTechnicalCharacteristicDto.enumOptions
          : (technicalCharacteristic.enumOptions as string[] | null);

      if (!enumOptions || enumOptions.length === 0) {
        throw new BadRequestException(
          'Les options enum sont requises pour le type "enum"',
        );
      }
      const filteredOptions = enumOptions.filter(
        (opt) => opt.trim().length > 0,
      );
      if (filteredOptions.length === 0) {
        throw new BadRequestException(
          'Au moins une option enum valide est requise',
        );
      }
      this.ensureEnumOptionsLength(filteredOptions);
    }

    const hasFamilies =
      updateTechnicalCharacteristicDto.familyIds &&
      updateTechnicalCharacteristicDto.familyIds.length > 0;
    const hasVariants =
      updateTechnicalCharacteristicDto.variantIds &&
      updateTechnicalCharacteristicDto.variantIds.length > 0;


    if (
      updateTechnicalCharacteristicDto.name &&
      normalizeString(updateTechnicalCharacteristicDto.name) !==
        normalizeString(technicalCharacteristic.name)
    ) {
      const familyIdsToCheck = hasFamilies
        ? updateTechnicalCharacteristicDto.familyIds!
        : technicalCharacteristic.families.map((f: any) => f.familyId);

      if (familyIdsToCheck.length > 0) {
        const existingCharacteristics =
          await this.prisma.technicalCharacteristic.findMany({
            where: {
              id: { not: id },
              families: {
                some: {
                  familyId: { in: familyIdsToCheck },
                },
              },
            },
            include: {
              families: true,
          },
        });

        for (const familyId of familyIdsToCheck) {
          const characteristicsInFamily = existingCharacteristics.filter((tc) =>
            tc.families.some((f: any) => f.familyId === familyId),
          );

          const existing = characteristicsInFamily.find(
            (tc) =>
              normalizeString(tc.name) ===
              normalizeString(updateTechnicalCharacteristicDto.name),
          );

          if (existing) {
            const family = await this.prisma.family.findUnique({
              where: { id: familyId },
            });
            throw new BadRequestException(
              `Une caractéristique technique avec le nom "${updateTechnicalCharacteristicDto.name}" existe déjà dans la famille "${family?.name || familyId}"`,
            );
          }
        }
      }
    }

    if (hasFamilies) {
      const families = await this.prisma.family.findMany({
        where: { id: { in: updateTechnicalCharacteristicDto.familyIds! } },
      });
      if (
        families.length !== updateTechnicalCharacteristicDto.familyIds!.length
      ) {
        throw new NotFoundException("Une ou plusieurs familles n'existent pas");
      }
    }


    if (hasVariants) {
      const variants = await this.prisma.variant.findMany({
        where: { id: { in: updateTechnicalCharacteristicDto.variantIds! } },
      });
      if (
        variants.length !== updateTechnicalCharacteristicDto.variantIds!.length
      ) {
        throw new NotFoundException(
          "Une ou plusieurs variantes n'existent pas",
        );
      }
    }

    const updateData: any = {
      name: updateTechnicalCharacteristicDto.name
        ? normalizeStringForStorage(updateTechnicalCharacteristicDto.name)
        : undefined,
      type: updateTechnicalCharacteristicDto.type,
    };

    if (
      updateTechnicalCharacteristicDto.type === 'enum' ||
      (finalType === 'enum' &&
        updateTechnicalCharacteristicDto.enumOptions !== undefined)
    ) {
      const enumOptions =
        updateTechnicalCharacteristicDto.enumOptions ||
        (technicalCharacteristic.enumOptions as string[] | null) ||
        [];
      const filteredOptions = enumOptions.filter(
        (opt) => opt.trim().length > 0,
      );
      this.ensureEnumOptionsLength(filteredOptions);
      updateData.enumOptions = filteredOptions.map((option) =>
        normalizeStringForStorage(option),
      );
    } else if (
      updateTechnicalCharacteristicDto.type &&
      updateTechnicalCharacteristicDto.type !== 'enum'
    ) {
      updateData.enumOptions = null;
      updateData.enumMultiple = null;
    }


    if (
      updateTechnicalCharacteristicDto.type === 'enum' ||
      (finalType === 'enum' &&
        updateTechnicalCharacteristicDto.enumMultiple !== undefined)
    ) {
      updateData.enumMultiple =
        updateTechnicalCharacteristicDto.enumMultiple ?? false;
    } else if (
        updateTechnicalCharacteristicDto.type &&
        updateTechnicalCharacteristicDto.type !== 'enum'
    ) {
      updateData.enumMultiple = null;
    }

    if (updateTechnicalCharacteristicDto.uniqueInItself !== undefined) {
      updateData.uniqueInItself = updateTechnicalCharacteristicDto.uniqueInItself;
    }

    if (hasFamilies !== undefined) {
      updateData.families = {
        deleteMany: {},
        create: hasFamilies
          ? updateTechnicalCharacteristicDto.familyIds!.map((familyId) => ({
              familyId,
            }))
          : [],
      };
    }

    if (hasVariants !== undefined) {
      updateData.variants = {
        deleteMany: {},
        create: hasVariants
          ? updateTechnicalCharacteristicDto.variantIds!.map((variantId) => ({
              variantId,
            }))
          : [],
      };
    }

    if (
      finalType === 'enum' &&
      updateTechnicalCharacteristicDto.enumOptions !== undefined
    ) {
      const oldEnumOptions =
        (technicalCharacteristic.enumOptions as string[] | null) || [];
      const newEnumOptions =
        updateTechnicalCharacteristicDto.enumOptions.filter(
        (opt) => opt.trim().length > 0,
      );

      const normalizedOldOptions = oldEnumOptions.map((opt) =>
        normalizeStringForStorage(opt),
      );
      const normalizedNewOptions = newEnumOptions.map((opt) =>
        normalizeStringForStorage(opt),
      );

      const newOptionsSet = new Set(normalizedNewOptions);

      const optionMapping = new Map<string, string>();
      const maxLength = Math.max(
        normalizedOldOptions.length,
        normalizedNewOptions.length,
      );

      for (let i = 0; i < maxLength; i++) {
        if (
          i < normalizedOldOptions.length &&
          i < normalizedNewOptions.length
        ) {
          const oldOption = normalizedOldOptions[i];
          const newOption = normalizedNewOptions[i];
          if (oldOption !== newOption) {
            optionMapping.set(oldOption, newOption);
          }
        }
      }

      const deletedOptions = new Set<string>();
      for (const oldOption of normalizedOldOptions) {
        if (!newOptionsSet.has(oldOption)) {
          if (!optionMapping.has(oldOption)) {
            deletedOptions.add(oldOption);
          }
        }
      }

      const productTechChars =
        await this.prisma.productTechnicalCharacteristic.findMany({
          where: {
            technicalCharacteristicId: id,
          },
        });

      for (const productTechChar of productTechChars) {
        const normalizedValue = normalizeStringForStorage(
          productTechChar.value,
        );
        let shouldUpdate = false;
        let newValue = productTechChar.value;

        if (optionMapping.has(normalizedValue)) {
          newValue = optionMapping.get(normalizedValue)!;
          shouldUpdate = true;
        }
        else if (deletedOptions.has(normalizedValue)) {
          newValue = '';
          shouldUpdate = true;
        }

        if (shouldUpdate) {
          await this.prisma.productTechnicalCharacteristic.update({
            where: { id: productTechChar.id },
            data: { value: newValue },
          });
        }
      }
    }

    return this.prisma.technicalCharacteristic.update({
      where: { id },
      data: updateData,
      include: {
        families: {
          include: { family: true },
        },
        variants: {
          include: { variant: true },
        },
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.technicalCharacteristic.delete({
      where: { id },
    });
  }

  private ensureEnumOptionsLength(options: string[]) {
    options.forEach((option) => {
      if (option.length > MAX_ENUM_OPTION_LENGTH) {
        throw new BadRequestException(
          `Les options enum sont limitées à ${MAX_ENUM_OPTION_LENGTH} caractères`,
        );
      }
    });
  }
}
