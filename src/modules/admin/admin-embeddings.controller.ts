import {
  Controller,
  HttpException,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { AdminEmbeddingsService } from './admin-embeddings.service';

@ApiTags('Admin')
@ApiBearerAuth()
@Roles('admin')
@Controller('admin')
export class AdminEmbeddingsController {
  constructor(private readonly embeddingsService: AdminEmbeddingsService) {}

  @Post('embeddings/resync')
  async resync() {
    try {
      const result = await this.embeddingsService.resyncAll();
      return {
        message: 'Embedding resync completed',
        ...result,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new HttpException(
        { message: 'Embedding resync failed', error: message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
