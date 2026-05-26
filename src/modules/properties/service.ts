import prisma from '../../config/database';
import { CreatePropertyInput, GetPropertiesQueryInput, UpdatePropertyInput } from './schema';
import { PropertyStatus } from '@prisma/client';
import { AppError } from '../../core/AppError';
import { deleteFromCloudinary } from '../../utils/uploadToCloudinary';
import interactionService from '../interactions/service';

const SUPPORTED_LANGUAGES = new Set(['en', 'am']);

/**
 * Check if a user is verified (helper function)
 * Owners must be verified to create/update/delete properties
 */
async function checkOwnerVerification(ownerId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: ownerId },
    select: { role: true, isVerified: true },
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (user.role !== 'owner') {
    throw new AppError('Only owners can create properties', 403);
  }

  if (!user.isVerified) {
    throw new AppError(
      'Your account is not verified. Please upload your verification documents and wait for approval before creating properties.',
      403
    );
  }
}

function toRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const entries = Object.entries(value as Record<string, unknown>).filter(
    ([, v]) => typeof v === 'string'
  ) as Array<[string, string]>;
  return Object.fromEntries(entries);
}

function localizeText(value: unknown, language: string): string {
  const map = toRecord(value);
  if (map[language]) return map[language];
  if (map.en) return map.en;
  const first = Object.values(map)[0];
  return typeof first === 'string' ? first : '';
}

function normalizeAmenities(value: unknown): Array<{ en: string; am: string }> {
  if (!Array.isArray(value)) return [];

  return value
    .map((amenity) => {
      if (typeof amenity === 'string') {
        return { en: amenity, am: amenity };
      }
      if (!amenity || typeof amenity !== 'object' || Array.isArray(amenity)) {
        return null;
      }

      const record = amenity as Record<string, unknown>;
      const en = typeof record.en === 'string' ? record.en : '';
      const am = typeof record.am === 'string' ? record.am : en;
      return en ? { en, am } : null;
    })
    .filter((amenity): amenity is { en: string; am: string } => amenity !== null);
}

async function setPropertyAmenities(propertyId: string, amenities: unknown): Promise<void> {
  const amenitiesJson = JSON.stringify(amenities);

  await prisma.$executeRaw`
    UPDATE "Property"
    SET "amenities" = CAST(${amenitiesJson} AS jsonb)
    WHERE "id" = ${propertyId}
  `;
}

async function getPropertyForResponse(propertyId: string) {
  return prisma.property.findFirst({
    where: { id: propertyId, isDeleted: false },
    include: {
      owner: {
        select: { id: true, first_name: true, last_name: true, email: true },
      },
    },
  });
}

function localizeProperty<T extends { title: unknown; description: unknown }>(
  property: T,
  language: string
) {
  return {
    ...property,
    titleText: localizeText(property.title, language),
    descriptionText: localizeText(property.description, language),
    language,
  };
}

const TYPE_LABELS: Record<string, { en: string; am: string }> = {
  VILLA: { en: 'Villa', am: 'ቪላ' },
  APARTMENT: { en: 'Apartment', am: 'አፓርታማ' },
  CONDO: { en: 'Condo', am: 'ኮንዶ' },
  STUDIO: { en: 'Studio', am: 'ስቱዲዮ' },
  HOUSE: { en: 'House', am: 'ቤት' },
  SHARED_ROOM: { en: 'Shared Room', am: 'የጋራ ክፍል' },
  SERVICED_APARTMENT: { en: 'Serviced Apartment', am: 'አገልግሎት ያለው አፓርታማ' },
  PENTHOUSE: { en: 'Penthouse', am: 'ፔንትሃውስ' },
};

function buildLeaseTerms(
  leaseTerms: CreatePropertyInput['leaseTerms'] | UpdatePropertyInput['leaseTerms'] | undefined,
  availableFrom?: Date
) {
  const base = leaseTerms ? { ...leaseTerms } : {};
  if (availableFrom) {
    (base as Record<string, unknown>).availableFrom = availableFrom.toISOString();
  }
  return Object.keys(base).length > 0 ? base : null;
}

function formatPropertyResponse(property: any) {
  const category = (property.category as any) || { en: '', am: '' };
  const location = (property.location as any) || { lat: 0, lng: 0 };
  const price = (property.price as any) || { value: 0, currency: 'ETB' };
  const area = (property.area as any) || { value: null, unit: 'sqm' };
  const title = (property.title as any) || { en: '', am: '' };
  const description = (property.description as any) || { en: '', am: '' };
  const address = (property.address as any) || { en: '', am: '' };
  const leaseTerms = (property.leaseTerms as any) || {
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
    amenities: property.amenities,
    title,
    description,
    address,
    price,
    area,
    viewCount: property.viewCount ?? 0,
    leaseTerms,
    images: Array.isArray(property.images) ? property.images : [],
    video: Array.isArray(property.videos) && property.videos.length > 0 ? property.videos[0] : '',
    availableFrom:
      leaseAvailableFrom ??
      (property.createdAt ? property.createdAt.toISOString() : null),
    status: property.status,
    isVerified: property.isVerified ?? false,
    owner: ownerObj,
    createdAt: property.createdAt,
    updateAt: property.updatedAt,
  };
}

function getDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const earthRadiusKm = 6371;
  return earthRadiusKm * c;
}

function normalizeNumeric(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
}

function normalizeCategory(category: unknown): string {
  if (!category || typeof category !== 'object') return '';
  const cat = category as Record<string, unknown>;
  return String(cat.en || cat.am || '').toLowerCase();
}

export const propertyService = {
  async createProperty(ownerId: string, data: CreatePropertyInput) {
    // Check if owner is verified
    await checkOwnerVerification(ownerId);

    const owner = await prisma.user.findUnique({
      where: { id: ownerId },
      select: { isVerified: true },
    });

    const isVerified = owner?.isVerified || false;

    const property = await prisma.property.create({
      data: {
        owner: {
          connect: { id: ownerId },
        },
        category: data.category as any,
        title: data.title as any,
        description: data.description as any,
        location: data.location as any,
        address: data.address as any ?? null,
        price: data.price as any,
        bedrooms: data.bedrooms ?? null,
        bathrooms: data.bathrooms ?? null,
        area: data.area as any ?? null,
        furnishingStatus: data.furnishingStatus ?? null,
        images: data.images ?? [],
        videos: data.videos ?? [],
        leaseTerms: buildLeaseTerms(data.leaseTerms, data.availableFrom) as any,
        isVerified,
      },
      include: {
        owner: {
          select: { id: true, first_name: true, last_name: true, email: true }
        }
      }
    });

    if (data.amenities !== undefined) {
      await setPropertyAmenities(property.id, data.amenities);
    }

    const propertyWithJsonAmenities = await getPropertyForResponse(property.id);
    return formatPropertyResponse(propertyWithJsonAmenities ?? property);
  },

  async getProperties(query: GetPropertiesQueryInput, language = 'en') {
    const raw = (query ?? {}) as Record<string, unknown>;
    const toNumber = (value: unknown): number | undefined => {
      if (value === undefined || value === null || value === '') return undefined;
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : undefined;
    };

    const page = Math.max(1, Math.trunc(toNumber(raw.page) ?? 1));
    const limit = Math.min(50, Math.max(1, Math.trunc(toNumber(raw.limit) ?? 12)));

    const status = typeof raw.status === 'string' ? raw.status : undefined;
    const category = typeof raw.category === 'string' ? raw.category : undefined;

    const minPrice = toNumber(raw.minPrice);
    const maxPrice = toNumber(raw.maxPrice);
    const bedrooms = toNumber(raw.bedrooms);
    const bathrooms = toNumber(raw.bathrooms);

    const allowedSortBy = new Set(['createdAt', 'price', 'viewCount']);
    const requestedSortBy = typeof raw.sortBy === 'string' ? raw.sortBy : undefined;
    const sortBy =
      requestedSortBy === 'viewsCount'
        ? 'viewCount'
        : requestedSortBy && allowedSortBy.has(requestedSortBy)
          ? requestedSortBy
          : 'createdAt';

    const order = raw.order === 'asc' || raw.order === 'desc' ? raw.order : 'desc';

    const skip = (page - 1) * limit;

    const where: any = {
      isDeleted: false,
    };

    if (status) where.status = status;
    if (category) {
      where.category = { string_contains: category };
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      // Note: Price is now JSON {value, currency}, complex querying required
      // Skipping for now, needs raw query or Prisma JSON filters
    }

    if (bedrooms !== undefined) where.bedrooms = bedrooms;
    if (bathrooms !== undefined) where.bathrooms = bathrooms;

    const normalizedLanguage = SUPPORTED_LANGUAGES.has(language) ? language : 'en';

    const [properties, total] = await Promise.all([
      prisma.property.findMany({
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
      prisma.property.count({ where }),
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

  async getNearbyProperties(
    lat: number,
    lng: number,
    radiusKm: number = 10,
    page: number = 1,
    limit: number = 12,
    status?: string,
    category?: string
  ) {
    const where: any = {
      isDeleted: false,
    };

    if (status) where.status = status;
    if (category) where.category = { string_contains: category };

    const candidates = await prisma.property.findMany({
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
        const location = property.location as any;
        if (
          !location ||
          typeof location.lat !== 'number' ||
          typeof location.lng !== 'number'
        ) {
          return null;
        }

        const distance = getDistanceKm(lat, lng, location.lat, location.lng);
        return { property, distance };
      })
      .filter((item): item is { property: any; distance: number } => item !== null)
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

  async getSimilarProperties(propertyId: string, limit: number = 12) {
    const targetProperty = await prisma.property.findFirst({
      where: { id: propertyId, isDeleted: false },
    });

    if (!targetProperty) return null;

    const targetLocation = targetProperty.location as any;
    const targetPrice = (targetProperty.price as any)?.value;
    const targetCategory = normalizeCategory(targetProperty.category);
    const targetBedrooms = targetProperty.bedrooms;
    const targetBathrooms = targetProperty.bathrooms;

    const candidates = await prisma.property.findMany({
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
        const location = property.location as any;
        const price = (property.price as any)?.value;
        const category = normalizeCategory(property.category);

        const distance =
          targetLocation &&
          typeof targetLocation.lat === 'number' &&
          typeof targetLocation.lng === 'number' &&
          location &&
          typeof location.lat === 'number' &&
          typeof location.lng === 'number'
            ? getDistanceKm(targetLocation.lat, targetLocation.lng, location.lat, location.lng)
            : null;

        let score = 0;
        if (targetCategory && category && category.includes(targetCategory)) score += 4;
        if (
          typeof price === 'number' &&
          typeof targetPrice === 'number' &&
          Math.abs(price - targetPrice) <= (targetPrice * 0.25 || 0)
        ) {
          score += 3;
        }
        if (typeof targetBedrooms === 'number' && property.bedrooms === targetBedrooms) score += 2;
        if (typeof targetBathrooms === 'number' && property.bathrooms === targetBathrooms) score += 1;
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
        if (b.score !== a.score) return b.score - a.score;
        if (a.distance === null) return 1;
        if (b.distance === null) return -1;
        return a.distance - b.distance;
      })
      .slice(0, limit);

    return scored.map((item) => ({
      ...formatPropertyResponse(item.property),
      ...(item.distance !== null ? { distance: Number(item.distance.toFixed(2)) } : {}),
    }));
  },

  async getPropertyById(propertyId: string, language = 'en') {
    const normalizedLanguage = SUPPORTED_LANGUAGES.has(language) ? language : 'en';
    const property = await prisma.property.findFirst({
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

    if (!property) return null;
    return formatPropertyResponse(property);
  },

  async updateProperty(ownerId: string, propertyId: string, data: UpdatePropertyInput) {
    // Check if owner is verified
    await checkOwnerVerification(ownerId);

    const existing = await prisma.property.findFirst({
      where: { id: propertyId, isDeleted: false },
    });

    if (!existing) return null;
    if (existing.ownerId !== ownerId) return 'UNAUTHORIZED';

    // Handle image deletion from Cloudinary when URLs are removed on edit
    if (data.images !== undefined && existing.images?.length) {
      const removedImages = existing.images.filter((img) => !data.images!.includes(img));
      for (const img of removedImages) {
        await deleteFromCloudinary(img, 'image').catch(console.error);
      }
    }
    // Handle video deletion from Cloudinary when URLs are removed on edit
    if (data.videos !== undefined && existing.videos?.length) {
      const removedVideos = existing.videos.filter((vid) => !data.videos!.includes(vid));
      for (const vid of removedVideos) {
        await deleteFromCloudinary(vid, 'video').catch(console.error);
      }
    }

    const updated = await prisma.property.update({
      where: { id: propertyId },
      data: {
        ...(data.category !== undefined && { category: data.category as any }),
        ...(data.title !== undefined && { title: data.title as any }),
        ...(data.description !== undefined && { description: data.description as any }),
        ...(data.location !== undefined && { location: data.location as any }),
        ...(data.address !== undefined && { address: data.address as any }),
        ...(data.price !== undefined && { price: data.price as any }),
        ...(data.bedrooms !== undefined && { bedrooms: data.bedrooms }),
        ...(data.bathrooms !== undefined && { bathrooms: data.bathrooms }),
        ...(data.area !== undefined && { area: data.area as any }),
        ...(data.furnishingStatus !== undefined && { furnishingStatus: data.furnishingStatus }),
        ...(data.images !== undefined && { images: data.images }),
        ...(data.videos !== undefined && { videos: data.videos }),
        ...(data.leaseTerms !== undefined || data.availableFrom !== undefined
          ? {
              leaseTerms: buildLeaseTerms(
                data.leaseTerms ?? (existing.leaseTerms as any),
                data.availableFrom
              ) as any,
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

    if (data.amenities !== undefined) {
      await setPropertyAmenities(propertyId, data.amenities);
    }

    const propertyWithJsonAmenities = await getPropertyForResponse(propertyId);
    return formatPropertyResponse(propertyWithJsonAmenities ?? updated);
  },

  async softDeleteProperty(ownerId: string, propertyId: string) {
    // Check if owner is verified
    await checkOwnerVerification(ownerId);

    const existing = await prisma.property.findFirst({
      where: { id: propertyId, isDeleted: false },
    });

    if (!existing) return null;
    if (existing.ownerId !== ownerId) return 'UNAUTHORIZED';

    const deleted = await prisma.property.update({
      where: { id: propertyId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });

    return formatPropertyResponse(deleted);
  },

  async getMyProperties(ownerId: string) {
    const properties = await prisma.property.findMany({
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

  async updatePropertyStatus(ownerId: string, propertyId: string, status: PropertyStatus) {
    // Check if owner is verified
    await checkOwnerVerification(ownerId);

    const existing = await prisma.property.findFirst({
      where: { id: propertyId, isDeleted: false },
    });

    if (!existing) return null;
    if (existing.ownerId !== ownerId) return 'UNAUTHORIZED';

    const updated = await prisma.property.update({
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

  async upsertPropertyTranslation(
    ownerId: string,
    propertyId: string,
    language: 'en' | 'am',
    title: string,
    description: string
  ) {
    const existing = await prisma.property.findFirst({
      where: { id: propertyId, isDeleted: false },
      select: { ownerId: true, title: true, description: true },
    });

    if (!existing) return null;
    if (existing.ownerId !== ownerId) return 'UNAUTHORIZED';

    const titleMap = toRecord(existing.title);
    const descriptionMap = toRecord(existing.description);

    titleMap[language] = title;
    descriptionMap[language] = description;

    return await prisma.property.update({
      where: { id: propertyId },
      data: {
        title: titleMap,
        description: descriptionMap,
      },
    });
  },

  async updatePropertyTranslation(
    ownerId: string,
    propertyId: string,
    language: 'en' | 'am',
    title: string,
    description: string
  ) {
    const existing = await prisma.property.findFirst({
      where: { id: propertyId, isDeleted: false },
      select: { ownerId: true, title: true, description: true },
    });

    if (!existing) return null;
    if (existing.ownerId !== ownerId) return 'UNAUTHORIZED';

    const titleMap = toRecord(existing.title);
    const descriptionMap = toRecord(existing.description);
    if (!titleMap[language] || !descriptionMap[language]) return 'NOT_FOUND';

    titleMap[language] = title;
    descriptionMap[language] = description;

    return await prisma.property.update({
      where: { id: propertyId },
      data: {
        title: titleMap,
        description: descriptionMap,
      },
    });
  },

  async deletePropertyTranslation(ownerId: string, propertyId: string, language: 'en' | 'am') {
    if (language === 'en') return 'CANNOT_DELETE_ENGLISH';

    const existing = await prisma.property.findFirst({
      where: { id: propertyId, isDeleted: false },
      select: { ownerId: true, title: true, description: true },
    });

    if (!existing) return null;
    if (existing.ownerId !== ownerId) return 'UNAUTHORIZED';

    const titleMap = toRecord(existing.title);
    const descriptionMap = toRecord(existing.description);

    if (!titleMap[language] && !descriptionMap[language]) return 'NOT_FOUND';

    delete titleMap[language];
    delete descriptionMap[language];

    return await prisma.property.update({
      where: { id: propertyId },
      data: {
        title: titleMap,
        description: descriptionMap,
      },
    });
  },
  async trackPropertyView(propertyId: string, userId: string) {
    if (!userId) return;

    const isNewView = await interactionService.trackLegacyDailyView(propertyId, userId);
    if (!isNewView) return;

    await prisma.property.update({
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
  async incrementViewCount(propertyId: string) {
    await prisma.property.update({
      where: { id: propertyId },
      data: {
        viewCount: { increment: 1 },
      },
    });
  },

  async saveProperty(userId: string, propertyId: string) {
    const property = await prisma.property.findFirst({
      where: { id: propertyId, isDeleted: false },
      include: {
        owner: {
          select: { id: true, first_name: true, last_name: true, email: true },
        },
      },
    });

    if (!property) {
      throw new AppError('Property not found', 404);
    }

    const existingSavedAt = await interactionService.getSavedAt(userId, propertyId);
    if (existingSavedAt) {
      return {
        property: formatPropertyResponse(property),
        savedAt: existingSavedAt,
      };
    }

    const result = await interactionService.saveProperty(userId, {
      propertyId,
      idempotencyKey: `property-save-${userId}-${propertyId}-${Date.now()}`,
      source: 'PROPERTY_DETAIL_PAGE',
    });

    const eventData = (result.body as { data: { recordedAt?: string; originalRecordedAt?: string } }).data;
    const recordedAt = new Date(
      eventData.recordedAt ?? eventData.originalRecordedAt ?? Date.now()
    );

    return {
      property: formatPropertyResponse(property),
      savedAt: recordedAt,
    };
  },

  async removeSavedProperty(userId: string, propertyId: string) {
    const isSaved = await interactionService.isPropertySaved(userId, propertyId);
    if (!isSaved) return false;

    try {
      await interactionService.unsaveProperty(userId, {
        propertyId,
        idempotencyKey: `property-unsave-${userId}-${propertyId}-${Date.now()}`,
        source: 'SAVED_PROPERTIES_PAGE',
      });
      return true;
    } catch {
      return false;
    }
  },

  async getSavedProperties(userId: string) {
    const savedStates = await interactionService.listSavedPropertyRecords(userId);

    return Promise.all(
      savedStates.map(async (state) => {
        const savedAt =
          (await interactionService.getSavedAt(userId, state.propertyId)) ?? state.updatedAt;
        return {
          ...formatPropertyResponse(state.property),
          savedAt,
        };
      })
    );
  },

  /**
   * Get analytics for a specific owner's properties
   * Returns: Total Properties, Available, Rented, Total Views
   */
  async getOwnerPropertyAnalytics(ownerId: string) {
    // Get all properties for this owner
    const properties = await prisma.property.findMany({
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
