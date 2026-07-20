import { Injectable } from '@nestjs/common';
import * as adminService from './service';
import type {
  GetAnalyticsQueryInput,
  GetAuditLogsQueryInput,
  GetOverviewQueryInput,
} from './schema';

@Injectable()
export class AdminAnalyticsService {
  getPlatformAnalytics(range?: GetAnalyticsQueryInput['range']) {
    return adminService.getPlatformAnalytics(range);
  }

  getOverview(query: GetOverviewQueryInput) {
    return adminService.getAdminOverview(query);
  }

  getAuditLogs(query: GetAuditLogsQueryInput) {
    return adminService.getAuditLogs(query);
  }
}
