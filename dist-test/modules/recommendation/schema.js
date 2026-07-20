"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.interactionSchema = exports.searchSchema = exports.preferenceSchema = void 0;
const zod_1 = require("zod");
const client_1 = require("@prisma/client");
exports.preferenceSchema = zod_1.z.object({
    budget: zod_1.z
        .object({
        min: zod_1.z.number().nonnegative().optional(),
        max: zod_1.z.number().nonnegative().optional(),
        currency: zod_1.z.string().default('ETB'),
    })
        .refine((budget) => budget.min === undefined || budget.max === undefined || budget.min <= budget.max, 'Minimum budget must be less than or equal to maximum budget')
        .optional(),
    bedrooms: zod_1.z.union([zod_1.z.number().int().nonnegative(), zod_1.z.object({
            min: zod_1.z.number().int().nonnegative().optional(),
            max: zod_1.z.number().int().nonnegative().optional(),
        })]).optional(),
    preferredLocations: zod_1.z.array(zod_1.z.object({
        address: zod_1.z.string().min(1),
        lat: zod_1.z.number().optional(),
        lng: zod_1.z.number().optional(),
    })).optional(),
    preferredType: zod_1.z.nativeEnum(client_1.PropertyType).optional(),
    amenities: zod_1.z.array(zod_1.z.string()).optional(),
    furnishStatus: zod_1.z.enum(['furnished', 'semi-furnished', 'unfurnished']).optional(),
});
exports.searchSchema = zod_1.z.object({
    query: zod_1.z.string().min(1),
    filters: zod_1.z.any().optional(),
});
exports.interactionSchema = zod_1.z.object({
    propertyId: zod_1.z.string().min(1),
    type: zod_1.z.enum(['VIEW', 'LIKE', 'SAVE']),
});
