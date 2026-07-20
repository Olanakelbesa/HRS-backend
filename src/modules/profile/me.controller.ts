import {
  BadRequestException,
  Body,
  Controller,
  Get,
  PayloadTooLargeException,
  Patch,
  Post,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
  UsePipes,
} from '@nestjs/common';
import { FileFieldsInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { ProfileApiService } from './profile.api.service';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  updatePersonalInfoSchema,
  uploadAvatarSchema,
  updateBankDetailsSchema,
  updateNotificationPreferencesSchema,
  updateLanguagePreferenceSchema,
  changePasswordSchema,
  type UpdatePersonalInfoInput,
  type UpdateBankDetailsInput,
  type UpdateNotificationPreferencesInput,
  type UpdateLanguagePreferenceInput,
  type ChangePasswordInput,
} from './schema';
import { preferenceSchema } from '../recommendation/schema';
import type { UploadedFile as AppUploadedFile } from '../../types/request';

const PROFILE_UPLOAD = {
  storage: memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
};

@ApiTags('Me')
@ApiBearerAuth()
@Controller('me')
export class MeController {
  constructor(private readonly profileService: ProfileApiService) {}

  @Get()
  async getProfile(@CurrentUser() user: AuthUser) {
    const data = await this.profileService.getProfile(user.userId);
    return { status: 'success', message: 'Profile loaded', data };
  }

  @Patch()
  @ApiConsumes('multipart/form-data', 'application/json')
  @UseInterceptors(FileInterceptor('image', PROFILE_UPLOAD))
  async updatePersonalInfo(
    @CurrentUser() user: AuthUser,
    @Body() body: UpdatePersonalInfoInput['body'],
    @UploadedFile() file?: AppUploadedFile,
  ) {
    const bodyParsed = updatePersonalInfoSchema.safeParse({ body });
    if (!bodyParsed.success) {
      throw new BadRequestException({
        message: 'Validation failed',
        errors: bodyParsed.error.flatten().fieldErrors,
      });
    }

    if (file) {
      const fileParsed = uploadAvatarSchema.safeParse({
        file: { size: file.size, mimetype: file.mimetype },
      });
      if (!fileParsed.success) {
        throw new BadRequestException({
          message: 'Avatar validation failed',
          errors: fileParsed.error.flatten().fieldErrors,
        });
      }
    }

    const data = await this.profileService.updatePersonalInfo(
      user.userId,
      bodyParsed.data.body,
      file,
    );
    return { status: 'success', message: 'Profile updated successfully', data };
  }

  @Get('documents')
  async getDocuments(@CurrentUser() user: AuthUser) {
    const doc = await this.profileService.getVerificationDoc(user.userId);

    if (!doc) {
      return { status: 'success', message: 'No documents found', data: null };
    }

    const uploadedFiles: { documentType: string; label: string; file: string; url: string }[] =
      [];
    if (doc.frontUrl) {
      uploadedFiles.push({
        documentType: 'NATIONAL_ID_FRONT',
        label: 'National ID - Front',
        file: doc.frontUrl.split('/').pop()!,
        url: doc.frontUrl,
      });
    }
    if (doc.backUrl) {
      uploadedFiles.push({
        documentType: 'NATIONAL_ID_BACK',
        label: 'National ID - Back',
        file: doc.backUrl.split('/').pop()!,
        url: doc.backUrl,
      });
    }
    if (doc.livePhotoUrl) {
      uploadedFiles.push({
        documentType: 'OWNER_PHOTO',
        label: 'Your Photo',
        file: doc.livePhotoUrl.split('/').pop()!,
        url: doc.livePhotoUrl,
      });
    }

    return {
      status: 'success',
      data: {
        id: doc.id,
        overallStatus: doc.status,
        note: doc.note,
        submittedAt: doc.submittedAt,
        reviewedAt: doc.reviewedAt,
        uploadedFiles,
      },
    };
  }

  @Post('documents')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'nationalIdFront', maxCount: 1 },
        { name: 'nationalIdBack', maxCount: 1 },
        { name: 'ownerPhoto', maxCount: 1 },
      ],
      PROFILE_UPLOAD,
    ),
  )
  async uploadDocuments(
    @CurrentUser() user: AuthUser,
    @UploadedFiles()
    files?: {
      nationalIdFront?: AppUploadedFile[];
      nationalIdBack?: AppUploadedFile[];
      ownerPhoto?: AppUploadedFile[];
    },
  ) {
    if (!files || Object.keys(files).length === 0) {
      throw new BadRequestException('No files provided');
    }

    const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    const MAX_SIZE = 5 * 1024 * 1024;
    const fieldToDocType: Record<string, string> = {
      nationalIdFront: 'NATIONAL_ID_FRONT',
      nationalIdBack: 'NATIONAL_ID_BACK',
      ownerPhoto: 'OWNER_PHOTO',
    };

    for (const [fieldName, fileArr] of Object.entries(files)) {
      const file = fileArr?.[0];
      if (!file) continue;
      if (!fieldToDocType[fieldName]) {
        throw new BadRequestException(
          `Unknown field: ${fieldName}. Allowed: nationalIdFront, nationalIdBack, ownerPhoto`,
        );
      }
      if (file.size > MAX_SIZE) {
        throw new PayloadTooLargeException(`File "${fieldName}" exceeds the 5 MB limit`);
      }
      if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        throw new BadRequestException(
          `File "${fieldName}" has an unsupported format. Allowed: pdf, jpg, jpeg, png`,
        );
      }
    }

    for (const [fieldName, fileArr] of Object.entries(files)) {
      const file = fileArr?.[0];
      if (!file) continue;
      await this.profileService.uploadDocument(user.userId, fieldToDocType[fieldName], file);
    }

    const doc = await this.profileService.getVerificationDoc(user.userId);
    const uploadedFiles: { documentType: string; label: string; file: string; url: string }[] =
      [];
    if (doc?.frontUrl) {
      uploadedFiles.push({
        documentType: 'NATIONAL_ID_FRONT',
        label: 'National ID - Front',
        file: doc.frontUrl.split('/').pop()!,
        url: doc.frontUrl,
      });
    }
    if (doc?.backUrl) {
      uploadedFiles.push({
        documentType: 'NATIONAL_ID_BACK',
        label: 'National ID - Back',
        file: doc.backUrl.split('/').pop()!,
        url: doc.backUrl,
      });
    }
    if (doc?.livePhotoUrl) {
      uploadedFiles.push({
        documentType: 'OWNER_PHOTO',
        label: 'Your Photo',
        file: doc.livePhotoUrl.split('/').pop()!,
        url: doc.livePhotoUrl,
      });
    }

    return {
      status: 'success',
      message: 'Documents uploaded successfully',
      data: {
        id: doc!.id,
        overallStatus: doc!.status,
        submittedAt: doc!.submittedAt,
        uploadedFiles,
      },
    };
  }

  @Patch('bank')
  @UsePipes(new ZodValidationPipe(updateBankDetailsSchema, 'body'))
  async updateBankDetails(
    @CurrentUser() user: AuthUser,
    @Body() body: UpdateBankDetailsInput['body'],
  ) {
    const data = await this.profileService.updateBankDetails(user.userId, body);
    return { status: 'success', message: 'Bank details updated successfully', data };
  }

  @Patch('notifications')
  @UsePipes(new ZodValidationPipe(updateNotificationPreferencesSchema, 'body'))
  async updateNotificationPreferences(
    @CurrentUser() user: AuthUser,
    @Body() body: UpdateNotificationPreferencesInput['body'],
  ) {
    const data = await this.profileService.updateNotificationPreferences(user.userId, body);
    return {
      status: 'success',
      message: 'Notification preferences updated successfully',
      data,
    };
  }

  @Patch('language')
  @UsePipes(new ZodValidationPipe(updateLanguagePreferenceSchema, 'body'))
  async updateLanguagePreference(
    @CurrentUser() user: AuthUser,
    @Body() body: UpdateLanguagePreferenceInput['body'],
  ) {
    const data = await this.profileService.updateLanguagePreference(user.userId, body);
    return { status: 'success', message: 'Language preference updated successfully', data };
  }

  @Post('change-password')
  @UsePipes(new ZodValidationPipe(changePasswordSchema, 'body'))
  async changePassword(
    @CurrentUser() user: AuthUser,
    @Body() body: ChangePasswordInput['body'],
  ) {
    await this.profileService.changePassword(user.userId, body);
    return { status: 'success', message: 'Password changed successfully' };
  }

  @Get('preferences')
  async getPreferences(@CurrentUser() user: AuthUser) {
    const data = await this.profileService.getPreferences(user.userId);
    return { status: 'success', message: 'Preferences fetched successfully', data };
  }

  @Post('preferences')
  @UsePipes(new ZodValidationPipe(preferenceSchema, 'body'))
  async savePreferences(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    const data = await this.profileService.savePreferences(user.userId, body);
    return { status: 'success', message: 'Preferences saved successfully', data };
  }

  @Patch('preferences')
  @UsePipes(new ZodValidationPipe(preferenceSchema, 'body'))
  async updatePreferences(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    const data = await this.profileService.updatePreferences(user.userId, body);
    return { status: 'success', message: 'Preferences updated successfully', data };
  }
}
