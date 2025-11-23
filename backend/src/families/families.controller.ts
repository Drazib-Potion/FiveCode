import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { FamiliesService } from './families.service';
import { CreateFamilyDto } from './dto/create-family.dto';
import { UpdateFamilyDto } from './dto/update-family.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('families')
@UseGuards(JwtAuthGuard)
export class FamiliesController {
  constructor(private readonly familiesService: FamiliesService) {}

  @Post()
  create(@Body() createFamilyDto: CreateFamilyDto) {
    return this.familiesService.create(createFamilyDto);
  }

  @Get()
  findAll(@Query('offset') offset?: string, @Query('limit') limit?: string, @Query('search') search?: string) {
    const offsetNum = offset ? parseInt(offset, 10) : 0;
    const limitNum = limit ? parseInt(limit, 10) : 50;
    return this.familiesService.findAll(offsetNum, limitNum, search);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.familiesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateFamilyDto: UpdateFamilyDto) {
    return this.familiesService.update(id, updateFamilyDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.familiesService.remove(id);
  }
}

