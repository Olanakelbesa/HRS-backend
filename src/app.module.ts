import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CommonModule } from './common/common.module';
import { PrismaModule } from './prisma/prisma.module';
import { HealthController } from './health.controller';
import { AuthModule } from './modules/auth/auth.module';
import { AdminModule } from './modules/admin/admin.module';
import { OwnerModule } from './modules/owner/owner.module';
import { InternalModule } from './modules/internal/internal.module';
import { UsersModule } from './modules/users/users.module';
import { ProfileModule } from './modules/profile/profile.module';
import { PropertiesModule } from './modules/properties/properties.module';
import { AgreementsModule } from './modules/agreements/agreements.module';
import { AppointmentsModule } from './modules/appointments/appointments.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { RecommendationsModule } from './modules/recommendation/recommendation.module';
import { ReportsModule } from './modules/reports/reports.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { SearchModule } from './modules/search/search.module';
import { VerificationModule } from './modules/verification/verification.module';
import { MessagingModule } from './modules/messaging/messaging.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { RedisModule } from './infrastructure/redis/redis.module';
import { MailModule } from './infrastructure/mail/mail.module';
import { StorageModule } from './infrastructure/storage/storage.module';
import { PaymentsInfraModule } from './infrastructure/payments/payments-infra.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    CommonModule,
    PrismaModule,
    RedisModule,
    MailModule,
    StorageModule,
    PaymentsInfraModule,
    AuthModule,
    UsersModule,
    ProfileModule,
    PropertiesModule,
    AdminModule,
    OwnerModule,
    InternalModule,
    AgreementsModule,
    AppointmentsModule,
    PaymentsModule,
    RecommendationsModule,
    ReportsModule,
    ReviewsModule,
    SearchModule,
    VerificationModule,
    MessagingModule,
    NotificationsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
