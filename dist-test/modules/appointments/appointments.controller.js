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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppointmentsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const appointments_api_service_1 = require("./appointments.api.service");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const zod_validation_pipe_1 = require("../../common/pipes/zod-validation.pipe");
const schema_1 = require("./schema");
let AppointmentsController = class AppointmentsController {
    constructor(appointmentsService) {
        this.appointmentsService = appointmentsService;
    }
    async book(user, body) {
        const appointment = await this.appointmentsService.bookAppointment(user.userId, user.role, body);
        return {
            status: 'success',
            message: 'Appointment request created successfully',
            data: { appointment },
        };
    }
    async getAvailability(propertyId, ownerId, fromRaw, toRaw) {
        if (!propertyId && !ownerId) {
            throw new common_1.BadRequestException('propertyId or ownerId is required');
        }
        const from = fromRaw ? new Date(fromRaw) : undefined;
        const to = toRaw ? new Date(toRaw) : undefined;
        if (from && Number.isNaN(from.getTime())) {
            throw new common_1.BadRequestException('Invalid `from` datetime');
        }
        if (to && Number.isNaN(to.getTime())) {
            throw new common_1.BadRequestException('Invalid `to` datetime');
        }
        const busy = await this.appointmentsService.getAvailability({
            propertyId,
            ownerId,
            from,
            to,
        });
        return {
            status: 'success',
            message: 'Availability fetched',
            data: { busy },
        };
    }
    async listMine(user, query) {
        const appointments = await this.appointmentsService.listMyAppointmentsForRenter(user.userId, user.role, query);
        return {
            status: 'success',
            message: 'Appointments fetched successfully',
            data: { appointments },
        };
    }
    async list(user, query) {
        const appointments = await this.appointmentsService.listAppointments(user.userId, user.role, query);
        return {
            status: 'success',
            message: 'Appointments fetched successfully',
            data: { appointments },
        };
    }
    async cancel(user, id) {
        const appointment = await this.appointmentsService.cancelRenterAppointment(user.userId, user.role, id);
        return {
            status: 'success',
            message: 'Appointment cancelled successfully',
            data: { appointment },
        };
    }
    async updateStatus(user, id, body) {
        const appointment = await this.appointmentsService.updateAppointmentStatus(user.userId, user.role, id, body);
        return {
            status: 'success',
            message: 'Appointment status updated successfully',
            data: { appointment },
        };
    }
    async updateNote(user, id, body) {
        const appointment = await this.appointmentsService.updateAppointmentNote(user.userId, user.role, id, body);
        return {
            status: 'success',
            message: 'Appointment note updated successfully',
            data: { appointment },
        };
    }
    async getById(user, id) {
        const role = String(user.role).trim().toLowerCase();
        const appointment = role === 'renter'
            ? await this.appointmentsService.getRenterAppointmentById(user.userId, user.role, id)
            : await this.appointmentsService.getAppointmentById(user.userId, user.role, id);
        return {
            status: 'success',
            message: 'Appointment fetched successfully',
            data: { appointment },
        };
    }
    async patchById(user, id, body) {
        const appointment = await this.appointmentsService.updateAppointmentStatus(user.userId, user.role, id, body);
        return {
            status: 'success',
            message: 'Appointment status updated successfully',
            data: { appointment },
        };
    }
    async remove(user, id) {
        const result = await this.appointmentsService.deleteAppointment(user.userId, user.role, id);
        return {
            status: 'success',
            message: 'Appointment deleted successfully',
            data: result,
        };
    }
};
exports.AppointmentsController = AppointmentsController;
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)('renter'),
    (0, common_1.HttpCode)(201),
    (0, common_1.UsePipes)(new zod_validation_pipe_1.ZodValidationPipe(schema_1.createAppointmentSchema, 'body')),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AppointmentsController.prototype, "book", null);
__decorate([
    (0, common_1.Get)('availability'),
    __param(0, (0, common_1.Query)('propertyId')),
    __param(1, (0, common_1.Query)('ownerId')),
    __param(2, (0, common_1.Query)('from')),
    __param(3, (0, common_1.Query)('to')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", Promise)
], AppointmentsController.prototype, "getAvailability", null);
__decorate([
    (0, common_1.Get)('me'),
    (0, roles_decorator_1.Roles)('renter'),
    (0, common_1.UsePipes)(new zod_validation_pipe_1.ZodValidationPipe(schema_1.listMyAppointmentsQuerySchema, 'query')),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AppointmentsController.prototype, "listMine", null);
__decorate([
    (0, common_1.Get)(),
    (0, common_1.UsePipes)(new zod_validation_pipe_1.ZodValidationPipe(schema_1.listAppointmentsQuerySchema, 'query')),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AppointmentsController.prototype, "list", null);
__decorate([
    (0, common_1.Patch)(':id/cancel'),
    (0, roles_decorator_1.Roles)('renter'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AppointmentsController.prototype, "cancel", null);
__decorate([
    (0, common_1.Patch)(':id/status'),
    (0, common_1.UsePipes)(new zod_validation_pipe_1.ZodValidationPipe(schema_1.updateAppointmentStatusSchema, 'body')),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], AppointmentsController.prototype, "updateStatus", null);
__decorate([
    (0, common_1.Patch)(':id/note'),
    (0, common_1.UsePipes)(new zod_validation_pipe_1.ZodValidationPipe(schema_1.updateAppointmentNoteSchema, 'body')),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], AppointmentsController.prototype, "updateNote", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AppointmentsController.prototype, "getById", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, common_1.UsePipes)(new zod_validation_pipe_1.ZodValidationPipe(schema_1.updateAppointmentStatusSchema, 'body')),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], AppointmentsController.prototype, "patchById", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AppointmentsController.prototype, "remove", null);
exports.AppointmentsController = AppointmentsController = __decorate([
    (0, swagger_1.ApiTags)('Appointments'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('appointments'),
    __metadata("design:paramtypes", [appointments_api_service_1.AppointmentsApiService])
], AppointmentsController);
