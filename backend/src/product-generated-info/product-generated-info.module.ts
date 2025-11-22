import { Module } from '@nestjs/common';
import { ProductGeneratedInfoService } from './product-generated-info.service';
import { ProductGeneratedInfoController } from './product-generated-info.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { TechnicalCharacteristicsModule } from '../technical-characteristics/technical-characteristics.module';

@Module({
  imports: [PrismaModule, TechnicalCharacteristicsModule],
  controllers: [ProductGeneratedInfoController],
  providers: [ProductGeneratedInfoService],
  exports: [ProductGeneratedInfoService],
})
export class ProductGeneratedInfoModule {}

