import { Injectable } from '@nestjs/common';
import * as adminService from './service';
import type {
  AdminUpdatePropertyBodyInput,
  ApprovePropertyInput,
  GetAdminPropertiesQueryInput,
  RejectPropertyInput,
} from './schema';

@Injectable()
export class AdminPropertiesService {
  getProperties(query: GetAdminPropertiesQueryInput) {
    return adminService.getProperties(query);
  }

  getPropertyById(id: string) {
    return adminService.getPropertyById(id);
  }

  overrideUpdate(adminId: string, id: string, body: AdminUpdatePropertyBodyInput) {
    return adminService.adminOverrideUpdateProperty(adminId, id, body);
  }

  approve(adminId: string, propertyId: string, payload: ApprovePropertyInput) {
    return adminService.approveProperty(adminId, propertyId, payload);
  }

  reject(adminId: string, propertyId: string, payload: RejectPropertyInput) {
    return adminService.rejectProperty(adminId, propertyId, payload);
  }
}
