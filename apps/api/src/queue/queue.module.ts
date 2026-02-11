import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TokenCleanupProcessor } from './token-cleanup.processor';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'token-cleanup',
    }),
  ],
  providers: [TokenCleanupProcessor],
  exports: [BullModule],
})
export class QueueModule {}
