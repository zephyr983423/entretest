import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Request,
  Res,
  SetMetadata,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { AttachmentsService } from './attachments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AttachmentType, attachmentTypeSchema } from '@repo/shared';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { z } from 'zod';

const uploadSchema = z.object({
  workOrderId: z.string(),
  type: attachmentTypeSchema,
});

@Controller('attachments')
export class AttachmentsController {
  constructor(private attachmentsService: AttachmentsService) {}

  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @Request() req: any,
    @UploadedFile() file: Express.Multer.File,
    @Body(new ZodValidationPipe(uploadSchema)) body: { workOrderId: string; type: AttachmentType },
  ) {
    const result = await this.attachmentsService.upload(
      req.user,
      body.workOrderId,
      file,
      body.type,
    );
    return { data: result, error: null };
  }

  @Get(':id/download')
  @UseGuards(JwtAuthGuard)
  async download(@Request() req: any, @Param('id') id: string, @Res() res: Response) {
    const { attachment, filePath } = await this.attachmentsService.getAttachment(req.user, id);
    const filename = attachment.filePath.split('/').pop() || 'download';
    res.download(filePath, filename);
  }
}

@Controller('public/attachments')
export class PublicAttachmentsController {
  constructor(private attachmentsService: AttachmentsService) {}

  @Get(':id/download')
  @SetMetadata('isPublic', true)
  async downloadPublic(
    @Param('id') id: string,
    @Query('token') token: string,
    @Res() res: Response,
  ) {
    const { attachment, filePath } = await this.attachmentsService.getAttachmentByToken(id, token);
    const filename = attachment.filePath.split('/').pop() || 'download';
    res.download(filePath, filename);
  }
}
