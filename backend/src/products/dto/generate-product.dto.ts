import { IsUUID, IsNotEmpty, IsObject, IsOptional, IsArray, ArrayMinSize } from 'class-validator';

export class GenerateProductDto {
  @IsUUID()
  @IsNotEmpty()
  familyId: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'At least one variant is required' })
  @IsUUID(undefined, { each: true })
  variantIds: string[]; // Tableau de variantIds

  @IsObject()
  @IsOptional()
  values?: Record<string, any>; // { technicalCharacteristicId: value } - Optionnel
}

