import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { uploadToCloudinary } from '../../utils/uploadToCloudinary';
import * as reportsService from './service';
import type {
  GetOwnerReportsQueryInput,
  SubmitOwnerResponseInput,
  SubmitReportInput,
} from './schema';

@Injectable()
export class ReportsApiService {
  getReportsAgainstOwner(ownerId: string, query: GetOwnerReportsQueryInput) {
    return reportsService.getReportsAgainstOwner(ownerId, query);
  }

  async getOwnerReportById(ownerId: string, reportId: string) {
    const report = await reportsService.getOwnerReportById(ownerId, reportId);
    if (!report) {
      throw new NotFoundException('Report not found');
    }
    return report;
  }

  async createReport(
    userId: string,
    body: SubmitReportInput,
    files?: Express.Multer.File[],
  ) {
    const uploadedImageUrls = await Promise.all(
      (files || []).map(async (file, index) => {
        if (!file?.buffer) {
          console.error(`[submitReport] Image ${index} missing buffer`);
          return null;
        }
        return uploadToCloudinary(file.buffer, 'reports/images', 'image');
      }),
    ).then((results) => results.filter((url): url is string => url !== null));

    return reportsService.createReport(userId, {
      ...body,
      images: uploadedImageUrls.length > 0 ? uploadedImageUrls : body.images || [],
    });
  }

  async submitOwnerResponse(
    ownerId: string,
    reportId: string,
    response: SubmitOwnerResponseInput['response'],
  ) {
    const result = await reportsService.submitOwnerResponse(ownerId, reportId, response);

    if ('error' in result) {
      if (result.error === 'not_found') {
        throw new NotFoundException('Report not found');
      }
      if (result.error === 'already_closed') {
        throw new BadRequestException(
          'Cannot respond to a report that is already resolved or dismissed',
        );
      }
    }

    return (result as { data: unknown }).data;
  }
}
