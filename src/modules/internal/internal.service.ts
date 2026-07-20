import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { logger } from '../../core/logger';

@Injectable()
export class InternalService {
  constructor(private readonly prisma: PrismaService) {}

  async getRecommendationData() {
    logger.info('Recommendation Service requested training data export.');

    const [interactions, preferences, properties] = await Promise.all([
      this.prisma.userInteractionEvent.findMany({
        select: {
          userId: true,
          propertyId: true,
          type: true,
        },
      }),
      this.prisma.userPreference.findMany({
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
      this.prisma.property.findMany({
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
