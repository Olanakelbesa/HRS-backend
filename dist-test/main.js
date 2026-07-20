"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const core_1 = require("@nestjs/core");
const swagger_1 = require("@nestjs/swagger");
const platform_socket_io_1 = require("@nestjs/platform-socket.io");
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const path_1 = __importDefault(require("path"));
const app_module_1 = require("./app.module");
const env_1 = require("./config/env");
const prismaHealth_1 = require("./lib/prismaHealth");
const prisma_service_1 = require("./prisma/prisma.service");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule, {
        rawBody: true,
    });
    app.useWebSocketAdapter(new platform_socket_io_1.IoAdapter(app));
    app.use((0, helmet_1.default)({
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
    }));
    app.enableCors({
        origin: env_1.env.ALLOWED_ORIGINS,
        credentials: true,
    });
    app.use((0, cookie_parser_1.default)());
    app.use((0, morgan_1.default)('dev'));
    app.set('trust proxy', true);
    app.useStaticAssets(path_1.default.join(__dirname, 'public'));
    app.useStaticAssets(path_1.default.join(process.cwd(), 'uploads'), { prefix: '/uploads' });
    app.setGlobalPrefix('api', {
        exclude: ['health', '/'],
    });
    const swaggerConfig = new swagger_1.DocumentBuilder()
        .setTitle('House Rental API')
        .setDescription('Smart House Rental Platform API')
        .setVersion('2.0')
        .addBearerAuth()
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, swaggerConfig);
    swagger_1.SwaggerModule.setup('api-docs', app, document);
    const prisma = app.get(prisma_service_1.PrismaService);
    await prisma.$connect();
    console.log('🐘 PostgreSQL connected');
    try {
        const { initVectorSearch, syncAllPropertyEmbeddings } = await Promise.resolve().then(() => __importStar(require('./modules/search/repository')));
        await initVectorSearch();
        syncAllPropertyEmbeddings().catch((err) => console.error('Bulk embedding sync failed:', err));
    }
    catch (err) {
        console.warn('Vector search init skipped:', err.message);
    }
    if (env_1.env.NODE_ENV === 'production') {
        await (0, prismaHealth_1.assertDatabaseSchemaReady)();
        console.log('✅ Database schema compatible with Prisma client');
    }
    const port = Number(env_1.env.PORT) || 5000;
    await app.listen(port);
    console.log(`🚀 Server running on http://localhost:${port}`);
    console.log(`📖 Docs available on http://localhost:${port}/api-docs`);
}
bootstrap().catch((err) => {
    console.error('Failed to start Nest application:', err);
    process.exit(1);
});
