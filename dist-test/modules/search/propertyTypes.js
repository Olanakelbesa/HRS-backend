"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PROPERTY_TYPE_PARSE_ORDER = exports.PROPERTY_TYPE_CATEGORY_LABELS = void 0;
exports.categoryLabelForPropertyType = categoryLabelForPropertyType;
/** Category.en labels in the database (seed data). */
exports.PROPERTY_TYPE_CATEGORY_LABELS = {
    apartment: 'apartment',
    villa: 'villa',
    studio: 'studio',
    house: 'house',
    penthouse: 'penthouse',
    condo: 'condo',
    'shared room': 'shared room',
    'serviced apartment': 'serviced apartment',
};
/** Longer phrases first so "penthouse" wins over "house". */
exports.PROPERTY_TYPE_PARSE_ORDER = [
    { pattern: /\bserviced\s+apartments?\b/i, type: 'serviced apartment' },
    { pattern: /\bshared\s+rooms?\b/i, type: 'shared room' },
    { pattern: /\bpenthouses?\b/i, type: 'penthouse' },
    { pattern: /\bapartments?\b/i, type: 'apartment' },
    { pattern: /\bvillas?\b/i, type: 'villa' },
    { pattern: /\bcondos?\b/i, type: 'condo' },
    { pattern: /\bstudios?\b/i, type: 'studio' },
    { pattern: /\bhouses?\b/i, type: 'house' },
];
function categoryLabelForPropertyType(propertyType) {
    return exports.PROPERTY_TYPE_CATEGORY_LABELS[propertyType];
}
