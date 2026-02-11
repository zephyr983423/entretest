import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
@Processor('token-cleanup')
export class TokenCleanupProcessor extends WorkerHost implements OnModuleInit {
  constructor(
    private prisma: PrismaService,
    @InjectQueue('token-cleanup') private tokenCleanupQueue: Queue,
  ) {
    super();
  }

  async onModuleInit() {
    // Schedule the cleanup job to run every hour
    const existingJobs = await this.tokenCleanupQueue.getRepeatableJobs();
    const hasCleanupJob = existingJobs.some((job) => job.name === 'cleanup-expired-tokens');

    if (!hasCleanupJob) {
      await this.tokenCleanupQueue.add(
        'cleanup-expired-tokens',
        {},
        {
          repeat: {
            pattern: '0 * * * *', // Every hour
          },
        },
      );
      console.log('📅 Scheduled token cleanup job (runs every hour)');
    }
  }

  async process(job: Job): Promise<void> {
    console.log(`🔄 Processing job: ${job.name}`);

    if (job.name === 'cleanup-expired-tokens') {
      await this.cleanupExpiredTokens();
    }
  }

  private async cleanupExpiredTokens() {
    const now = new Date();

    // Find and delete expired tokens
    const result = await this.prisma.publicConfirmToken.deleteMany({
      where: {
        expiresAt: {
          lt: now,
        },
      },
    });

    console.log(`🧹 Cleaned up ${result.count} expired tokens`);
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    console.log(`✅ Job ${job.name} completed`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    console.error(`❌ Job ${job.name} failed:`, error.message);
  }
}
