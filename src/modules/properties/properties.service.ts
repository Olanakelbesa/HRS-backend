import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma, PropertyStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AppError } from '../../core/AppError';
import { uploadToCloudinary, deleteFromCloudinary } from '../../utils/uploadToCloudinary';
import { syncPropertyEmbedding } from '../search/repository';
import interactionService from '../interactions/service';
import { findPropertyIdsByCategory } from './propertyCategoryFilter';
import type {
  CreatePropertyInput,
  UpdatePropertyInput,
  GetPropertiesQueryInput,
  GetNearbyPropertiesQueryInput,
} from './schema';

const SUPPORTED_LANGUAGES = new Set(['en', 'am']);
type Amenity = { en: string; am: string };

function toRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const entries = Object.entries(value as Record<string, unknown>).filter(
    ([, v]) => typeof v === 'string',
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

function normalizeAmenity(value: unknown): Amenity | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? { en: trimmed, am: trimmed } : null;
  }

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const en = typeof record.en === 'string' ? record.en.trim() : '';
  const am = typeof record.am === 'string' ? record.am.trim() : en;

  return en ? { en, am: am || en } : null;
}

function parseAmenitiesSource(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (!trimmed) return [];
  try {
    return JSON.parse(trimmed);
  } catch {
    return trimmed;
  }
}

function normalizeAmenities(value: unknown): Amenity[] {
  const parsed = parseAmenitiesSource(value);
  const source = Array.isArray(parsed) ? parsed : parsed === undefined || parsed === null ? [] : [parsed];

  return source
    .map(normalizeAmenity)
    .filter((amenity): amenity is Amenity => amenity !== null);
}

function buildLeaseTerms(
  leaseTerms: CreatePropertyInput['leaseTerms'] | UpdatePropertyInput['leaseTerms'] | undefined,
  availableFrom?: Date,
) {
  const base = leaseTerms ? { ...leaseTerms } : {};
  if (availableFrom) {
    (base as Record<string, unknown>).availableFrom = availableFrom.toISOString();
  }
  return Object.keys(base).length > 0 ? base : null;
}

export function formatPropertyResponse(property: any) {
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

  const ownerObj = property.owner
    ? {
        id: property.owner.id,
        first_name: property.owner.first_name || '',
        last_name: property.owner.last_name || '',
        email: property.owner.email || '',
      }
    : null;

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

function normalizeCategory(category: unknown): string {
  if (!category || typeof category !== 'object') return '';
  const cat = category as Record<string, unknown>;
  return String(cat.en || cat.am || '').toLowerCase();
}

@Injectable()
export class PropertiesService {
  constructor(private readonly prisma: PrismaService) {}

  private async checkOwnerVerification(ownerId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
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
        403,
      );
    }
  }

  async createProperty(
    ownerId: string,
    body: CreatePropertyInput,
    files?: { images?: Express.Multer.File[]; videos?: Express.Multer.File[] },
  ) {
    await this.checkOwnerVerification(ownerId);

    const imageUrls = await Promise.all(
      (files?.images || []).map((file) => {
        if (!file.buffer) return null;
        return uploadToCloudinary(file.buffer, 'properties/images', 'image');
      }),
    ).then((results) => results.filter((url): url is string => url !== null));

    const videoUrls = await Promise.all(
      (files?.videos || []).map((file) => {
        if (!file.buffer) return null;
        return uploadToCloudinary(file.buffer, 'properties/videos', 'video');
      }),
    ).then((results) => results.filter((url): url is string => url !== null));

    const data = {
      ...body,
      images: imageUrls.length > 0 ? imageUrls : body.images || [],
      videos: videoUrls.length > 0 ? videoUrls : body.videos || [],
    };

    const owner = await this.prisma.user.findUnique({
      where: { id: ownerId },
      select: { isVerified: true },
    });

    const isVerified = owner?.isVerified || false;

    const property = await this.prisma.property.create({
      data: {
        owner: { connect: { id: ownerId } },
        category: data.category as any,
        title: data.title as any,
        description: data.description as any,
        location: data.location as any,
        address: (data.address as any) ?? null,
        price: data.price as any,
        bedrooms: data.bedrooms ?? null,
        bathrooms: data.bathrooms ?? null,
        area: (data.area as any) ?? null,
        amenities: normalizeAmenities(data.amenities) as unknown as Prisma.InputJsonValue,
        furnishingStatus: data.furnishingStatus ?? null,
        images: data.images ?? [],
        videos: data.videos ?? [],
        leaseTerms: buildLeaseTerms(data.leaseTerms, data.availableFrom) as any,
        isVerified,
      },
      include: {
        owner: {
          select: { id: true, first_name: true, last_name: true, email: true },
        },
      },
    });

    const formatted = formatPropertyResponse(property);
    syncPropertyEmbedding(property.id).catch((err) =>
      console.error('Background embedding sync failed:', err),
    );
    return formatted;
  }

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
    const category =
      typeof raw.category === 'string'
        ? raw.category
        : raw.category != null
          ? String(raw.category)
          : undefined;

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

    const where: any = { isDeleted: false };
    if (status) where.status = status;
    if (category) {
      const matchingIds = await findPropertyIdsByCategory(category);
      if (matchingIds) {
        where.id = { in: matchingIds.length > 0 ? matchingIds : ['__no_category_match__'] };
      }
    }
    if (bedrooms !== undefined) where.bedrooms = bedrooms;
    if (bathrooms !== undefined) where.bathrooms = bathrooms;

    const [properties, total] = await Promise.all([
      this.prisma.property.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: order },
        include: {
          owner: {
            select: { id: true, first_name: true, last_name: true, email: true },
          },
        },
      }),
      this.prisma.property.count({ where }),
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
  }

  async getNearbyProperties(
    lat: number,
    lng: number,
    radius: number,
    page: number,
    limit: number,
    status?: GetNearbyPropertiesQueryInput['status'],
    category?: GetNearbyPropertiesQueryInput['category'],
  ) {
    const where: any = { isDeleted: false };
    if (status) where.status = status;
    if (category) {
      const matchingIds = await findPropertyIdsByCategory(category);
      if (matchingIds) {
        where.id = { in: matchingIds.length > 0 ? matchingIds : ['__no_category_match__'] };
      }
    }

    const candidates = await this.prisma.property.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        owner: {
          select: { id: true, first_name: true, last_name: true, email: true },
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
      .filter((item) => item.distance <= radius)
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
  }

  async getSimilarProperties(propertyId: string, limit = 12) {
    const targetProperty = await this.prisma.property.findFirst({
      where: { id: propertyId, isDeleted: false },
    });

    if (!targetProperty) throw new NotFoundException('Property not found');

    const targetLocation = targetProperty.location as any;
    const targetPrice = (targetProperty.price as any)?.value;
    const targetCategory = normalizeCategory(targetProperty.category);
    const targetBedrooms = targetProperty.bedrooms;
    const targetBathrooms = targetProperty.bathrooms;

    const candidates = await this.prisma.property.findMany({
      where: {
        isDeleted: false,
        status: 'AVAILABLE',
        id: { not: propertyId },
      },
      include: {
        owner: {
          select: { id: true, first_name: true, last_name: true, email: true },
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

        return { property, score, distance };
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
  }

  async getPropertyById(propertyId: string, language = 'en', userId?: string) {
    const property = await this.prisma.property.findFirst({
      where: { id: propertyId, isDeleted: false },
      include: {
        owner: {
          select: { id: true, first_name: true, last_name: true, email: true },
        },
      },
    });

    if (!property) throw new NotFoundException('Property not found');

    if (userId) {
      this.trackPropertyView(propertyId, userId).catch((err) =>
        console.error('View tracking error:', err),
      );
    } else {
      this.incrementViewCount(propertyId).catch((err) =>
        console.error('View count increment error:', err),
      );
    }

    return formatPropertyResponse(property);
  }

  async updateProperty(
    ownerId: string,
    propertyId: string,
    body: UpdatePropertyInput,
    files?: { images?: Express.Multer.File[]; videos?: Express.Multer.File[] },
  ) {
    await this.checkOwnerVerification(ownerId);

    const existing = await this.prisma.property.findFirst({
      where: { id: propertyId, isDeleted: false },
    });

    if (!existing) throw new NotFoundException('Property not found');
    if (existing.ownerId !== ownerId) {
      throw new UnauthorizedException('Unauthorized. You are not the owner of this property.');
    }

    const imageUrls = await Promise.all(
      (files?.images || []).map((file) => {
        if (!file.buffer) return null;
        return uploadToCloudinary(file.buffer, 'properties/images', 'image');
      }),
    ).then((results) => results.filter((url): url is string => url !== null));

    const videoUrls = await Promise.all(
      (files?.videos || []).map((file) => {
        if (!file.buffer) return null;
        return uploadToCloudinary(file.buffer, 'properties/videos', 'video');
      }),
    ).then((results) => results.filter((url): url is string => url !== null));

    const keptImageUrls = Array.isArray(body.images) ? body.images : [];
    const keptVideoUrls = Array.isArray(body.videos) ? body.videos : [];

    const finalData = {
      ...body,
      ...(body.images !== undefined || imageUrls.length > 0
        ? { images: [...keptImageUrls, ...imageUrls] }
        : {}),
      ...(body.videos !== undefined || videoUrls.length > 0
        ? { videos: [...keptVideoUrls, ...videoUrls] }
        : {}),
    };

    if (finalData.images !== undefined && existing.images?.length) {
      const removedImages = existing.images.filter((img) => !finalData.images!.includes(img));
      for (const img of removedImages) {
        await deleteFromCloudinary(img, 'image').catch(console.error);
      }
    }

    if (finalData.videos !== undefined && existing.videos?.length) {
      const removedVideos = existing.videos.filter((vid) => !finalData.videos!.includes(vid));
      for (const vid of removedVideos) {
        await deleteFromCloudinary(vid, 'video').catch(console.error);
      }
    }

    const updated = await this.prisma.property.update({
      where: { id: propertyId },
      data: {
        ...(finalData.category !== undefined && { category: finalData.category as any }),
        ...(finalData.title !== undefined && { title: finalData.title as any }),
        ...(finalData.description !== undefined && { description: finalData.description as any }),
        ...(finalData.location !== undefined && { location: finalData.location as any }),
        ...(finalData.address !== undefined && { address: finalData.address as any }),
        ...(finalData.price !== undefined && { price: finalData.price as any }),
        ...(finalData.bedrooms !== undefined && { bedrooms: finalData.bedrooms }),
        ...(finalData.bathrooms !== undefined && { bathrooms: finalData.bathrooms }),
        ...(finalData.area !== undefined && { area: finalData.area as any }),
        ...(finalData.amenities !== undefined && {
          amenities: normalizeAmenities(finalData.amenities) as unknown as Prisma.InputJsonValue,
        }),
        ...(finalData.furnishingStatus !== undefined && { furnishingStatus: finalData.furnishingStatus }),
        ...(finalData.images !== undefined && { images: finalData.images }),
        ...(finalData.videos !== undefined && { videos: finalData.videos }),
        ...(finalData.leaseTerms !== undefined || finalData.availableFrom !== undefined
          ? {
              leaseTerms: buildLeaseTerms(
                finalData.leaseTerms ?? (existing.leaseTerms as any),
                finalData.availableFrom,
              ) as any,
            }
          : {}),
        ...(finalData.status !== undefined && { status: finalData.status }),
      },
      include: {
        owner: {
          select: { id: true, first_name: true, last_name: true, email: true },
        },
      },
    });

    const formatted = formatPropertyResponse(updated);
    syncPropertyEmbedding(updated.id).catch((err) =>
      console.error('Background embedding sync failed:', err),
    );
    return formatted;
  }

  async softDeleteProperty(ownerId: string, propertyId: string) {
    await this.checkOwnerVerification(ownerId);

    const existing = await this.prisma.property.findFirst({
      where: { id: propertyId, isDeleted: false },
    });

    if (!existing) throw new NotFoundException('Property not found');
    if (existing.ownerId !== ownerId) {
      throw new UnauthorizedException('Unauthorized. You are not the owner of this property.');
    }

    const deleted = await this.prisma.property.update({
      where: { id: propertyId },
      data: { isDeleted: true, deletedAt: new Date() },
    });

    return formatPropertyResponse(deleted);
  }

  async getMyProperties(ownerId: string) {
    const properties = await this.prisma.property.findMany({
      where: { ownerId, isDeleted: false },
      orderBy: { createdAt: 'desc' },
      include: {
        owner: {
          select: { id: true, first_name: true, last_name: true, email: true },
        },
      },
    });
    return properties.map((property) => formatPropertyResponse(property));
  }

  async updatePropertyStatus(ownerId: string, propertyId: string, status: PropertyStatus) {
    await this.checkOwnerVerification(ownerId);

    const existing = await this.prisma.property.findFirst({
      where: { id: propertyId, isDeleted: false },
    });

    if (!existing) throw new NotFoundException('Property not found');
    if (existing.ownerId !== ownerId) {
      throw new UnauthorizedException('Unauthorized. You are not the owner of this property.');
    }

    const updated = await this.prisma.property.update({
      where: { id: propertyId },
      data: { status },
      include: {
        owner: {
          select: { id: true, first_name: true, last_name: true, email: true },
        },
      },
    });

    return formatPropertyResponse(updated);
  }

  async trackPropertyView(propertyId: string, userId: string) {
    if (!userId) return;
    const isNewView = await interactionService.trackLegacyDailyView(propertyId, userId);
    if (!isNewView) return;

    await this.prisma.property.update({
      where: { id: propertyId },
      data: { viewCount: { increment: 1 } },
    });
  }

  async incrementViewCount(propertyId: string) {
    await this.prisma.property.update({
      where: { id: propertyId },
      data: { viewCount: { increment: 1 } },
    });
  }

  async saveProperty(userId: string, propertyId: string) {
    const property = await this.prisma.property.findFirst({
      where: { id: propertyId, isDeleted: false },
      include: {
        owner: { select: { id: true, first_name: true, last_name: true, email: true } },
      },
    });

    if (!property) throw new AppError('Property not found', 404);

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
    const recordedAt = new Date(eventData.recordedAt ?? eventData.originalRecordedAt ?? Date.now());

    return {
      property: formatPropertyResponse(property),
      savedAt: recordedAt,
    };
  }

  async removeSavedProperty(userId: string, propertyId: string) {
    const isSaved = await interactionService.isPropertySaved(userId, propertyId);
    if (!isSaved) throw new NotFoundException('Saved property not found');

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
  }

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
      }),
    );
  }

  async getOwnerPropertyAnalytics(ownerId: string) {
    const properties = await this.prisma.property.findMany({
      where: { ownerId, isDeleted: false },
      select: { id: true, status: true, viewCount: true },
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
  }
}
