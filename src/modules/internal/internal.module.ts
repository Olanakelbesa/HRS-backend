import { Module } from '@nestjs/common';
import { InternalController } from './internal.controller';
import { InternalService } from './internal.service';
import { ServiceAuthGuard } from '../../common/guards/service-auth.guard';

@Module({
  controllers: [InternalController],
  providers: [InternalService, ServiceAuthGuard],
})
export class InternalModule {}
