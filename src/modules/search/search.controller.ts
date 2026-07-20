import { Body, Controller, Get, HttpCode, Post, Query, UsePipes } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SearchService } from './search.service';
import { Public } from '../../common/decorators/public.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { propertySearchSchema, type PropertySearchInput } from './schema';

@ApiTags('Search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Public()
  @Get()
  @UsePipes(new ZodValidationPipe(propertySearchSchema, 'query'))
  async searchGet(@Query() query: PropertySearchInput) {
    const result = await this.searchService.search(
      query.query,
      query.page,
      query.limit,
      query.currency,
    );
    return {
      status: 'success',
      message: 'Semantic search completed successfully',
      data: result,
    };
  }

  @Public()
  @Post()
  @HttpCode(200)
  @UsePipes(new ZodValidationPipe(propertySearchSchema, 'body'))
  async searchPost(@Body() body: PropertySearchInput) {
    const result = await this.searchService.search(
      body.query,
      body.page,
      body.limit,
      body.currency,
    );
    return {
      status: 'success',
      message: 'Semantic search completed successfully',
      data: result,
    };
  }
}
