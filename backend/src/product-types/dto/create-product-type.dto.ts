import { IsString, IsNotEmpty } from 'class-validator';

export class CreateProductTypeDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  code: string;
}
