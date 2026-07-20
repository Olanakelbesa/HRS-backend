import { Injectable } from '@nestjs/common';
import * as adminService from './service';

@Injectable()
export class AdminReviewsService {
  getReviews(query: { page: number; limit: number; search?: string }) {
    return adminService.getReviews(query);
  }

  updateReviewStatus(adminId: string, id: string, status: string) {
    return adminService.updateReviewStatus(adminId, id, status);
  }

  deleteReview(adminId: string, id: string) {
    return adminService.deleteReview(adminId, id);
  }
}
