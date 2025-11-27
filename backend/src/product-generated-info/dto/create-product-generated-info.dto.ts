import { IsUUID, IsNotEmpty, IsObject, IsOptional } from 'class-validator';

export class CreateProductGeneratedInfoDto {
  @IsUUID()
  @IsNotEmpty()
  productId: string;

  @IsUUID()
  @IsOptional()
  variant1Id?: string; // Variante de niveau 1 (optionnelle)

  @IsUUID()
  @IsOptional()
  variant2Id?: string; // Variante de niveau 2 (optionnelle)

  @IsObject()
  @IsOptional()
  values?: Record<string, any>; // { technicalCharacteristicId: value } - Optionnel
}
