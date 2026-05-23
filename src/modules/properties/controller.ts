import { Request, Response } from 'express';
import { propertyService } from './service';
import { CreatePropertyInput } from './schema';
import { GetPropertiesQueryInput, GetNearbyPropertiesQueryInput, GetSimilarPropertiesQueryInput } from './schema';
import { UpdatePropertyInput } from './schema';
import { UpdatePropertyStatusInput } from './schema';
import { AddPropertyTranslationInput } from './schema';
import { UpdatePropertyTranslationInput } from './schema';
import { uploadToCloudinary } from '../../utils/uploadToCloudinary';
import { getClientIp } from '../../utils/getClientIp';
const resolveLanguage = (req: Request): 'en' | 'am' => {
  const queryLang = typeof req.query.lang === 'string' ? req.query.lang.toLowerCase() : undefined;
  if (queryLang === 'en' || queryLang === 'am') return queryLang;

  const header = req.headers['accept-language'];
  const raw = Array.isArray(header) ? header[0] : header;
  const normalized = raw?.split(',')[0]?.split('-')[0]?.toLowerCase();
  return normalized === 'am' ? 'am' : 'en';
};

// export async function list(req: Request, res: Response) {
//   const page = Number(req.query.page) || 1;
//   const limit = Number(req.query.limit) || 20;
//   const result = await propertyService.listProperties({ page, limit });
//   return res.status(200).json({ status: 'success', data: result });
// }

// export async function getById(req: Request, res: Response) {
//   const property = await propertyService.getPropertyById(String(req.params.id));
//   return res.status(200).json({ status: 'success', data: { property } });
// }

/**
 * Create Property Controller
 * POST /api/properties
 */


export const createPropertyController = async (req: Request, res: Response) => {
  try {
    const ownerId = (req as any).userId;

    if (!ownerId) {
      return res.status(401).json({
        message: 'Unauthorized. Please login.',
      });
    }

    const body = req.body as CreatePropertyInput;

    /**
     * 📦 Files from multer
     */
    const files = req.files as {
      images?: Express.Multer.File[];
      videos?: Express.Multer.File[];
    };

    console.log('[createProperty] Files received:', {
      imagesCount: files?.images?.length || 0,
      videosCount: files?.videos?.length || 0,
      hasBuffer: files?.images?.[0]?.buffer ? true : false,
    });

    /**
     * ☁️ Upload images → Cloudinary
     */
    const imageUrls = await Promise.all(
      (files?.images || []).map((file, index) => {
        if (!file.buffer) {
          console.error(`[createProperty] Image ${index} missing buffer`);
          return null;
        }
        return uploadToCloudinary(file.buffer, 'properties/images', 'image');
      })
    ).then(results => results.filter((url): url is string => url !== null));

    /**
     * 🎥 Upload videos → Cloudinary
     */
    const videoUrls = await Promise.all(
      (files?.videos || []).map((file, index) => {
        if (!file.buffer) {
          console.error(`[createProperty] Video ${index} missing buffer`);
          return null;
        }
        return uploadToCloudinary(file.buffer, 'properties/videos', 'video');
      })
    ).then(results => results.filter((url): url is string => url !== null));

    console.log('[createProperty] Uploaded URLs:', { imageUrls, videoUrls });

    /**
     * 💾 Save ONLY URLs in DB
     */
    const property = await propertyService.createProperty(ownerId, {
      ...body,
      images: imageUrls.length > 0 ? imageUrls : body.images || [],
      videos: videoUrls.length > 0 ? videoUrls : body.videos || [],
    });

    return res.status(201).json({
      message: 'Property created successfully',
      data: property,
    });
  } catch (error: any) {
    console.error('Create property error:', error);

    return res.status(500).json({
      message: 'Internal server error',
      error: error.message,
    });
  }
};
/**
 * GET /api/properties
 */
export const getPropertiesController = async (req: Request, res: Response) => {
  try {
    const query = req.query as unknown as GetPropertiesQueryInput;
    const language = resolveLanguage(req);

    const result = await propertyService.getProperties(query, language);

    return res.status(200).json({
      message: 'Properties fetched successfully',
      data: result.properties,
      meta: result.meta,
    });
  } catch (error: any) {
    console.error('Get properties error:', error);

    return res.status(500).json({
      message: 'Internal server error',
      error: error.message,
    });
  }
};

export const getNearbyPropertiesController = async (req: Request, res: Response) => {
  try {
    const query = req.query as unknown as GetNearbyPropertiesQueryInput;
    const language = resolveLanguage(req);
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 12;
    const radius = Number(query.radius) || 10;
    const status = query.status;
    const category = query.category;

    const result = await propertyService.getNearbyProperties(
      query.lat,
      query.lng,
      radius,
      page,
      limit,
      status,
      category
    );

    return res.status(200).json({
      message: 'Nearby properties fetched successfully',
      data: result.properties,
      meta: result.meta,
    });
  } catch (error: any) {
    console.error('Get nearby properties error:', error);

    return res.status(500).json({
      message: 'Internal server error',
      error: error.message,
    });
  }
};

export const getSimilarPropertiesController = async (req: Request, res: Response) => {
  try {
    const query = req.query as unknown as GetSimilarPropertiesQueryInput;
    const propertyId = req.params.propertyId as string;
    const limit = Number(query.limit) || 12;

    const similarProperties = await propertyService.getSimilarProperties(propertyId, limit);

    if (similarProperties === null) {
      return res.status(404).json({ message: 'Property not found' });
    }

    return res.status(200).json({
      message: 'Similar properties fetched successfully',
      data: similarProperties,
    });
  } catch (error: any) {
    console.error('Get similar properties error:', error);

    return res.status(500).json({
      message: 'Internal server error',
      error: error.message,
    });
  }
};

export const getPropertyByIdController = async (req: Request, res: Response) => {
  try {
    const propertyId = req.params.propertyId as string;
    const language = resolveLanguage(req);

    const property = await propertyService.getPropertyById(propertyId, language);

    if (!property) {
      return res.status(404).json({
        message: 'Property not found',
      });
    }

    // =========================
    // 🔥 VIEW TRACKING - Increment for ALL visitors (logged in or not)
    // =========================

    const userId = (req as any).userId;
    console.log("👤 userId:", (req as any).userId);
    
    if (userId) {
      // For logged-in users: track interaction (which also increments view count)
      propertyService
        .trackPropertyView(propertyId, userId)
        .catch((err) => console.error('View tracking error:', err));
    } else {
      // For anonymous users: just increment the view count
      propertyService
        .incrementViewCount(propertyId)
        .catch((err) => console.error('View count increment error:', err));
    }
    // =========================
    return res.status(200).json({
      message: 'Property fetched successfully',
      data: property,
    });
  } catch (error: any) {
    console.error('Get property by id error:', error);

    return res.status(500).json({
      message: 'Internal server error',
      error: error.message,
    });
  }
};

export const updatePropertyController = async (req: Request, res: Response) => {
  try {
    const ownerId = (req as any).userId

    if (!ownerId) {
      return res.status(401).json({
        message: 'Unauthorized. Please login.',
      });
    }

    const propertyId = req.params.propertyId as string;
    const body = req.body as UpdatePropertyInput;

    const files = req.files as {
      images?: Express.Multer.File[];
      videos?: Express.Multer.File[];
    };

    const imageUrls = await Promise.all(
      (files?.images || []).map((file) => {
        if (!file.buffer) return null;
        return uploadToCloudinary(file.buffer, 'properties/images', 'image');
      })
    ).then(results => results.filter((url): url is string => url !== null));

    const videoUrls = await Promise.all(
      (files?.videos || []).map((file) => {
        if (!file.buffer) return null;
        return uploadToCloudinary(file.buffer, 'properties/videos', 'video');
      })
    ).then(results => results.filter((url): url is string => url !== null));

    const keptImageUrls = Array.isArray(body.images) ? body.images : [];
    const keptVideoUrls = Array.isArray(body.videos) ? body.videos : [];

    const finalBody = {
      ...body,
      ...(body.images !== undefined || imageUrls.length > 0
        ? { images: [...keptImageUrls, ...imageUrls] }
        : {}),
      ...(body.videos !== undefined || videoUrls.length > 0
        ? { videos: [...keptVideoUrls, ...videoUrls] }
        : {}),
    };

    const result = await propertyService.updateProperty(ownerId, propertyId, finalBody);

    if (result === null) {
      return res.status(404).json({
        message: 'Property not found',
      });
    }

    if (result === 'UNAUTHORIZED') {
      return res.status(401).json({
        message: 'Unauthorized. You are not the owner of this property.',
      });
    }

    return res.status(200).json({
      message: 'Property updated successfully',
      data: result,
    });
  } catch (error: any) {
    console.error('Update property error:', error);

    return res.status(500).json({
      message: 'Internal server error',
      error: error.message,
    });
  }
};

export const deletePropertyController = async (req: Request, res: Response) => {
  try {
    const ownerId = (req as any).userId
    if (!ownerId) {
      return res.status(401).json({
        message: 'Unauthorized. Please login.',
      });
    }

    const propertyId = req.params.propertyId as string;

    const result = await propertyService.softDeleteProperty(ownerId, propertyId);

    if (result === null) {
      return res.status(404).json({
        message: 'Property not found',
      });
    }

    if (result === 'UNAUTHORIZED') {
      return res.status(401).json({
        message: 'Unauthorized. You are not the owner of this property.',
      });
    }

    return res.status(200).json({
      message: 'Property soft deleted successfully',
      data: result,
    });
  } catch (error: any) {
    console.error('Delete property error:', error);

    return res.status(500).json({
      message: 'Internal server error',
      error: error.message,
    });
  }
};

export const getMyPropertiesController = async (req: Request, res: Response) => {
  try {
    const ownerId = (req as any).userId

    if (!ownerId) {
      return res.status(401).json({
        message: 'Unauthorized. Please login.',
      });
    }

    const properties = await propertyService.getMyProperties(ownerId);

    return res.status(200).json({
      message: 'Owner properties fetched successfully',
      data: properties,
    });
  } catch (error: any) {
    console.error('Get my properties error:', error);

    return res.status(500).json({
      message: 'Internal server error',
      error: error.message,
    });
  }
};

export const getSavedPropertiesController = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    if (!userId) {
      return res.status(401).json({
        message: 'Unauthorized. Please login.',
      });
    }

    const savedProperties = await propertyService.getSavedProperties(userId);

    return res.status(200).json({
      message: 'Saved properties fetched successfully',
      data: savedProperties,
    });
  } catch (error: any) {
    console.error('Get saved properties error:', error);

    return res.status(500).json({
      message: 'Internal server error',
      error: error.message,
    });
  }
};

export const savePropertyController = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    if (!userId) {
      return res.status(401).json({
        message: 'Unauthorized. Please login.',
      });
    }

    const propertyId = req.params.propertyId as string;
    const savedProperty = await propertyService.saveProperty(userId, propertyId);

    return res.status(200).json({
      message: 'Property saved successfully',
      data: savedProperty,
    });
  } catch (error: any) {
    console.error('Save property error:', error);

    return res.status(500).json({
      message: 'Internal server error',
      error: error.message,
    });
  }
};

export const removeSavedPropertyController = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    if (!userId) {
      return res.status(401).json({
        message: 'Unauthorized. Please login.',
      });
    }

    const propertyId = req.params.propertyId as string;
    const removed = await propertyService.removeSavedProperty(userId, propertyId);

    if (!removed) {
      return res.status(404).json({
        message: 'Saved property not found',
      });
    }

    return res.status(200).json({
      message: 'Property removed from saved list successfully',
    });
  } catch (error: any) {
    console.error('Remove saved property error:', error);

    return res.status(500).json({
      message: 'Internal server error',
      error: error.message,
    });
  }
};

export const updatePropertyStatusController = async (req: Request, res: Response) => {
  try {
    const ownerId = (req as any).userId

    if (!ownerId) {
      return res.status(401).json({
        message: 'Unauthorized. Please login.',
      });
    }

    const propertyId = req.params.propertyId as string;
    const { status } = req.body as UpdatePropertyStatusInput;

    const result = await propertyService.updatePropertyStatus(ownerId, propertyId, status);

    if (result === null) {
      return res.status(404).json({
        message: 'Property not found',
      });
    }

    if (result === 'UNAUTHORIZED') {
      return res.status(401).json({
        message: 'Unauthorized. You are not the owner of this property.',
      });
    }

    return res.status(200).json({
      message: 'Property status updated successfully',
      data: result,
    });
  } catch (error: any) {
    console.error('Update property status error:', error);

    return res.status(500).json({
      message: 'Internal server error',
      error: error.message,
    });
  }
};

export const addPropertyTranslationController = async (req: Request, res: Response) => {
  try {
    const ownerId = (req as any).userId
    if (!ownerId) {
      return res.status(401).json({
        message: 'Unauthorized. Please login.',
      });
    }

    const propertyId = req.params.propertyId as string;
    const body = req.body as AddPropertyTranslationInput;

    const result = await propertyService.upsertPropertyTranslation(
      ownerId,
      propertyId,
      body.language,
      body.title,
      body.description
    );

    if (result === null) {
      return res.status(404).json({ message: 'Property not found' });
    }
    if (result === 'UNAUTHORIZED') {
      return res.status(401).json({
        message: 'Unauthorized. You are not the owner of this property.',
      });
    }

    return res.status(200).json({
      message: 'Translation saved successfully',
      data: result,
    });
  } catch (error: any) {
    console.error('Add property translation error:', error);
    return res.status(500).json({
      message: 'Internal server error',
      error: error.message,
    });
  }
};

export const updatePropertyTranslationController = async (req: Request, res: Response) => {
  try {
    const ownerId = (req as any).userId
    if (!ownerId) {
      return res.status(401).json({
        message: 'Unauthorized. Please login.',
      });
    }

    const propertyId = req.params.propertyId as string;
    const language = req.params.lang as 'en' | 'am';
    const body = req.body as UpdatePropertyTranslationInput;

    const result = await propertyService.updatePropertyTranslation(
      ownerId,
      propertyId,
      language,
      body.title,
      body.description
    );

    if (result === null) {
      return res.status(404).json({ message: 'Property not found' });
    }
    if (result === 'UNAUTHORIZED') {
      return res.status(401).json({
        message: 'Unauthorized. You are not the owner of this property.',
      });
    }
    if (result === 'NOT_FOUND') {
      return res.status(404).json({ message: 'Translation not found' });
    }

    return res.status(200).json({
      message: 'Translation updated successfully',
      data: result,
    });
  } catch (error: any) {
    console.error('Update property translation error:', error);
    return res.status(500).json({
      message: 'Internal server error',
      error: error.message,
    });
  }
};

export const deletePropertyTranslationController = async (req: Request, res: Response) => {
  try {
    const ownerId = (req as any).userId
    if (!ownerId) {
      return res.status(401).json({
        message: 'Unauthorized. Please login.',
      });
    }

    const propertyId = req.params.propertyId as string;
    const language = req.params.lang as 'en' | 'am';

    const result = await propertyService.deletePropertyTranslation(ownerId, propertyId, language);

    if (result === null) {
      return res.status(404).json({ message: 'Property not found' });
    }
    if (result === 'UNAUTHORIZED') {
      return res.status(401).json({
        message: 'Unauthorized. You are not the owner of this property.',
      });
    }
    if (result === 'CANNOT_DELETE_ENGLISH') {
      return res.status(400).json({ message: 'English translation cannot be deleted' });
    }
    if (result === 'NOT_FOUND') {
      return res.status(404).json({ message: 'Translation not found' });
    }

    return res.status(200).json({
      message: 'Translation deleted successfully',
      data: result,
    });
  } catch (error: any) {
    console.error('Delete property translation error:', error);
    return res.status(500).json({
      message: 'Internal server error',
      error: error.message,
    });
  }
};

/**
 * GET /api/v1/properties/analytics
 * Get property analytics for the authenticated owner
 */
export const getOwnerPropertyAnalyticsController = async (req: Request, res: Response) => {
  try {
    const ownerId = (req as any).userId;

    if (!ownerId) {
      return res.status(401).json({
        message: 'Unauthorized. Please login.',
      });
    }

    const analytics = await propertyService.getOwnerPropertyAnalytics(ownerId);

    return res.status(200).json({
      message: 'Property analytics fetched successfully',
      data: analytics,
    });
  } catch (error: any) {
    console.error('Get property analytics error:', error);

    return res.status(500).json({
      message: 'Internal server error',
      error: error.message,
    });
  }
};
