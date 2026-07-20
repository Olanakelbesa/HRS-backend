import { Injectable } from '@nestjs/common';
import { uploadToCloudinary, deleteFromCloudinary } from '../../utils/uploadToCloudinary';
import {
  uploadAvatarToCloudinary,
  uploadDocumentToCloudinary,
  deleteFromCloudinary as deleteByPublicId,
} from '../../lib/cloudinary';
import type { UploadedFile } from '../../types/request';

@Injectable()
export class StorageService {
  uploadBuffer(buffer: Buffer, folder: string, resourceType: 'image' | 'video' = 'image') {
    return uploadToCloudinary(buffer, folder, resourceType);
  }

  deleteByUrl(url: string, resourceType: 'image' | 'video' = 'image') {
    return deleteFromCloudinary(url, resourceType);
  }

  uploadAvatar(file: UploadedFile, userId: string) {
    return uploadAvatarToCloudinary(file, userId);
  }

  uploadDocument(file: UploadedFile, userId: string, docType: string) {
    return uploadDocumentToCloudinary(file, userId, docType);
  }

  deleteByPublicId(publicId: string) {
    return deleteByPublicId(publicId);
  }
}
