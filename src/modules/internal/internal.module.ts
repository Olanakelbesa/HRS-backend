import { Module } from '@nestjs/common';
import { InternalController } from './internal.controller';
import { InternalApiService } from './internal.api.service';
import { ServiceAuthGuard } from '../../common/guards/service-auth.guard';

@Module({
  controllers: [InternalController],
  providers: [InternalApiService, ServiceAuthGuard],
})
export class InternalModule {}
