"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOwnerOverviewQuerySchema = void 0;
const zod_1 = require("zod");
exports.getOwnerOverviewQuerySchema = zod_1.z.object({
    range: zod_1.z.enum(['weekly', 'monthly']).default('monthly'),
});
