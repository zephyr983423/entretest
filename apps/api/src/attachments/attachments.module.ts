import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { AttachmentsService } from './attachments.service';
import { AttachmentsController, PublicAttachmentsController } from './attachments.controller';
import { StorageService } from './storage.service';
import { memoryStorage } from 'multer';

@Module({
  imports: [
    MulterModule.register({
      storage: memoryStorage(),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
    }),
  ],
  controllers: [AttachmentsController, PublicAttachmentsController],
  providers: [AttachmentsService, StorageService],
  exports: [AttachmentsService, StorageService],
})
export class AttachmentsModule {}
