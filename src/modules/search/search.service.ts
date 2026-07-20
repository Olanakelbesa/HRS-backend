import { Injectable } from '@nestjs/common';
import { parseQuery, searchProperties } from './service';
import type { SupportedCurrency } from './currency';

@Injectable()
export class SearchService {
  async search(
    query: string,
    page = 1,
    limit = 12,
    displayCurrency: SupportedCurrency = 'ETB',
  ) {
    return searchProperties(query, page, limit, displayCurrency);
  }

  async parse(query: string, displayCurrency: SupportedCurrency = 'ETB') {
    return parseQuery(query, displayCurrency);
  }
}
