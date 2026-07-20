"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.translationParamsSchema = exports.deletePropertyTranslationSchema = exports.updatePropertyTranslationSchema = exports.addPropertyTranslationSchema = exports.deletePropertySchema = exports.getPropertyByIdSchema = exports.getSimilarPropertiesSchema = exports.getNearbyPropertiesSchema = exports.getPropertiesSchema = exports.updatePropertyStatusSchema = exports.updatePropertySchema = exports.createPropertySchema = exports.MultiLangTextSchema = exports.OrderEnum = exports.SortByEnum = exports.SupportedLanguageEnum = exports.PropertyTypeEnum = exports.PropertyStatusEnum = void 0;
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
exports.PropertyStatusEnum = zod_1.z.preprocess((val) => (typeof val === 'string' ? val.toUpperCase() : val), zod_1.z.nativeEnum(client_1.PropertyStatus));
exports.PropertyTypeEnum = zod_1.z.preprocess((val) => (typeof val === 'string' ? val.toUpperCase().replace(/\s+/g, '_') : val), zod_1.z.nativeEnum(client_1.PropertyType));
exports.SupportedLanguageEnum = zod_1.z.enum(['en', 'am']);
exports.SortByEnum = zod_1.z.enum(['createdAt', 'price', 'viewCount', 'viewsCount']);
exports.OrderEnum = zod_1.z.enum(['asc', 'desc']);
exports.MultiLangTextSchema = zod_1.z.object({
    en: zod_1.z.string().min(1),
    am: zod_1.z.string().min(1),
});
const AmenitySchema = zod_1.z.union([
    exports.MultiLangTextSchema,
    zod_1.z.string().min(1).transform((value) => ({ en: value, am: value })),
]);
/**
 * Parses JSON-string fields sent via multipart/form-data.
 */
const jsonPreprocess = (schema) => zod_1.z.preprocess((val) => {
    if (typeof val === 'string') {
        try {
            return JSON.parse(val);
        }
        catch {
            return val;
        }
    }
    return val;
}, schema);
const priceSchema = zod_1.z.object({
    value: zod_1.z.coerce.number().positive(),
    currency: zod_1.z.string().min(1),
});
const areaSchema = zod_1.z.object({
    value: zod_1.z.coerce.number().positive().nullable(),
    unit: zod_1.z.string().min(1),
});
const leaseTermsSchema = zod_1.z.object({
    secureDeposit: zod_1.z
        .object({
        value: zod_1.z.coerce.number().positive(),
        currency: zod_1.z.string().min(1),
    })
        .optional(),
    conditions: exports.MultiLangTextSchema.optional(),
    minDuration: zod_1.z.coerce.number().int().positive().optional(),
    availableFrom: zod_1.z.coerce.date().optional(),
});
/**
 * Multipart may send duplicate `images`/`videos` fields (JSON array + plain URLs).
 * Flatten into a single URL string array.
 */
const mediaUrlsSchema = zod_1.z.preprocess((val) => {
    if (val === undefined || val === null)
        return undefined;
    const flatten = (input) => {
        if (Array.isArray(input)) {
            return input.flatMap(flatten);
        }
        if (typeof input === 'string') {
            const trimmed = input.trim();
            if (!trimmed)
                return [];
            if (trimmed.startsWith('[')) {
                try {
                    return flatten(JSON.parse(trimmed));
                }
                catch {
                    return [trimmed];
                }
            }
            return [trimmed];
        }
        return [];
    };
    const urls = flatten(val);
    return urls.length > 0 ? urls : undefined;
}, zod_1.z.array(zod_1.z.string().min(1)).optional());
/**
 * CREATE — category, price { value, currency }, area { value, unit }
 */
exports.createPropertySchema = zod_1.z.object({
    category: jsonPreprocess(exports.MultiLangTextSchema),
    title: jsonPreprocess(exports.MultiLangTextSchema),
    description: jsonPreprocess(exports.MultiLangTextSchema),
    location: jsonPreprocess(zod_1.z.object({ lat: zod_1.z.coerce.number(), lng: zod_1.z.coerce.number() })),
    address: jsonPreprocess(exports.MultiLangTextSchema).optional(),
    price: jsonPreprocess(priceSchema),
    bedrooms: zod_1.z.coerce.number().int().min(0).optional(),
    bathrooms: zod_1.z.coerce.number().int().min(0).optional(),
    area: jsonPreprocess(areaSchema).optional(),
    amenities: jsonPreprocess(zod_1.z.array(AmenitySchema).optional()),
    furnishingStatus: zod_1.z.string().optional(),
    images: mediaUrlsSchema,
    videos: mediaUrlsSchema,
    leaseTerms: jsonPreprocess(leaseTermsSchema.optional()),
    availableFrom: zod_1.z.coerce.date().optional(),
});
/**
 * UPDATE
 */
exports.updatePropertySchema = zod_1.z.object({
    category: jsonPreprocess(exports.MultiLangTextSchema).optional(),
    title: jsonPreprocess(exports.MultiLangTextSchema).optional(),
    description: jsonPreprocess(exports.MultiLangTextSchema).optional(),
    location: jsonPreprocess(zod_1.z.object({ lat: zod_1.z.coerce.number(), lng: zod_1.z.coerce.number() })).optional(),
    address: jsonPreprocess(exports.MultiLangTextSchema).optional(),
    price: jsonPreprocess(priceSchema).optional(),
    bedrooms: zod_1.z.coerce.number().int().min(0).optional(),
    bathrooms: zod_1.z.coerce.number().int().min(0).optional(),
    area: jsonPreprocess(areaSchema).optional(),
    amenities: jsonPreprocess(zod_1.z.array(AmenitySchema).optional()),
    furnishingStatus: zod_1.z.string().optional(),
    images: mediaUrlsSchema,
    videos: mediaUrlsSchema,
    leaseTerms: jsonPreprocess(leaseTermsSchema.optional()),
    availableFrom: zod_1.z.coerce.date().optional(),
    status: exports.PropertyStatusEnum.optional(),
});
exports.updatePropertyStatusSchema = zod_1.z.object({
    status: exports.PropertyStatusEnum,
});
exports.getPropertiesSchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(50).default(12),
    lang: exports.SupportedLanguageEnum.optional(),
    status: exports.PropertyStatusEnum.optional(),
    category: exports.PropertyTypeEnum.optional(),
    minPrice: zod_1.z.coerce.number().min(0).optional(),
    maxPrice: zod_1.z.coerce.number().min(0).optional(),
    bedrooms: zod_1.z.coerce.number().int().min(0).optional(),
    bathrooms: zod_1.z.coerce.number().int().min(0).optional(),
    sortBy: exports.SortByEnum.default('createdAt'),
    order: exports.OrderEnum.default('desc'),
});
exports.getNearbyPropertiesSchema = zod_1.z.object({
    lat: zod_1.z.coerce.number(),
    lng: zod_1.z.coerce.number(),
    radius: zod_1.z.coerce.number().min(0).optional(),
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(50).default(12),
    lang: exports.SupportedLanguageEnum.optional(),
    status: exports.PropertyStatusEnum.optional(),
    category: exports.PropertyTypeEnum.optional(),
});
exports.getSimilarPropertiesSchema = zod_1.z.object({
    limit: zod_1.z.coerce.number().int().min(1).max(50).default(12),
    lang: exports.SupportedLanguageEnum.optional(),
});
exports.getPropertyByIdSchema = zod_1.z.object({
    propertyId: zod_1.z.string().min(1, 'propertyId is required'),
});
exports.deletePropertySchema = zod_1.z.object({
    propertyId: zod_1.z.string().min(1, 'propertyId is required'),
});
exports.addPropertyTranslationSchema = zod_1.z.object({
    language: exports.SupportedLanguageEnum,
    title: zod_1.z.string().min(1),
    description: zod_1.z.string().min(1),
});
exports.updatePropertyTranslationSchema = zod_1.z.object({
    title: zod_1.z.string().min(1),
    description: zod_1.z.string().min(1),
});
exports.deletePropertyTranslationSchema = zod_1.z.object({
    propertyId: zod_1.z.string().min(1, 'propertyId is required'),
    lang: exports.SupportedLanguageEnum,
});
exports.translationParamsSchema = zod_1.z.object({
    propertyId: zod_1.z.string().min(1, 'propertyId is required'),
    lang: exports.SupportedLanguageEnum,
});
