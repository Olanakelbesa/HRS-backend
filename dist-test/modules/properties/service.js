"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.propertyService = void 0;
exports.formatPropertyResponse = formatPropertyResponse;
const database_1 = __importDefault(require("../../config/database"));
const repository_1 = require("../search/repository");
const AppError_1 = require("../../core/AppError");
const uploadToCloudinary_1 = require("../../utils/uploadToCloudinary");
const service_1 = __importDefault(require("../interactions/service"));
const propertyCategoryFilter_1 = require("./propertyCategoryFilter");
const SUPPORTED_LANGUAGES = new Set(['en', 'am']);
/**
 * Check if a user is verified (helper function)
 * Owners must be verified to create/update/delete properties
 */
async function checkOwnerVerification(ownerId) {
    const user = await database_1.default.user.findUnique({
        where: { id: ownerId },
        select: { role: true, isVerified: true },
    });
    if (!user) {
        throw new AppError_1.AppError('User not found', 404);
    }
    if (user.role !== 'owner') {
        throw new AppError_1.AppError('Only owners can create properties', 403);
    }
    if (!user.isVerified) {
        throw new AppError_1.AppError('Your account is not verified. Please upload your verification documents and wait for approval before creating properties.', 403);
    }
}
function toRecord(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value))
        return {};
    const entries = Object.entries(value).filter(([, v]) => typeof v === 'string');
    return Object.fromEntries(entries);
}
function localizeText(value, language) {
    const map = toRecord(value);
    if (map[language])
        return map[language];
    if (map.en)
        return map.en;
    const first = Object.values(map)[0];
    return typeof first === 'string' ? first : '';
}
function normalizeAmenity(value) {
    if (typeof value === 'string') {
        const trimmed = value.trim();
        return trimmed ? { en: trimmed, am: trimmed } : null;
    }
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return null;
    }
    const record = value;
    const en = typeof record.en === 'string' ? record.en.trim() : '';
    const am = typeof record.am === 'string' ? record.am.trim() : en;
    return en ? { en, am: am || en } : null;
}
function parseAmenitiesSource(value) {
    if (typeof value !== 'string')
        return value;
    const trimmed = value.trim();
    if (!trimmed)
        return [];
    try {
        return JSON.parse(trimmed);
    }
    catch {
        return trimmed;
    }
}
function normalizeAmenities(value) {
    const parsed = parseAmenitiesSource(value);
    const source = Array.isArray(parsed) ? parsed : parsed === undefined || parsed === null ? [] : [parsed];
    return source
        .map(normalizeAmenity)
        .filter((amenity) => amenity !== null);
}
function localizeProperty(property, language) {
    return {
        ...property,
        titleText: localizeText(property.title, language),
        descriptionText: localizeText(property.description, language),
        language,
    };
}
const TYPE_LABELS = {
    VILLA: { en: 'Villa', am: 'ቪላ' },
    APARTMENT: { en: 'Apartment', am: 'አፓርታማ' },
    CONDO: { en: 'Condo', am: 'ኮንዶ' },
    STUDIO: { en: 'Studio', am: 'ስቱዲዮ' },
    HOUSE: { en: 'House', am: 'ቤት' },
    SHARED_ROOM: { en: 'Shared Room', am: 'የጋራ ክፍል' },
    SERVICED_APARTMENT: { en: 'Serviced Apartment', am: 'አገልግሎት ያለው አፓርታማ' },
    PENTHOUSE: { en: 'Penthouse', am: 'ፔንትሃውስ' },
};
function buildLeaseTerms(leaseTerms, availableFrom) {
    const base = leaseTerms ? { ...leaseTerms } : {};
    if (availableFrom) {
        base.availableFrom = availableFrom.toISOString();
    }
    return Object.keys(base).length > 0 ? base : null;
}
function formatPropertyResponse(property) {
    const category = property.category || { en: '', am: '' };
    const location = property.location || { lat: 0, lng: 0 };
    const price = property.price || { value: 0, currency: 'ETB' };
    const area = property.area || { value: null, unit: 'sqm' };
    const title = property.title || { en: '', am: '' };
    const description = property.description || { en: '', am: '' };
    const address = property.address || { en: '', am: '' };
    const leaseTerms = property.leaseTerms || {
        secureDeposit: { value: 0, currency: 'ETB' },
        conditions: { en: '', am: '' },
    };
    const leaseAvailableFrom = leaseTerms.availableFrom
        ? new Date(leaseTerms.availableFrom).toISOString()
        : null;
    const ownerObj = property.owner ? {
        id: property.owner.id,
        first_name: property.owner.first_name || '',
        last_name: property.owner.last_name || '',
        email: property.owner.email || ''
    } : null;
    return {
        id: property.id,
        category,
        location,
        bedrooms: property.bedrooms ?? 0,
        bathrooms: property.bathrooms ?? 0,
        furnishingStatus: property.furnishingStatus ?? 'Unfurnished',
        amenities: normalizeAmenities(property.amenities),
        title,
        description,
        address,
        price,
        area,
        viewCount: property.viewCount ?? 0,
        leaseTerms,
        images: Array.isArray(property.images) ? property.images : [],
        video: Array.isArray(property.videos) && property.videos.length > 0 ? property.videos[0] : '',
        availableFrom: leaseAvailableFrom ??
            (property.createdAt ? property.createdAt.toISOString() : null),
        status: property.status,
        isVerified: property.isVerified ?? false,
        owner: ownerObj,
        createdAt: property.createdAt,
        updateAt: property.updatedAt,
    };
}
function getDistanceKm(lat1, lng1, lat2, lng2) {
    const toRad = (value) => (value * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const earthRadiusKm = 6371;
    return earthRadiusKm * c;
}
function normalizeNumeric(value) {
    if (value === undefined || value === null || value === '')
        return undefined;
    const num = Number(value);
    return Number.isFinite(num) ? num : undefined;
}
function normalizeCategory(category) {
    if (!category || typeof category !== 'object')
        return '';
    const cat = category;
    return String(cat.en || cat.am || '').toLowerCase();
}
exports.propertyService = {
    async createProperty(ownerId, data) {
        // Check if owner is verified
        await checkOwnerVerification(ownerId);
        const owner = await database_1.default.user.findUnique({
            where: { id: ownerId },
            select: { isVerified: true },
        });
        const isVerified = owner?.isVerified || false;
        const property = await database_1.default.property.create({
            data: {
                owner: {
                    connect: { id: ownerId },
                },
                category: data.category,
                title: data.title,
                description: data.description,
                location: data.location,
                address: data.address ?? null,
                price: data.price,
                bedrooms: data.bedrooms ?? null,
                bathrooms: data.bathrooms ?? null,
                area: data.area ?? null,
                amenities: normalizeAmenities(data.amenities),
                furnishingStatus: data.furnishingStatus ?? null,
                images: data.images ?? [],
                videos: data.videos ?? [],
                leaseTerms: buildLeaseTerms(data.leaseTerms, data.availableFrom),
                isVerified,
            },
            include: {
                owner: {
                    select: { id: true, first_name: true, last_name: true, email: true }
                }
            }
        });
        const formatted = formatPropertyResponse(property);
        (0, repository_1.syncPropertyEmbedding)(property.id).catch((err) => console.error('Background embedding sync failed:', err));
        return formatted;
    },
    async getProperties(query, language = 'en') {
        const raw = (query ?? {});
        const toNumber = (value) => {
            if (value === undefined || value === null || value === '')
                return undefined;
            const parsed = Number(value);
            return Number.isFinite(parsed) ? parsed : undefined;
        };
        const page = Math.max(1, Math.trunc(toNumber(raw.page) ?? 1));
        const limit = Math.min(50, Math.max(1, Math.trunc(toNumber(raw.limit) ?? 12)));
        const status = typeof raw.status === 'string' ? raw.status : undefined;
        const category = typeof raw.category === 'string'
            ? raw.category
            : raw.category != null
                ? String(raw.category)
                : undefined;
        const minPrice = toNumber(raw.minPrice);
        const maxPrice = toNumber(raw.maxPrice);
        const bedrooms = toNumber(raw.bedrooms);
        const bathrooms = toNumber(raw.bathrooms);
        const allowedSortBy = new Set(['createdAt', 'price', 'viewCount']);
        const requestedSortBy = typeof raw.sortBy === 'string' ? raw.sortBy : undefined;
        const sortBy = requestedSortBy === 'viewsCount'
            ? 'viewCount'
            : requestedSortBy && allowedSortBy.has(requestedSortBy)
                ? requestedSortBy
                : 'createdAt';
        const order = raw.order === 'asc' || raw.order === 'desc' ? raw.order : 'desc';
        const skip = (page - 1) * limit;
        const where = {
            isDeleted: false,
        };
        if (status)
            where.status = status;
        if (category) {
            const matchingIds = await (0, propertyCategoryFilter_1.findPropertyIdsByCategory)(category);
            if (matchingIds) {
                where.id = { in: matchingIds.length > 0 ? matchingIds : ['__no_category_match__'] };
            }
        }
        if (minPrice !== undefined || maxPrice !== undefined) {
            // Note: Price is now JSON {value, currency}, complex querying required
            // Skipping for now, needs raw query or Prisma JSON filters
        }
        if (bedrooms !== undefined)
            where.bedrooms = bedrooms;
        if (bathrooms !== undefined)
            where.bathrooms = bathrooms;
        const normalizedLanguage = SUPPORTED_LANGUAGES.has(language) ? language : 'en';
        const [properties, total] = await Promise.all([
            database_1.default.property.findMany({
                where,
                skip,
                take: limit,
                orderBy: { [sortBy]: order },
                include: {
                    owner: {
                        select: {
                            id: true,
                            first_name: true,
                            last_name: true,
                            email: true,
                        },
                    },
                },
            }),
            database_1.default.property.count({ where }),
        ]);
        return {
            properties: properties.map((property) => formatPropertyResponse(property)),
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    },
    async getNearbyProperties(lat, lng, radiusKm = 10, page = 1, limit = 12, status, category) {
        const where = {
            isDeleted: false,
        };
        if (status)
            where.status = status;
        if (category) {
            const matchingIds = await (0, propertyCategoryFilter_1.findPropertyIdsByCategory)(category);
            if (matchingIds) {
                where.id = { in: matchingIds.length > 0 ? matchingIds : ['__no_category_match__'] };
            }
        }
        const candidates = await database_1.default.property.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                owner: {
                    select: {
                        id: true,
                        first_name: true,
                        last_name: true,
                        email: true,
                    },
                },
            },
            take: 300,
        });
        const nearby = candidates
            .map((property) => {
            const location = property.location;
            if (!location ||
                typeof location.lat !== 'number' ||
                typeof location.lng !== 'number') {
                return null;
            }
            const distance = getDistanceKm(lat, lng, location.lat, location.lng);
            return { property, distance };
        })
            .filter((item) => item !== null)
            .filter((item) => item.distance <= radiusKm)
            .sort((a, b) => a.distance - b.distance);
        const total = nearby.length;
        const start = (page - 1) * limit;
        const selected = nearby.slice(start, start + limit);
        return {
            properties: selected.map((item) => ({
                ...formatPropertyResponse(item.property),
                distance: Number(item.distance.toFixed(2)),
            })),
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    },
    async getSimilarProperties(propertyId, limit = 12) {
        const targetProperty = await database_1.default.property.findFirst({
            where: { id: propertyId, isDeleted: false },
        });
        if (!targetProperty)
            return null;
        const targetLocation = targetProperty.location;
        const targetPrice = targetProperty.price?.value;
        const targetCategory = normalizeCategory(targetProperty.category);
        const targetBedrooms = targetProperty.bedrooms;
        const targetBathrooms = targetProperty.bathrooms;
        const candidates = await database_1.default.property.findMany({
            where: {
                isDeleted: false,
                status: 'AVAILABLE',
                id: { not: propertyId },
            },
            include: {
                owner: {
                    select: {
                        id: true,
                        first_name: true,
                        last_name: true,
                        email: true,
                    },
                },
            },
            take: 200,
        });
        const scored = candidates
            .map((property) => {
            const location = property.location;
            const price = property.price?.value;
            const category = normalizeCategory(property.category);
            const distance = targetLocation &&
                typeof targetLocation.lat === 'number' &&
                typeof targetLocation.lng === 'number' &&
                location &&
                typeof location.lat === 'number' &&
                typeof location.lng === 'number'
                ? getDistanceKm(targetLocation.lat, targetLocation.lng, location.lat, location.lng)
                : null;
            let score = 0;
            if (targetCategory && category && category.includes(targetCategory))
                score += 4;
            if (typeof price === 'number' &&
                typeof targetPrice === 'number' &&
                Math.abs(price - targetPrice) <= (targetPrice * 0.25 || 0)) {
                score += 3;
            }
            if (typeof targetBedrooms === 'number' && property.bedrooms === targetBedrooms)
                score += 2;
            if (typeof targetBathrooms === 'number' && property.bathrooms === targetBathrooms)
                score += 1;
            if (distance !== null) {
                score += Math.max(0, 2 - distance / 10);
            }
            return {
                property,
                score,
                distance,
            };
        })
            .filter((item) => item.score > 0)
            .sort((a, b) => {
            if (b.score !== a.score)
                return b.score - a.score;
            if (a.distance === null)
                return 1;
            if (b.distance === null)
                return -1;
            return a.distance - b.distance;
        })
            .slice(0, limit);
        return scored.map((item) => ({
            ...formatPropertyResponse(item.property),
            ...(item.distance !== null ? { distance: Number(item.distance.toFixed(2)) } : {}),
        }));
    },
    async getPropertyById(propertyId, language = 'en') {
        const normalizedLanguage = SUPPORTED_LANGUAGES.has(language) ? language : 'en';
        const property = await database_1.default.property.findFirst({
            where: {
                id: propertyId,
                isDeleted: false,
            },
            include: {
                owner: {
                    select: {
                        id: true,
                        first_name: true,
                        last_name: true,
                        email: true,
                    },
                },
            },
        });
        if (!property)
            return null;
        return formatPropertyResponse(property);
    },
    async updateProperty(ownerId, propertyId, data) {
        // Check if owner is verified
        await checkOwnerVerification(ownerId);
        const existing = await database_1.default.property.findFirst({
            where: { id: propertyId, isDeleted: false },
        });
        if (!existing)
            return null;
        if (existing.ownerId !== ownerId)
            return 'UNAUTHORIZED';
        // Handle image deletion from Cloudinary when URLs are removed on edit
        if (data.images !== undefined && existing.images?.length) {
            const removedImages = existing.images.filter((img) => !data.images.includes(img));
            for (const img of removedImages) {
                await (0, uploadToCloudinary_1.deleteFromCloudinary)(img, 'image').catch(console.error);
            }
        }
        // Handle video deletion from Cloudinary when URLs are removed on edit
        if (data.videos !== undefined && existing.videos?.length) {
            const removedVideos = existing.videos.filter((vid) => !data.videos.includes(vid));
            for (const vid of removedVideos) {
                await (0, uploadToCloudinary_1.deleteFromCloudinary)(vid, 'video').catch(console.error);
            }
        }
        const updated = await database_1.default.property.update({
            where: { id: propertyId },
            data: {
                ...(data.category !== undefined && { category: data.category }),
                ...(data.title !== undefined && { title: data.title }),
                ...(data.description !== undefined && { description: data.description }),
                ...(data.location !== undefined && { location: data.location }),
                ...(data.address !== undefined && { address: data.address }),
                ...(data.price !== undefined && { price: data.price }),
                ...(data.bedrooms !== undefined && { bedrooms: data.bedrooms }),
                ...(data.bathrooms !== undefined && { bathrooms: data.bathrooms }),
                ...(data.area !== undefined && { area: data.area }),
                ...(data.amenities !== undefined && {
                    amenities: normalizeAmenities(data.amenities),
                }),
                ...(data.furnishingStatus !== undefined && { furnishingStatus: data.furnishingStatus }),
                ...(data.images !== undefined && { images: data.images }),
                ...(data.videos !== undefined && { videos: data.videos }),
                ...(data.leaseTerms !== undefined || data.availableFrom !== undefined
                    ? {
                        leaseTerms: buildLeaseTerms(data.leaseTerms ?? existing.leaseTerms, data.availableFrom),
                    }
                    : {}),
                ...(data.status !== undefined && { status: data.status }),
            },
            include: {
                owner: {
                    select: { id: true, first_name: true, last_name: true, email: true }
                }
            }
        });
        const formatted = formatPropertyResponse(updated);
        (0, repository_1.syncPropertyEmbedding)(updated.id).catch((err) => console.error('Background embedding sync failed:', err));
        return formatted;
    },
    async softDeleteProperty(ownerId, propertyId) {
        // Check if owner is verified
        await checkOwnerVerification(ownerId);
        const existing = await database_1.default.property.findFirst({
            where: { id: propertyId, isDeleted: false },
        });
        if (!existing)
            return null;
        if (existing.ownerId !== ownerId)
            return 'UNAUTHORIZED';
        const deleted = await database_1.default.property.update({
            where: { id: propertyId },
            data: {
                isDeleted: true,
                deletedAt: new Date(),
            },
        });
        return formatPropertyResponse(deleted);
    },
    async getMyProperties(ownerId) {
        const properties = await database_1.default.property.findMany({
            where: {
                ownerId,
                isDeleted: false,
            },
            orderBy: {
                createdAt: 'desc',
            },
            include: {
                owner: {
                    select: { id: true, first_name: true, last_name: true, email: true }
                }
            }
        });
        return properties.map((property) => formatPropertyResponse(property));
    },
    async updatePropertyStatus(ownerId, propertyId, status) {
        // Check if owner is verified
        await checkOwnerVerification(ownerId);
        const existing = await database_1.default.property.findFirst({
            where: { id: propertyId, isDeleted: false },
        });
        if (!existing)
            return null;
        if (existing.ownerId !== ownerId)
            return 'UNAUTHORIZED';
        const updated = await database_1.default.property.update({
            where: { id: propertyId },
            data: { status },
            include: {
                owner: {
                    select: { id: true, first_name: true, last_name: true, email: true },
                },
            },
        });
        return formatPropertyResponse(updated);
    },
    async upsertPropertyTranslation(ownerId, propertyId, language, title, description) {
        const existing = await database_1.default.property.findFirst({
            where: { id: propertyId, isDeleted: false },
            select: { ownerId: true, title: true, description: true },
        });
        if (!existing)
            return null;
        if (existing.ownerId !== ownerId)
            return 'UNAUTHORIZED';
        const titleMap = toRecord(existing.title);
        const descriptionMap = toRecord(existing.description);
        titleMap[language] = title;
        descriptionMap[language] = description;
        return await database_1.default.property.update({
            where: { id: propertyId },
            data: {
                title: titleMap,
                description: descriptionMap,
            },
        });
    },
    async updatePropertyTranslation(ownerId, propertyId, language, title, description) {
        const existing = await database_1.default.property.findFirst({
            where: { id: propertyId, isDeleted: false },
            select: { ownerId: true, title: true, description: true },
        });
        if (!existing)
            return null;
        if (existing.ownerId !== ownerId)
            return 'UNAUTHORIZED';
        const titleMap = toRecord(existing.title);
        const descriptionMap = toRecord(existing.description);
        if (!titleMap[language] || !descriptionMap[language])
            return 'NOT_FOUND';
        titleMap[language] = title;
        descriptionMap[language] = description;
        return await database_1.default.property.update({
            where: { id: propertyId },
            data: {
                title: titleMap,
                description: descriptionMap,
            },
        });
    },
    async deletePropertyTranslation(ownerId, propertyId, language) {
        if (language === 'en')
            return 'CANNOT_DELETE_ENGLISH';
        const existing = await database_1.default.property.findFirst({
            where: { id: propertyId, isDeleted: false },
            select: { ownerId: true, title: true, description: true },
        });
        if (!existing)
            return null;
        if (existing.ownerId !== ownerId)
            return 'UNAUTHORIZED';
        const titleMap = toRecord(existing.title);
        const descriptionMap = toRecord(existing.description);
        if (!titleMap[language] && !descriptionMap[language])
            return 'NOT_FOUND';
        delete titleMap[language];
        delete descriptionMap[language];
        return await database_1.default.property.update({
            where: { id: propertyId },
            data: {
                title: titleMap,
                description: descriptionMap,
            },
        });
    },
    async trackPropertyView(propertyId, userId) {
        if (!userId)
            return;
        const isNewView = await service_1.default.trackLegacyDailyView(propertyId, userId);
        if (!isNewView)
            return;
        await database_1.default.property.update({
            where: { id: propertyId },
            data: {
                viewCount: { increment: 1 },
            },
        });
    },
    /**
     * Increment view count for ALL visitors (authenticated or not)
     * This ensures the view count works for anonymous users too
     */
    async incrementViewCount(propertyId) {
        await database_1.default.property.update({
            where: { id: propertyId },
            data: {
                viewCount: { increment: 1 },
            },
        });
    },
    async saveProperty(userId, propertyId) {
        const property = await database_1.default.property.findFirst({
            where: { id: propertyId, isDeleted: false },
            include: {
                owner: {
                    select: { id: true, first_name: true, last_name: true, email: true },
                },
            },
        });
        if (!property) {
            throw new AppError_1.AppError('Property not found', 404);
        }
        const existingSavedAt = await service_1.default.getSavedAt(userId, propertyId);
        if (existingSavedAt) {
            return {
                property: formatPropertyResponse(property),
                savedAt: existingSavedAt,
            };
        }
        const result = await service_1.default.saveProperty(userId, {
            propertyId,
            idempotencyKey: `property-save-${userId}-${propertyId}-${Date.now()}`,
            source: 'PROPERTY_DETAIL_PAGE',
        });
        const eventData = result.body.data;
        const recordedAt = new Date(eventData.recordedAt ?? eventData.originalRecordedAt ?? Date.now());
        return {
            property: formatPropertyResponse(property),
            savedAt: recordedAt,
        };
    },
    async removeSavedProperty(userId, propertyId) {
        const isSaved = await service_1.default.isPropertySaved(userId, propertyId);
        if (!isSaved)
            return false;
        try {
            await service_1.default.unsaveProperty(userId, {
                propertyId,
                idempotencyKey: `property-unsave-${userId}-${propertyId}-${Date.now()}`,
                source: 'SAVED_PROPERTIES_PAGE',
            });
            return true;
        }
        catch {
            return false;
        }
    },
    async getSavedProperties(userId) {
        const savedStates = await service_1.default.listSavedPropertyRecords(userId);
        return Promise.all(savedStates.map(async (state) => {
            const savedAt = (await service_1.default.getSavedAt(userId, state.propertyId)) ?? state.updatedAt;
            return {
                ...formatPropertyResponse(state.property),
                savedAt,
            };
        }));
    },
    /**
     * Get analytics for a specific owner's properties
     * Returns: Total Properties, Available, Rented, Total Views
     */
    async getOwnerPropertyAnalytics(ownerId) {
        // Get all properties for this owner
        const properties = await database_1.default.property.findMany({
            where: {
                ownerId,
                isDeleted: false,
            },
            select: {
                id: true,
                status: true,
                viewCount: true,
            },
        });
        const totalProperties = properties.length;
        const availableProperties = properties.filter((p) => p.status === 'AVAILABLE').length;
        const rentedProperties = properties.filter((p) => p.status === 'RENTED').length;
        const pendingProperties = properties.filter((p) => p.status === 'PENDING').length;
        const totalViews = properties.reduce((sum, p) => sum + (p.viewCount || 0), 0);
        return {
            totalProperties,
            available: availableProperties,
            rented: rentedProperties,
            pending: pendingProperties,
            totalViews,
        };
    },
};
