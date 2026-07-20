import { Module } from '@nestjs/common';
import { MeController } from './me.controller';
import { ProfileService } from './profile.service';

@Module({
  controllers: [MeController],
  providers: [ProfileService],
  exports: [ProfileService],
})
export class ProfileModule {}
