import { Request, Response } from 'express';
import { verificationService } from './service';
import { uploadToCloudinary } from '../../utils/uploadToCloudinary';
import type {
  UploadVerificationDocumentsInput,
  UpdateVerificationStatusInput,
} from './schema';

/**
 * Upload verification documents
 * POST /api/v1/verification/documents
 */
export const uploadVerificationDocumentsController = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = (req as any).userId;

    if (!userId) {
      return res.status(401).json({
        message: 'Unauthorized. Please login.',
      });
    }

    const files = req.files as {
      front?: Express.Multer.File[];
      back?: Express.Multer.File[];
      livePhoto?: Express.Multer.File[];
    };

    if (!files?.front || !files?.back || !files?.livePhoto) {
      return res.status(400).json({
        message: 'All three documents are required: front, back, and live photo',
      });
    }

    // Upload documents to Cloudinary
    const [frontUrl, backUrl, livePhotoUrl] = await Promise.all([
      uploadToCloudinary(files.front[0].buffer, 'verification/documents', 'image'),
      uploadToCloudinary(files.back[0].buffer, 'verification/documents', 'image'),
      uploadToCloudinary(files.livePhoto[0].buffer, 'verification/photos', 'image'),
    ]);

    const data: UploadVerificationDocumentsInput = {
      frontUrl,
      backUrl,
      livePhotoUrl,
    };

    const verificationDoc = await verificationService.uploadVerificationDocuments(
      userId,
      data
    );

    return res.status(201).json({
      message: 'Verification documents uploaded successfully',
      data: verificationDoc,
    });
  } catch (error: any) {
    console.error('Upload verification documents error:', error);

    if (error.message.includes('already approved')) {
      return res.status(400).json({
        message: error.message,
      });
    }

    return res.status(500).json({
      message: 'Internal server error',
      error: error.message,
    });
  }
};

/**
 * Get verification documents
 * GET /api/v1/verification/documents/:userId
 */
export const getVerificationDocumentsController = async (
  req: Request,
  res: Response
) => {
  try {
    const requestingUserId = (req as any).userId;
    const requestingUserRole = (req as any).userRole;
    const userId = req.params.userId as string;

    if (!requestingUserId) {
      return res.status(401).json({
        message: 'Unauthorized. Please login.',
      });
    }

    const verificationDoc = await verificationService.getVerificationDocuments(
      userId,
      requestingUserId,
      requestingUserRole
    );

    if (!verificationDoc) {
      return res.status(404).json({
        message: 'Verification documents not found',
      });
    }

    return res.status(200).json({
      message: 'Verification documents fetched successfully',
      data: verificationDoc,
    });
  } catch (error: any) {
    console.error('Get verification documents error:', error);

    if (error.message.includes('Unauthorized')) {
      return res.status(403).json({
        message: error.message,
      });
    }

    return res.status(500).json({
      message: 'Internal server error',
      error: error.message,
    });
  }
};

/**
 * Get current user's verification status
 * GET /api/v1/verification/my-status
 */
export const getMyVerificationStatusController = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = (req as any).userId;

    if (!userId) {
      return res.status(401).json({
        message: 'Unauthorized. Please login.',
      });
    }

    const status = await verificationService.getMyVerificationStatus(userId);

    return res.status(200).json({
      message: 'Verification status fetched successfully',
      data: status,
    });
  } catch (error: any) {
    console.error('Get verification status error:', error);

    return res.status(500).json({
      message: 'Internal server error',
      error: error.message,
    });
  }
};

/**
 * Update verification status (Admin only)
 * PATCH /api/v1/verification/documents/:userId/status
 */
export const updateVerificationStatusController = async (
  req: Request,
  res: Response
) => {
  try {
    const adminId = (req as any).userId;

    if (!adminId) {
      return res.status(401).json({
        message: 'Unauthorized. Please login.',
      });
    }

    const userId = req.params.userId as string;
    const body = req.body as UpdateVerificationStatusInput;

    const updatedDoc = await verificationService.updateVerificationStatus(
      adminId,
      userId,
      body
    );

    return res.status(200).json({
      message: 'Verification status updated successfully',
      data: updatedDoc,
    });
  } catch (error: any) {
    console.error('Update verification status error:', error);

    if (error.message.includes('Unauthorized') || error.message.includes('Admin')) {
      return res.status(403).json({
        message: error.message,
      });
    }

    if (error.message.includes('not found')) {
      return res.status(404).json({
        message: error.message,
      });
    }

    return res.status(500).json({
      message: 'Internal server error',
      error: error.message,
    });
  }
};

/**
 * Get all pending verification requests (Admin only)
 * GET /api/v1/verification/pending
 */
export const getPendingVerificationsController = async (
  req: Request,
  res: Response
) => {
  try {
    const adminId = (req as any).userId;

    if (!adminId) {
      return res.status(401).json({
        message: 'Unauthorized. Please login.',
      });
    }

    const pendingDocs = await verificationService.getPendingVerifications(adminId);

    return res.status(200).json({
      message: 'Pending verifications fetched successfully',
      data: pendingDocs,
    });
  } catch (error: any) {
    console.error('Get pending verifications error:', error);

    if (error.message.includes('Unauthorized') || error.message.includes('Admin')) {
      return res.status(403).json({
        message: error.message,
      });
    }

    return res.status(500).json({
      message: 'Internal server error',
      error: error.message,
    });
  }
};
