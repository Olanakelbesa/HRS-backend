export const INTERACTION_SOURCE_VALUES = [
  'SEARCH_RESULTS',
  'SEARCH_RESULTS_CARD',
  'RECOMMENDATIONS',
  'RECOMMENDATIONS_CARD',
  'SIMILAR_PROPERTIES',
  'SIMILAR_PROPERTIES_CARD',
  'DIRECT_LINK',
  'CATEGORY_BROWSE',
  'LOCATION_BROWSE',
  'OWNER_PROFILE',
  'PROPERTY_DETAIL_PAGE',
  'SAVED_PROPERTIES_PAGE',
] as const;

export type InteractionErrorCode =
  | 'MISSING_IDEMPOTENCY_KEY'
  | 'INVALID_SOURCE'
  | 'ALREADY_LIKED'
  | 'NOT_LIKED'
  | 'ALREADY_SAVED'
  | 'NOT_SAVED'
  | 'PROPERTY_NOT_FOUND'
  | 'SERVICE_AUTHENTICATION_REQUIRED';

export class InteractionApiError extends Error {
  constructor(
    public readonly code: InteractionErrorCode,
    message: string,
    public readonly statusCode: number,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
  }

  toJSON() {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        ...this.details,
      },
    };
  }
}
