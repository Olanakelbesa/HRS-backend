import { v2 as cloudinary } from 'cloudinary';
import streamifier from 'streamifier';
import type { UploadedFile } from '../types/request';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload avatar image to Cloudinary
 */
export async function uploadAvatarToCloudinary(
  file: UploadedFile,
  userId: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const publicId = `avatars/${userId}-${Date.now()}`;

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        public_id: publicId,
        folder: 'house-rental/avatars',
        resource_type: 'auto',
        quality: 'auto',
        fetch_format: 'auto',
      },
      (error, result) => {
        if (error) {
          reject(new Error(`Cloudinary upload failed: ${error.message}`));
        } else if (result?.secure_url) {
          resolve(result.secure_url);
        } else {
          reject(new Error('Cloudinary upload failed: No URL returned'));
        }
      }
    );

    uploadStream.end(file.buffer);
  });
}

/**
 * Upload verification document to Cloudinary
 */
export async function uploadDocumentToCloudinary(
  file: UploadedFile,
  userId: string,
  documentType: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const publicId = `documents/${userId}-${documentType}-${Date.now()}`;
    const isImage = file.mimetype.startsWith('image/');

    const uploadOptions: Record<string, any> = {
      public_id: publicId,
      folder: 'house-rental/documents',
      resource_type: isImage ? 'image' : 'raw',
    };
    if (isImage) {
      uploadOptions.quality = 'auto';
      uploadOptions.fetch_format = 'auto';
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          reject(new Error(`Cloudinary upload failed: ${error.message}`));
        } else if (result?.secure_url) {
          resolve(result.secure_url);
        } else {
          reject(new Error('Cloudinary upload failed: No URL returned'));
        }
      }
    );

    uploadStream.end(file.buffer);
  });
}

/**
 * Delete file from Cloudinary
 */
export async function deleteFromCloudinary(publicId: string): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error(`Failed to delete Cloudinary file ${publicId}:`, error);
    // Don't throw - deletion failure shouldn't break the operation
  }
}

/**
 * Extract Cloudinary public ID from URL
 */
export function extractPublicId(url: string): string {
  const match = url.match(/\/([^/]+)\/([^/]+)\./) || url.match(/\/([^/]+)$/);
  return match ? match[1] : '';
}
