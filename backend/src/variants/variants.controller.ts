import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { VariantsService } from './variants.service';
import { CreateVariantDto } from './dto/create-variant.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('variants')
@UseGuards(JwtAuthGuard)
export class VariantsController {
  constructor(private readonly variantsService: VariantsService) {}

  @Post()
  create(@Body() createVariantDto: CreateVariantDto) {
    return this.variantsService.create(createVariantDto);
  }

  @Get()
  findAll(@Query('familyId') familyId?: string, @Query('offset') offset?: string, @Query('limit') limit?: string, @Query('search') search?: string) {
    const offsetNum = offset ? parseInt(offset, 10) : 0;
    const limitNum = limit ? parseInt(limit, 10) : 50;
    if (familyId) {
      return this.variantsService.findByFamily(familyId, offsetNum, limitNum, search);
    }
    return this.variantsService.findAll(offsetNum, limitNum, search);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.variantsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateVariantDto: UpdateVariantDto) {
    return this.variantsService.update(id, updateVariantDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.variantsService.remove(id);
  }
}

