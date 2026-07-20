import {
  PipeTransform,
  Injectable,
  BadRequestException,
  ArgumentMetadata,
} from '@nestjs/common';
import { ZodTypeAny, ZodError } from 'zod';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(
    private readonly schema: ZodTypeAny,
    private readonly source: 'body' | 'query' | 'params' = 'body',
  ) {}

  transform(value: unknown, metadata: ArgumentMetadata) {
    if (this.source === 'body' && metadata.type !== 'body') return value;
    if (this.source === 'query' && metadata.type !== 'query') return value;
    if (this.source === 'params' && metadata.type !== 'param') return value;

    const result = this.schema.safeParse(
      this.source === 'body' && value && typeof value === 'object' && !('body' in (value as object))
        ? { body: value }
        : this.source === 'query'
          ? { query: value }
          : this.source === 'params'
            ? { params: value }
            : value,
    );

    // Also accept flat schemas (not wrapped in body/query)
    if (!result.success) {
      const flat = this.schema.safeParse(value);
      if (flat.success) return flat.data;

      const error = result.error as ZodError;
      throw new BadRequestException({
        message: 'Validation failed',
        errors: error.flatten().fieldErrors,
      });
    }

    const data = result.data as Record<string, unknown>;
    if (this.source === 'body' && data.body !== undefined) return data.body;
    if (this.source === 'query' && data.query !== undefined) return data.query;
    if (this.source === 'params' && data.params !== undefined) return data.params;
    return result.data;
  }
}
