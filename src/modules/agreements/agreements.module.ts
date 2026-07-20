import { Module } from '@nestjs/common';
import { AgreementsController } from './agreements.controller';
import { AgreementsApiService } from './agreements.api.service';

@Module({
  controllers: [AgreementsController],
  providers: [AgreementsApiService],
  exports: [AgreementsApiService],
})
export class AgreementsModule {}
