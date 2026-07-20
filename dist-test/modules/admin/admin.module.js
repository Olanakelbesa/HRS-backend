"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminModule = void 0;
const common_1 = require("@nestjs/common");
const admin_analytics_controller_1 = require("./admin-analytics.controller");
const admin_analytics_service_1 = require("./admin-analytics.service");
const admin_users_controller_1 = require("./admin-users.controller");
const admin_users_service_1 = require("./admin-users.service");
const admin_properties_controller_1 = require("./admin-properties.controller");
const admin_properties_service_1 = require("./admin-properties.service");
const admin_agreements_controller_1 = require("./admin-agreements.controller");
const admin_agreements_service_1 = require("./admin-agreements.service");
const admin_reports_controller_1 = require("./admin-reports.controller");
const admin_reports_service_1 = require("./admin-reports.service");
const admin_reviews_controller_1 = require("./admin-reviews.controller");
const admin_reviews_service_1 = require("./admin-reviews.service");
const admin_recommendations_controller_1 = require("./admin-recommendations.controller");
const admin_recommendations_service_1 = require("./admin-recommendations.service");
const admin_embeddings_controller_1 = require("./admin-embeddings.controller");
const admin_embeddings_service_1 = require("./admin-embeddings.service");
let AdminModule = class AdminModule {
};
exports.AdminModule = AdminModule;
exports.AdminModule = AdminModule = __decorate([
    (0, common_1.Module)({
        controllers: [
            admin_analytics_controller_1.AdminAnalyticsController,
            admin_users_controller_1.AdminUsersController,
            admin_properties_controller_1.AdminPropertiesController,
            admin_agreements_controller_1.AdminAgreementsController,
            admin_reports_controller_1.AdminReportsController,
            admin_reviews_controller_1.AdminReviewsController,
            admin_recommendations_controller_1.AdminRecommendationsController,
            admin_embeddings_controller_1.AdminEmbeddingsController,
        ],
        providers: [
            admin_analytics_service_1.AdminAnalyticsService,
            admin_users_service_1.AdminUsersService,
            admin_properties_service_1.AdminPropertiesService,
            admin_agreements_service_1.AdminAgreementsService,
            admin_reports_service_1.AdminReportsService,
            admin_reviews_service_1.AdminReviewsService,
            admin_recommendations_service_1.AdminRecommendationsService,
            admin_embeddings_service_1.AdminEmbeddingsService,
        ],
    })
], AdminModule);
