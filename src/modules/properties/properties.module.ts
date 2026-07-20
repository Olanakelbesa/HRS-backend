import { Module } from '@nestjs/common';
import { PropertiesController } from './properties.controller';
import { PropertiesApiService } from './properties.api.service';

@Module({
  controllers: [PropertiesController],
  providers: [PropertiesApiService],
  exports: [PropertiesApiService],
})
export class PropertiesModule {}
