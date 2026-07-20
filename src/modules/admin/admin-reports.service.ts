import { Injectable } from '@nestjs/common';
import * as adminService from './service';

@Injectable()
export class AdminReportsService {
  getReports(query: { page: number; limit: number; search?: string }) {
    return adminService.getReports(query);
  }

  getReportById(id: string) {
    return adminService.getReportById(id);
  }

  updateReportStatus(adminId: string, id: string, status: string) {
    return adminService.updateReportStatus(adminId, id, status);
  }

  getReportRiskAssessment(id: string) {
    return adminService.getReportRiskAssessment(id);
  }
}
