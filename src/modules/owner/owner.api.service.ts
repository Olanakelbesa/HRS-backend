import { Injectable } from '@nestjs/common';
import { getOwnerOverview } from './service';
import type { GetOwnerOverviewQueryInput } from './schema';

@Injectable()
export class OwnerApiService {
  getOverview(ownerId: string, query: GetOwnerOverviewQueryInput) {
    return getOwnerOverview(ownerId, query);
  }
}
