"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PROPERTY_TYPE_TO_CATEGORY_LABEL = void 0;
exports.resolveCategoryLabel = resolveCategoryLabel;
exports.getCategoryMatchVariants = getCategoryMatchVariants;
exports.findPropertyIdsByCategory = findPropertyIdsByCategory;
exports.buildCategoryWhere = buildCategoryWhere;
const client_1 = require("@prisma/client");
const database_1 = __importDefault(require("../../config/database"));
/** Maps API enum values to category.en labels stored in the database. */
exports.PROPERTY_TYPE_TO_CATEGORY_LABEL = {
    APARTMENT: 'Apartment',
    VILLA: 'Villa',
    CONDO: 'Condo',
    STUDIO: 'Studio',
    HOUSE: 'House',
    SHARED_ROOM: 'Shared Room',
    SERVICED_APARTMENT: 'Serviced Apartment',
    PENTHOUSE: 'Penthouse',
};
const LABEL_BY_LOWER = Object.fromEntries(Object.values(exports.PROPERTY_TYPE_TO_CATEGORY_LABEL).map((label) => [label.toLowerCase(), label]));
/**
 * Resolve a query category param (enum or display label) to the stored category.en value.
 */
function resolveCategoryLabel(categoryParam) {
    const trimmed = categoryParam.trim();
    if (!trimmed)
        return null;
    const enumKey = trimmed.toUpperCase().replace(/\s+/g, '_');
    if (exports.PROPERTY_TYPE_TO_CATEGORY_LABEL[enumKey]) {
        return exports.PROPERTY_TYPE_TO_CATEGORY_LABEL[enumKey];
    }
    return LABEL_BY_LOWER[trimmed.toLowerCase()] ?? null;
}
/**
 * All lowercase variants that may appear in category.en (seed labels, enum strings, etc.).
 */
function getCategoryMatchVariants(categoryParam) {
    const trimmed = categoryParam.trim();
    if (!trimmed)
        return [];
    const variants = new Set();
    const enumKey = trimmed.toUpperCase().replace(/\s+/g, '_');
    const label = exports.PROPERTY_TYPE_TO_CATEGORY_LABEL[enumKey];
    if (label) {
        variants.add(label.toLowerCase());
        variants.add(enumKey.toLowerCase());
        variants.add(label);
        variants.add(enumKey);
    }
    const resolved = resolveCategoryLabel(trimmed);
    if (resolved) {
        variants.add(resolved.toLowerCase());
        variants.add(resolved);
    }
    variants.add(trimmed.toLowerCase());
    variants.add(trimmed);
    return [...variants];
}
/**
 * Find property IDs whose category.en matches the requested type.
 * Uses SQL JSON extraction (same approach as semantic search filters).
 */
async function findPropertyIdsByCategory(categoryParam) {
    const variants = getCategoryMatchVariants(categoryParam);
    if (variants.length === 0)
        return null;
    const rows = await database_1.default.$queryRaw `
    SELECT id
    FROM "Property"
    WHERE "isDeleted" = false
      AND LOWER(TRIM(category->>'en')) IN (${client_1.Prisma.join(variants.map((v) => v.toLowerCase()))})
  `;
    return rows.map((row) => row.id);
}
/**
 * Prisma JSON filter for Property.category ({ en, am }).
 * Kept for callers that only need a where fragment.
 */
function buildCategoryWhere(categoryParam) {
    const variants = getCategoryMatchVariants(categoryParam);
    if (variants.length === 0)
        return undefined;
    return {
        OR: variants.map((value) => ({
            category: {
                path: ['en'],
                equals: value,
            },
        })),
    };
}
