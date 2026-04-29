import prisma from '../../config/database';
import { cosineSimilarity } from "../../utils/similarity.utils";
import { InteractionType } from "@prisma/client";

class RecommendationService {

  // ========================
  // USER PREFERENCES
  // ========================
  async savePreferences(userId: string, data: any) {
    return prisma.userPreference.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data },
    });
  }

  async getPreferences(userId: string) {
    return prisma.userPreference.findUnique({
      where: { userId },
    });
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
      orderBy: { createdAt: "desc" },
      take: 5,
    });
  }

  // ========================
  // INTERACTIONS
  // ========================
  async trackInteraction(userId: string, propertyId: string, type: InteractionType) {
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
      type: { in: ["LIKE", "SAVE"] }
    },
    include: {
      property: {
        include: { embedding: true }
      }
    }
  });

  // ✅ properly typed filtering
  const vectors: number[][] = interactions
    .map(i => i.property.embedding?.embedding)
    .filter((e): e is number[] => Array.isArray(e));

  if (vectors.length === 0) return null;

  const length = vectors[0].length;
  const avg = new Array<number>(length).fill(0);

  for (const vec of vectors) {
    for (let i = 0; i < length; i++) {
      avg[i] += vec[i];
    }
  }

  return avg.map(v => v / vectors.length);
}
  // ========================
  // COLLABORATIVE FILTERING (NEW)
  // ========================
  async getCollaborativeRecommendations(userId: string) {
    const myInteractions = await prisma.userInteraction.findMany({
      where: { userId },
      select: { propertyId: true }
    });

    const propertyIds = myInteractions.map(i => i.propertyId);
    if (propertyIds.length === 0) return [];

    const similarUsers = await prisma.userInteraction.findMany({
      where: {
        propertyId: { in: propertyIds },
        userId: { not: userId }
      },
      select: { userId: true }
    });

    const userIds = [...new Set(similarUsers.map(u => u.userId))];

    const recommendations = await prisma.userInteraction.findMany({
      where: {
        userId: { in: userIds },
        propertyId: { notIn: propertyIds }
      },
      select: { propertyId: true }
    });

    const recommendedIds = [...new Set(recommendations.map(r => r.propertyId))];

    return prisma.property.findMany({
      where: {
        id: { in: recommendedIds },
        isDeleted: false,
        status: "AVAILABLE"
      },
      take: 10
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
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    const userEmbedding = await this.getUserEmbedding(userId);

    const viewedEmbeddings = await prisma.propertyEmbedding.findMany({
      where: {
        propertyId: { in: interactions.map(i => i.propertyId) }
      }
    });

    const properties = await prisma.property.findMany({
      where: { isDeleted: false, status: "AVAILABLE" },
      include: {
        reviews: true,
        embedding: true
      }
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
          reasons.push("matches your budget");
        }

        if (preferences.preferredLocations?.includes(property.location)) {
          score += 25;
          reasons.push("preferred location");
        }
      }

      // ========================
      // SEARCH MATCHING
      // ========================
      searches.forEach((s) => {
        if (
          property.title
            ?.toString()
            .toLowerCase()
            .includes(s.query.toLowerCase())
        ) {
          score += 20;
          reasons.push("matches your search");
        }
      });

      // ========================
      // PROPERTY SIMILARITY (EXISTING)
      // ========================
      if (property.embedding && viewedEmbeddings.length > 0) {
        let maxSim = 0;

        for (const viewed of viewedEmbeddings) {
          const sim = cosineSimilarity(
            property.embedding.embedding,
            viewed.embedding
          );
          if (sim > maxSim) maxSim = sim;
        }

        if (maxSim > 0.5) {
          score += maxSim * 50;
          reasons.push("similar to viewed properties");
        }
      }

      // ========================
      // USER EMBEDDING (NEW AI)
      // ========================
      if (userEmbedding && property.embedding) {
        const sim = cosineSimilarity(
          userEmbedding,
          property.embedding.embedding
        );

        if (sim > 0.5) {
          score += sim * 60;
          reasons.push("matches your taste");
        }
      }

      // ========================
      // RATING BOOST
      // ========================
      if (property.reviews.length > 0) {
        const avg =
          property.reviews.reduce((a, r) => a + r.rating, 0) /
          property.reviews.length;
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
      .map(s => s.property);

    const collabTop = collaborative.slice(0, 3);

    return [...topScored, ...collabTop];
  }

  // ========================
  // SIMILAR PROPERTIES
  // ========================
  async getSimilarProperties(propertyId: string) {
    const base = await prisma.propertyEmbedding.findUnique({
      where: { propertyId }
    });

    if (!base) return [];

    const all = await prisma.propertyEmbedding.findMany();

    return all
      .filter(p => p.propertyId !== propertyId)
      .map(p => ({
        propertyId: p.propertyId,
        similarity: cosineSimilarity(base.embedding, p.embedding)
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 10);
  }
}

export default new RecommendationService();