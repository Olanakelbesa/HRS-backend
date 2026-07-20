import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsApiService } from './reports.api.service';

@Module({
  controllers: [ReportsController],
  providers: [ReportsApiService],
  exports: [ReportsApiService],
})
export class ReportsModule {}
