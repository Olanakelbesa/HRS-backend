import {
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

function recommendationServiceBaseUrl() {
  return process.env.RECOMMENDATION_URL || 'http://recommendation-service:8001';
}

async function fetchRecommendationService(path: string, init?: RequestInit) {
  const response = await fetch(`${recommendationServiceBaseUrl()}${path}`, init);
  const data = (await response.json().catch(() => ({}))) as {
    detail?: string;
    message?: string;
  };
  if (!response.ok) {
    const detail = data.detail ?? data.message ?? response.statusText;
    throw new Error(detail);
  }
  return data;
}

@Injectable()
export class AdminRecommendationsService {
  async triggerTraining() {
    try {
      return await fetchRecommendationService('/api/v1/train', { method: 'POST' });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Training failed';
      throw new HttpException(message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getAnalytics() {
    try {
      return await fetchRecommendationService('/api/v1/training/analytics');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to load analytics';
      const status = message.includes('No training run')
        ? HttpStatus.NOT_FOUND
        : HttpStatus.INTERNAL_SERVER_ERROR;
      if (status === HttpStatus.NOT_FOUND) {
        throw new NotFoundException(message);
      }
      throw new HttpException(message, status);
    }
  }

  async getTrainingHistory(limit = 10) {
    const safeLimit = Math.min(50, Math.max(1, Number(limit) || 10));
    try {
      return await fetchRecommendationService(
        `/api/v1/training/history?limit=${safeLimit}`,
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to load history';
      throw new HttpException(message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
