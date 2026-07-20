import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import { Public } from './common/decorators/public.decorator';
import { SkipThrottle } from '@nestjs/throttler';

@ApiTags('Health')
@Controller()
export class HealthController {
  @Public()
  @SkipThrottle()
  @Get('health')
  rootHealth() {
    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      build: process.env.RENDER_GIT_COMMIT?.slice(0, 7) || process.env.BUILD_ID || 'local',
    };
  }

  @Public()
  @SkipThrottle()
  @Get('health/schema')
  schemaHealth() {
    const agreement = Prisma.dmmf.datamodel.models.find((m) => m.name === 'Agreement');
    const payment = Prisma.dmmf.datamodel.models.find((m) => m.name === 'Payment');
    const enums = Prisma.dmmf.datamodel.enums.map((e) => e.name);

    return {
      status: 'ok',
      prismaClient: {
        agreementFields: agreement?.fields.map((f) => f.name) ?? [],
        paymentFields: payment?.fields.map((f) => f.name) ?? [],
        enums,
        legacyPaymentStatusColumn:
          agreement?.fields.some((f) => f.name === 'paymentStatus') ?? false,
        legacyPaymentStatusEnum: enums.includes('PaymentStatus'),
      },
      build: process.env.RENDER_GIT_COMMIT?.slice(0, 7) || process.env.BUILD_ID || 'local',
    };
  }
}
