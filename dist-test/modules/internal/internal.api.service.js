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
exports.InternalApiService = void 0;
const common_1 = require("@nestjs/common");
const database_1 = __importDefault(require("../../config/database"));
const logger_1 = require("../../core/logger");
let InternalApiService = class InternalApiService {
    async getRecommendationData() {
        logger_1.logger.info('Recommendation Service requested training data export.');
        const [interactions, preferences, properties] = await Promise.all([
            database_1.default.userInteractionEvent.findMany({
                select: {
                    userId: true,
                    propertyId: true,
                    type: true,
                },
            }),
            database_1.default.userPreference.findMany({
                select: {
                    userId: true,
                    preferredType: true,
                    preferredLocations: true,
                    preferredAmenities: true,
                    preferredPriceMin: true,
                    preferredPriceMax: true,
                    preferredBedrooms: true,
                    furnishStatus: true,
                },
            }),
            database_1.default.property.findMany({
                where: { isDeleted: false },
                select: {
                    id: true,
                    category: true,
                    status: true,
                    bedrooms: true,
                    furnishingStatus: true,
                    amenities: true,
                    price: true,
                },
            }),
        ]);
        return { interactions, preferences, properties };
    }
};
exports.InternalApiService = InternalApiService;
exports.InternalApiService = InternalApiService = __decorate([
    (0, common_1.Injectable)()
], InternalApiService);
