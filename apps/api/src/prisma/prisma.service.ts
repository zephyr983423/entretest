import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async cleanDatabase() {
    if (process.env.NODE_ENV !== 'test') {
      throw new Error('cleanDatabase is only allowed in test environment');
    }

    await this.workOrderEvent.deleteMany();
    await this.publicConfirmToken.deleteMany();
    await this.attachment.deleteMany();
    await this.inventoryTxn.deleteMany();
    await this.repair.deleteMany();
    await this.inspection.deleteMany();
    await this.workOrder.deleteMany();
    await this.device.deleteMany();
    await this.user.deleteMany();
  }
}
