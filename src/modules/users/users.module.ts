import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersApiService } from './users.api.service';

@Module({
  controllers: [UsersController],
  providers: [UsersApiService],
  exports: [UsersApiService],
})
export class UsersModule {}
