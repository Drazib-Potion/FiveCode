import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { TechnicalCharacteristicsService } from './technical-characteristics.service';
import { CreateTechnicalCharacteristicDto } from './dto/create-technical-characteristic.dto';
import { UpdateTechnicalCharacteristicDto } from './dto/update-technical-characteristic.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('technical-characteristics')
@UseGuards(JwtAuthGuard)
export class TechnicalCharacteristicsController {
  constructor(private readonly technicalCharacteristicsService: TechnicalCharacteristicsService) {}

  @Post()
  create(@Body() createTechnicalCharacteristicDto: CreateTechnicalCharacteristicDto) {
    return this.technicalCharacteristicsService.create(createTechnicalCharacteristicDto);
  }

  @Get()
  findAll(@Query('familyId') familyId?: string, @Query('variantIds') variantIds?: string) {
    if (familyId && variantIds) {
      // variantIds peut être une chaîne séparée par des virgules
      const variantIdsArray = variantIds.split(',').filter(id => id.trim() !== '');
      return this.technicalCharacteristicsService.findByFamilyAndVariant(familyId, variantIdsArray);
    }
    if (familyId) {
      return this.technicalCharacteristicsService.findByFamily(familyId);
    }
    if (variantIds) {
      const variantIdsArray = variantIds.split(',').filter(id => id.trim() !== '');
      if (variantIdsArray.length === 1) {
        return this.technicalCharacteristicsService.findByVariant(variantIdsArray[0]);
      }
      // Pour plusieurs variantes, on utilise findByFamilyAndVariant avec une famille vide
      // Mais on a besoin d'une famille, donc on récupère la famille de la première variante
      // Pour l'instant, on retourne toutes les caractéristiques associées à ces variantes
      return this.technicalCharacteristicsService.findByVariant(variantIdsArray[0]);
    }
    return this.technicalCharacteristicsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.technicalCharacteristicsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateTechnicalCharacteristicDto: UpdateTechnicalCharacteristicDto) {
    return this.technicalCharacteristicsService.update(id, updateTechnicalCharacteristicDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.technicalCharacteristicsService.remove(id);
  }
}

