import prisma from '../../config/database';
import { AppError } from '../../core/AppError';
import type { UpdateProfileInput } from './schema';
import bcrypt from 'bcryptjs';
import reviewService from '../review-rate/service';
import { propertyService } from '../properties/service';

function formatDateToIsoDate(value: Date) {
  return value.toISOString().substring(0, 10);
}


export async function getProfile(userId: string) {
  const user = await prisma.user.findUnique({
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

export async function getOwnerProfile(ownerId: string) {
  const owner = await prisma.user.findUnique({
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

  const listingsRaw = await propertyService.getMyProperties(ownerId);
  const listings = listingsRaw.map((property: any) => ({
    id: property.id,
    title: property.title?.en || property.title?.am || '',
    location: property.address?.en || property.address?.am || '',
    price: property.price?.value ?? 0,
    image: Array.isArray(property.images) && property.images.length > 0 ? property.images[0] : '',
  }));

  const reviewStats = await reviewService.getOwnerReviewStats(ownerId);
  const ownerReviews = await reviewService.getOwnerReviews(ownerId, { limit: 10, sort: 'newest' });

  const reviews = ownerReviews.reviews.map((review: any) => ({
    id: review.reviewId,
    reviewerName: review.reviewerName,
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
        average: reviewStats.averageRating,
        reviewCount: reviewStats.totalReviews,
      },
    },
    listings,
    reviews,
  };
}

export async function updateProfile(userId: string, input: UpdateProfileInput) {
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
    return getProfile(userId);
  }

  const user = await prisma.user.update({
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

  return user;
}

export async function changePassword(
  userId: string,
  data: { currentPassword: string; newPassword: string }
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error('User not found');
  }

  if (!user.password) {
    throw new Error('Password is not set for this account');
  }

  const isMatch = await bcrypt.compare(data.currentPassword, user.password);

  if (!isMatch) {
    throw new Error('Current password is incorrect');
  }

  const hashedPassword = await bcrypt.hash(data.newPassword, 10);

  await prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword },
  });

  return { message: 'Password updated successfully' };
}

export async function getAllUsers() {
  const users = await prisma.user.findMany({
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

  return users;
}
export async function updateUserRole(userId: string, role: 'renter' | 'owner' | 'admin') {
  const user = await prisma.user.update({
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

  return user;
}
export async function updateUserStatus(userId: string, isActive: boolean) {
  const user = await prisma.user.update({
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

  return user;
}
