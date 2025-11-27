import { IsString, IsOptional } from 'class-validator';

export class UpdateProductTypeDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  code?: string;
}
