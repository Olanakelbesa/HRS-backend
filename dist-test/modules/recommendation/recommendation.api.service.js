"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecommendationApiService = void 0;
const common_1 = require("@nestjs/common");
const service_1 = __importDefault(require("./service"));
const service_2 = __importDefault(require("../interactions/service"));
const service_3 = require("../properties/service");
let RecommendationApiService = class RecommendationApiService {
    getRecommendations(userId) {
        return service_1.default.getRecommendations(userId);
    }
    async getRecommendationsFormatted(userId) {
        const result = await service_1.default.getRecommendations(userId);
        return result.map((property) => (0, service_3.formatPropertyResponse)(property));
    }
    getSimilarProperties(propertyId) {
        return service_1.default.getSimilarProperties(propertyId);
    }
    trackInteraction(userId, propertyId, type) {
        return service_1.default.trackInteraction(userId, propertyId, type);
    }
    saveSearch(userId, query, filters) {
        return service_1.default.saveSearch(userId, query, filters);
    }
    getSearchHistory(userId) {
        return service_1.default.getSearchHistory(userId);
    }
    savePreferences(userId, data) {
        return service_1.default.savePreferences(userId, data);
    }
    updatePreferences(userId, data) {
        return service_1.default.updatePreferences(userId, data);
    }
    getPreferences(userId) {
        return service_1.default.getPreferences(userId);
    }
    validateSource(source) {
        return service_2.default.validateSource(source);
    }
    recordView(userId, data) {
        return service_2.default.recordView(userId, data);
    }
    likeProperty(userId, data) {
        return service_2.default.likeProperty(userId, data);
    }
    unlikeProperty(userId, data) {
        return service_2.default.unlikeProperty(userId, data);
    }
    saveProperty(userId, data) {
        return service_2.default.saveProperty(userId, data);
    }
    unsaveProperty(userId, data) {
        return service_2.default.unsaveProperty(userId, data);
    }
    recordContact(userId, data) {
        return service_2.default.recordContact(userId, data);
    }
    recordShare(userId, data) {
        return service_2.default.recordShare(userId, data);
    }
    recordSchedule(userId, data) {
        return service_2.default.recordSchedule(userId, data);
    }
    getPropertyState(userId, propertyId) {
        return service_2.default.getPropertyState(userId, propertyId);
    }
    getHistory(userId, query) {
        return service_2.default.getHistory(userId, query);
    }
    exportUserEvents(userId, after) {
        return service_2.default.exportUserEvents(userId, after);
    }
};
exports.RecommendationApiService = RecommendationApiService;
exports.RecommendationApiService = RecommendationApiService = __decorate([
    (0, common_1.Injectable)()
], RecommendationApiService);
