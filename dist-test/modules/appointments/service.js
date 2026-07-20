"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAvailability = getAvailability;
exports.bookAppointment = bookAppointment;
exports.listMyAppointmentsForRenter = listMyAppointmentsForRenter;
exports.getRenterAppointmentById = getRenterAppointmentById;
exports.cancelRenterAppointment = cancelRenterAppointment;
exports.listAppointments = listAppointments;
exports.listOwnerAppointments = listOwnerAppointments;
exports.getAppointmentById = getAppointmentById;
exports.updateAppointmentStatus = updateAppointmentStatus;
exports.deleteAppointment = deleteAppointment;
exports.updateAppointmentNote = updateAppointmentNote;
const database_1 = __importDefault(require("../../config/database"));
const AppError_1 = require("../../core/AppError");
const logger_1 = require("../../core/logger");
const emailService_1 = require("../../emails/emailService");
const localized_1 = require("../../utils/localized");
const service_1 = require("../notifications/service");
const appointmentSelect = {
    id: true,
    propertyId: true,
    renterId: true,
    ownerId: true,
    startsAt: true,
    endsAt: true,
    status: true,
    note: true,
    createdAt: true,
    updatedAt: true,
    property: {
        select: {
            id: true,
            title: true,
            address: true,
            images: true,
            status: true,
        },
    },
    renter: {
        select: {
            id: true,
            email: true,
            first_name: true,
            last_name: true,
            phone: true,
            image: true,
        },
    },
    owner: {
        select: {
            id: true,
            email: true,
            first_name: true,
            last_name: true,
            phone: true,
            image: true,
        },
    },
};
/** Statuses that block a property time slot */
const RENTER_CANCELLABLE_STATUSES = ['PENDING', 'ACCEPTED'];
const ACTIVE_SLOT_STATUSES = ['PENDING', 'ACCEPTED'];
function formatAppointmentDateTime(date) {
    return date.toLocaleString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZone: 'Africa/Addis_Ababa',
    });
}
async function findOverlappingAppointment(where) {
    return database_1.default.appointment.findFirst({
        where: {
            ...(where.propertyId ? { propertyId: where.propertyId } : {}),
            ...(where.renterId ? { renterId: where.renterId } : {}),
            ...(where.ownerId ? { ownerId: where.ownerId } : {}),
            ...(where.excludeId ? { id: { not: where.excludeId } } : {}),
            status: { in: [...ACTIVE_SLOT_STATUSES] },
            startsAt: { lt: where.endsAt },
            endsAt: { gt: where.startsAt },
        },
        select: { id: true },
    });
}
/**
 * Get busy appointment slots for a property or owner within an optional window.
 * Returns appointments with status in ACTIVE_SLOT_STATUSES (PENDING, ACCEPTED).
 */
async function getAvailability(options) {
    const { propertyId, ownerId, from, to } = options;
    const windowFrom = from ?? new Date();
    const windowTo = to ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // default 30 days
    const where = {
        status: { in: [...ACTIVE_SLOT_STATUSES] },
        startsAt: { lt: windowTo },
        endsAt: { gt: windowFrom },
    };
    if (propertyId)
        where.propertyId = propertyId;
    if (ownerId)
        where.ownerId = ownerId;
    const appointments = await database_1.default.appointment.findMany({
        where,
        select: {
            id: true,
            propertyId: true,
            ownerId: true,
            startsAt: true,
            endsAt: true,
            status: true,
        },
        orderBy: { startsAt: 'asc' },
    });
    return appointments.map((a) => ({
        id: a.id,
        propertyId: a.propertyId,
        ownerId: a.ownerId,
        startsAt: a.startsAt.toISOString(),
        endsAt: a.endsAt.toISOString(),
        status: a.status,
    }));
}
function assertCanAccessAppointment(userId, userRole, appointment) {
    if (userRole === 'admin')
        return;
    if (appointment.renterId === userId || appointment.ownerId === userId)
        return;
    throw new AppError_1.AppError('You do not have permission to view this appointment', 403);
}
/**
 * Check if a user is verified (helper function)
 * Owners must be verified to interact with appointments
 */
async function checkOwnerVerification(ownerId) {
    const user = await database_1.default.user.findUnique({
        where: { id: ownerId },
        select: { role: true, isVerified: true },
    });
    if (!user) {
        throw new AppError_1.AppError('User not found', 404);
    }
    if (user.role !== 'owner') {
        throw new AppError_1.AppError('Only owners can perform this action', 403);
    }
    if (!user.isVerified) {
        throw new AppError_1.AppError('Your account is not verified. Please upload your verification documents and wait for approval.', 403);
    }
}
async function notifyOwnerOfNewBooking(appointmentId) {
    const appointment = await database_1.default.appointment.findUnique({
        where: { id: appointmentId },
        select: {
            id: true,
            startsAt: true,
            endsAt: true,
            property: { select: { title: true, address: true } },
            renter: { select: { email: true, first_name: true, last_name: true } },
            owner: { select: { email: true, first_name: true } },
        },
    });
    if (!appointment)
        return;
    logger_1.logger.info('New appointment booking request created', {
        appointmentId: appointment.id,
        ownerEmail: appointment.owner.email,
    });
    if (!appointment.owner.email)
        return;
    try {
        await (0, emailService_1.sendEmail)('appointmentRequest', appointment.owner.email, {
            ownerFirstName: appointment.owner.first_name ?? 'there',
            renterName: [appointment.renter.first_name, appointment.renter.last_name].filter(Boolean).join(' ') ||
                appointment.renter.email ||
                'Renter',
            propertyTitle: (0, localized_1.getLocalizedText)(appointment.property.title),
            propertyAddress: (0, localized_1.getLocalizedText)(appointment.property.address),
            startsAt: formatAppointmentDateTime(appointment.startsAt),
            endsAt: formatAppointmentDateTime(appointment.endsAt),
        }, 'New property visit booking request');
    }
    catch (error) {
        logger_1.logger.warn('Could not send appointment request email', {
            appointmentId: appointment.id,
            error: error instanceof Error ? error.message : String(error),
        });
    }
}
async function bookAppointment(userId, userRole, input) {
    if (userRole !== 'renter') {
        throw new AppError_1.AppError('Only renters can book appointments', 403);
    }
    const property = await database_1.default.property.findUnique({
        where: { id: input.propertyId },
        select: { id: true, ownerId: true, status: true },
    });
    if (!property)
        throw new AppError_1.AppError('Property not found', 404);
    if (property.status !== 'AVAILABLE') {
        throw new AppError_1.AppError('This property is not available for visits', 400);
    }
    const user = await database_1.default.user.findUnique({
        where: { id: userId },
        select: { id: true },
    });
    if (!user)
        throw new AppError_1.AppError('User account not found. Please log in again.', 404);
    if (property.ownerId === userId) {
        throw new AppError_1.AppError('You cannot book an appointment for your own property', 400);
    }
    if (input.startsAt < new Date()) {
        throw new AppError_1.AppError('Cannot book appointments in the past', 400);
    }
    const renterOverlap = await findOverlappingAppointment({
        renterId: userId,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
    });
    if (renterOverlap) {
        throw new AppError_1.AppError('You already have an overlapping appointment', 409);
    }
    const propertyOverlap = await findOverlappingAppointment({
        propertyId: property.id,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
    });
    if (propertyOverlap) {
        throw new AppError_1.AppError('This time slot is already booked for this property', 409);
    }
    const duplicateForRenterOnProperty = await findOverlappingAppointment({
        propertyId: property.id,
        renterId: userId,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
    });
    if (duplicateForRenterOnProperty) {
        throw new AppError_1.AppError('You already have a booking for this property at this time', 409);
    }
    const appointment = await database_1.default.appointment.create({
        data: {
            propertyId: property.id,
            renterId: userId,
            ownerId: property.ownerId,
            startsAt: input.startsAt,
            endsAt: input.endsAt,
            note: input.note ?? null,
        },
        select: appointmentSelect,
    });
    await notifyOwnerOfNewBooking(appointment.id);
    await (0, service_1.createNotification)({
        userId: appointment.ownerId,
        type: 'APPOINTMENT_BOOKED',
        title: 'New booking request',
        body: `A renter requested a visit for ${(0, localized_1.getLocalizedText)(appointment.property.title)}`,
        payload: {
            appointmentId: appointment.id,
            propertyId: appointment.propertyId,
            startsAt: appointment.startsAt.toISOString(),
            endsAt: appointment.endsAt.toISOString(),
        },
    });
    await (0, service_1.createAuditLog)({
        actorId: userId,
        eventType: 'APPOINTMENT_BOOKED',
        entityType: 'Appointment',
        entityId: appointment.id,
        metadata: {
            propertyId: appointment.propertyId,
            ownerId: appointment.ownerId,
            renterId: appointment.renterId,
            startsAt: appointment.startsAt.toISOString(),
            endsAt: appointment.endsAt.toISOString(),
        },
    });
    return appointment;
}
async function listMyAppointmentsForRenter(userId, userRole, query) {
    if (userRole !== 'renter') {
        throw new AppError_1.AppError('Only renters can access their appointments', 403);
    }
    return listAppointments(userId, 'renter', query);
}
async function getRenterAppointmentById(userId, userRole, appointmentId) {
    if (userRole !== 'renter') {
        throw new AppError_1.AppError('Only renters can access this appointment', 403);
    }
    const appointment = await database_1.default.appointment.findUnique({
        where: { id: appointmentId },
        select: appointmentSelect,
    });
    if (!appointment)
        throw new AppError_1.AppError('Appointment not found', 404);
    if (appointment.renterId !== userId) {
        throw new AppError_1.AppError('You do not have permission to view this appointment', 403);
    }
    return appointment;
}
async function cancelRenterAppointment(userId, userRole, appointmentId) {
    if (userRole !== 'renter') {
        throw new AppError_1.AppError('Only renters can cancel their appointments', 403);
    }
    const appointment = await database_1.default.appointment.findUnique({
        where: { id: appointmentId },
        select: {
            id: true,
            renterId: true,
            ownerId: true,
            status: true,
            propertyId: true,
        },
    });
    if (!appointment)
        throw new AppError_1.AppError('Appointment not found', 404);
    if (appointment.renterId !== userId) {
        throw new AppError_1.AppError('You can only cancel your own appointments', 403);
    }
    if (!RENTER_CANCELLABLE_STATUSES.includes(appointment.status)) {
        throw new AppError_1.AppError('Only pending or confirmed appointments can be cancelled', 400);
    }
    const updated = await database_1.default.appointment.update({
        where: { id: appointmentId },
        data: { status: 'CANCELLED' },
        select: appointmentSelect,
    });
    await (0, service_1.createNotification)({
        userId: updated.ownerId,
        type: 'APPOINTMENT_UPDATED',
        title: 'Appointment cancelled',
        body: 'A renter cancelled their visit request',
        payload: {
            appointmentId: updated.id,
            status: updated.status,
            propertyId: updated.propertyId,
        },
    });
    await (0, service_1.createAuditLog)({
        actorId: userId,
        eventType: 'APPOINTMENT_CANCELLED',
        entityType: 'Appointment',
        entityId: updated.id,
        metadata: { previousStatus: appointment.status, status: 'CANCELLED' },
    });
    return updated;
}
async function listAppointments(userId, userRole, query) {
    const where = {
        ...(query.status ? { status: query.status } : {}),
        ...(query.propertyId ? { propertyId: query.propertyId } : {}),
        ...(query.from || query.to
            ? {
                startsAt: {
                    ...(query.from ? { gte: query.from } : {}),
                    ...(query.to ? { lte: query.to } : {}),
                },
            }
            : {}),
    };
    if (userRole === 'renter') {
        where.renterId = userId;
    }
    else if (userRole === 'owner') {
        where.ownerId = userId;
    }
    return database_1.default.appointment.findMany({
        where,
        orderBy: { startsAt: 'asc' },
        select: appointmentSelect,
    });
}
async function listOwnerAppointments(userId, userRole, query) {
    if (userRole !== 'owner' && userRole !== 'admin') {
        throw new AppError_1.AppError('Only owners can access this endpoint', 403);
    }
    return listAppointments(userId, userRole === 'admin' ? 'admin' : 'owner', query);
}
async function getAppointmentById(userId, userRole, appointmentId) {
    const appointment = await database_1.default.appointment.findUnique({
        where: { id: appointmentId },
        select: appointmentSelect,
    });
    if (!appointment)
        throw new AppError_1.AppError('Appointment not found', 404);
    assertCanAccessAppointment(userId, userRole, appointment);
    return appointment;
}
async function updateAppointmentStatus(userId, userRole, appointmentId, input) {
    const appointment = await database_1.default.appointment.findUnique({
        where: { id: appointmentId },
        select: {
            id: true,
            propertyId: true,
            renterId: true,
            ownerId: true,
            startsAt: true,
            endsAt: true,
            status: true,
        },
    });
    if (!appointment)
        throw new AppError_1.AppError('Appointment not found', 404);
    if (input.status === 'CANCELLED') {
        const canCancel = userRole === 'admin' || appointment.renterId === userId || appointment.ownerId === userId;
        if (!canCancel) {
            throw new AppError_1.AppError('You do not have permission to cancel this appointment', 403);
        }
        if (appointment.status !== 'PENDING' && appointment.status !== 'ACCEPTED') {
            throw new AppError_1.AppError('Only pending or confirmed appointments can be cancelled', 400);
        }
        if (userRole === 'owner' && appointment.ownerId === userId) {
            await checkOwnerVerification(userId);
        }
    }
    else {
        const canManage = userRole === 'admin' || appointment.ownerId === userId;
        if (!canManage)
            throw new AppError_1.AppError('Only the property owner can approve or reject', 403);
        if (appointment.status !== 'PENDING') {
            throw new AppError_1.AppError('Only pending appointments can be approved or rejected', 400);
        }
        if (userRole === 'owner' && appointment.ownerId === userId) {
            await checkOwnerVerification(userId);
        }
        if (input.status === 'ACCEPTED') {
            const ownerOverlap = await findOverlappingAppointment({
                ownerId: appointment.ownerId,
                startsAt: appointment.startsAt,
                endsAt: appointment.endsAt,
                excludeId: appointment.id,
            });
            if (ownerOverlap) {
                throw new AppError_1.AppError('You already have a confirmed appointment at this time', 409);
            }
            const propertyOverlap = await findOverlappingAppointment({
                propertyId: appointment.propertyId,
                startsAt: appointment.startsAt,
                endsAt: appointment.endsAt,
                excludeId: appointment.id,
            });
            if (propertyOverlap) {
                throw new AppError_1.AppError('This property time slot is no longer available', 409);
            }
        }
    }
    const updated = await database_1.default.appointment.update({
        where: { id: appointmentId },
        data: {
            status: input.status,
        },
        select: appointmentSelect,
    });
    await (0, service_1.createNotification)({
        userId: updated.renterId,
        type: 'APPOINTMENT_UPDATED',
        title: 'Appointment updated',
        body: `Your appointment status is now ${updated.status}`,
        payload: {
            appointmentId: updated.id,
            status: updated.status,
            propertyId: updated.propertyId,
        },
    });
    await (0, service_1.createAuditLog)({
        actorId: userId,
        eventType: 'APPOINTMENT_STATUS_UPDATED',
        entityType: 'Appointment',
        entityId: updated.id,
        metadata: { previousStatus: appointment.status, status: updated.status },
    });
    return updated;
}
async function deleteAppointment(userId, userRole, appointmentId) {
    const appointment = await database_1.default.appointment.findUnique({
        where: { id: appointmentId },
        select: {
            id: true,
            renterId: true,
            ownerId: true,
        },
    });
    if (!appointment)
        throw new AppError_1.AppError('Appointment not found', 404);
    const canDelete = userRole === 'admin' || appointment.renterId === userId || appointment.ownerId === userId;
    if (!canDelete) {
        throw new AppError_1.AppError('You do not have permission to delete this appointment', 403);
    }
    // Check if owner is verified (only applies to owners, not admins or renters)
    if (userRole === 'owner' && appointment.ownerId === userId) {
        await checkOwnerVerification(userId);
    }
    await database_1.default.appointment.delete({ where: { id: appointmentId } });
    const notificationRecipientId = appointment.renterId === userId ? appointment.ownerId : appointment.renterId;
    await (0, service_1.createNotification)({
        userId: notificationRecipientId,
        type: 'APPOINTMENT_UPDATED',
        title: 'Appointment deleted',
        body: 'An appointment was deleted by one of the participants',
        payload: { appointmentId },
    });
    await (0, service_1.createAuditLog)({
        actorId: userId,
        eventType: 'APPOINTMENT_DELETED',
        entityType: 'Appointment',
        entityId: appointmentId,
        metadata: {
            renterId: appointment.renterId,
            ownerId: appointment.ownerId,
        },
    });
    return { id: appointmentId };
}
async function updateAppointmentNote(userId, userRole, appointmentId, input) {
    const appointment = await database_1.default.appointment.findUnique({
        where: { id: appointmentId },
        select: {
            id: true,
            ownerId: true,
            note: true,
        },
    });
    if (!appointment) {
        throw new AppError_1.AppError('Appointment not found', 404);
    }
    const canUpdateNote = userRole === 'admin' || appointment.ownerId === userId;
    if (!canUpdateNote) {
        throw new AppError_1.AppError('Only owner/agent can update appointment note', 403);
    }
    // Check if owner is verified (only applies to owners, not admins)
    if (userRole === 'owner' && appointment.ownerId === userId) {
        await checkOwnerVerification(userId);
    }
    const updated = await database_1.default.appointment.update({
        where: { id: appointmentId },
        data: { note: input.note },
        select: appointmentSelect,
    });
    await (0, service_1.createAuditLog)({
        actorId: userId,
        eventType: 'APPOINTMENT_NOTE_UPDATED',
        entityType: 'Appointment',
        entityId: updated.id,
        metadata: {
            previousNote: appointment.note,
            note: updated.note,
        },
    });
    return updated;
}
