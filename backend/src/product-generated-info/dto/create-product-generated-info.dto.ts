import {
  IsUUID,
  IsNotEmpty,
  IsObject,
  IsOptional,
} from 'class-validator';

export class CreateProductGeneratedInfoDto {
  @IsUUID()
  @IsNotEmpty()
  productId: string;

  @IsUUID()
  @IsOptional()
  variantId?: string; // Une seule variante (optionnelle)

  @IsObject()
  @IsOptional()
  values?: Record<string, any>; // { technicalCharacteristicId: value } - Optionnel
}
