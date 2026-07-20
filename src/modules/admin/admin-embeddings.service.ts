import { Injectable } from '@nestjs/common';
import { resyncAllEmbeddings } from './embeddings.service';

@Injectable()
export class AdminEmbeddingsService {
  resyncAll() {
    return resyncAllEmbeddings();
  }
}
