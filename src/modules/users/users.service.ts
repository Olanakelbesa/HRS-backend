import { Injectable } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { AppError } from '../../core/AppError';
import type { UpdateProfileInput } from './schema';

function formatDateToIsoDate(value: Date) {
  return value.toISOString().substring(0, 10);
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        phone: true,
        image: true,
        location: true,
        bio: true,
        role: true,
        preferredLanguage: true,
        emailVerified: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!user) throw new AppError('User not found', 404);
    return user;
  }

  async getOwnerProfile(ownerId: string) {
    const owner = await this.prisma.user.findUnique({
      where: { id: ownerId },
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        phone: true,
        image: true,
        location: true,
        bio: true,
        role: true,
        isVerified: true,
        verificationState: true,
        preferredLanguage: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!owner || owner.role !== 'owner') {
      throw new AppError('Owner not found', 404);
    }

    const properties = await this.prisma.property.findMany({
      where: { ownerId },
    });

    const listings = properties.map((property: any) => ({
      id: property.id,
      title: (property.title as { en?: string })?.en || '',
      location: (property.address as { en?: string })?.en || '',
      price: (property.price as { value?: number })?.value ?? 0,
      image: Array.isArray(property.images) && property.images.length > 0 ? property.images[0] : '',
    }));

    const reviewsRaw = await this.prisma.review.findMany({
      where: { property: { ownerId } },
      include: {
        reviewer: { select: { first_name: true, last_name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const aggregate = await this.prisma.review.aggregate({
      where: { property: { ownerId } },
      _avg: { rating: true },
      _count: { rating: true },
    });

    const reviews = reviewsRaw.map((review: any) => ({
      id: review.id,
      reviewerName: `${review.reviewer?.first_name ?? ''} ${review.reviewer?.last_name ?? ''}`.trim() || 'Anonymous',
      date: formatDateToIsoDate(new Date(review.createdAt)),
      rating: review.rating,
      comment: review.comment,
    }));

    return {
      owner: {
        id: owner.id,
        name: `${owner.first_name ?? ''} ${owner.last_name ?? ''}`.trim(),
        avatar: owner.image || '',
        role: owner.role?.toUpperCase() || 'OWNER',
        location: owner.location || '',
        joinedDate: formatDateToIsoDate(owner.createdAt),
        verification: {
          idVerified: owner.verificationState === 'verified',
          phoneVerified: Boolean(owner.phone),
        },
        propertiesManaged: listings.length,
        rating: {
          average: aggregate._avg?.rating || 0,
          reviewCount: aggregate._count?.rating || 0,
        },
      },
      listings,
      reviews,
    };
  }

  async updateProfile(userId: string, input: UpdateProfileInput) {
    const data: Record<string, unknown> = {};

    if (input.first_name !== undefined) data.first_name = input.first_name;
    if (input.last_name !== undefined) data.last_name = input.last_name;

    if ((input.first_name === undefined || input.last_name === undefined) && input.name !== undefined) {
      const parts = input.name.trim().split(/\s+/);
      if (parts.length > 0) {
        data.first_name = parts[0];
        if (parts.length > 1) {
          data.last_name = parts.slice(1).join(' ');
        }
      }
    }

    if (input.phone !== undefined) data.phone = input.phone;
    if (input.location !== undefined) data.location = input.location;
    if (input.bio !== undefined) data.bio = input.bio;
    if (input.image !== undefined) data.image = input.image;

    if (Object.keys(data).length === 0) {
      return this.getProfile(userId);
    }

    return this.prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        phone: true,
        image: true,
        location: true,
        bio: true,
        role: true,
        preferredLanguage: true,
        emailVerified: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async changePassword(
    userId: string,
    data: { currentPassword: string; newPassword: string },
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (!user.password) {
      throw new AppError('Password is not set for this account', 400);
    }

    const isMatch = await bcrypt.compare(data.currentPassword, user.password);

    if (!isMatch) {
      throw new AppError('Current password is incorrect', 400);
    }

    const hashedPassword = await bcrypt.hash(data.newPassword, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return { message: 'Password updated successfully' };
  }

  async getAllUsers() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        role: true,
        isVerified: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async updateUserRole(userId: string, role: 'renter' | 'owner' | 'admin') {
    return this.prisma.user.update({
      where: { id: userId },
      data: { role },
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        role: true,
        isVerified: true,
      },
    });
  }

  async updateUserStatus(userId: string, isActive: boolean) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { isVerified: isActive },
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        role: true,
        isVerified: true,
      },
    });
  }
}
