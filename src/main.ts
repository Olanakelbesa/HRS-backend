import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { cleanupOpenApiDoc } from 'nestjs-zod';
import { IoAdapter } from '@nestjs/platform-socket.io';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { AppModule } from './app.module';
import { env } from './config/env';
import { assertDatabaseSchemaReady } from './lib/prismaHealth';
import { PrismaService } from './prisma/prisma.service';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });

  app.useWebSocketAdapter(new IoAdapter(app));

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https://validator.swagger.io'],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: [
            "'self'",
            "'unsafe-inline'",
            'https://cdnjs.cloudflare.com',
            'https://fonts.googleapis.com',
          ],
          fontSrc: ["'self'", 'https://fonts.gstatic.com', 'https://cdnjs.cloudflare.com'],
        },
      },
    }),
  );

  app.enableCors({
    origin: env.ALLOWED_ORIGINS,
    credentials: true,
  });

  app.use(cookieParser());
  app.use(morgan('dev'));
  app.set('trust proxy', true);

  app.useStaticAssets(path.join(__dirname, 'public'));
  app.useStaticAssets(path.join(process.cwd(), 'uploads'), { prefix: '/uploads' });

  app.setGlobalPrefix('api', {
    exclude: ['health', '/'],
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('House Rental API')
    .setDescription('Smart House Rental Platform API')
    .setVersion('2.0')
    .addBearerAuth()
    .build();
  const document = cleanupOpenApiDoc(SwaggerModule.createDocument(app, swaggerConfig));
  SwaggerModule.setup('api-docs', app, document);

  const prisma = app.get(PrismaService);
  await prisma.$connect();
  console.log('🐘 PostgreSQL connected');

  try {
    const { initVectorSearch, syncAllPropertyEmbeddings } = await import(
      './modules/search/repository'
    );
    await initVectorSearch();
    syncAllPropertyEmbeddings().catch((err) =>
      console.error('Bulk embedding sync failed:', err),
    );
  } catch (err) {
    console.warn('Vector search init skipped:', (err as Error).message);
  }

  if (env.NODE_ENV === 'production') {
    await assertDatabaseSchemaReady();
    console.log('✅ Database schema compatible with Prisma client');
  }

  const port = Number(env.PORT) || 5000;
  await app.listen(port);
  console.log(`🚀 Server running on http://localhost:${port}`);
  console.log(`📖 Docs available on http://localhost:${port}/api-docs`);
}

bootstrap().catch((err) => {
  console.error('Failed to start Nest application:', err);
  process.exit(1);
});
