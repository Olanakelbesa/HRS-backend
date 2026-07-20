import { Injectable } from '@nestjs/common';
import { searchProperties } from './service';
import type { PropertySearchInput } from './schema';

@Injectable()
export class SearchApiService {
  search(
    query: string,
    page: number,
    limit: number,
    currency: PropertySearchInput['currency'],
  ) {
    return searchProperties(query, page, limit, currency);
  }
}
