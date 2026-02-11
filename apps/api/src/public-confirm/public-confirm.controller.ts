import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Request,
  SetMetadata,
} from '@nestjs/common';
import { PublicConfirmService } from './public-confirm.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  requestTokenSchema,
  publicConfirmSchema,
  RequestTokenInput,
  PublicConfirmInput,
} from '@repo/shared';

@Controller('public/confirm')
export class PublicConfirmController {
  constructor(private publicConfirmService: PublicConfirmService) {}

  @Post('request-token')
  @UseGuards(JwtAuthGuard)
  async requestToken(
    @Request() req: any,
    @Body(new ZodValidationPipe(requestTokenSchema)) input: RequestTokenInput,
  ) {
    const result = await this.publicConfirmService.requestToken(
      input.workOrderId,
      req.user.id,
      req.user.role,
    );
    return { data: result, error: null };
  }

  @Get(':token')
  @SetMetadata('isPublic', true)
  async getByToken(@Param('token') token: string) {
    const result = await this.publicConfirmService.getWorkOrderByToken(token);
    return { data: result, error: null };
  }

  @Post(':token')
  @SetMetadata('isPublic', true)
  async confirm(
    @Param('token') token: string,
    @Body(new ZodValidationPipe(publicConfirmSchema)) input: PublicConfirmInput,
  ) {
    const result = await this.publicConfirmService.confirm(token, input);
    return { data: result, error: null };
  }
}
