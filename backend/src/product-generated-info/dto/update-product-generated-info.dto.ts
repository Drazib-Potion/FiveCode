import { IsObject, IsOptional } from 'class-validator';

export class UpdateProductGeneratedInfoDto {
  @IsObject()
  @IsOptional()
  values?: Record<string, any>;
}

