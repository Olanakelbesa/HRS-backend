"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.agreementDetailSelect = exports.agreementListSelect = exports.agreementCoreSelect = void 0;
/** Explicit field list — avoids stale Prisma client selecting removed columns after migrations. */
exports.agreementCoreSelect = {
    id: true,
    propertyId: true,
    renterId: true,
    ownerId: true,
    appointmentId: true,
    monthlyRent: true,
    currency: true,
    startDate: true,
    endDate: true,
    termsSnapshot: true,
    depositOriginal: true,
    depositAmountEtb: true,
    fxRate: true,
    fxRateAt: true,
    status: true,
    ownerMessage: true,
    sentAt: true,
    renterRespondedAt: true,
    offerExpiresAt: true,
    activatedAt: true,
    cancelledBy: true,
    cancellationReason: true,
    createdAt: true,
    updatedAt: true,
};
const propertySummarySelect = {
    id: true,
    title: true,
    address: true,
    images: true,
    status: true,
};
const renterSummarySelect = {
    id: true,
    first_name: true,
    last_name: true,
    email: true,
    phone: true,
};
const ownerSummarySelect = {
    id: true,
    first_name: true,
    last_name: true,
    email: true,
    phone: true,
};
exports.agreementListSelect = {
    ...exports.agreementCoreSelect,
    property: { select: propertySummarySelect },
    renter: { select: renterSummarySelect },
};
exports.agreementDetailSelect = {
    ...exports.agreementCoreSelect,
    property: { select: propertySummarySelect },
    renter: { select: renterSummarySelect },
    owner: { select: ownerSummarySelect },
    payments: { orderBy: { createdAt: 'desc' } },
};
