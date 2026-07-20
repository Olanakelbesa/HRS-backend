import { Injectable } from '@nestjs/common';
import * as adminService from './service';

@Injectable()
export class AdminAgreementsService {
  getAgreements(query: { page: number; limit: number; search?: string }) {
    return adminService.getAgreements(query);
  }

  getAgreementById(id: string) {
    return adminService.getAgreementById(id);
  }

  createAgreement(adminId: string, data: unknown) {
    return adminService.createAgreement(adminId, data);
  }

  updateAgreementStatus(adminId: string, id: string, status: string) {
    return adminService.updateAgreementStatus(adminId, id, status);
  }

  getAgreementRiskAssessment(id: string) {
    return adminService.getAgreementRiskAssessment(id);
  }

  getAgreementPaymentSummary(id: string) {
    return adminService.getAgreementPaymentSummary(id);
  }

  listAgreementPayments(agreementId: string) {
    return adminService.listAgreementPaymentsAdmin(agreementId);
  }

  getPaymentProof(paymentId: string) {
    return adminService.getPaymentProofAdmin(paymentId);
  }
}
