import prisma from '../../config/database';
import { Prisma } from '@prisma/client';
import { AppError } from '../../core/AppError';

interface ListOptions {
  page: number;
  limit: number;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  lat?: number;
  lng?: number;
  radius?: number;
}

export async function listProperties(opts: ListOptions) {
  const { page, limit, minPrice, maxPrice, search, lat, lng, radius } = opts;

  const where: Prisma.PropertyWhereInput = {};

  // Price filter
  if (minPrice || maxPrice) {
    where.pricePerNight = {};
    if (minPrice) where.pricePerNight.gte = minPrice;
    if (maxPrice) where.pricePerNight.lte = maxPrice;
  }

  // Text search
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { address: { contains: search, mode: 'insensitive' } },
    ];
  }

  // Map filter
  if (lat && lng && radius) {
    const latRange = radius / 111;
    const lngRange = radius / (111 * Math.cos((lat * Math.PI) / 180));

    where.latitude = {
      gte: lat - latRange,
      lte: lat + latRange,
    };

    where.longitude = {
      gte: lng - lngRange,
      lte: lng + lngRange,
    };
  }

  const [list, total] = await Promise.all([
    prisma.property.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: {
        createdAt: 'desc',
      },
    }),
    prisma.property.count({ where }),
  ]);

  return {
    list,
    total,
    page,
    limit,
  };
}

export async function getPropertyById(id: string) {
  const property = await prisma.property.findUnique({
    where: { id },
  });

  if (!property) {
    throw new AppError('Property not found', 404);
  }

  return property;
}