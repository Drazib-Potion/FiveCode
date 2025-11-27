import { Module } from '@nestjs/common';
import { TechnicalCharacteristicsService } from './technical-characteristics.service';
import { TechnicalCharacteristicsController } from './technical-characteristics.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TechnicalCharacteristicsController],
  providers: [TechnicalCharacteristicsService],
  exports: [TechnicalCharacteristicsService],
})
export class TechnicalCharacteristicsModule {}
