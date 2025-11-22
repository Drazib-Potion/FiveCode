import { IsString, IsNotEmpty } from 'class-validator';

export class CreateFamilyDto {
  @IsString()
  @IsNotEmpty()
  name: string;
}
