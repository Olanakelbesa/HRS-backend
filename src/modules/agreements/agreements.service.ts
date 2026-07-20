import { Injectable } from '@nestjs/common';
import * as agreementService from './service';
import type {
  CreateOwnerAgreementInput,
  ListAgreementsQuery,
  ListOwnerAgreementsQuery,
} from './schema';

@Injectable()
export class AgreementsService {
  listOwnerAgreements(ownerId: string, query: ListOwnerAgreementsQuery) {
    return agreementService.listOwnerAgreements(ownerId, query);
  }

  listRenterAgreements(renterId: string, query: ListAgreementsQuery) {
    return agreementService.listRenterAgreements(renterId, query);
  }

  exportOwnerAgreements(ownerId: string, query: unknown) {
    return agreementService.exportOwnerAgreements(ownerId, query);
  }

  getAgreementDetail(agreementId: string, requesterId?: string) {
    return agreementService.getAgreementDetail(agreementId, requesterId);
  }

  createOwnerAgreement(ownerId: string, input: CreateOwnerAgreementInput) {
    return agreementService.createOwnerAgreement(ownerId, input);
  }

  updateDraftAgreement(
    agreementId: string,
    ownerId: string,
    input: Parameters<typeof agreementService.updateDraftAgreement>[2],
  ) {
    return agreementService.updateDraftAgreement(agreementId, ownerId, input);
  }

  sendAgreement(agreementId: string, ownerId: string, offerExpiresAt?: Date) {
    return agreementService.sendAgreement(agreementId, ownerId, offerExpiresAt);
  }

  cancelAgreement(agreementId: string, userId: string, reason?: string) {
    return agreementService.cancelAgreement(agreementId, userId, reason);
  }

  acceptAgreement(agreementId: string, renterId: string) {
    return agreementService.acceptAgreement(agreementId, renterId);
  }

  rejectAgreement(agreementId: string, renterId: string, reason?: string) {
    return agreementService.rejectAgreement(agreementId, renterId, reason);
  }

  initiateDeposit(agreementId: string, renterId: string) {
    return agreementService.initiateDeposit(agreementId, renterId);
  }

  getDepositStatus(agreementId: string, renterId: string) {
    return agreementService.getDepositStatus(agreementId, renterId);
  }

  listAgreementPayments(agreementId: string, requesterId: string) {
    return agreementService.listAgreementPayments(agreementId, requesterId);
  }

  terminateAgreement(agreementId: string, ownerId: string, reason?: string) {
    return agreementService.terminateAgreement(agreementId, ownerId, reason);
  }
}
