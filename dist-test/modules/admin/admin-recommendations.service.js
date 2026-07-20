"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminRecommendationsService = void 0;
const common_1 = require("@nestjs/common");
function recommendationServiceBaseUrl() {
    return process.env.RECOMMENDATION_URL || 'http://recommendation-service:8001';
}
async function fetchRecommendationService(path, init) {
    const response = await fetch(`${recommendationServiceBaseUrl()}${path}`, init);
    const data = (await response.json().catch(() => ({})));
    if (!response.ok) {
        const detail = data.detail ?? data.message ?? response.statusText;
        throw new Error(detail);
    }
    return data;
}
let AdminRecommendationsService = class AdminRecommendationsService {
    async triggerTraining() {
        try {
            return await fetchRecommendationService('/api/v1/train', { method: 'POST' });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Training failed';
            throw new common_1.HttpException(message, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async getAnalytics() {
        try {
            return await fetchRecommendationService('/api/v1/training/analytics');
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to load analytics';
            const status = message.includes('No training run')
                ? common_1.HttpStatus.NOT_FOUND
                : common_1.HttpStatus.INTERNAL_SERVER_ERROR;
            if (status === common_1.HttpStatus.NOT_FOUND) {
                throw new common_1.NotFoundException(message);
            }
            throw new common_1.HttpException(message, status);
        }
    }
    async getTrainingHistory(limit = 10) {
        const safeLimit = Math.min(50, Math.max(1, Number(limit) || 10));
        try {
            return await fetchRecommendationService(`/api/v1/training/history?limit=${safeLimit}`);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to load history';
            throw new common_1.HttpException(message, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
};
exports.AdminRecommendationsService = AdminRecommendationsService;
exports.AdminRecommendationsService = AdminRecommendationsService = __decorate([
    (0, common_1.Injectable)()
], AdminRecommendationsService);
