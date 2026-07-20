import { Injectable } from '@nestjs/common';
import prisma from '../../config/database';
import { logger } from '../../core/logger';

@Injectable()
export class InternalApiService {
  async getRecommendationData() {
    logger.info('Recommendation Service requested training data export.');

    const [interactions, preferences, properties] = await Promise.all([
      prisma.userInteractionEvent.findMany({
        select: {
          userId: true,
          propertyId: true,
          type: true,
        },
      }),
      prisma.userPreference.findMany({
        select: {
          userId: true,
          preferredType: true,
          preferredLocations: true,
          preferredAmenities: true,
          preferredPriceMin: true,
          preferredPriceMax: true,
          preferredBedrooms: true,
          furnishStatus: true,
        },
      }),
      prisma.property.findMany({
        where: { isDeleted: false },
        select: {
          id: true,
          category: true,
          status: true,
          bedrooms: true,
          furnishingStatus: true,
          amenities: true,
          price: true,
        },
      }),
    ]);

    return { interactions, preferences, properties };
  }
}
