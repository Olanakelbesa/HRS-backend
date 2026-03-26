import prisma from '../../config/database';
import { CreatePropertyInput, GetPropertiesQueryInput, UpdatePropertyInput } from './schema';
import { PropertyStatus } from '@prisma/client';
export const propertyService = {
  async createProperty(ownerId: string, data: CreatePropertyInput) {
    return await prisma.property.create({
      data: {
        owner: {
          connect: { id: ownerId },
        },
        // 🔥 Use foreign key directly (simpler & safer)

        type: data.type,
        title: data.title,
        description: data.description,
        location: data.location,
        address: data.address ?? null,
        price: data.price,
        bedrooms: data.bedrooms ?? null,
        bathrooms: data.bathrooms ?? null,
        area: data.area ?? null,
        amenities: data.amenities ?? {},
        furnishingType: data.furnishingType ?? null,
        images: data.images,
        videos: data.videos ?? [],
        rentTerms: data.rentTerms ?? null,
      },
    });
  },

  async getProperties(query: GetPropertiesQueryInput) {
    const { page, limit, status, type, minPrice, maxPrice, bedrooms, bathrooms, sortBy, order } =
      query;

    const skip = (page - 1) * limit;

    const where: any = {
      isDeleted: false,
    };

    if (status) where.status = status;
    if (type) where.type = type;

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) where.price.gte = minPrice;
      if (maxPrice !== undefined) where.price.lte = maxPrice;
    }

    if (bedrooms !== undefined) where.bedrooms = bedrooms;
    if (bathrooms !== undefined) where.bathrooms = bathrooms;

    const [properties, total] = await Promise.all([
      prisma.property.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          [sortBy]: order,
        },
        include: {
          owner: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              email: true,
            },
          },
        },
      }),
      prisma.property.count({ where }),
    ]);

    return {
      properties,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async getPropertyById(propertyId: string) {
    return await prisma.property.findFirst({
      where: {
        id: propertyId,
        isDeleted: false,
      },
      include: {
        owner: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
          },
        },
      },
    });
  },

  async updateProperty(ownerId: string, propertyId: string, data: UpdatePropertyInput) {
    const existing = await prisma.property.findFirst({
      where: { id: propertyId, isDeleted: false },
    });

    if (!existing) return null;
    if (existing.ownerId !== ownerId) return 'UNAUTHORIZED';

    return await prisma.property.update({
      where: { id: propertyId },
      data,
    });
  },

  async softDeleteProperty(ownerId: string, propertyId: string) {
    const existing = await prisma.property.findFirst({
      where: { id: propertyId, isDeleted: false },
    });

    if (!existing) return null;
    if (existing.ownerId !== ownerId) return 'UNAUTHORIZED';

    return await prisma.property.update({
      where: { id: propertyId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });
  },

  async getMyProperties(ownerId: string) {
    return await prisma.property.findMany({
      where: {
        ownerId,
        isDeleted: false,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  },

  async updatePropertyStatus(ownerId: string, propertyId: string, status: PropertyStatus) {
    const existing = await prisma.property.findFirst({
      where: { id: propertyId, isDeleted: false },
    });

    if (!existing) return null;
    if (existing.ownerId !== ownerId) return 'UNAUTHORIZED';

    return await prisma.property.update({
      where: { id: propertyId },
      data: { status },
    });
  },
};
