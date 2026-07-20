import { Module } from '@nestjs/common';
import { AppointmentsController } from './appointments.controller';
import { AppointmentsApiService } from './appointments.api.service';

@Module({
  controllers: [AppointmentsController],
  providers: [AppointmentsApiService],
  exports: [AppointmentsApiService],
})
export class AppointmentsModule {}
