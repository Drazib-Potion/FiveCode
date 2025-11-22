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
  findAll(@Query('familyId') familyId?: string, @Query('variantId') variantId?: string) {
    if (familyId && variantId) {
      return this.technicalCharacteristicsService.findByFamilyAndVariant(familyId, variantId);
    }
    if (familyId) {
      return this.technicalCharacteristicsService.findByFamily(familyId);
    }
    if (variantId) {
      return this.technicalCharacteristicsService.findByVariant(variantId);
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

