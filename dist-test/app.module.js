"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const common_module_1 = require("./common/common.module");
const prisma_module_1 = require("./prisma/prisma.module");
const health_controller_1 = require("./health.controller");
const auth_module_1 = require("./modules/auth/auth.module");
const admin_module_1 = require("./modules/admin/admin.module");
const owner_module_1 = require("./modules/owner/owner.module");
const internal_module_1 = require("./modules/internal/internal.module");
const users_module_1 = require("./modules/users/users.module");
const profile_module_1 = require("./modules/profile/profile.module");
const properties_module_1 = require("./modules/properties/properties.module");
const agreements_module_1 = require("./modules/agreements/agreements.module");
const appointments_module_1 = require("./modules/appointments/appointments.module");
const payments_module_1 = require("./modules/payments/payments.module");
const recommendation_module_1 = require("./modules/recommendation/recommendation.module");
const reports_module_1 = require("./modules/reports/reports.module");
const reviews_module_1 = require("./modules/reviews/reviews.module");
const search_module_1 = require("./modules/search/search.module");
const verification_module_1 = require("./modules/verification/verification.module");
const messaging_module_1 = require("./modules/messaging/messaging.module");
const notifications_module_1 = require("./modules/notifications/notifications.module");
const redis_module_1 = require("./infrastructure/redis/redis.module");
const mail_module_1 = require("./infrastructure/mail/mail.module");
const storage_module_1 = require("./infrastructure/storage/storage.module");
const payments_infra_module_1 = require("./infrastructure/payments/payments-infra.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true }),
            common_module_1.CommonModule,
            prisma_module_1.PrismaModule,
            redis_module_1.RedisModule,
            mail_module_1.MailModule,
            storage_module_1.StorageModule,
            payments_infra_module_1.PaymentsInfraModule,
            auth_module_1.AuthModule,
            users_module_1.UsersModule,
            profile_module_1.ProfileModule,
            properties_module_1.PropertiesModule,
            admin_module_1.AdminModule,
            owner_module_1.OwnerModule,
            internal_module_1.InternalModule,
            agreements_module_1.AgreementsModule,
            appointments_module_1.AppointmentsModule,
            payments_module_1.PaymentsModule,
            recommendation_module_1.RecommendationsModule,
            reports_module_1.ReportsModule,
            reviews_module_1.ReviewsModule,
            search_module_1.SearchModule,
            verification_module_1.VerificationModule,
            messaging_module_1.MessagingModule,
            notifications_module_1.NotificationsModule,
        ],
        controllers: [health_controller_1.HealthController],
    })
], AppModule);
