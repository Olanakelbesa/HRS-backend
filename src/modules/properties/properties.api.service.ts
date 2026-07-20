import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { propertyService } from './service';
import type {
  CreatePropertyInput,
  UpdatePropertyInput,
  UpdatePropertyStatusInput,
  GetPropertiesQueryInput,
  GetNearbyPropertiesQueryInput,
} from './schema';
import { PropertyStatus } from '@prisma/client';
import { uploadToCloudinary } from '../../utils/uploadToCloudinary';

@Injectable()
export class PropertiesApiService {
  async createProperty(
    ownerId: string,
    body: CreatePropertyInput,
    files?: { images?: Express.Multer.File[]; videos?: Express.Multer.File[] },
  ) {
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

    return propertyService.createProperty(ownerId, {
      ...body,
      images: imageUrls.length > 0 ? imageUrls : body.images || [],
      videos: videoUrls.length > 0 ? videoUrls : body.videos || [],
    });
  }

  getProperties(query: GetPropertiesQueryInput, language = 'en') {
    return propertyService.getProperties(query, language);
  }

  getNearbyProperties(
    lat: number,
    lng: number,
    radius: number,
    page: number,
    limit: number,
    status?: GetNearbyPropertiesQueryInput['status'],
    category?: GetNearbyPropertiesQueryInput['category'],
  ) {
    return propertyService.getNearbyProperties(
      lat,
      lng,
      radius,
      page,
      limit,
      status,
      category,
    );
  }

  async getSimilarProperties(propertyId: string, limit = 12) {
    const similar = await propertyService.getSimilarProperties(propertyId, limit);
    if (similar === null) throw new NotFoundException('Property not found');
    return similar;
  }

  async getPropertyById(propertyId: string, language = 'en', userId?: string) {
    const property = await propertyService.getPropertyById(propertyId, language);
    if (!property) throw new NotFoundException('Property not found');

    if (userId) {
      propertyService
        .trackPropertyView(propertyId, userId)
        .catch((err) => console.error('View tracking error:', err));
    } else {
      propertyService
        .incrementViewCount(propertyId)
        .catch((err) => console.error('View count increment error:', err));
    }

    return property;
  }

  async updateProperty(
    ownerId: string,
    propertyId: string,
    body: UpdatePropertyInput,
    files?: { images?: Express.Multer.File[]; videos?: Express.Multer.File[] },
  ) {
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

    const finalBody = {
      ...body,
      ...(body.images !== undefined || imageUrls.length > 0
        ? { images: [...keptImageUrls, ...imageUrls] }
        : {}),
      ...(body.videos !== undefined || videoUrls.length > 0
        ? { videos: [...keptVideoUrls, ...videoUrls] }
        : {}),
    };

    const result = await propertyService.updateProperty(ownerId, propertyId, finalBody);
    if (result === null) throw new NotFoundException('Property not found');
    if (result === 'UNAUTHORIZED') {
      throw new UnauthorizedException('Unauthorized. You are not the owner of this property.');
    }
    return result;
  }

  async softDeleteProperty(ownerId: string, propertyId: string) {
    const result = await propertyService.softDeleteProperty(ownerId, propertyId);
    if (result === null) throw new NotFoundException('Property not found');
    if (result === 'UNAUTHORIZED') {
      throw new UnauthorizedException('Unauthorized. You are not the owner of this property.');
    }
    return result;
  }

  getMyProperties(ownerId: string) {
    return propertyService.getMyProperties(ownerId);
  }

  getSavedProperties(userId: string) {
    return propertyService.getSavedProperties(userId);
  }

  saveProperty(userId: string, propertyId: string) {
    return propertyService.saveProperty(userId, propertyId);
  }

  async removeSavedProperty(userId: string, propertyId: string) {
    const removed = await propertyService.removeSavedProperty(userId, propertyId);
    if (!removed) throw new NotFoundException('Saved property not found');
    return removed;
  }

  async updatePropertyStatus(
    ownerId: string,
    propertyId: string,
    status: PropertyStatus,
  ) {
    const result = await propertyService.updatePropertyStatus(ownerId, propertyId, status);
    if (result === null) throw new NotFoundException('Property not found');
    if (result === 'UNAUTHORIZED') {
      throw new UnauthorizedException('Unauthorized. You are not the owner of this property.');
    }
    return result;
  }

  getOwnerPropertyAnalytics(ownerId: string) {
    return propertyService.getOwnerPropertyAnalytics(ownerId);
  }
}
