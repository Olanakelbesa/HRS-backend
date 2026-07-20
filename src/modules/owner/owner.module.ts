import { Module } from '@nestjs/common';
import { OwnerController } from './owner.controller';
import { OwnerApiService } from './owner.api.service';

@Module({
  controllers: [OwnerController],
  providers: [OwnerApiService],
  exports: [OwnerApiService],
})
export class OwnerModule {}
