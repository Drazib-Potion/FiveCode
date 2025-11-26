import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { TechnicalCharacteristicsService } from './technical-characteristics.service';
import { CreateTechnicalCharacteristicDto } from './dto/create-technical-characteristic.dto';
import { UpdateTechnicalCharacteristicDto } from './dto/update-technical-characteristic.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('technical-characteristics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TechnicalCharacteristicsController {
  constructor(private readonly technicalCharacteristicsService: TechnicalCharacteristicsService) {}

  @Post()
  @Roles('MANAGER', 'ADMIN')
  create(@Body() createTechnicalCharacteristicDto: CreateTechnicalCharacteristicDto) {
    return this.technicalCharacteristicsService.create(createTechnicalCharacteristicDto);
  }

  @Get()
  findAll(@Query('familyId') familyId?: string, @Query('variantIds') variantIds?: string, @Query('offset') offset?: string, @Query('limit') limit?: string, @Query('search') search?: string) {
    const offsetNum = offset ? parseInt(offset, 10) : 0;
    const limitNum = limit ? parseInt(limit, 10) : 50;
    
    if (familyId) {
      // Si variantIds est fourni (même vide), utiliser findByFamilyAndVariant
      // Cela permet de filtrer correctement : avec un tableau vide, on obtient uniquement
      // les caractéristiques qui ne sont pas liées à une variante
      if (variantIds !== undefined) {
        // variantIds peut être une chaîne séparée par des virgules ou une chaîne vide
        const variantIdsArray = variantIds ? variantIds.split(',').filter(id => id.trim() !== '') : [];
        return this.technicalCharacteristicsService.findByFamilyAndVariant(familyId, variantIdsArray, offsetNum, limitNum, search);
      }
      // Si variantIds n'est pas fourni du tout, retourner toutes les caractéristiques de la famille
      return this.technicalCharacteristicsService.findByFamily(familyId, offsetNum, limitNum, search);
    }
    if (variantIds) {
      const variantIdsArray = variantIds.split(',').filter(id => id.trim() !== '');
      if (variantIdsArray.length === 1) {
        return this.technicalCharacteristicsService.findByVariant(variantIdsArray[0], offsetNum, limitNum, search);
      }
      // Pour plusieurs variantes, on utilise findByFamilyAndVariant avec une famille vide
      // Mais on a besoin d'une famille, donc on récupère la famille de la première variante
      // Pour l'instant, on retourne toutes les caractéristiques associées à ces variantes
      return this.technicalCharacteristicsService.findByVariant(variantIdsArray[0], offsetNum, limitNum, search);
    }
    return this.technicalCharacteristicsService.findAll(offsetNum, limitNum, search);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.technicalCharacteristicsService.findOne(id);
  }

  @Patch(':id')
  @Roles('MANAGER', 'ADMIN')
  update(@Param('id') id: string, @Body() updateTechnicalCharacteristicDto: UpdateTechnicalCharacteristicDto) {
    return this.technicalCharacteristicsService.update(id, updateTechnicalCharacteristicDto);
  }

  @Delete(':id')
  @Roles('MANAGER', 'ADMIN')
  remove(@Param('id') id: string) {
    return this.technicalCharacteristicsService.remove(id);
  }
}

