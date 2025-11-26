import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  UnauthorizedException,
  Patch,
} from '@nestjs/common';
import { ProductGeneratedInfoService } from './product-generated-info.service';
import { CreateProductGeneratedInfoDto } from './dto/create-product-generated-info.dto';
import { UpdateProductGeneratedInfoDto } from './dto/update-product-generated-info.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('product-generated-infos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProductGeneratedInfoController {
  constructor(
    private readonly productGeneratedInfoService: ProductGeneratedInfoService,
  ) {}

  @Post()
  @Roles('MANAGER', 'ADMIN')
  create(
    @Body() createDto: CreateProductGeneratedInfoDto,
    @Request() req: any,
  ) {
    const userEmail = req.user?.email;
    if (!userEmail) {
      throw new UnauthorizedException('User email not found in request');
    }
    return this.productGeneratedInfoService.create(createDto, userEmail);
  }

  @Get()
  findAll(@Query('productId') productId?: string) {
    if (productId) {
      return this.productGeneratedInfoService.findByProduct(productId);
    }
    return this.productGeneratedInfoService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productGeneratedInfoService.findOne(id);
  }

  @Delete(':id')
  @Roles('MANAGER', 'ADMIN')
  remove(@Param('id') id: string) {
    return this.productGeneratedInfoService.remove(id);
  }

  @Patch(':id')
  @Roles('MANAGER', 'ADMIN')
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateProductGeneratedInfoDto,
    @Request() req: any,
  ) {
    const userEmail = req.user?.email;
    if (!userEmail) {
      throw new UnauthorizedException('User email not found in request');
    }
    return this.productGeneratedInfoService.update(id, updateDto, userEmail);
  }
}
