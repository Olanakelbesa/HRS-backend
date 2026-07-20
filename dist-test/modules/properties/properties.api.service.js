"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PropertiesApiService = void 0;
const common_1 = require("@nestjs/common");
const service_1 = require("./service");
const uploadToCloudinary_1 = require("../../utils/uploadToCloudinary");
let PropertiesApiService = class PropertiesApiService {
    async createProperty(ownerId, body, files) {
        const imageUrls = await Promise.all((files?.images || []).map((file) => {
            if (!file.buffer)
                return null;
            return (0, uploadToCloudinary_1.uploadToCloudinary)(file.buffer, 'properties/images', 'image');
        })).then((results) => results.filter((url) => url !== null));
        const videoUrls = await Promise.all((files?.videos || []).map((file) => {
            if (!file.buffer)
                return null;
            return (0, uploadToCloudinary_1.uploadToCloudinary)(file.buffer, 'properties/videos', 'video');
        })).then((results) => results.filter((url) => url !== null));
        return service_1.propertyService.createProperty(ownerId, {
            ...body,
            images: imageUrls.length > 0 ? imageUrls : body.images || [],
            videos: videoUrls.length > 0 ? videoUrls : body.videos || [],
        });
    }
    getProperties(query, language = 'en') {
        return service_1.propertyService.getProperties(query, language);
    }
    getNearbyProperties(lat, lng, radius, page, limit, status, category) {
        return service_1.propertyService.getNearbyProperties(lat, lng, radius, page, limit, status, category);
    }
    async getSimilarProperties(propertyId, limit = 12) {
        const similar = await service_1.propertyService.getSimilarProperties(propertyId, limit);
        if (similar === null)
            throw new common_1.NotFoundException('Property not found');
        return similar;
    }
    async getPropertyById(propertyId, language = 'en', userId) {
        const property = await service_1.propertyService.getPropertyById(propertyId, language);
        if (!property)
            throw new common_1.NotFoundException('Property not found');
        if (userId) {
            service_1.propertyService
                .trackPropertyView(propertyId, userId)
                .catch((err) => console.error('View tracking error:', err));
        }
        else {
            service_1.propertyService
                .incrementViewCount(propertyId)
                .catch((err) => console.error('View count increment error:', err));
        }
        return property;
    }
    async updateProperty(ownerId, propertyId, body, files) {
        const imageUrls = await Promise.all((files?.images || []).map((file) => {
            if (!file.buffer)
                return null;
            return (0, uploadToCloudinary_1.uploadToCloudinary)(file.buffer, 'properties/images', 'image');
        })).then((results) => results.filter((url) => url !== null));
        const videoUrls = await Promise.all((files?.videos || []).map((file) => {
            if (!file.buffer)
                return null;
            return (0, uploadToCloudinary_1.uploadToCloudinary)(file.buffer, 'properties/videos', 'video');
        })).then((results) => results.filter((url) => url !== null));
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
        const result = await service_1.propertyService.updateProperty(ownerId, propertyId, finalBody);
        if (result === null)
            throw new common_1.NotFoundException('Property not found');
        if (result === 'UNAUTHORIZED') {
            throw new common_1.UnauthorizedException('Unauthorized. You are not the owner of this property.');
        }
        return result;
    }
    async softDeleteProperty(ownerId, propertyId) {
        const result = await service_1.propertyService.softDeleteProperty(ownerId, propertyId);
        if (result === null)
            throw new common_1.NotFoundException('Property not found');
        if (result === 'UNAUTHORIZED') {
            throw new common_1.UnauthorizedException('Unauthorized. You are not the owner of this property.');
        }
        return result;
    }
    getMyProperties(ownerId) {
        return service_1.propertyService.getMyProperties(ownerId);
    }
    getSavedProperties(userId) {
        return service_1.propertyService.getSavedProperties(userId);
    }
    saveProperty(userId, propertyId) {
        return service_1.propertyService.saveProperty(userId, propertyId);
    }
    async removeSavedProperty(userId, propertyId) {
        const removed = await service_1.propertyService.removeSavedProperty(userId, propertyId);
        if (!removed)
            throw new common_1.NotFoundException('Saved property not found');
        return removed;
    }
    async updatePropertyStatus(ownerId, propertyId, status) {
        const result = await service_1.propertyService.updatePropertyStatus(ownerId, propertyId, status);
        if (result === null)
            throw new common_1.NotFoundException('Property not found');
        if (result === 'UNAUTHORIZED') {
            throw new common_1.UnauthorizedException('Unauthorized. You are not the owner of this property.');
        }
        return result;
    }
    getOwnerPropertyAnalytics(ownerId) {
        return service_1.propertyService.getOwnerPropertyAnalytics(ownerId);
    }
};
exports.PropertiesApiService = PropertiesApiService;
exports.PropertiesApiService = PropertiesApiService = __decorate([
    (0, common_1.Injectable)()
], PropertiesApiService);
