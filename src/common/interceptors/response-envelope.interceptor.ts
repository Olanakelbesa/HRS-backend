import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Envelope<T> {
  status: 'success';
  data: T;
  message?: string;
}

@Injectable()
export class ResponseEnvelopeInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((payload) => {
        if (payload === undefined || payload === null) {
          return { status: 'success', data: null };
        }

        // Already enveloped or raw health-style responses
        if (
          typeof payload === 'object' &&
          payload !== null &&
          'status' in payload &&
          ((payload as { status: string }).status === 'success' ||
            (payload as { status: string }).status === 'error' ||
            (payload as { status: string }).status === 'ok')
        ) {
          return payload;
        }

        if (
          typeof payload === 'object' &&
          payload !== null &&
          'message' in payload &&
          !('data' in payload) &&
          Object.keys(payload).length === 1
        ) {
          return {
            status: 'success',
            message: (payload as { message: string }).message,
          };
        }

        return { status: 'success', data: payload };
      }),
    );
  }
}
