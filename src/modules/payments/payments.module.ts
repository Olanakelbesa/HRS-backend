import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsApiService } from './payments.api.service';

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsApiService],
  exports: [PaymentsApiService],
})
export class PaymentsModule {}
