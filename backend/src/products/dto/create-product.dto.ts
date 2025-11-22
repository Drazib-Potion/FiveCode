import { IsString, IsNotEmpty, IsUUID } from 'class-validator';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  code: string;

  @IsUUID()
  @IsNotEmpty()
  familyId: string;

  @IsUUID()
  @IsNotEmpty()
  productTypeId: string;
}
