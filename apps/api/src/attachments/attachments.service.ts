import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from './storage.service';
import { Role, AttachmentType } from '@repo/shared';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

interface CurrentUser {
  id: string;
  role: Role;
}

@Injectable()
export class AttachmentsService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
  ) {}

  async upload(
    user: CurrentUser,
    workOrderId: string,
    file: Express.Multer.File,
    type: AttachmentType,
  ) {
    // Check work order exists and user has access
    const workOrder = await this.prisma.workOrder.findUnique({
      where: { id: workOrderId },
    });

    if (!workOrder) {
      throw new NotFoundException('Work order not found');
    }

    // Access control
    if (user.role === Role.CUSTOMER && workOrder.customerUserId !== user.id) {
      throw new ForbiddenException('Access denied');
    }

    const ext = path.extname(file.originalname);
    const filename = `${uuidv4()}${ext}`;
    const relativePath = await this.storage.saveFile(workOrderId, filename, file.buffer);

    const attachment = await this.prisma.attachment.create({
      data: {
        workOrderId,
        type,
        filePath: relativePath,
        mimeType: file.mimetype,
        size: file.size,
        createdByUserId: user.id,
      },
    });

    return attachment;
  }

  async getAttachment(user: CurrentUser, id: string) {
    const attachment = await this.prisma.attachment.findUnique({
      where: { id },
      include: {
        workOrder: true,
      },
    });

    if (!attachment) {
      throw new NotFoundException('Attachment not found');
    }

    // Access control
    if (user.role === Role.CUSTOMER && attachment.workOrder.customerUserId !== user.id) {
      throw new ForbiddenException('Access denied');
    }

    if (user.role === Role.STAFF && attachment.workOrder.assignedToUserId !== user.id) {
      throw new ForbiddenException('Access denied');
    }

    return {
      attachment,
      filePath: this.storage.getFilePath(attachment.filePath),
    };
  }

  async getAttachmentByToken(id: string, token: string) {
    const confirmToken = await this.prisma.publicConfirmToken.findUnique({
      where: { token },
      include: { workOrder: true },
    });

    if (!confirmToken) {
      throw new ForbiddenException('Invalid token');
    }

    if (confirmToken.expiresAt < new Date()) {
      throw new ForbiddenException('Token expired');
    }

    const attachment = await this.prisma.attachment.findUnique({
      where: { id },
    });

    if (!attachment) {
      throw new NotFoundException('Attachment not found');
    }

    if (attachment.workOrderId !== confirmToken.workOrderId) {
      throw new ForbiddenException('Access denied');
    }

    return {
      attachment,
      filePath: this.storage.getFilePath(attachment.filePath),
    };
  }
}
