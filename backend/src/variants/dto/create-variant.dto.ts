import { IsString, IsNotEmpty, IsUUID, IsEnum } from 'class-validator';

export enum VariantLevel {
  FIRST = 'FIRST',
  SECOND = 'SECOND',
}

export class CreateVariantDto {
  @IsUUID()
  @IsNotEmpty()
  familyId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  code: string; // Code de la variante (unique par famille)

  @IsEnum(VariantLevel, { message: 'variantLevel must be FIRST or SECOND' })
  variantLevel: VariantLevel;
}

