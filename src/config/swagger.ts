import swaggerJsdoc from 'swagger-jsdoc';
import { env } from './env';
import path from 'path';
import { generateOpenApiSchemas } from '../lib/prismaToOpenApi';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Smart House Rental Platform API',
      version: '1.0.0',
      description: 'API documentation for the House Rental backend',
    },
    servers: [
      {
        url: env.APP_BASE_URL,
        description: env.NODE_ENV === 'production' ? 'Production server' : 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  // Avoid duplicate/competing definitions by scanning one source based on the running file type.
  apis: __filename.endsWith('.js')
    ? [path.join(__dirname, '../modules/**/*.js')]
    : [path.join(__dirname, '../modules/**/*.ts')],
};

const baseSpec = swaggerJsdoc(options) as {
  components?: { schemas?: Record<string, unknown>; securitySchemes?: Record<string, unknown> };
  [key: string]: unknown;
};

// All schemas from Prisma schema only (no hardcoded request/response shapes)
const dynamicSchemas = generateOpenApiSchemas({
  excludeModels: new Set(['Account', 'Session', 'VerificationToken', 'RefreshToken']),
  includeAuthSchemas: true,
});

if (!baseSpec.components) baseSpec.components = {};
baseSpec.components.schemas = {
  ...(baseSpec.components.schemas ?? {}),
  ...dynamicSchemas,
};

export const swaggerSpec = baseSpec;
