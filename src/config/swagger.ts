import swaggerJsdoc from 'swagger-jsdoc';
import { env } from './env';
import path from 'path';

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
        url: `http://localhost:${env.PORT}`,
        description: 'Development server',
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
  apis: [path.join(process.cwd(), 'src/modules/**/*.ts')],
};

export const swaggerSpec = swaggerJsdoc(options);
