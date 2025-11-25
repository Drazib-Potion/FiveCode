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
} from '@nestjs/common';
import { ProductGeneratedInfoService } from './product-generated-info.service';
import { CreateProductGeneratedInfoDto } from './dto/create-product-generated-info.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('product-generated-infos')
@UseGuards(JwtAuthGuard)
export class ProductGeneratedInfoController {
  constructor(
    private readonly productGeneratedInfoService: ProductGeneratedInfoService,
  ) {}

  @Post()
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
  remove(@Param('id') id: string) {
    return this.productGeneratedInfoService.remove(id);
  }
}
