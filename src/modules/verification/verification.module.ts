import { Module } from '@nestjs/common';
import { VerificationController } from './verification.controller';
import { VerificationApiService } from './verification.api.service';

@Module({
  controllers: [VerificationController],
  providers: [VerificationApiService],
  exports: [VerificationApiService],
})
export class VerificationModule {}
