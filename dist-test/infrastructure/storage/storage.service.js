"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageService = void 0;
const common_1 = require("@nestjs/common");
const uploadToCloudinary_1 = require("../../utils/uploadToCloudinary");
const cloudinary_1 = require("../../lib/cloudinary");
let StorageService = class StorageService {
    uploadBuffer(buffer, folder, resourceType = 'image') {
        return (0, uploadToCloudinary_1.uploadToCloudinary)(buffer, folder, resourceType);
    }
    deleteByUrl(url, resourceType = 'image') {
        return (0, uploadToCloudinary_1.deleteFromCloudinary)(url, resourceType);
    }
    uploadAvatar(file, userId) {
        return (0, cloudinary_1.uploadAvatarToCloudinary)(file, userId);
    }
    uploadDocument(file, userId, docType) {
        return (0, cloudinary_1.uploadDocumentToCloudinary)(file, userId, docType);
    }
    deleteByPublicId(publicId) {
        return (0, cloudinary_1.deleteFromCloudinary)(publicId);
    }
};
exports.StorageService = StorageService;
exports.StorageService = StorageService = __decorate([
    (0, common_1.Injectable)()
], StorageService);
