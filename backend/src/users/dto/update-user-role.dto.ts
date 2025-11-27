import { IsEnum } from 'class-validator';
import { Role } from '@prisma/client';

export class UpdateUserRoleDto {
  @IsEnum(Role, { message: 'Le rôle doit être CONSULTATION, MANAGER ou ADMIN' })
  role: Role;
}
