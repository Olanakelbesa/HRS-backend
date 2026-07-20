"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = __importDefault(require("../../config/database"));
const similarity_utils_1 = require("../../utils/similarity.utils");
const service_1 = __importDefault(require("../interactions/service"));
const preferenceScoring_1 = require("./preferenceScoring");
function buildPreferenceResponse(pref) {
    if (!pref)
        return null;
    return {
        budget: {
            min: pref.preferredPriceMin,
            max: pref.preferredPriceMax,
            currency: pref.preferredCurrency || 'ETB',
        },
        bedrooms: pref.preferredBedrooms,
        preferredLocations: pref.preferredLocations || [],
        preferredType: pref.preferredType ?? null,
        amenities: pref.preferredAmenities || [],
        furnishStatus: pref.furnishStatus ?? null,
        updatedAt: pref.updatedAt,
    };
}
class RecommendationService {
    // ========================
    // USER PREFERENCES
    // ========================
    async savePreferences(userId, data) {
        const dbData = {};
        if (data.budget) {
            if (data.budget.min !== undefined)
                dbData.preferredPriceMin = data.budget.min;
            if (data.budget.max !== undefined)
                dbData.preferredPriceMax = data.budget.max;
            if (data.budget.currency !== undefined)
                dbData.preferredCurrency = data.budget.currency;
        }
        if (data.bedrooms !== undefined) {
            if (typeof data.bedrooms === 'number') {
                dbData.preferredBedrooms = data.bedrooms;
            }
            else {
                dbData.preferredBedrooms = data.bedrooms.min ?? data.bedrooms.max;
            }
        }
        if (data.preferredLocations !== undefined) {
            dbData.preferredLocations = data.preferredLocations.map((location) => ({
                address: location.address,
                lat: location.lat ?? null,
                lng: location.lng ?? null,
            }));
        }
        if (data.preferredType !== undefined) {
            dbData.preferredType = data.preferredType;
        }
        if (data.amenities !== undefined) {
            dbData.preferredAmenities = data.amenities;
        }
        if (data.furnishStatus !== undefined) {
            dbData.furnishStatus = data.furnishStatus;
        }
        const pref = await database_1.default.userPreference.upsert({
            where: { userId },
            update: dbData,
            create: { userId, ...dbData },
        });
        return buildPreferenceResponse(pref);
    }
    async updatePreferences(userId, data) {
        return this.savePreferences(userId, data);
    }
    async getPreferences(userId) {
        const pref = await database_1.default.userPreference.findUnique({ where: { userId } });
        return buildPreferenceResponse(pref);
    }
    // ========================
    // SEARCH HISTORY
    // ========================
    async saveSearch(userId, query, filters) {
        return database_1.default.searchHistory.create({
            data: { userId, query, filters },
        });
    }
    async getSearchHistory(userId) {
        return database_1.default.searchHistory.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 5,
        });
    }
    // ========================
    // INTERACTIONS
    // ========================
    async trackInteraction(userId, propertyId, type) {
        const idempotencyKey = `legacy-track-${type}-${userId}-${propertyId}`;
        if (type === 'VIEW') {
            const dayKey = new Date().toISOString().slice(0, 10);
            return service_1.default.recordView(userId, {
                propertyId,
                idempotencyKey: `legacy-view-${userId}-${propertyId}-${dayKey}`,
            });
        }
        if (type === 'LIKE') {
            return service_1.default.likeProperty(userId, {
                propertyId,
                idempotencyKey,
                source: 'PROPERTY_DETAIL_PAGE',
            });
        }
        return service_1.default.saveProperty(userId, {
            propertyId,
            idempotencyKey,
            source: 'PROPERTY_DETAIL_PAGE',
        });
    }
    // ========================
    // USER EMBEDDING (NEW)
    // ========================
    async getUserEmbedding(userId) {
        const likedAndSaved = await database_1.default.userPropertyState.findMany({
            where: {
                userId,
                OR: [{ isLiked: true }, { isSaved: true }],
            },
            select: { propertyId: true },
        });
        const propertyIds = likedAndSaved.map((s) => s.propertyId);
        const properties = await database_1.default.property.findMany({
            where: { id: { in: propertyIds } },
            include: { embedding: true },
        });
        const vectors = properties
            .map((p) => p.embedding?.embedding)
            .filter((e) => Array.isArray(e));
        if (vectors.length === 0)
            return null;
        const length = vectors[0].length;
        const avg = new Array(length).fill(0);
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
    async getCollaborativeRecommendations(userId) {
        const myStates = await database_1.default.userPropertyState.findMany({
            where: {
                userId,
                OR: [{ isLiked: true }, { isSaved: true }],
            },
            select: { propertyId: true },
        });
        const propertyIds = myStates.map((s) => s.propertyId);
        if (propertyIds.length === 0)
            return [];
        const similarUsers = await database_1.default.userPropertyState.findMany({
            where: {
                propertyId: { in: propertyIds },
                userId: { not: userId },
                OR: [{ isLiked: true }, { isSaved: true }],
            },
            select: { userId: true },
        });
        const userIds = [...new Set(similarUsers.map((u) => u.userId))];
        const recommendations = await database_1.default.userPropertyState.findMany({
            where: {
                userId: { in: userIds },
                propertyId: { notIn: propertyIds },
                OR: [{ isLiked: true }, { isSaved: true }],
            },
            select: { propertyId: true },
        });
        const recommendedIds = [...new Set(recommendations.map((r) => r.propertyId))];
        return database_1.default.property.findMany({
            where: {
                id: { in: recommendedIds },
                isDeleted: false,
                status: 'AVAILABLE',
            },
            take: 10,
        });
    }
    // ========================
    // PREFERENCE-BASED (COLD START)
    // ========================
    toPrefForScoring(pref) {
        const locations = Array.isArray(pref.preferredLocations)
            ? pref.preferredLocations
            : [];
        return {
            preferredPriceMin: pref.preferredPriceMin,
            preferredPriceMax: pref.preferredPriceMax,
            preferredBedrooms: pref.preferredBedrooms,
            preferredType: pref.preferredType,
            preferredAmenities: pref.preferredAmenities,
            furnishStatus: pref.furnishStatus,
            preferredLocations: locations,
        };
    }
    async getPreferenceBasedRecommendations(userId, limit = 20) {
        const pref = await database_1.default.userPreference.findUnique({ where: { userId } });
        if (!pref)
            return [];
        const prefForScoring = this.toPrefForScoring(pref);
        if (!(0, preferenceScoring_1.hasMeaningfulPreferences)(prefForScoring))
            return [];
        const properties = await database_1.default.property.findMany({
            where: {
                isDeleted: false,
                status: 'AVAILABLE',
            },
            include: {
                reviews: true,
            },
        });
        if (properties.length === 0)
            return [];
        const ranked = properties
            .map((property) => ({
            property,
            score: (0, preferenceScoring_1.scorePropertyAgainstPreferences)(property, prefForScoring),
        }))
            .sort((a, b) => {
            if (b.score !== a.score)
                return b.score - a.score;
            return (b.property.viewCount ?? 0) - (a.property.viewCount ?? 0);
        })
            .slice(0, limit)
            .map(({ property }) => property);
        return ranked;
    }
    // ========================
    // MAIN RECOMMENDATION ENGINE
    // ========================
    async getRecommendations(userId) {
        // FAST PATH: Check the Python Recommendation Microservice (Redis/DB Precomputed)
        try {
            const recommendationUrl = process.env.RECOMMENDATION_URL || 'http://recommendation-service:8001';
            const response = await fetch(`${recommendationUrl}/api/v1/recommendations/${userId}`);
            if (response.ok) {
                const data = await response.json();
                if (data.recommendations && data.recommendations.length > 0) {
                    // Fetch property objects for the returned IDs
                    const properties = await database_1.default.property.findMany({
                        where: {
                            id: { in: data.recommendations },
                            isDeleted: false,
                            status: 'AVAILABLE'
                        },
                        include: {
                            reviews: true,
                        }
                    });
                    // Maintain AI ranking order
                    const propMap = new Map(properties.map(p => [p.id, p]));
                    const sortedProps = data.recommendations.map((id) => propMap.get(id)).filter(Boolean);
                    if (sortedProps.length > 0) {
                        return sortedProps;
                    }
                }
            }
        }
        catch (e) {
            console.error("Microservice unavailable or empty:", e);
        }
        // Cold-start fallback: rank available listings by saved renter preferences
        return this.getPreferenceBasedRecommendations(userId);
    }
    // ========================
    // SIMILAR PROPERTIES
    // ========================
    async getSimilarProperties(propertyId) {
        const base = await database_1.default.propertyEmbedding.findUnique({
            where: { propertyId },
        });
        if (!base)
            return [];
        const all = await database_1.default.propertyEmbedding.findMany();
        return all
            .filter((p) => p.propertyId !== propertyId)
            .map((p) => ({
            propertyId: p.propertyId,
            similarity: (0, similarity_utils_1.cosineSimilarity)(base.embedding, p.embedding),
        }))
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, 10);
    }
}
exports.default = new RecommendationService();
