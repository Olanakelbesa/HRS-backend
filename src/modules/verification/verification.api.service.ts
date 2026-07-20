import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { verificationService } from './service';
import type { UpdateVerificationStatusInput } from './schema';
import { uploadToCloudinary } from '../../utils/uploadToCloudinary';

@Injectable()
export class VerificationApiService {
  async uploadDocuments(
    userId: string,
    files: {
      front?: Express.Multer.File[];
      back?: Express.Multer.File[];
      livePhoto?: Express.Multer.File[];
    },
  ) {
    if (!files?.front?.[0] || !files?.back?.[0] || !files?.livePhoto?.[0]) {
      throw new BadRequestException(
        'All three documents are required: front, back, and live photo',
      );
    }

    const [frontUrl, backUrl, livePhotoUrl] = await Promise.all([
      uploadToCloudinary(files.front[0].buffer, 'verification/documents', 'image'),
      uploadToCloudinary(files.back[0].buffer, 'verification/documents', 'image'),
      uploadToCloudinary(files.livePhoto[0].buffer, 'verification/photos', 'image'),
    ]);

    return verificationService.uploadVerificationDocuments(userId, {
      frontUrl,
      backUrl,
      livePhotoUrl,
    });
  }

  async getDocuments(userId: string, requestingUserId: string, userRole: string) {
    const doc = await verificationService.getVerificationDocuments(
      userId,
      requestingUserId,
      userRole,
    );
    if (!doc) throw new NotFoundException('Verification documents not found');
    return doc;
  }

  getMyStatus(userId: string) {
    return verificationService.getMyVerificationStatus(userId);
  }

  updateStatus(adminId: string, userId: string, body: UpdateVerificationStatusInput) {
    return verificationService.updateVerificationStatus(adminId, userId, body);
  }

  getPending(adminId: string) {
    return verificationService.getPendingVerifications(adminId);
  }
}
