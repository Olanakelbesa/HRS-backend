import { Injectable } from '@nestjs/common';
import * as profileService from './service';
import type {
  UpdatePersonalInfoInput,
  UpdateBankDetailsInput,
  UpdateNotificationPreferencesInput,
  UpdateLanguagePreferenceInput,
  ChangePasswordInput,
} from './schema';
import type { UploadedFile } from '../../types/request';
import recommendationService from '../recommendation/service';

@Injectable()
export class ProfileApiService {
  getProfile(userId: string) {
    return profileService.getProfile(userId);
  }

  updatePersonalInfo(
    userId: string,
    data: UpdatePersonalInfoInput['body'],
    file?: UploadedFile,
  ) {
    return profileService.updatePersonalInfo(userId, data, file);
  }

  uploadDocument(userId: string, documentType: string, file: UploadedFile) {
    return profileService.uploadDocument(userId, documentType, file);
  }

  getVerificationDoc(userId: string) {
    return profileService.getVerificationDoc(userId);
  }

  updateBankDetails(userId: string, data: UpdateBankDetailsInput['body']) {
    return profileService.updateBankDetails(userId, data);
  }

  updateNotificationPreferences(
    userId: string,
    data: UpdateNotificationPreferencesInput['body'],
  ) {
    return profileService.updateNotificationPreferences(userId, data);
  }

  updateLanguagePreference(userId: string, data: UpdateLanguagePreferenceInput['body']) {
    return profileService.updateLanguagePreference(userId, data);
  }

  changePassword(userId: string, data: ChangePasswordInput['body']) {
    return profileService.changePassword(userId, data);
  }

  getPreferences(userId: string) {
    return recommendationService.getPreferences(userId);
  }

  savePreferences(userId: string, data: unknown) {
    return recommendationService.savePreferences(userId, data as any);
  }

  updatePreferences(userId: string, data: unknown) {
    return recommendationService.updatePreferences(userId, data as any);
  }
}
