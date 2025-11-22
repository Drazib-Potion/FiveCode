import { IsString, IsNotEmpty, IsOptional, IsUUID, IsArray } from 'class-validator';

export class CreateTechnicalCharacteristicDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  type: string; // "string" | "number" | "boolean" | "select"

  @IsArray()
  @IsUUID(undefined, { each: true })
  @IsOptional()
  familyIds?: string[]; // Tableau de familyIds

  @IsArray()
  @IsUUID(undefined, { each: true })
  @IsOptional()
  variantIds?: string[]; // Tableau de variantIds
}

