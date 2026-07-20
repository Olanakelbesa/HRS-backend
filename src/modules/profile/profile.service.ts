import { Injectable } from '@nestjs/common';
import { hash, compare } from 'bcryptjs';
import * as path from 'path';
import { PrismaService } from '../../prisma/prisma.service';
import { AppError } from '../../core/AppError';
import { uploadDocumentToCloudinary, uploadAvatarToCloudinary } from '../../lib/cloudinary';
import type {
  UpdatePersonalInfoInput,
  UpdateBankDetailsInput,
  UpdateNotificationPreferencesInput,
  UpdateLanguagePreferenceInput,
  ChangePasswordInput,
} from './schema';
import type { UploadedFile } from '../../types/request';

const DOCUMENT_METADATA: Record<string, { label: string; description: string }> = {
  NATIONAL_ID_FRONT: {
    label: 'National ID - Front',
    description: 'Government-issued photo ID',
  },
  NATIONAL_ID_BACK: {
    label: 'National ID - Back',
    description: 'Back of government-issued ID',
  },
  OWNER_PHOTO: {
    label: 'Your Photo',
    description: 'Proof of you own the ID',
  },
};

function mapDocumentStatus(status: string): string {
  const statusMap: Record<string, string> = {
    pending: 'pending',
    approved: 'verified',
    rejected: 'rejected',
    resubmit: 'resubmit',
    under_review: 'under_review',
  };
  return statusMap[status] || status;
}

@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        verificationDocs: true,
        bankDetail: true,
        notificationPreference: true,
      },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    const doc = user.verificationDocs[0] ?? null;
    const documents = [];

    if (doc) {
      if (doc.frontUrl) {
        documents.push({
          id: `${doc.id}-front`,
          documentType: 'NATIONAL_ID_FRONT',
          label: DOCUMENT_METADATA.NATIONAL_ID_FRONT.label,
          description: DOCUMENT_METADATA.NATIONAL_ID_FRONT.description,
          file: path.basename(doc.frontUrl),
        });
      }
      if (doc.backUrl) {
        documents.push({
          id: `${doc.id}-back`,
          documentType: 'NATIONAL_ID_BACK',
          label: DOCUMENT_METADATA.NATIONAL_ID_BACK.label,
          description: DOCUMENT_METADATA.NATIONAL_ID_BACK.description,
          file: path.basename(doc.backUrl),
        });
      }
      if (doc.livePhotoUrl) {
        documents.push({
          id: `${doc.id}-photo`,
          documentType: 'OWNER_PHOTO',
          label: DOCUMENT_METADATA.OWNER_PHOTO.label,
          description: DOCUMENT_METADATA.OWNER_PHOTO.description,
          file: path.basename(doc.livePhotoUrl),
        });
      }
    }

    const verification = doc
      ? {
          status: mapDocumentStatus(doc.status),
          submittedAt: doc.submittedAt.toISOString(),
          documents,
        }
      : null;

    const baseProfile = {
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      phone: user.phone,
      location: user.location || '',
      bio: user.bio || '',
      image: user.image,
      role: user.role,
      status: user.status,
      preferredLanguage: user.preferredLanguage,
      verificationState: user.verificationState,
      isVerified: user.isVerified,
      emailVerified: user.emailVerified,
      notificationPreferences: user.notificationPreference || {
        appointments: true,
        agreements: true,
        payments: true,
        reviews: false,
        reports: true,
        system: false,
      },
      language: user.preferredLanguage || 'en',
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };

    if (user.role === 'owner') {
      return {
        ...baseProfile,
        verification,
        bankDetails: user.bankDetail
          ? {
              name: user.bankDetail.bankName,
              accountNumber: user.bankDetail.accountNumber,
              accountHolder: user.bankDetail.holderName,
            }
          : null,
      };
    }

    return baseProfile;
  }

  async updatePersonalInfo(
    userId: string,
    data: UpdatePersonalInfoInput['body'],
    file?: UploadedFile,
  ) {
    const fullName = data.fullName || '';
    const nameParts = fullName.trim().split(/\s+/);
    const firstName = nameParts[0] || null;
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : null;

    let imageUrl: string | undefined;
    if (file) {
      imageUrl = await uploadAvatarToCloudinary(file, userId);
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        first_name: firstName,
        last_name: lastName,
        phone: data.phone,
        location: data.location,
        bio: data.bio,
        ...(imageUrl && { image: imageUrl }),
      },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        phone: true,
        location: true,
        bio: true,
        image: true,
      },
    });

    return {
      id: user.id,
      fullName: `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim(),
      email: user.email,
      phone: user.phone,
      location: user.location,
      bio: user.bio,
      image: user.image,
    };
  }

  async uploadDocument(userId: string, documentType: string, file: UploadedFile) {
    const fileUrl = await uploadDocumentToCloudinary(file, userId, documentType);

    const urlField: Record<string, string> = {
      NATIONAL_ID_FRONT: 'frontUrl',
      NATIONAL_ID_BACK: 'backUrl',
      OWNER_PHOTO: 'livePhotoUrl',
    };

    const field = urlField[documentType];
    if (!field) throw new AppError(`Invalid documentType: ${documentType}`, 400);

    return this.prisma.verificationDocument.upsert({
      where: { userId },
      create: { userId, [field]: fileUrl, status: 'pending', submittedAt: new Date() },
      update: { [field]: fileUrl, status: 'pending', submittedAt: new Date() },
    });
  }

  async getVerificationDoc(userId: string) {
    return this.prisma.verificationDocument.findUnique({ where: { userId } });
  }

  async updateBankDetails(userId: string, data: UpdateBankDetailsInput['body']) {
    const bankDetail = await this.prisma.bankDetail.upsert({
      where: { userId },
      create: {
        userId,
        bankName: data.bankName,
        accountNumber: data.accountNumber,
        holderName: data.holderName,
        branch: data.branch || null,
      },
      update: {
        bankName: data.bankName,
        accountNumber: data.accountNumber,
        holderName: data.holderName,
        branch: data.branch || null,
      },
    });

    return {
      id: bankDetail.id,
      name: bankDetail.bankName,
      accountNumber: bankDetail.accountNumber,
      accountHolder: bankDetail.holderName,
      branch: bankDetail.branch,
    };
  }

  async updateNotificationPreferences(
    userId: string,
    data: UpdateNotificationPreferencesInput['body'],
  ) {
    const preferences = await this.prisma.notificationPreference.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });

    return {
      appointments: preferences.appointments,
      agreements: preferences.agreements,
      payments: preferences.payments,
      reviews: preferences.reviews,
      reports: preferences.reports,
      system: preferences.system,
    };
  }

  async updateLanguagePreference(
    userId: string,
    data: UpdateLanguagePreferenceInput['body'],
  ) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { preferredLanguage: data.language },
    });

    return { language: data.language };
  }

  async changePassword(userId: string, data: ChangePasswordInput['body']) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { password: true },
    });

    if (!user || !user.password) {
      throw new AppError('User not found or password not set', 400);
    }

    const isPasswordValid = await compare(data.currentPassword, user.password);
    if (!isPasswordValid) {
      throw new AppError('Current password is incorrect', 400);
    }

    const hashedPassword = await hash(data.newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });
  }

  async getPreferences(userId: string) {
    const pref = await this.prisma.userPreference.findUnique({ where: { userId } });
    if (!pref) return null;
    return {
      budget: {
        min: pref.preferredPriceMin,
        max: pref.preferredPriceMax,
        currency: pref.preferredCurrency || 'ETB',
      },
      bedrooms: pref.preferredBedrooms,
      preferredLocations: pref.preferredLocations || [],
      preferredType: pref.preferredType ?? null,
      amenities: pref.preferredAmenities || [],
      furnishStatus: pref.furnishStatus ?? null,
      updatedAt: pref.updatedAt,
    };
  }

  async savePreferences(userId: string, data: any) {
    const dbData: any = {};
    if (data.budget) {
      if (data.budget.min !== undefined) dbData.preferredPriceMin = data.budget.min;
      if (data.budget.max !== undefined) dbData.preferredPriceMax = data.budget.max;
      if (data.budget.currency !== undefined) dbData.preferredCurrency = data.budget.currency;
    }
    if (data.bedrooms !== undefined) dbData.preferredBedrooms = data.bedrooms;
    if (data.preferredLocations !== undefined) dbData.preferredLocations = data.preferredLocations;
    if (data.preferredType !== undefined) dbData.preferredType = data.preferredType;
    if (data.amenities !== undefined) dbData.preferredAmenities = data.amenities;
    if (data.furnishStatus !== undefined) dbData.furnishStatus = data.furnishStatus;

    const pref = await this.prisma.userPreference.upsert({
      where: { userId },
      create: { userId, ...dbData },
      update: dbData,
    });
    return this.getPreferences(userId);
  }

  async updatePreferences(userId: string, data: any) {
    return this.savePreferences(userId, data);
  }
}
