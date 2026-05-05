import prisma from '../../config/database';
import { cosineSimilarity } from '../../utils/similarity.utils';
import { InteractionType } from '@prisma/client';

class RecommendationService {
  // ========================
  // USER PREFERENCES
  // ========================
  async savePreferences(userId: string, data: any) {
    // Map the richer frontend payload to existing Prisma fields
    const dbData: any = {};

    if (data.budget) {
      if (typeof data.budget.min === 'number') dbData.preferredPriceMin = data.budget.min;
      if (typeof data.budget.max === 'number') dbData.preferredPriceMax = data.budget.max;
    }

    if (data.bedrooms) {
      // store minimum bedrooms preference if provided, otherwise max
      dbData.preferredBedrooms =
        typeof data.bedrooms.min === 'number' ? data.bedrooms.min : data.bedrooms.max;
    }

    if (Array.isArray(data.preferredLocations)) {
      // store as an array of city strings (fall back to "city, state" when state exists)
      dbData.preferredLocations = data.preferredLocations
        .map((loc: any) => {
          if (!loc) return '';
          if (loc.city && loc.state) return `${loc.city}, ${loc.state}`;
          return loc.city || '';
        })
        .filter(Boolean);
    }

    if (Array.isArray(data.amenities)) {
      dbData.preferredAmenities = data.amenities;
    }

    if (data.preferredType) dbData.preferredType = data.preferredType;

    return prisma.userPreference.upsert({
      where: { userId },
      update: dbData,
      create: { userId, ...dbData },
    });
  }

  async getPreferences(userId: string) {
    const pref = await prisma.userPreference.findUnique({ where: { userId } });

    // Always return a full structured preference object (use sensible defaults)
    const rebuilt: any = {
      preferredLocations: [],
      budget: { min: null, max: null },
      bedrooms: { min: null, max: null },
      bathrooms: { min: null, max: null },
      petsAllowed: false,
      amenities: [],
      furnished: false,
      moveInDate: null,
      leaseLengthMonths: null,
      searchRadiusKm: null,
      commuteMinutes: null,
      smokingAllowed: false,
      languages: [],
      notes: null,
      preferredType: null,
    };

    if (!pref) return rebuilt;

    // Populate fields from DB record
    if (typeof pref.preferredPriceMin === 'number') rebuilt.budget.min = pref.preferredPriceMin;
    if (typeof pref.preferredPriceMax === 'number') rebuilt.budget.max = pref.preferredPriceMax;

    if (typeof pref.preferredBedrooms === 'number') {
      rebuilt.bedrooms.min = pref.preferredBedrooms;
      rebuilt.bedrooms.max = pref.preferredBedrooms;
    }

    if (Array.isArray(pref.preferredLocations) && pref.preferredLocations.length > 0) {
      rebuilt.preferredLocations = pref.preferredLocations.map((s: string) => {
        const parts = s.split(',').map((p) => p.trim());
        return { city: parts[0] || null, state: parts[1] || null, lat: null, lng: null };
      });
    }

    if (Array.isArray(pref.preferredAmenities)) rebuilt.amenities = pref.preferredAmenities;
    if (pref.preferredType) rebuilt.preferredType = pref.preferredType;

    return rebuilt;
  }

  // ========================
  // SEARCH HISTORY
  // ========================
  async saveSearch(userId: string, query: string, filters: any) {
    return prisma.searchHistory.create({
      data: { userId, query, filters },
    });
  }

  async getSearchHistory(userId: string) {
    return prisma.searchHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
  }

  // ========================
  // INTERACTIONS
  // ========================
  async trackInteraction(userId: string, propertyId: string, type: InteractionType) {
    // Ensure the property exists to avoid foreign key violation
    const property = await prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) {
      // Use AppError for consistent error handling
      const { AppError } = await import('../../core/AppError');
      throw new AppError('Property not found', 404);
    }

    return prisma.userInteraction.create({
      data: { userId, propertyId, type },
    });
  }

  // ========================
  // USER EMBEDDING (NEW)
  // ========================
  async getUserEmbedding(userId: string) {
    const interactions = await prisma.userInteraction.findMany({
      where: {
        userId,
        type: { in: ['LIKE', 'SAVE'] },
      },
      include: {
        property: {
          include: { embedding: true },
        },
      },
    });

    // ✅ properly typed filtering
    const vectors: number[][] = interactions
      .map((i) => i.property.embedding?.embedding)
      .filter((e): e is number[] => Array.isArray(e));

    if (vectors.length === 0) return null;

    const length = vectors[0].length;
    const avg = new Array<number>(length).fill(0);

    for (const vec of vectors) {
      for (let i = 0; i < length; i++) {
        avg[i] += vec[i];
      }
    }

    return avg.map((v) => v / vectors.length);
  }
  // ========================
  // COLLABORATIVE FILTERING (NEW)
  // ========================
  async getCollaborativeRecommendations(userId: string) {
    const myInteractions = await prisma.userInteraction.findMany({
      where: { userId },
      select: { propertyId: true },
    });

    const propertyIds = myInteractions.map((i) => i.propertyId);
    if (propertyIds.length === 0) return [];

    const similarUsers = await prisma.userInteraction.findMany({
      where: {
        propertyId: { in: propertyIds },
        userId: { not: userId },
      },
      select: { userId: true },
    });

    const userIds = [...new Set(similarUsers.map((u) => u.userId))];

    const recommendations = await prisma.userInteraction.findMany({
      where: {
        userId: { in: userIds },
        propertyId: { notIn: propertyIds },
      },
      select: { propertyId: true },
    });

    const recommendedIds = [...new Set(recommendations.map((r) => r.propertyId))];

    return prisma.property.findMany({
      where: {
        id: { in: recommendedIds },
        isDeleted: false,
        status: 'AVAILABLE',
      },
      take: 10,
    });
  }

  // ========================
  // MAIN RECOMMENDATION ENGINE
  // ========================
  async getRecommendations(userId: string) {
    const preferences = await this.getPreferences(userId);
    const searches = await this.getSearchHistory(userId);

    const interactions = await prisma.userInteraction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    const userEmbedding = await this.getUserEmbedding(userId);

    const viewedEmbeddings = await prisma.propertyEmbedding.findMany({
      where: {
        propertyId: { in: interactions.map((i) => i.propertyId) },
      },
    });

    const properties = await prisma.property.findMany({
      where: { isDeleted: false, status: 'AVAILABLE' },
      include: {
        reviews: true,
        embedding: true,
      },
    });

    const scored = properties.map((property) => {
      let score = 0;
      const reasons: string[] = [];

      // ========================
      // PREFERENCES
      // ========================
      if (preferences) {
        if (
          preferences.preferredPriceMin &&
          preferences.preferredPriceMax &&
          property.price >= preferences.preferredPriceMin &&
          property.price <= preferences.preferredPriceMax
        ) {
          score += 30;
          reasons.push('matches your budget');
        }

        if (preferences.preferredLocations?.includes(property.location)) {
          score += 25;
          reasons.push('preferred location');
        }
      }

      // ========================
      // SEARCH MATCHING
      // ========================
      searches.forEach((s) => {
        if (property.title?.toString().toLowerCase().includes(s.query.toLowerCase())) {
          score += 20;
          reasons.push('matches your search');
        }
      });

      // ========================
      // PROPERTY SIMILARITY (EXISTING)
      // ========================
      if (property.embedding && viewedEmbeddings.length > 0) {
        let maxSim = 0;

        for (const viewed of viewedEmbeddings) {
          const sim = cosineSimilarity(property.embedding.embedding, viewed.embedding);
          if (sim > maxSim) maxSim = sim;
        }

        if (maxSim > 0.5) {
          score += maxSim * 50;
          reasons.push('similar to viewed properties');
        }
      }

      // ========================
      // USER EMBEDDING (NEW AI)
      // ========================
      if (userEmbedding && property.embedding) {
        const sim = cosineSimilarity(userEmbedding, property.embedding.embedding);

        if (sim > 0.5) {
          score += sim * 60;
          reasons.push('matches your taste');
        }
      }

      // ========================
      // RATING BOOST
      // ========================
      if (property.reviews.length > 0) {
        const avg = property.reviews.reduce((a, r) => a + r.rating, 0) / property.reviews.length;
        score += avg * 5;
      }

      return { property, score, reasons };
    });

    // ========================
    // COLLABORATIVE RESULTS
    // ========================
    const collaborative = await this.getCollaborativeRecommendations(userId);

    const topScored = scored
      .sort((a, b) => b.score - a.score)
      .slice(0, 7)
      .map((s) => s.property);

    const collabTop = collaborative.slice(0, 3);

    return [...topScored, ...collabTop];
  }

  // ========================
  // SIMILAR PROPERTIES
  // ========================
  async getSimilarProperties(propertyId: string) {
    const base = await prisma.propertyEmbedding.findUnique({
      where: { propertyId },
    });

    if (!base) return [];

    const all = await prisma.propertyEmbedding.findMany();

    return all
      .filter((p) => p.propertyId !== propertyId)
      .map((p) => ({
        propertyId: p.propertyId,
        similarity: cosineSimilarity(base.embedding, p.embedding),
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 10);
  }
}

export default new RecommendationService();
