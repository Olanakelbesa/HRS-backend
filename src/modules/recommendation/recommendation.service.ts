import { Injectable } from '@nestjs/common';
import recommendationService from './service';
import interactionService from '../interactions/service';
import { formatPropertyResponse } from '../properties/properties.service';
import type { z } from 'zod';
import type { preferenceSchema } from './schema';

type PreferencePayload = z.infer<typeof preferenceSchema>;

@Injectable()
export class RecommendationService {
  getRecommendations(userId: string) {
    return recommendationService.getRecommendations(userId);
  }

  async getRecommendationsFormatted(userId: string) {
    const result = await recommendationService.getRecommendations(userId);
    return result.map((property: Parameters<typeof formatPropertyResponse>[0]) =>
      formatPropertyResponse(property),
    );
  }

  getSimilarProperties(propertyId: string) {
    return recommendationService.getSimilarProperties(propertyId);
  }

  trackInteraction(userId: string, propertyId: string, type: 'VIEW' | 'LIKE' | 'SAVE') {
    return recommendationService.trackInteraction(userId, propertyId, type);
  }

  saveSearch(userId: string, query: string, filters?: unknown) {
    return recommendationService.saveSearch(userId, query, filters);
  }

  getSearchHistory(userId: string) {
    return recommendationService.getSearchHistory(userId);
  }

  savePreferences(userId: string, data: PreferencePayload) {
    return recommendationService.savePreferences(userId, data);
  }

  updatePreferences(userId: string, data: PreferencePayload) {
    return recommendationService.updatePreferences(userId, data);
  }

  getPreferences(userId: string) {
    return recommendationService.getPreferences(userId);
  }

  validateSource(source: string | undefined) {
    return interactionService.validateSource(source);
  }

  recordView(userId: string, data: Parameters<typeof interactionService.recordView>[1]) {
    return interactionService.recordView(userId, data);
  }

  likeProperty(userId: string, data: Parameters<typeof interactionService.likeProperty>[1]) {
    return interactionService.likeProperty(userId, data);
  }

  unlikeProperty(userId: string, data: Parameters<typeof interactionService.unlikeProperty>[1]) {
    return interactionService.unlikeProperty(userId, data);
  }

  saveProperty(userId: string, data: Parameters<typeof interactionService.saveProperty>[1]) {
    return interactionService.saveProperty(userId, data);
  }

  unsaveProperty(userId: string, data: Parameters<typeof interactionService.unsaveProperty>[1]) {
    return interactionService.unsaveProperty(userId, data);
  }

  recordContact(userId: string, data: Parameters<typeof interactionService.recordContact>[1]) {
    return interactionService.recordContact(userId, data);
  }

  recordShare(userId: string, data: Parameters<typeof interactionService.recordShare>[1]) {
    return interactionService.recordShare(userId, data);
  }

  recordSchedule(userId: string, data: Parameters<typeof interactionService.recordSchedule>[1]) {
    return interactionService.recordSchedule(userId, data);
  }

  getPropertyState(userId: string, propertyId: string) {
    return interactionService.getPropertyState(userId, propertyId);
  }

  getHistory(userId: string, query: Parameters<typeof interactionService.getHistory>[1]) {
    return interactionService.getHistory(userId, query);
  }

  exportUserEvents(userId: string, after?: string) {
    return interactionService.exportUserEvents(userId, after);
  }
}
