"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InteractionApiError = exports.INTERACTION_SOURCE_VALUES = void 0;
exports.INTERACTION_SOURCE_VALUES = [
    'SEARCH_RESULTS',
    'SEARCH_RESULTS_CARD',
    'RECOMMENDATIONS',
    'RECOMMENDATIONS_CARD',
    'SIMILAR_PROPERTIES',
    'SIMILAR_PROPERTIES_CARD',
    'DIRECT_LINK',
    'CATEGORY_BROWSE',
    'LOCATION_BROWSE',
    'OWNER_PROFILE',
    'PROPERTY_DETAIL_PAGE',
    'SAVED_PROPERTIES_PAGE',
];
class InteractionApiError extends Error {
    constructor(code, message, statusCode, details) {
        super(message);
        this.code = code;
        this.statusCode = statusCode;
        this.details = details;
    }
    toJSON() {
        return {
            success: false,
            error: {
                code: this.code,
                message: this.message,
                ...this.details,
            },
        };
    }
}
exports.InteractionApiError = InteractionApiError;
