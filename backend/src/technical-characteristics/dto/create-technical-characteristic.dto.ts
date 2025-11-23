import { IsString, IsNotEmpty, IsOptional, IsUUID, IsArray, IsBoolean } from 'class-validator';

export class CreateTechnicalCharacteristicDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  type: string; // "string" | "number" | "boolean" | "enum"

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  enumOptions?: string[]; // Tableau de strings pour les options enum

  @IsBoolean()
  @IsOptional()
  enumMultiple?: boolean; // true = sélection multiple, false = sélection unique

  @IsArray()
  @IsUUID(undefined, { each: true })
  @IsOptional()
  familyIds?: string[]; // Tableau de familyIds

  @IsArray()
  @IsUUID(undefined, { each: true })
  @IsOptional()
  variantIds?: string[]; // Tableau de variantIds
}

