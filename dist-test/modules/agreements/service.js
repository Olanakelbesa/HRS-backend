"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.finalizeSecurityDeposit = void 0;
exports.listOwnerAgreements = listOwnerAgreements;
exports.listRenterAgreements = listRenterAgreements;
exports.exportOwnerAgreements = exportOwnerAgreements;
exports.getAgreementDetail = getAgreementDetail;
exports.createOwnerAgreement = createOwnerAgreement;
exports.updateDraftAgreement = updateDraftAgreement;
exports.sendAgreement = sendAgreement;
exports.cancelAgreement = cancelAgreement;
exports.acceptAgreement = acceptAgreement;
exports.rejectAgreement = rejectAgreement;
exports.initiateDeposit = initiateDeposit;
exports.getDepositStatus = getDepositStatus;
exports.listAgreementPayments = listAgreementPayments;
exports.terminateAgreement = terminateAgreement;
const crypto_1 = require("crypto");
const database_1 = __importDefault(require("../../config/database"));
const AppError_1 = require("../../core/AppError");
const exchangeRate_1 = require("../../lib/exchangeRate");
const agreementStatus_1 = require("../../lib/agreementStatus");
const client_1 = require("../../integrations/chapa/client");
const deposit_1 = require("./deposit");
Object.defineProperty(exports, "finalizeSecurityDeposit", { enumerable: true, get: function () { return deposit_1.finalizeSecurityDeposit; } });
const prismaSelects_1 = require("../../lib/prismaSelects");
async function checkOwnerVerification(ownerId) {
    const user = await database_1.default.user.findUnique({
        where: { id: ownerId },
        select: { role: true, isVerified: true },
    });
    if (!user)
        throw new AppError_1.AppError('User not found', 404);
    if (user.role !== 'owner')
        throw new AppError_1.AppError('Only owners can perform this action', 403);
    if (!user.isVerified) {
        throw new AppError_1.AppError('Your account is not verified. Please upload your verification documents and wait for approval.', 403);
    }
}
function buildTermsSnapshot(property) {
    return {
        capturedAt: new Date().toISOString(),
        propertyId: property.id,
        title: property.title,
        address: property.address,
        category: property.category,
        price: property.price,
        leaseTerms: property.leaseTerms,
        images: property.images,
    };
}
function resolveMonthlyRent(property, override) {
    if (override != null)
        return override;
    const price = property.price;
    if (!price?.value || price.value <= 0) {
        throw new AppError_1.AppError('Property has no monthly rent configured', 400);
    }
    return price.value;
}
function resolveCurrency(property, override) {
    if (override)
        return override.toUpperCase();
    const price = property.price;
    return (price?.currency || 'ETB').toUpperCase();
}
function getSecureDeposit(leaseTerms) {
    const terms = (leaseTerms || {});
    const deposit = terms.secureDeposit;
    if (!deposit?.value || deposit.value <= 0) {
        throw new AppError_1.AppError('Property has no security deposit configured in lease terms', 400);
    }
    return {
        value: deposit.value,
        currency: (deposit.currency || 'ETB').toUpperCase(),
    };
}
async function assertNoBlockingAgreement(propertyId, renterId, excludeId) {
    const existing = await database_1.default.agreement.findFirst({
        where: {
            propertyId,
            renterId,
            status: { in: agreementStatus_1.BLOCKING_AGREEMENT_STATUSES },
            ...(excludeId ? { id: { not: excludeId } } : {}),
        },
    });
    if (existing) {
        throw new AppError_1.AppError('An open agreement already exists for this renter and property', 409);
    }
}
function assertOfferNotExpired(agreement) {
    if (!agreement.offerExpiresAt)
        return;
    if (agreement.offerExpiresAt.getTime() < Date.now()) {
        throw new AppError_1.AppError('This offer has expired', 410);
    }
}
async function expireAgreementIfNeeded(agreementId) {
    const agreement = await database_1.default.agreement.findUnique({ where: { id: agreementId } });
    if (!agreement?.offerExpiresAt)
        return agreement;
    if (agreement.offerExpiresAt.getTime() >= Date.now())
        return agreement;
    if (agreement.status !== 'sent' && agreement.status !== 'payment_pending')
        return agreement;
    return database_1.default.agreement.update({
        where: { id: agreementId },
        data: { status: 'expired' },
    });
}
function mapAgreementResponse(row) {
    return (0, agreementStatus_1.enrichAgreement)(row);
}
async function listOwnerAgreements(ownerId, query) {
    await checkOwnerVerification(ownerId);
    const where = { ownerId };
    if (query.search) {
        where.OR = [
            { id: { contains: query.search, mode: 'insensitive' } },
            { property: { title: { path: ['en'], string_contains: query.search } } },
            { renter: { first_name: { contains: query.search, mode: 'insensitive' } } },
        ];
    }
    if (query.status)
        where.status = query.status;
    const [items, total] = await Promise.all([
        database_1.default.agreement.findMany({
            where,
            select: prismaSelects_1.agreementListSelect,
            orderBy: { createdAt: 'desc' },
        }),
        database_1.default.agreement.count({ where }),
    ]);
    return {
        items: items.map(mapAgreementResponse),
        meta: { total },
    };
}
async function listRenterAgreements(renterId, query) {
    const where = { renterId };
    if (query.status)
        where.status = query.status;
    const page = Number(query.page ?? 1) || 1;
    const limit = Number(query.limit ?? 20) || 20;
    const [items, total] = await Promise.all([
        database_1.default.agreement.findMany({
            where,
            select: {
                ...prismaSelects_1.agreementListSelect,
                owner: { select: { id: true, first_name: true, last_name: true } },
            },
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
        }),
        database_1.default.agreement.count({ where }),
    ]);
    return {
        items: items.map(mapAgreementResponse),
        meta: { page, limit, total },
    };
}
async function exportOwnerAgreements(ownerId, _query) {
    await checkOwnerVerification(ownerId);
    const agreements = await database_1.default.agreement.findMany({
        where: { ownerId },
        select: prismaSelects_1.agreementListSelect,
        orderBy: { createdAt: 'desc' },
    });
    const headers = ['Agreement ID', 'Property', 'Renter', 'Monthly Rent', 'Status', 'Start Date'];
    const rows = agreements.map((a) => [
        a.id,
        typeof a.property.title === 'string'
            ? a.property.title
            : a.property.title?.en || '',
        `${a.renter.first_name} ${a.renter.last_name}`,
        String(a.monthlyRent),
        a.status,
        a.startDate?.toISOString() ?? '',
    ]);
    return [headers, ...rows].map((r) => r.join(',')).join('\n');
}
async function getAgreementDetail(agreementId, requesterId) {
    await expireAgreementIfNeeded(agreementId);
    const agreement = await database_1.default.agreement.findUnique({
        where: { id: agreementId },
        select: prismaSelects_1.agreementDetailSelect,
    });
    if (!agreement)
        throw new AppError_1.AppError('Agreement not found', 404);
    if (requesterId &&
        requesterId !== agreement.ownerId &&
        requesterId !== agreement.renterId) {
        if (agreement.renter) {
            agreement.renter.email = undefined;
            agreement.renter.phone = undefined;
        }
        if (agreement.owner) {
            agreement.owner.email = undefined;
            agreement.owner.phone = undefined;
        }
    }
    return mapAgreementResponse(agreement);
}
async function createOwnerAgreement(ownerId, input) {
    await checkOwnerVerification(ownerId);
    const property = await database_1.default.property.findUnique({ where: { id: input.propertyId } });
    if (!property)
        throw new AppError_1.AppError('Property not found', 404);
    if (property.ownerId !== ownerId)
        throw new AppError_1.AppError('You do not own this property', 403);
    if (input.renterId === ownerId)
        throw new AppError_1.AppError('Owner cannot be the renter', 400);
    const renter = await database_1.default.user.findUnique({ where: { id: input.renterId } });
    if (!renter)
        throw new AppError_1.AppError('Renter not found', 404);
    if (input.appointmentId) {
        const appointment = await database_1.default.appointment.findUnique({ where: { id: input.appointmentId } });
        if (!appointment || appointment.propertyId !== property.id) {
            throw new AppError_1.AppError('Invalid appointment for this property', 400);
        }
        if (appointment.renterId !== input.renterId) {
            throw new AppError_1.AppError('Appointment renter does not match', 400);
        }
    }
    if (input.offerExpiresAt.getTime() <= Date.now()) {
        throw new AppError_1.AppError('Offer expiry must be in the future', 400);
    }
    await assertNoBlockingAgreement(property.id, input.renterId);
    const monthlyRent = resolveMonthlyRent(property, input.monthlyRent);
    const currency = resolveCurrency(property, input.currency);
    const deposit = getSecureDeposit(property.leaseTerms);
    const conversion = await (0, exchangeRate_1.convertDepositToEtb)(deposit.value, deposit.currency);
    const status = input.send ? 'sent' : 'draft';
    const now = input.send ? new Date() : undefined;
    const agreement = await database_1.default.agreement.create({
        data: {
            propertyId: property.id,
            renterId: input.renterId,
            ownerId,
            appointmentId: input.appointmentId,
            monthlyRent,
            currency,
            startDate: input.startDate,
            endDate: input.endDate,
            termsSnapshot: buildTermsSnapshot(property),
            depositOriginal: {
                value: conversion.originalAmount,
                currency: conversion.originalCurrency,
            },
            depositAmountEtb: conversion.depositAmountEtb,
            fxRate: conversion.fxRate,
            fxRateAt: conversion.fxRateAt,
            ownerMessage: input.ownerMessage,
            offerExpiresAt: input.offerExpiresAt,
            status,
            sentAt: now,
        },
        select: prismaSelects_1.agreementDetailSelect,
    });
    if (input.send) {
        await database_1.default.notification.create({
            data: {
                userId: input.renterId,
                type: 'MESSAGE_NEW',
                title: 'New lease offer',
                body: 'You have received a new lease agreement offer.',
            },
        });
    }
    return mapAgreementResponse(agreement);
}
async function updateDraftAgreement(agreementId, ownerId, data) {
    await checkOwnerVerification(ownerId);
    const agreement = await database_1.default.agreement.findUnique({ where: { id: agreementId } });
    if (!agreement)
        throw new AppError_1.AppError('Agreement not found', 404);
    if (agreement.ownerId !== ownerId)
        throw new AppError_1.AppError('Forbidden', 403);
    if (agreement.status !== 'draft') {
        throw new AppError_1.AppError('Only draft agreements can be updated', 400);
    }
    if (data.offerExpiresAt && data.offerExpiresAt.getTime() <= Date.now()) {
        throw new AppError_1.AppError('Offer expiry must be in the future', 400);
    }
    const updated = await database_1.default.agreement.update({
        where: { id: agreementId },
        data,
        select: prismaSelects_1.agreementDetailSelect,
    });
    return mapAgreementResponse(updated);
}
async function sendAgreement(agreementId, ownerId, offerExpiresAt) {
    await checkOwnerVerification(ownerId);
    const agreement = await database_1.default.agreement.findUnique({ where: { id: agreementId } });
    if (!agreement)
        throw new AppError_1.AppError('Agreement not found', 404);
    if (agreement.ownerId !== ownerId)
        throw new AppError_1.AppError('Forbidden', 403);
    if (agreement.status !== 'draft') {
        throw new AppError_1.AppError('Only draft agreements can be sent', 400);
    }
    const expiresAt = offerExpiresAt ?? agreement.offerExpiresAt;
    if (!expiresAt || expiresAt.getTime() <= Date.now()) {
        throw new AppError_1.AppError('A future offer expiry is required', 400);
    }
    await assertNoBlockingAgreement(agreement.propertyId, agreement.renterId, agreementId);
    const updated = await database_1.default.agreement.update({
        where: { id: agreementId },
        data: {
            status: 'sent',
            sentAt: new Date(),
            offerExpiresAt: expiresAt,
        },
        select: prismaSelects_1.agreementDetailSelect,
    });
    await database_1.default.notification.create({
        data: {
            userId: agreement.renterId,
            type: 'MESSAGE_NEW',
            title: 'New lease offer',
            body: 'You have received a new lease agreement offer.',
        },
    });
    return mapAgreementResponse(updated);
}
async function cancelAgreement(agreementId, actorId, reason) {
    const agreement = await database_1.default.agreement.findUnique({ where: { id: agreementId } });
    if (!agreement)
        throw new AppError_1.AppError('Agreement not found', 404);
    const isOwner = agreement.ownerId === actorId;
    const isRenter = agreement.renterId === actorId;
    if (!isOwner && !isRenter)
        throw new AppError_1.AppError('Forbidden', 403);
    const cancellable = ['draft', 'sent', 'payment_pending'];
    if (!cancellable.includes(agreement.status)) {
        throw new AppError_1.AppError('Agreement cannot be cancelled in its current state', 400);
    }
    if (isOwner && agreement.status === 'draft') {
        await checkOwnerVerification(actorId);
    }
    const updated = await database_1.default.agreement.update({
        where: { id: agreementId },
        data: {
            status: 'cancelled',
            cancelledBy: actorId,
            cancellationReason: reason,
        },
        select: prismaSelects_1.agreementDetailSelect,
    });
    return mapAgreementResponse(updated);
}
async function acceptAgreement(agreementId, renterId) {
    await expireAgreementIfNeeded(agreementId);
    const agreement = await database_1.default.agreement.findUnique({ where: { id: agreementId } });
    if (!agreement)
        throw new AppError_1.AppError('Agreement not found', 404);
    if (agreement.renterId !== renterId)
        throw new AppError_1.AppError('Forbidden', 403);
    if (agreement.status !== 'sent') {
        throw new AppError_1.AppError('Only sent offers can be accepted', 400);
    }
    assertOfferNotExpired(agreement);
    const deposit = (agreement.depositOriginal || {});
    if (deposit.value && deposit.currency) {
        const conversion = await (0, exchangeRate_1.convertDepositToEtb)(deposit.value, deposit.currency);
        const updated = await database_1.default.agreement.update({
            where: { id: agreementId },
            data: {
                status: 'payment_pending',
                renterRespondedAt: new Date(),
                depositAmountEtb: conversion.depositAmountEtb,
                fxRate: conversion.fxRate,
                fxRateAt: conversion.fxRateAt,
            },
            select: prismaSelects_1.agreementDetailSelect,
        });
        await database_1.default.notification.create({
            data: {
                userId: agreement.ownerId,
                type: 'MESSAGE_NEW',
                title: 'Offer accepted',
                body: 'The renter accepted your lease offer. Awaiting security deposit.',
            },
        });
        return mapAgreementResponse(updated);
    }
    throw new AppError_1.AppError('Agreement deposit is not configured', 400);
}
async function rejectAgreement(agreementId, renterId, reason) {
    const agreement = await database_1.default.agreement.findUnique({ where: { id: agreementId } });
    if (!agreement)
        throw new AppError_1.AppError('Agreement not found', 404);
    if (agreement.renterId !== renterId)
        throw new AppError_1.AppError('Forbidden', 403);
    if (agreement.status !== 'sent') {
        throw new AppError_1.AppError('Only sent offers can be rejected', 400);
    }
    const updated = await database_1.default.agreement.update({
        where: { id: agreementId },
        data: {
            status: 'rejected',
            renterRespondedAt: new Date(),
            cancellationReason: reason,
        },
        select: prismaSelects_1.agreementDetailSelect,
    });
    await database_1.default.notification.create({
        data: {
            userId: agreement.ownerId,
            type: 'MESSAGE_NEW',
            title: 'Offer rejected',
            body: reason || 'The renter declined your lease offer.',
        },
    });
    return mapAgreementResponse(updated);
}
async function initiateDeposit(agreementId, renterId) {
    await expireAgreementIfNeeded(agreementId);
    const agreement = await database_1.default.agreement.findUnique({
        where: { id: agreementId },
        include: { renter: true, property: true },
    });
    if (!agreement)
        throw new AppError_1.AppError('Agreement not found', 404);
    if (agreement.renterId !== renterId)
        throw new AppError_1.AppError('Forbidden', 403);
    if (agreement.status !== 'payment_pending') {
        throw new AppError_1.AppError('Deposit payment is only available after accepting the offer', 400);
    }
    assertOfferNotExpired(agreement);
    const amountEtb = agreement.depositAmountEtb;
    if (!amountEtb || amountEtb <= 0) {
        throw new AppError_1.AppError('Deposit amount is not set', 400);
    }
    let payment = await database_1.default.payment.findFirst({
        where: {
            agreementId,
            purpose: 'security_deposit',
            status: { in: ['pending', 'processing'] },
        },
        orderBy: { createdAt: 'desc' },
    });
    const txRef = payment?.chapaTxRef || `agr-${agreementId.slice(0, 8)}-${(0, crypto_1.randomBytes)(6).toString('hex')}`;
    if (!payment) {
        payment = await database_1.default.payment.create({
            data: {
                agreementId,
                purpose: 'security_deposit',
                provider: 'chapa',
                amount: amountEtb,
                amountEtb,
                currency: 'ETB',
                originalAmount: agreement.depositOriginal?.value,
                originalCurrency: agreement.depositOriginal?.currency,
                status: 'pending',
                chapaTxRef: txRef,
                expiresAt: agreement.offerExpiresAt,
            },
        });
    }
    const urls = (0, client_1.buildChapaUrls)(txRef);
    const title = typeof agreement.property.title === 'string'
        ? agreement.property.title
        : agreement.property.title?.en || 'Security deposit';
    if (!agreement.renter.email) {
        throw new AppError_1.AppError('Renter email is required for Chapa checkout', 400);
    }
    const chapa = await (0, client_1.initializeTransaction)({
        amount: amountEtb.toFixed(2),
        currency: 'ETB',
        email: agreement.renter.email,
        first_name: agreement.renter.first_name || 'Renter',
        last_name: agreement.renter.last_name || 'User',
        phone_number: agreement.renter.phone || undefined,
        tx_ref: txRef,
        callback_url: urls.callback_url,
        return_url: urls.return_url,
        customization: {
            title: 'Security deposit',
            description: title,
        },
    });
    await database_1.default.payment.update({
        where: { id: payment.id },
        data: { status: 'processing', chapaTxRef: txRef },
    });
    return {
        checkoutUrl: chapa.checkout_url,
        txRef,
        paymentId: payment.id,
        amountEtb,
    };
}
async function getDepositStatus(agreementId, renterId) {
    const agreement = await database_1.default.agreement.findUnique({ where: { id: agreementId } });
    if (!agreement)
        throw new AppError_1.AppError('Agreement not found', 404);
    if (agreement.renterId !== renterId)
        throw new AppError_1.AppError('Forbidden', 403);
    const payment = await database_1.default.payment.findFirst({
        where: { agreementId, purpose: 'security_deposit' },
        orderBy: { createdAt: 'desc' },
    });
    return {
        agreementStatus: agreement.status,
        ...mapAgreementResponse(agreement),
        payment: payment
            ? {
                id: payment.id,
                status: payment.status,
                chapaTxRef: payment.chapaTxRef,
                amountEtb: payment.amountEtb,
                paidAt: payment.paidAt,
            }
            : null,
    };
}
async function listAgreementPayments(agreementId, requesterId) {
    const agreement = await database_1.default.agreement.findUnique({ where: { id: agreementId } });
    if (!agreement)
        throw new AppError_1.AppError('Agreement not found', 404);
    if (agreement.ownerId !== requesterId && agreement.renterId !== requesterId) {
        throw new AppError_1.AppError('Forbidden', 403);
    }
    return database_1.default.payment.findMany({
        where: { agreementId },
        orderBy: { createdAt: 'desc' },
    });
}
async function terminateAgreement(agreementId, requesterId, reason) {
    const agreement = await database_1.default.agreement.findUnique({ where: { id: agreementId } });
    if (!agreement)
        throw new AppError_1.AppError('Agreement not found', 404);
    if (agreement.ownerId !== requesterId)
        throw new AppError_1.AppError('Forbidden', 403);
    if (agreement.status !== 'completed') {
        throw new AppError_1.AppError('Only completed agreements can be terminated', 400);
    }
    await checkOwnerVerification(requesterId);
    const updated = await database_1.default.agreement.update({
        where: { id: agreementId },
        data: { status: 'terminated' },
        select: prismaSelects_1.agreementDetailSelect,
    });
    await database_1.default.auditLog.create({
        data: {
            actorId: requesterId,
            eventType: 'AGREEMENT_TERMINATED',
            entityType: 'Agreement',
            entityId: agreementId,
            metadata: { reason },
        },
    });
    return mapAgreementResponse(updated);
}
