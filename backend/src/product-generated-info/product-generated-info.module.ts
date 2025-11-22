import { Module } from '@nestjs/common';
import { ProductGeneratedInfoService } from './product-generated-info.service';
import { ProductGeneratedInfoController } from './product-generated-info.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { FieldsModule } from '../fields/fields.module';

@Module({
  imports: [PrismaModule, FieldsModule],
  controllers: [ProductGeneratedInfoController],
  providers: [ProductGeneratedInfoService],
  exports: [ProductGeneratedInfoService],
})
export class ProductGeneratedInfoModule {}

