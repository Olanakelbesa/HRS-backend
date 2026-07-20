"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatSearchProperty = formatSearchProperty;
const service_1 = require("../properties/service");
const currency_1 = require("./currency");
/**
 * Formats a property for semantic search responses (includes price.amountEtb).
 */
function formatSearchProperty(property, etbPerUsd, displayCurrency) {
    const formatted = (0, service_1.formatPropertyResponse)(property);
    const rawPrice = formatted.price;
    return {
        ...formatted,
        price: (0, currency_1.enrichPrice)(rawPrice, etbPerUsd, displayCurrency),
    };
}
