"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VerificationApiService = void 0;
const common_1 = require("@nestjs/common");
const service_1 = require("./service");
const uploadToCloudinary_1 = require("../../utils/uploadToCloudinary");
let VerificationApiService = class VerificationApiService {
    async uploadDocuments(userId, files) {
        if (!files?.front?.[0] || !files?.back?.[0] || !files?.livePhoto?.[0]) {
            throw new common_1.BadRequestException('All three documents are required: front, back, and live photo');
        }
        const [frontUrl, backUrl, livePhotoUrl] = await Promise.all([
            (0, uploadToCloudinary_1.uploadToCloudinary)(files.front[0].buffer, 'verification/documents', 'image'),
            (0, uploadToCloudinary_1.uploadToCloudinary)(files.back[0].buffer, 'verification/documents', 'image'),
            (0, uploadToCloudinary_1.uploadToCloudinary)(files.livePhoto[0].buffer, 'verification/photos', 'image'),
        ]);
        return service_1.verificationService.uploadVerificationDocuments(userId, {
            frontUrl,
            backUrl,
            livePhotoUrl,
        });
    }
    async getDocuments(userId, requestingUserId, userRole) {
        const doc = await service_1.verificationService.getVerificationDocuments(userId, requestingUserId, userRole);
        if (!doc)
            throw new common_1.NotFoundException('Verification documents not found');
        return doc;
    }
    getMyStatus(userId) {
        return service_1.verificationService.getMyVerificationStatus(userId);
    }
    updateStatus(adminId, userId, body) {
        return service_1.verificationService.updateVerificationStatus(adminId, userId, body);
    }
    getPending(adminId) {
        return service_1.verificationService.getPendingVerifications(adminId);
    }
};
exports.VerificationApiService = VerificationApiService;
exports.VerificationApiService = VerificationApiService = __decorate([
    (0, common_1.Injectable)()
], VerificationApiService);
