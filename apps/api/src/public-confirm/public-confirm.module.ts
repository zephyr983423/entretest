import { Module } from '@nestjs/common';
import { PublicConfirmService } from './public-confirm.service';
import { PublicConfirmController } from './public-confirm.controller';
import { WorkOrdersModule } from '../work-orders/work-orders.module';

@Module({
  imports: [WorkOrdersModule],
  controllers: [PublicConfirmController],
  providers: [PublicConfirmService],
  exports: [PublicConfirmService],
})
export class PublicConfirmModule {}
