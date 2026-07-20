"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportsApiService = void 0;
const common_1 = require("@nestjs/common");
const uploadToCloudinary_1 = require("../../utils/uploadToCloudinary");
const reportsService = __importStar(require("./service"));
let ReportsApiService = class ReportsApiService {
    getReportsAgainstOwner(ownerId, query) {
        return reportsService.getReportsAgainstOwner(ownerId, query);
    }
    async getOwnerReportById(ownerId, reportId) {
        const report = await reportsService.getOwnerReportById(ownerId, reportId);
        if (!report) {
            throw new common_1.NotFoundException('Report not found');
        }
        return report;
    }
    async createReport(userId, body, files) {
        const uploadedImageUrls = await Promise.all((files || []).map(async (file, index) => {
            if (!file?.buffer) {
                console.error(`[submitReport] Image ${index} missing buffer`);
                return null;
            }
            return (0, uploadToCloudinary_1.uploadToCloudinary)(file.buffer, 'reports/images', 'image');
        })).then((results) => results.filter((url) => url !== null));
        return reportsService.createReport(userId, {
            ...body,
            images: uploadedImageUrls.length > 0 ? uploadedImageUrls : body.images || [],
        });
    }
    async submitOwnerResponse(ownerId, reportId, response) {
        const result = await reportsService.submitOwnerResponse(ownerId, reportId, response);
        if ('error' in result) {
            if (result.error === 'not_found') {
                throw new common_1.NotFoundException('Report not found');
            }
            if (result.error === 'already_closed') {
                throw new common_1.BadRequestException('Cannot respond to a report that is already resolved or dismissed');
            }
        }
        return result.data;
    }
};
exports.ReportsApiService = ReportsApiService;
exports.ReportsApiService = ReportsApiService = __decorate([
    (0, common_1.Injectable)()
], ReportsApiService);
