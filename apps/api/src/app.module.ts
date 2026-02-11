import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { WorkOrdersModule } from './work-orders/work-orders.module';
import { AttachmentsModule } from './attachments/attachments.module';
import { PublicConfirmModule } from './public-confirm/public-confirm.module';
import { QueueModule } from './queue/queue.module';

const redisEnabled = !!process.env.REDIS_HOST;

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: process.env.NODE_ENV === 'test' ? '../../.env.test' : '../../.env',
    }),
    ...(redisEnabled
      ? [
          BullModule.forRoot({
            connection: {
              host: process.env.REDIS_HOST,
              port: parseInt(process.env.REDIS_PORT || '6379', 10),
            },
          }),
          QueueModule,
        ]
      : []),
    PrismaModule,
    AuthModule,
    UsersModule,
    WorkOrdersModule,
    AttachmentsModule,
    PublicConfirmModule,
  ],
})
export class AppModule {}
