import { Module } from '@nestjs/common';
import { MeController } from './me.controller';
import { ProfileApiService } from './profile.api.service';

@Module({
  controllers: [MeController],
  providers: [ProfileApiService],
  exports: [ProfileApiService],
})
export class ProfileModule {}
