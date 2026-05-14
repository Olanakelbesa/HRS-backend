import prisma from '../../config/database';
import { cosineSimilarity } from '../../utils/similarity.utils';
import { InteractionType } from '@prisma/client';

type LocalizedText = {
  en: string | null;
  am: string | null;
};

type PreferenceLocation = {
  city: LocalizedText;
  region: LocalizedText;
  lat: number | null;
  lng: number | null;
};

type PreferencePayload = {
  preferredLocations?: Array<{
    city?: string | { en?: string; am?: string };
    region?: string | { en?: string; am?: string };
    state?: string | { en?: string; am?: string };
    lat?: number;
    lng?: number;
  }>;
  budget?: { min?: number; max?: number; currency?: string };
  bedrooms?: { min?: number; max?: number };
  bathrooms?: { min?: number; max?: number };
  amenities?: string[];
  furnishStatus?: 'furnished' | 'semiFurnished' | 'unfunished';
  furnished?: boolean;
  notes?: string | { en?: string; am?: string };
  preferredPropertyType?: string | { en?: string; am?: string };
  preferredType?: string;
  locale?: 'en' | 'am';
  supportedLocales?: Array<'en' | 'am'>;
};

function isLocalizedText(value: unknown): value is { en?: string; am?: string } {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeLocalizedText(value: unknown): LocalizedText {
  if (typeof value === 'string') {
    return { en: value, am: value };
  }

  if (isLocalizedText(value)) {
    const en = typeof value.en === 'string' && value.en.trim() ? value.en.trim() : null;
    const am = typeof value.am === 'string' && value.am.trim() ? value.am.trim() : en;

    return { en, am };
  }

  return { en: null, am: null };
}

function normalizePropertyTypeLabel(value: unknown): LocalizedText {
  const text = normalizeLocalizedText(value);

  if (!text.en) {
    return { en: null, am: null };
  }

  const mapped: Record<string, LocalizedText> = {
    VILLA: { en: 'Villa', am: 'ቪላ' },
    APARTMENT: { en: 'Apartment', am: 'አፓርትመንት' },
    CONDO: { en: 'Condo', am: 'ኮንዶ' },
    STUDIO: { en: 'Studio', am: 'ስቱዲዮ' },
    HOUSE: { en: 'House', am: 'ቤት' },
    PENTHOUSE: { en: 'Penthouse', am: 'ፔንትሃውስ' },
  };

  const candidate = text.en.toUpperCase();
  if (mapped[candidate]) {
    return mapped[candidate];
  }

  return {
    en: text.en,
    am: text.am ?? text.en,
  };
}

function normalizeFurnishStatus(
  value: unknown,
  fallback?: boolean
): 'furnished' | 'semiFurnished' | 'unfunished' {
  if (value === 'furnished' || value === 'semiFurnished' || value === 'unfunished') {
    return value;
  }

  if (fallback === true) {
    return 'furnished';
  }

  if (fallback === false) {
    return 'unfunished';
  }

  return 'unfunished';
}

function normalizePreferenceLocation(
  value: NonNullable<PreferencePayload['preferredLocations']>[number]
): string {
  const city = normalizeLocalizedText(value?.city);
  const region = normalizeLocalizedText(value?.region ?? value?.state);

  return [city.en, region.en].filter(Boolean).join(', ');
}

function parseStoredLocation(value: string): PreferenceLocation {
  const [cityPart = '', regionPart = ''] = value.split(',').map((part) => part.trim());

  return {
    city: { en: cityPart || null, am: cityPart || null },
    region: { en: regionPart || null, am: regionPart || null },
    lat: null,
    lng: null,
  };
}

function buildPreferenceResponse(
  pref: {
    preferredPriceMin: number | null;
    preferredPriceMax: number | null;
    preferredBedrooms: number | null;
    preferredLocations: string[];
    preferredAmenities: string[];
    preferredType: string | null;
  } | null,
  input?: PreferencePayload
) {
  const budgetCurrency =
    input?.budget?.currency ?? (pref?.preferredPriceMin || pref?.preferredPriceMax ? 'ETB' : null);
  const notes = normalizeLocalizedText(input?.notes);
  const furnishStatus = normalizeFurnishStatus(input?.furnishStatus, input?.furnished);
  const preferredPropertyType = normalizePropertyTypeLabel(
    input?.preferredPropertyType ?? input?.preferredType ?? pref?.preferredType
  );

  return {
    preferredLocations: input?.preferredLocations?.length
      ? input.preferredLocations.map((location) => ({
          city: normalizeLocalizedText(location?.city),
          region: normalizeLocalizedText(location?.region ?? location?.state),
          lat: typeof location?.lat === 'number' ? location.lat : null,
          lng: typeof location?.lng === 'number' ? location.lng : null,
        }))
      : (pref?.preferredLocations?.map(parseStoredLocation) ?? []),
    budget: {
      min: input?.budget?.min ?? pref?.preferredPriceMin ?? null,
      max: input?.budget?.max ?? pref?.preferredPriceMax ?? null,
      currency: budgetCurrency,
    },
    bedrooms: {
      min: input?.bedrooms?.min ?? pref?.preferredBedrooms ?? null,
      max: input?.bedrooms?.max ?? pref?.preferredBedrooms ?? null,
    },
    bathrooms: {
      min: input?.bathrooms?.min ?? null,
      max: input?.bathrooms?.max ?? null,
    },
    amenities: input?.amenities ?? pref?.preferredAmenities ?? [],
    furnishStatus,
    notes: notes.en || notes.am ? notes : { en: null, am: null },
    preferredPropertyType,
    locale: input?.locale ?? 'en',
    supportedLocales: input?.supportedLocales ?? ['en', 'am'],
  };
}

class RecommendationService {
  // ========================
  // USER PREFERENCES
  // ========================
  async savePreferences(userId: string, data: PreferencePayload) {
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
        .map(normalizePreferenceLocation)
        .filter(Boolean);
    }

    if (Array.isArray(data.amenities)) {
      dbData.preferredAmenities = data.amenities;
    }

    if (data.preferredPropertyType) {
      const preferredType = normalizePropertyTypeLabel(data.preferredPropertyType).en;

      if (preferredType) dbData.preferredType = preferredType.toUpperCase();
    } else if (data.preferredType) {
      dbData.preferredType = data.preferredType;
    }

    const pref = await prisma.userPreference.upsert({
      where: { userId },
      update: dbData,
      create: { userId, ...dbData },
    });

    return buildPreferenceResponse(pref, data);
  }

  async getPreferences(userId: string) {
    const pref = await prisma.userPreference.findUnique({ where: { userId } });
    return buildPreferenceResponse(pref, undefined);
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
    const preferences = await prisma.userPreference.findUnique({ where: { userId } });
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
          preferences.preferredPriceMin !== null &&
          preferences.preferredPriceMax !== null &&
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
