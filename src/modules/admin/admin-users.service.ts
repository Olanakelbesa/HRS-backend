import { Injectable } from '@nestjs/common';
import * as adminService from './service';
import type {
  GetUsersQueryInput,
  CreateAdminUserInput,
  GetPendingVerificationsQueryInput,
} from './schema';

@Injectable()
export class AdminUsersService {
  createUser(adminId: string, input: CreateAdminUserInput) {
    return adminService.createUser(adminId, input);
  }

  getUsers(query: GetUsersQueryInput) {
    return adminService.getUsers(query);
  }

  getUserById(id: string) {
    return adminService.getUserById(id);
  }

  getUserDocuments(userId: string) {
    return adminService.getUserDocuments(userId);
  }

  updateUserStatus(adminId: string, id: string, status: string) {
    return adminService.updateUserStatus(adminId, id, status);
  }

  updateUserVerificationState(
    adminId: string,
    id: string,
    verificationState: string,
    comment?: string,
  ) {
    return adminService.updateUserVerificationState(
      adminId,
      id,
      verificationState,
      comment,
    );
  }

  getPendingVerifications(query: GetPendingVerificationsQueryInput) {
    return adminService.getPendingVerifications(query);
  }

  resolveVerification(
    adminId: string,
    id: string,
    status: 'approved' | 'rejected' | 'resubmit' | 'pending' | 'under_review',
    note?: string,
  ) {
    return adminService.resolveVerification(adminId, id, status, note);
  }
}
