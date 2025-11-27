import {
  IsArray,
  ArrayMinSize,
  IsUUID,
  IsObject,
  IsOptional,
} from 'class-validator';

export class UpdateProductVariantsDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one variant is required' })
  @IsUUID(undefined, { each: true })
  variantIds: string[]; // Tableau de variantIds

  @IsObject()
  @IsOptional()
  values?: Record<string, any>; // { technicalCharacteristicId: value } - Optionnel
}
