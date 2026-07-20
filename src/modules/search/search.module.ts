import { Module } from '@nestjs/common';
import { SearchController } from './search.controller';
import { SearchApiService } from './search.api.service';

@Module({
  controllers: [SearchController],
  providers: [SearchApiService],
  exports: [SearchApiService],
})
export class SearchModule {}
