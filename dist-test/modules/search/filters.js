"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasStructuredFilters = hasStructuredFilters;
exports.finalizeParsedFilters = finalizeParsedFilters;
exports.relaxFilters = relaxFilters;
exports.buildFilterSql = buildFilterSql;
const queryParser_1 = require("./queryParser");
const currency_1 = require("./currency");
const propertyTypes_1 = require("./propertyTypes");
function hasValue(v) {
    return v !== null && v !== undefined;
}
function hasStructuredFilters(filters) {
    return (hasValue(filters.location) ||
        hasValue(filters.maxPrice) ||
        hasValue(filters.minPrice) ||
        filters.bedrooms != null ||
        filters.amenities.length > 0 ||
        hasValue(filters.propertyType));
}
/** Re-run sanitization after merge (price rules + confidence). */
function finalizeParsedFilters(query, filters) {
    return (0, queryParser_1.sanitizeParsedFilters)(filters, query, filters.currency);
}
/** Filters used when strict SQL pre-filtering returns no rows. */
function relaxFilters(filters) {
    return {
        ...filters,
        location: null,
    };
}
function escapeLikePattern(value) {
    return value.replace(/[%_\\]/g, '\\$&');
}
function sqlLikeLiteral(value) {
    return `'%${escapeLikePattern(value)}%'`;
}
function sqlStringLiteral(value) {
    return `'${value.replace(/'/g, "''")}'`;
}
/**
 * Builds SQL AND clauses for hybrid search pre-filtering.
 * @param etbPerUsd - used to compare USD-listed rents in ETB
 */
function buildFilterSql(filters, etbPerUsd) {
    let filterSql = '';
    const rentEtb = (0, currency_1.buildRentAmountEtbSql)(etbPerUsd);
    if (hasValue(filters.maxPrice)) {
        const max = Number(filters.maxPrice);
        if (filters.priceCurrency === 'USD') {
            filterSql += ` AND (
        (UPPER(COALESCE(p.price->>'currency', 'ETB')) = 'USD' AND (p.price->>'value')::numeric <= ${max})
        OR
        (UPPER(COALESCE(p.price->>'currency', 'ETB')) <> 'USD' AND ${rentEtb} <= ${Math.round(max * etbPerUsd)})
      )`;
        }
        else {
            filterSql += ` AND ${rentEtb} <= ${max}`;
        }
    }
    if (hasValue(filters.minPrice)) {
        const min = Number(filters.minPrice);
        if (filters.priceCurrency === 'USD') {
            filterSql += ` AND (
        (UPPER(COALESCE(p.price->>'currency', 'ETB')) = 'USD' AND (p.price->>'value')::numeric >= ${min})
        OR
        (UPPER(COALESCE(p.price->>'currency', 'ETB')) <> 'USD' AND ${rentEtb} >= ${Math.round(min * etbPerUsd)})
      )`;
        }
        else {
            filterSql += ` AND ${rentEtb} >= ${min}`;
        }
    }
    if (filters.bedrooms != null) {
        if (filters.bedrooms === 0 || filters.propertyType === 'studio') {
            filterSql += ` AND (p.bedrooms = 0 OR LOWER(TRIM(p.category->>'en')) = 'studio')`;
        }
        else {
            filterSql += ` AND p.bedrooms >= ${Number(filters.bedrooms)}`;
        }
    }
    if (hasValue(filters.propertyType) && filters.bedrooms !== 0) {
        const label = (0, propertyTypes_1.categoryLabelForPropertyType)(filters.propertyType);
        filterSql += ` AND LOWER(TRIM(p.category->>'en')) = ${sqlStringLiteral(label)}`;
    }
    if (hasValue(filters.location)) {
        const loc = sqlLikeLiteral(filters.location);
        filterSql += ` AND (
      p.location::text ILIKE ${loc} OR
      p.address::text ILIKE ${loc} OR
      p.title::text ILIKE ${loc}
    )`;
    }
    for (const amenity of filters.amenities) {
        const pattern = sqlLikeLiteral(amenity);
        filterSql += ` AND p.amenities::text ILIKE ${pattern}`;
    }
    return filterSql;
}
