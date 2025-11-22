import { IsString, IsNotEmpty, IsUUID, IsArray, IsOptional } from 'class-validator';

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

  @IsArray()
  @IsUUID(undefined, { each: true })
  @IsOptional()
  excludedVariantIds?: string[]; // Tableau des IDs de variantes qui excluent cette variante
}

