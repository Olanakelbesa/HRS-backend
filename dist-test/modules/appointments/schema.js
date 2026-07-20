"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateAppointmentNoteSchema = exports.updateAppointmentStatusSchema = exports.appointmentIdParamSchema = exports.listMyAppointmentsQuerySchema = exports.listAppointmentsQuerySchema = exports.createAppointmentSchema = void 0;
const zod_1 = require("zod");
exports.createAppointmentSchema = zod_1.z
    .object({
    propertyId: zod_1.z.string().min(1),
    startsAt: zod_1.z.coerce.date(),
    endsAt: zod_1.z.coerce.date(),
    note: zod_1.z.string().max(500).optional(),
})
    .refine((value) => value.endsAt > value.startsAt, {
    message: 'endsAt must be after startsAt',
    path: ['endsAt'],
})
    .refine((value) => value.startsAt >= new Date(), {
    message: 'startsAt must be in the future',
    path: ['startsAt'],
});
exports.listAppointmentsQuerySchema = zod_1.z.object({
    status: zod_1.z.enum(['PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED']).optional(),
    propertyId: zod_1.z.string().optional(),
    from: zod_1.z.coerce.date().optional(),
    to: zod_1.z.coerce.date().optional(),
});
/** Renter "my appointments" list — same filters as owner list */
exports.listMyAppointmentsQuerySchema = exports.listAppointmentsQuerySchema;
exports.appointmentIdParamSchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
});
exports.updateAppointmentStatusSchema = zod_1.z.object({
    status: zod_1.z.enum(['ACCEPTED', 'REJECTED', 'CANCELLED']),
});
exports.updateAppointmentNoteSchema = zod_1.z.object({
    note: zod_1.z.string().max(500),
});
