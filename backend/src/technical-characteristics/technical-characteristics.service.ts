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
    // Valider le type
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
    // Si le type est "enum", vérifier que enumOptions est fourni et non vide
    if (createTechnicalCharacteristicDto.type === 'enum') {
      if (
        !createTechnicalCharacteristicDto.enumOptions ||
        createTechnicalCharacteristicDto.enumOptions.length === 0
      ) {
        throw new BadRequestException(
          'Les options enum sont requises pour le type "enum"',
        );
      }
      // Filtrer les options vides
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

    // Vérifier qu'au moins une famille ou une variante est fournie
    const hasFamilies =
      createTechnicalCharacteristicDto.familyIds &&
      createTechnicalCharacteristicDto.familyIds.length > 0;
    const hasVariants =
      createTechnicalCharacteristicDto.variantIds &&
      createTechnicalCharacteristicDto.variantIds.length > 0;

    // Vérifier que le nom n'existe pas déjà dans les familles spécifiées (insensible à la casse et aux accents)
    if (hasFamilies) {
      // Récupérer toutes les caractéristiques techniques associées aux familles spécifiées
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

      // Vérifier pour chaque famille si le nom existe déjà
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

    // Vérifier que les familles existent
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

    // Vérifier que les variantes existent
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
    // Récupérer toutes les caractéristiques techniques si recherche, sinon utiliser la pagination normale
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

    // Filtrer avec normalisation si recherche
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

    // Appliquer la pagination
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
    // Récupérer toutes les caractéristiques techniques de la famille
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

    // Filtrer avec normalisation si recherche
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

    // Appliquer la pagination
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
    // Récupérer toutes les caractéristiques techniques de la variante
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

    // Filtrer avec normalisation si recherche
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

    // Appliquer la pagination
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
    // Construire le filtre de base
    const baseFilter: any = {
      families: {
        some: { familyId },
      },
    };

    // Récupérer toutes les caractéristiques techniques associées à la famille
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

    // Filtrer selon la logique stricte : la caractéristique est associée uniquement à ce qui est explicitement coché
    // Si variantIds est vide, on cherche les caractéristiques qui s'appliquent à toute la famille (sans variantes spécifiques)
    // Si variantIds n'est pas vide, on cherche uniquement les caractéristiques qui ont ces variantes spécifiques associées
    const filtered = allTechnicalCharacteristics.filter(
      (technicalCharacteristic) => {
        // Récupérer les variantes associées avec leur famille (en filtrant les null/undefined)
        const associatedVariants = (technicalCharacteristic.variants || [])
          .filter(
            (tcVariant: any) => tcVariant.variant && tcVariant.variant.familyId,
          ) // Filtrer les variantes invalides
          .map((tcVariant: any) => ({
            variantId: tcVariant.variantId,
            familyId: tcVariant.variant.familyId,
          }));

        // Filtrer les variantes pour ne garder que celles qui appartiennent à la famille
        const variantsForThisFamily = associatedVariants.filter(
          (v) => v.familyId === familyId,
        );

        // Si on cherche des variantes spécifiques (variantIds n'est pas vide)
        if (variantIds.length > 0) {
          // La caractéristique doit avoir des variantes associées pour cette famille
          // ET au moins une de ces variantes doit correspondre aux variantes recherchées
          if (variantsForThisFamily.length === 0) {
            return false; // Pas de variantes associées, donc ne s'applique pas aux variantes spécifiques
          }
          const variantIdsForThisFamily = variantsForThisFamily.map(
            (v) => v.variantId,
          );
          return variantIds.some((variantId) =>
            variantIdsForThisFamily.includes(variantId),
          );
        } else {
          // Si on ne cherche pas de variantes spécifiques (variantIds est vide)
          // On retourne uniquement les caractéristiques qui n'ont pas de variantes associées pour cette famille
          // (caractéristiques qui s'appliquent à toute la famille sans restriction de variantes)
          return variantsForThisFamily.length === 0;
        }
      },
    );

    // Appliquer la recherche avec normalisation si nécessaire
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

    // Appliquer la pagination sur le résultat filtré
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

    // Si le type est "enum", vérifier que enumOptions est fourni et non vide
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
      // Filtrer les options vides
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

    // Si le nom est modifié, vérifier qu'il n'existe pas déjà dans les familles spécifiées (insensible à la casse et aux accents)
    if (
      updateTechnicalCharacteristicDto.name &&
      normalizeString(updateTechnicalCharacteristicDto.name) !==
        normalizeString(technicalCharacteristic.name)
    ) {
      // Utiliser les familles fournies dans la mise à jour, sinon les familles actuelles
      const familyIdsToCheck = hasFamilies
        ? updateTechnicalCharacteristicDto.familyIds!
        : technicalCharacteristic.families.map((f: any) => f.familyId);

      if (familyIdsToCheck.length > 0) {
        // Récupérer toutes les caractéristiques techniques associées aux familles spécifiées (sauf la caractéristique actuelle)
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

        // Vérifier pour chaque famille si le nom existe déjà
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

    // Vérifier que les familles existent
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

    // Vérifier que les variantes existent
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

    // Préparer les données de mise à jour
    const updateData: any = {
      name: updateTechnicalCharacteristicDto.name
        ? normalizeStringForStorage(updateTechnicalCharacteristicDto.name)
        : undefined,
      type: updateTechnicalCharacteristicDto.type,
    };

    // Gérer enumOptions
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
      // Si on change le type vers autre chose que enum, supprimer enumOptions et enumMultiple
      updateData.enumOptions = null;
      updateData.enumMultiple = null;
    }

    // Gérer enumMultiple
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
      // Si on change le type vers autre chose que enum, supprimer enumMultiple
      updateData.enumMultiple = null;
    }

    // Mettre à jour les familles si fournies
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

    // Mettre à jour les variantes si fournies
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

    // Si le type est "enum" et que les options sont modifiées, synchroniser les valeurs
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

      // Normaliser les options pour la comparaison
      const normalizedOldOptions = oldEnumOptions.map((opt) =>
        normalizeStringForStorage(opt),
      );
      const normalizedNewOptions = newEnumOptions.map((opt) =>
        normalizeStringForStorage(opt),
      );

      // Créer un Set des nouvelles options pour vérifier rapidement si une option existe
      const newOptionsSet = new Set(normalizedNewOptions);

      // Trouver les correspondances entre anciennes et nouvelles options par index
      const optionMapping = new Map<string, string>();
      const maxLength = Math.max(
        normalizedOldOptions.length,
        normalizedNewOptions.length,
      );

      // Mapping par index : option à l'index i devient la nouvelle option à l'index i (si elle existe)
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

      // Trouver les options supprimées (présentes dans l'ancienne liste mais absentes de la nouvelle)
      const deletedOptions = new Set<string>();
      for (const oldOption of normalizedOldOptions) {
        // Vérifier si l'option existe toujours dans la nouvelle liste (par valeur exacte)
        if (!newOptionsSet.has(oldOption)) {
          // Vérifier aussi si elle n'a pas été renommée (via le mapping)
          if (!optionMapping.has(oldOption)) {
            deletedOptions.add(oldOption);
          }
        }
      }

      // Récupérer toutes les ProductTechnicalCharacteristic pour cette caractéristique technique
      const productTechChars =
        await this.prisma.productTechnicalCharacteristic.findMany({
          where: {
            technicalCharacteristicId: id,
          },
        });

      // Mettre à jour les valeurs
      for (const productTechChar of productTechChars) {
        const normalizedValue = normalizeStringForStorage(
          productTechChar.value,
        );
        let shouldUpdate = false;
        let newValue = productTechChar.value;

        // Si la valeur correspond à une option renommée, la mettre à jour
        if (optionMapping.has(normalizedValue)) {
          newValue = optionMapping.get(normalizedValue)!;
          shouldUpdate = true;
        }
        // Si la valeur correspond à une option supprimée, la vider
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
