"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZodValidationPipe = void 0;
const common_1 = require("@nestjs/common");
let ZodValidationPipe = class ZodValidationPipe {
    constructor(schema, source = 'body') {
        this.schema = schema;
        this.source = source;
    }
    transform(value, metadata) {
        if (this.source === 'body' && metadata.type !== 'body')
            return value;
        if (this.source === 'query' && metadata.type !== 'query')
            return value;
        if (this.source === 'params' && metadata.type !== 'param')
            return value;
        const result = this.schema.safeParse(this.source === 'body' && value && typeof value === 'object' && !('body' in value)
            ? { body: value }
            : this.source === 'query'
                ? { query: value }
                : this.source === 'params'
                    ? { params: value }
                    : value);
        // Also accept flat schemas (not wrapped in body/query)
        if (!result.success) {
            const flat = this.schema.safeParse(value);
            if (flat.success)
                return flat.data;
            const error = result.error;
            throw new common_1.BadRequestException({
                message: 'Validation failed',
                errors: error.flatten().fieldErrors,
            });
        }
        const data = result.data;
        if (this.source === 'body' && data.body !== undefined)
            return data.body;
        if (this.source === 'query' && data.query !== undefined)
            return data.query;
        if (this.source === 'params' && data.params !== undefined)
            return data.params;
        return result.data;
    }
};
exports.ZodValidationPipe = ZodValidationPipe;
exports.ZodValidationPipe = ZodValidationPipe = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [Function, String])
], ZodValidationPipe);
