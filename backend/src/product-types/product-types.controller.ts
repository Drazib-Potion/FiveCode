import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { ProductTypesService } from './product-types.service';
import { CreateProductTypeDto } from './dto/create-product-type.dto';
import { UpdateProductTypeDto } from './dto/update-product-type.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('product-types')
@UseGuards(JwtAuthGuard)
export class ProductTypesController {
  constructor(private readonly productTypesService: ProductTypesService) {}

  @Post()
  create(@Body() createProductTypeDto: CreateProductTypeDto) {
    return this.productTypesService.create(createProductTypeDto);
  }

  @Get()
  findAll(@Query('offset') offset?: string, @Query('limit') limit?: string, @Query('search') search?: string) {
    const offsetNum = offset ? parseInt(offset, 10) : 0;
    const limitNum = limit ? parseInt(limit, 10) : 50;
    return this.productTypesService.findAll(offsetNum, limitNum, search);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productTypesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateProductTypeDto: UpdateProductTypeDto) {
    return this.productTypesService.update(id, updateProductTypeDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productTypesService.remove(id);
  }
}

