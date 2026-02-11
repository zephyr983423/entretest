import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role, createUserSchema, CreateUserInput } from '@repo/shared';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Post()
  @Roles(Role.OWNER)
  async create(@Body(new ZodValidationPipe(createUserSchema)) input: CreateUserInput) {
    const user = await this.usersService.create(input);
    return { data: user, error: null };
  }

  @Get()
  @Roles(Role.OWNER)
  async findAll(@Query('role') role?: Role) {
    const users = await this.usersService.findAll(role);
    return { data: users, error: null };
  }
}
