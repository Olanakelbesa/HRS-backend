import { Injectable } from '@nestjs/common';
import * as chapaClient from '../../integrations/chapa/client';

@Injectable()
export class ChapaService {
  get client() {
    return chapaClient;
  }
}
