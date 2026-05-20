import { v2 as cloudinary, UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';
import streamifier from 'streamifier';
import '../config/cloudinary'; // Initialize config

export const uploadToCloudinary = (
  buffer: Buffer,
  folder: string,
  resourceType: 'image' | 'video'
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType,
      },
      (error: UploadApiErrorResponse | null | undefined, result: UploadApiResponse | undefined) => {
        if (error || !result) return reject(error);
        resolve(result.secure_url);
      }
    );

    streamifier.createReadStream(buffer).pipe(stream);
  });
};

export const deleteFromCloudinary = async (url: string, resourceType: 'image' | 'video' = 'image'): Promise<void> => {
  try {
    // Extract public ID from URL
    // e.g., https://res.cloudinary.com/demo/image/upload/v1234567890/folder/image_id.jpg
    const parts = url.split('/');
    const lastPart = parts[parts.length - 1];
    const folderPart = parts[parts.length - 2];
    
    // Remove extension
    const publicIdWithFolder = `${folderPart}/${lastPart.split('.')[0]}`;
    
    await cloudinary.uploader.destroy(publicIdWithFolder, { resource_type: resourceType });
  } catch (error) {
    console.error('Failed to delete from Cloudinary:', error);
  }
};