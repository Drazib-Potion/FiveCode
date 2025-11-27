import { PartialType } from '@nestjs/mapped-types';
import { CreateTechnicalCharacteristicDto } from './create-technical-characteristic.dto';

export class UpdateTechnicalCharacteristicDto extends PartialType(
  CreateTechnicalCharacteristicDto,
) {}
